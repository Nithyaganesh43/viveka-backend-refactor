import express, { Router } from "express";
import {
  readyToSyncController,
  syncController,
} from "./controller";
import { authenticateToken } from "../../middleware/authMiddleware";
import {
  validate,
  readyToSyncSchema,
  syncPayloadSchema,
} from "./validation";

const router: Router = express.Router();

/**
 * @route   POST /api/readytosync
 * @desc    Check if client session is valid for sync
 */
router.post(
  "/readytosync",
  authenticateToken,
  validate(readyToSyncSchema),
  readyToSyncController
);

/**
 * @route   POST /api/sync
 * @desc    Sync offline data and return full client dataset
 */
router.post(
  "/sync",
  authenticateToken,
  validate(syncPayloadSchema),
  syncController
);

export default router;
