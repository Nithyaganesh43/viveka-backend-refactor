import express from 'express';
import { sendOTPController } from './controller.js';
import { validate, sendOtpSchema } from './validation.js';
import { otpLimiter } from '../../middleware/rateLimiter.js';

const router = express.Router();

/**
 * @route   POST /api/otp/send
 * @desc    Send OTP to phone number
 * @body    { phoneNumber: string, purpose: 'register' | 'login' }
 * @returns { success: boolean, message: string }
 */
router.post('/send', otpLimiter, validate(sendOtpSchema), sendOTPController);

export default router;
