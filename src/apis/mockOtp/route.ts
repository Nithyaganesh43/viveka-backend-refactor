import express, { Router } from "express";
import { sendOTPController } from "./controller";
import { validate, sendOtpSchema } from "./validation";
import { otpLimiter } from "../../middleware/rateLimiter";

/**
 * OTP Router - Handles OTP-related routes
 */
const router: Router = express.Router();

/**
 * @route   POST /api/otp/send
 * @desc    Send OTP to phone number for registration or login
 * @access  Public (rate-limited)
 * @body    { phoneNumber: string, purpose?: 'register' | 'login' | 'generic' }
 * @returns { success: boolean, message: string, phoneNumber: string, expiresInSeconds: number }
 */
router.post(
  "/send",
  otpLimiter,
  validate(sendOtpSchema),
  sendOTPController
);

export default router;
