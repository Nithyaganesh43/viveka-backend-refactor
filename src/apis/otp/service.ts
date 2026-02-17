import repository from "../../repository/repository";
import axios, { AxiosResponse } from "axios";
import { IClient, IOtpSession } from "../../models/Model";
import bcrypt from "bcrypt";
import {
  SendOtpResponse,
  VerifyOtpResponse,
  SendOtpInput,
  VerifyOtpInput,
  OtpPurpose,
} from "./dto";

// =============================================================================
// CONSTANTS
// =============================================================================

const OTP_TTL_SECONDS = 600;
const MAX_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 10;

// =============================================================================
// TYPES
// =============================================================================

interface OtpNotificationResult {
  status: boolean;
  message: string;
}

interface TwoFactorApiResponse {
  Status: string;
  Details: string;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generates a random 4-digit OTP
 */
function generateOtp(): number {
  return Math.floor(1000 + Math.random() * 9000);
}

/**
 * Hashes an OTP using bcrypt
 */
async function hashOtp(otp: number): Promise<string> {
  return bcrypt.hash(String(otp), BCRYPT_ROUNDS);
}

/**
 * Verifies an OTP against its hashed value
 */
async function verifyOtpHash(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(String(otp), hash);
}

/**
 * Sends OTP notification via 2Factor API
 */
const sendOtpNotification = async (
  phoneNumber: string,
  otp: number
): Promise<OtpNotificationResult> => {
  const url = `https://2factor.in/API/V1/${process.env.FACTOR_API_Key}/SMS/${phoneNumber}/${otp}/OTP1`;
  const response: AxiosResponse<TwoFactorApiResponse> = await axios.get(url);

  if (response.status !== 200 || response.data?.Status !== "Success") {
    return { status: false, message: "Failed to send OTP." };
  }
  return { status: true, message: "OTP sent successfully." };
};

/**
 * Validates and normalizes the OTP purpose
 * @throws {Error} if purpose is not 'register' or 'login'
 */
const assertPurpose = (purpose?: string): "register" | "login" => {
  const allowed: Array<"register" | "login"> = ["register", "login"];
  if (purpose && allowed.includes(purpose as "register" | "login")) {
    return purpose as "register" | "login";
  }
  throw new Error("Purpose must be either register or login");
};

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Sends an OTP to the specified phone number
 * @param phoneNumber - The phone number to send OTP to
 * @param purpose - The purpose of the OTP (register or login)
 * @returns SendOtpResponse with success status and details
 * @throws {Error} if validation or sending fails
 */
export const sendOTP = async (
  phoneNumber: string,
  purpose?: string
): Promise<SendOtpResponse> => {
  try {
    const normalizedPurpose: "register" | "login" = assertPurpose(purpose);

    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    // Validate based on purpose
    if (normalizedPurpose === "register") {
      const existingClient = await repository.findOne<IClient>("clients", {
        phoneNumber,
      });
      if (existingClient) {
        throw new Error("Phone number already registered");
      }
    }

    if (normalizedPurpose === "login") {
      const client = await repository.findOne<IClient>("clients", {
        phoneNumber,
      });
      if (!client) {
        throw new Error("Client not found. Please register first");
      }
      if (client.isActive === false) {
        throw new Error("Account is not active");
      }
    }

    // Generate OTP and expiration
    const otp: number = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

    // Clean up old OTP sessions
    await repository.deleteMany("otpsessions", {
      phoneNumber,
      purpose: normalizedPurpose,
    });

    // Create new OTP session
    await repository.create<IOtpSession>("otpsessions", {
      phoneNumber,
      purpose: normalizedPurpose,
      otpHash: await hashOtp(otp),
      expiresAt,
      isVerified: false,
      attempts: 0,
    });

    // Send OTP notification
    const result: OtpNotificationResult = await sendOtpNotification(
      phoneNumber,
      otp
    );

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

/**
 * Verifies an OTP for the specified phone number
 * @param phoneNumber - The phone number to verify
 * @param otp - The OTP code to verify
 * @param purpose - The purpose of the OTP (register or login)
 * @param consume - Whether to consume (delete) the OTP session after verification
 * @returns VerifyOtpResponse with success status and details
 * @throws {Error} if verification fails
 */
export const verifyOTP = async (
  phoneNumber: string,
  otp: string,
  purpose: string,
  consume: boolean = true
): Promise<VerifyOtpResponse> => {
  try {
    const normalizedPurpose: "register" | "login" = assertPurpose(purpose);

    const otpSession = await repository.findOne<IOtpSession>("otpsessions", {
      phoneNumber,
      purpose: normalizedPurpose,
    });

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

    const isValid: boolean = await verifyOtpHash(otp, otpSession.otpHash);
    if (!isValid) {
      otpSession.attempts += 1;
      await otpSession.save();
      throw new Error("Invalid OTP");
    }

    // Consume or mark as verified
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
