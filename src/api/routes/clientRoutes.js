import express from 'express';
import {
  getClientController,
  updateClientController,
} from '../controllers/client/clientController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { validate, validateMultiple } from '../../middleware/validate.js';
import { clientIdParam, updateClientSchema } from '../../validators/index.js';

const router = express.Router();

/**
 * @route   GET /api/client/:clientId
 * @desc    Get client details
 * @returns { success: boolean, client: object }
 */
router.get(
  '/:clientId',
  authenticateToken,
  validate(clientIdParam, 'params'),
  getClientController,
);

/**
 * @route   PUT /api/client/:clientId
 * @desc    Update client profile fields
 */
router.put(
  '/:clientId',
  authenticateToken,
  validateMultiple({ params: clientIdParam, body: updateClientSchema }),
  updateClientController,
);

export default router;
