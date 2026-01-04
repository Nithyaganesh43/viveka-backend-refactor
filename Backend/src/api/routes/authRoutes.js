import express from 'express';
import {
  registerController,
  loginController,
  logoutController,
  getClientController,
} from '../controllers/authController.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register new client (after OTP verification)
 * @body    { phoneNumber: string, password: string, ownerName: string, businessName: string }
 * @returns { success: boolean, clientId: string, phoneNumber: string }
 */
router.post('/register', registerController);

/**
 * @route   POST /api/auth/login
 * @desc    Login client with password
 * @body    { phoneNumber: string, password: string, deviceId: string, deviceName?: string }
 * @returns { success: boolean, token: string, clientId: string, deviceSessionId: string }
 */
router.post('/login', loginController);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout client
 * @body    { clientId: string, deviceSessionId: string }
 * @returns { success: boolean, message: string }
 */
router.post('/logout', logoutController);

/**
 * @route   GET /api/auth/client/:clientId
 * @desc    Get client details
 * @returns { success: boolean, client: object }
 */
router.get('/client/:clientId', getClientController);

export default router;
