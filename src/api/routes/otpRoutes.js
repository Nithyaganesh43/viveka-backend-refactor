import express from 'express';
import { sendOTPController } from '../controllers/otp/otpController.js';
import { validate } from '../../middleware/validate.js';
import { sendOtpSchema } from '../../validators/index.js';
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
