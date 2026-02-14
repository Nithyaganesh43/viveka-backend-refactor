import express from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import {
  validate,
  validateMultiple,
  createDealerSchema,
  updateDealerSchema,
  createOrderSchema,
  markDeliveredSchema,
  updateOrderTotalSchema,
  cancelOrderSchema,
  dealerPaymentSchema,
  clientIdParam,
  clientAndDealerIdParams,
  orderIdParam,
} from './validation.js';
import {
  createDealerController,
  getDealersController,
  updateDealerController,
  deleteDealerController,
  getDealerItemsController,
  getDealerLowStockItemsController,
  getDealerOrderRecommendationsController,
  createDealerOrderController,
  getDealerOrdersController,
  getDealerOrderByIdController,
  cancelDealerOrderController,
  markDealerOrderDeliveredController,
  updateOrderTotalController,
  getOrderPaymentsController,
  createDealerPaymentController,
  getDealerPaymentsController,
  getDealerSummaryController,
  getDealerTransactionsController,
  getAllDealerTransactionsController,
  getOrderPaymentTransactionsController,
  getOrderPaymentDetailsController,
  getAllPaymentsController,
  getPaymentByIdController,
} from './controller.js';

const router = express.Router();
router.use(authenticateToken);

// ============================================================================
// DEALER CRUD
// ============================================================================
router.post('/', validate(createDealerSchema), createDealerController);
router.get(
  '/:clientId',
  validate(clientIdParam, 'params'),
  getDealersController,
);
router.put(
  '/:clientId/:dealerId',
  validateMultiple({
    params: clientAndDealerIdParams,
    body: updateDealerSchema,
  }),
  updateDealerController,
);
router.delete(
  '/:clientId/:dealerId',
  validate(clientAndDealerIdParams, 'params'),
  deleteDealerController,
);

// ============================================================================
// DEALER ITEMS
// ============================================================================
router.get(
  '/:clientId/:dealerId/items',
  validate(clientAndDealerIdParams, 'params'),
  getDealerItemsController,
);
router.get(
  '/:clientId/:dealerId/items/low-stock',
  validate(clientAndDealerIdParams, 'params'),
  getDealerLowStockItemsController,
);
router.get(
  '/:clientId/:dealerId/orders/recommendations',
  validate(clientAndDealerIdParams, 'params'),
  getDealerOrderRecommendationsController,
);

// ============================================================================
// DEALER ORDERS
// ============================================================================
router.post(
  '/orders',
  validate(createOrderSchema),
  createDealerOrderController,
);
router.get(
  '/:clientId/:dealerId/orders',
  validate(clientAndDealerIdParams, 'params'),
  getDealerOrdersController,
);
router.get(
  '/orders/:orderId',
  validate(orderIdParam, 'params'),
  getDealerOrderByIdController,
); // query: clientId
router.post(
  '/orders/:orderId/cancel',
  validateMultiple({ params: orderIdParam, body: cancelOrderSchema }),
  cancelDealerOrderController,
); // body: clientId
router.post(
  '/orders/:orderId/mark-delivered',
  validateMultiple({ params: orderIdParam, body: markDeliveredSchema }),
  markDealerOrderDeliveredController,
); // body: clientId, totalAmount, dueDate
router.put(
  '/orders/:orderId/total',
  validateMultiple({ params: orderIdParam, body: updateOrderTotalSchema }),
  updateOrderTotalController,
); // body: clientId, totalAmount, dueDate
router.get(
  '/orders/:orderId/payments',
  validate(orderIdParam, 'params'),
  getOrderPaymentsController,
); // query: clientId

// ============================================================================
// DEALER PAYMENTS
// ============================================================================
router.post(
  '/payments',
  validate(dealerPaymentSchema),
  createDealerPaymentController,
);
router.get(
  '/:clientId/:dealerId/payments',
  validate(clientAndDealerIdParams, 'params'),
  getDealerPaymentsController,
);
router.get(
  '/:clientId/payments/all',
  validate(clientIdParam, 'params'),
  getAllPaymentsController,
); // query: dealerId, orderId, limit, skip
router.get('/payments/:paymentId', getPaymentByIdController); // query: clientId

// ============================================================================
// ORDER PAYMENT TRANSACTIONS
// ============================================================================
router.get(
  '/:clientId/order-payments',
  validate(clientIdParam, 'params'),
  getOrderPaymentTransactionsController,
); // query: status, dealerId, limit, skip
router.get(
  '/orders/:orderId/payment-details',
  validate(orderIdParam, 'params'),
  getOrderPaymentDetailsController,
); // query: clientId

// ============================================================================
// DEALER SUMMARY
// ============================================================================
router.get(
  '/:clientId/:dealerId/summary',
  validate(clientAndDealerIdParams, 'params'),
  getDealerSummaryController,
);

// ============================================================================
// DEALER TRANSACTIONS
// ============================================================================
router.get(
  '/:clientId/transactions',
  validate(clientIdParam, 'params'),
  getAllDealerTransactionsController,
); // All dealers transactions
router.get(
  '/:clientId/:dealerId/transactions',
  validate(clientAndDealerIdParams, 'params'),
  getDealerTransactionsController,
); // Specific dealer transactions

export default router;
