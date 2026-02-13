import express from 'express';
import {
  getDashboardSummaryController,
  getSalesTrendsController,
  getTopItemsController,
  getDashboardController,
} from '../controllers/dashboard/dashboardController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validate.js';
import {
  salesTrendsQuerySchema,
  topItemsQuerySchema,
  dashboardQuerySchema,
} from '../../validators/index.js';

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticateToken);

// Summary cards
router.get('/summary', getDashboardSummaryController);

// Sales trends with query validation
router.get(
  '/sales-trends',
  validate(salesTrendsQuerySchema, 'query'),
  getSalesTrendsController,
);

// Top selling items with query validation
router.get(
  '/top-items',
  validate(topItemsQuerySchema, 'query'),
  getTopItemsController,
);

// Full dashboard payload with query validation
router.get(
  '/',
  validate(dashboardQuerySchema, 'query'),
  getDashboardController,
);

export default router;
