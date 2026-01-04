import { OtpSession } from '../models/Model.js';

// Generate 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Mock: Print OTP instead of sending via SMS
const sendOTPMock = (phoneNumber, otp) => {
  console.log(`\n📱 OTP for ${phoneNumber}: ${otp} (Mock - Print Only)\n`);
};

// Send OTP to phone number
export const sendOTP = async (phoneNumber) => {
  try {
    const otp = generateOTP();
    const otpHash = otp; // In production, hash the OTP before storing
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTP for this phone number
    await OtpSession.deleteMany({ phoneNumber });

    // Create new OTP session
    const otpSession = await OtpSession.create({
      phoneNumber,
      otpHash,
      expiresAt,
      isVerified: false,
      attempts: 0,
    });

    // Mock: Print OTP instead of sending SMS
    sendOTPMock(phoneNumber, otp);

    return {
      success: true,
      message: 'OTP sent successfully',
      phoneNumber,
    };
  } catch (error) {
    throw new Error(`Failed to send OTP: ${error.message}`);
  }
};

// Verify OTP
export const verifyOTP = async (phoneNumber, otp) => {
  try {
    const otpSession = await OtpSession.findOne({ phoneNumber });

    if (!otpSession) {
      throw new Error('OTP not found. Please request a new OTP');
    }

    if (otpSession.expiresAt < new Date()) {
      await OtpSession.deleteOne({ _id: otpSession._id });
      throw new Error('OTP has expired. Please request a new OTP');
    }

    if (otpSession.attempts >= 5) {
      await OtpSession.deleteOne({ _id: otpSession._id });
      throw new Error(
        'Maximum OTP attempts exceeded. Please request a new OTP'
      );
    }

    if (otpSession.otpHash !== otp) {
      otpSession.attempts += 1;
      await otpSession.save();
      throw new Error('Invalid OTP');
    }

    otpSession.isVerified = true;
    await otpSession.save();

    return {
      success: true,
      message: 'OTP verified successfully',
      phoneNumber,
    };
  } catch (error) {
    throw new Error(`OTP verification failed: ${error.message}`);
  }
};

// Clear OTP session
export const clearOTPSession = async (phoneNumber) => {
  try {
    await OtpSession.deleteOne({ phoneNumber });
    return { success: true, message: 'OTP session cleared' };
  } catch (error) {
    throw new Error(`Failed to clear OTP session: ${error.message}`);
  }
};
