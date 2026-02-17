import repository from "../../repository/repository";
import bcrypt from "bcrypt";

const OTP_TTL_SECONDS = 600;
const MAX_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 10;

type OtpPurpose = "register" | "login";

interface OtpSessionDoc {
  _id: string;
  phoneNumber: string;
  purpose: OtpPurpose;
  otpHash: string;
  expiresAt: Date;
  isVerified: boolean;
  attempts: number;
  save(): Promise<void>;
}

function generateOtp(): number {
  return 1234; // Mock OTP for testing
}

async function hashOtp(otp: number): Promise<string> {
  return bcrypt.hash(String(otp), BCRYPT_ROUNDS);
}

async function verifyOtpHash(otp: number | string, hash: string): Promise<boolean> {
  return bcrypt.compare(String(otp), hash);
}

const sendOtpNotification = async (
  phoneNumber: string,
  otp: number
): Promise<{ status: boolean; message: string }> => {
  return { status: true, message: "OTP sent successfully." };
};

const assertPurpose = (purpose: string): OtpPurpose => {
  const allowed: OtpPurpose[] = ["register", "login"];
  if (allowed.includes(purpose as OtpPurpose)) return purpose as OtpPurpose;
  throw new Error("Purpose must be either register or login");
};

export const sendOTP = async (
  phoneNumber: string,
  purpose: string
): Promise<{
  success: boolean;
  message: string;
  phoneNumber: string;
  expiresInSeconds: number;
}> => {
  try {
    const normalizedPurpose = assertPurpose(purpose);

    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    if (normalizedPurpose === "register") {
      const existingClient = await repository.findOne("clients", { phoneNumber });
      if (existingClient) {
        throw new Error("Phone number already registered");
      }
    }

    if (normalizedPurpose === "login") {
      const client: any = await repository.findOne("clients", { phoneNumber });
      if (!client) {
        throw new Error("Client not found. Please register first");
      }
      if (client.isActive === false) {
        throw new Error("Account is not active");
      }
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

    await repository.deleteMany("otpsessions", {
      phoneNumber,
      purpose: normalizedPurpose,
    });

    await repository.create("otpsessions", {
      phoneNumber,
      purpose: normalizedPurpose,
      otpHash: await hashOtp(otp),
      expiresAt,
      isVerified: false,
      attempts: 0,
    });

    const result = await sendOtpNotification(phoneNumber, otp);

    if (!result.status) {
      throw new Error(result.message);
    }

    return {
      success: true,
      message: "OTP sent successfully",
      phoneNumber,
      expiresInSeconds: OTP_TTL_SECONDS,
    };
  } catch (error: any) {
    throw new Error(`Failed to send OTP: ${error.message}`);
  }
};

export const verifyOTP = async (
  phoneNumber: string,
  otp: number | string,
  purpose: string,
  consume = true
): Promise<{
  success: boolean;
  message: string;
  phoneNumber: string;
}> => {
  try {
    const normalizedPurpose = assertPurpose(purpose);

    const otpSession = (await repository.findOne("otpsessions", {
      phoneNumber,
      purpose: normalizedPurpose,
    })) as OtpSessionDoc | null;

    if (!otpSession) {
      throw new Error("OTP not found. Please request a new OTP");
    }

    if (otpSession.expiresAt < new Date()) {
      await repository.deleteOne("otpsessions", { _id: otpSession._id });
      throw new Error("OTP session expired. Please request new OTP");
    }

    if (otpSession.attempts >= MAX_ATTEMPTS) {
      await repository.deleteOne("otpsessions", { _id: otpSession._id });
      throw new Error("Maximum OTP attempts exceeded. Please request new OTP");
    }

    const isValid = await verifyOtpHash(otp, otpSession.otpHash);

    if (!isValid) {
      otpSession.attempts += 1;
      await otpSession.save();
      throw new Error("Invalid OTP");
    }

    if (consume) {
      await repository.deleteOne("otpsessions", { _id: otpSession._id });
    } else {
      otpSession.isVerified = true;
      await otpSession.save();
    }

    return {
      success: true,
      message: "OTP verified successfully",
      phoneNumber,
    };
  } catch (error: any) {
    throw new Error(`OTP verification failed: ${error.message}`);
  }
};
