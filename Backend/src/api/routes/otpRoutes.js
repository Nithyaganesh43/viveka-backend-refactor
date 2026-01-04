import express from 'express';
import {
  sendOTPController,
  verifyOTPController,
  clearOTPController,
} from '../controllers/otpController.js';

const router = express.Router();

/**
 * @route   POST /api/otp/send
 * @desc    Send OTP to phone number (Mock - prints to console)
 * @body    { phoneNumber: string }
 * @returns { success: boolean, message: string }
 */
router.post('/send', sendOTPController);

/**
 * @route   POST /api/otp/verify
 * @desc    Verify OTP
 * @body    { phoneNumber: string, otp: string }
 * @returns { success: boolean, message: string }
 */
router.post('/verify', verifyOTPController);

/**
 * @route   POST /api/otp/clear
 * @desc    Clear OTP session
 * @body    { phoneNumber: string }
 * @returns { success: boolean, message: string }
 */
router.post('/clear', clearOTPController);

export default router;
