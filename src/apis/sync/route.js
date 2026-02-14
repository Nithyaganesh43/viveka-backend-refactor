import express from 'express';
import {
  readyToSyncController,
  syncController,
} from './controller.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import {
  validate,
  readyToSyncSchema,
  syncPayloadSchema,
} from './validation.js';

const router = express.Router();

/**
 * @route   POST /api/readytosync
 * @desc    Check if client session is valid for sync
 */
router.post(
  '/readytosync',
  authenticateToken,
  validate(readyToSyncSchema),
  readyToSyncController,
);

/**
 * @route   POST /api/sync
 * @desc    Sync offline data and return full client dataset
 */
router.post(
  '/sync',
  authenticateToken,
  validate(syncPayloadSchema),
  syncController,
);

export default router;
