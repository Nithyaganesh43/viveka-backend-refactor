import express from 'express';
import {
  createItemGroupController,
  getItemGroupsController,
  updateItemGroupController,
  deleteItemGroupController,
  createItemController,
  getItemsController,
  updateItemController,
  deleteItemController,
  createclientCustomerController,
  getClientCustomersController,
  getClientCustomerByPhoneController,
  updateClientCustomerController,
  deleteClientCustomerController,
  createCartController,
  addToCartController,
  removeFromCartController,
  getCartController,
  clearCartController,
  generateInvoiceController,
  generateInvoiceWithProductsController,
  getInvoicesController,
  recordPaymentController,
  getPaymentsController,
  getPurchaseHistoryController,
  getPendingInvoicesController,
  getPaymentReportController,
  getPendingInvoicesByClientCustomerController,
  getPaidInvoicesByClientCustomerController,
  getInvoiceHistoryController,
  getPaymentHistoryController,
} from './controller.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import {
  validate,
  validateMultiple,
  // Item & ItemGroup schemas
  createItemGroupSchema,
  updateItemGroupSchema,
  createItemSchema,
  updateItemSchema,
  getItemsQuerySchema,
  clientIdParam,
  clientAndGroupIdParams,
  clientAndItemIdParams,
  // Customer schemas
  createCustomerSchema,
  updateCustomerSchema,
  clientAndCustomerIdParams,
  clientAndPhoneParams,
  // Cart schemas
  createCartSchema,
  addCartItemSchema,
  removeCartItemSchema,
  clearCartSchema,
  cartIdParam,
  // Invoice schemas
  generateInvoiceSchema,
  generateInvoiceWithProductsSchema,
  paymentSchema,
  invoiceIdParam,
  clientCustomerInvoicesParams,
} from './validation.js';

const router = express.Router();

// All business routes require an active authenticated session
router.use(authenticateToken);

// ============================================================================
// ITEM GROUP ROUTES
// ============================================================================

/**
 * @route   POST /api/business/item-groups
 * @desc    Create new item group
 * @body    { clientId: string, name: string, description?: string }
 */
router.post(
  '/item-groups',
  validate(createItemGroupSchema),
  createItemGroupController,
);

/**
 * @route   GET /api/business/item-groups/:clientId
 * @desc    Get all item groups for client
 */
router.get(
  '/item-groups/:clientId',
  validate(clientIdParam, 'params'),
  getItemGroupsController,
);

/**
 * @route   PUT /api/business/item-groups/:clientId/:groupId
 * @desc    Update item group
 */
router.put(
  '/item-groups/:clientId/:groupId',
  validateMultiple({
    params: clientAndGroupIdParams,
    body: updateItemGroupSchema,
  }),
  updateItemGroupController,
);

/**
 * @route   DELETE /api/business/item-groups/:clientId/:groupId
 * @desc    Delete item group
 */
router.delete(
  '/item-groups/:clientId/:groupId',
  validate(clientAndGroupIdParams, 'params'),
  deleteItemGroupController,
);

// ============================================================================
// ITEM ROUTES
// ============================================================================

/**
 * @route   POST /api/business/items
 * @desc    Create new item
 * @body    { clientId: string, name: string, price: number, unit?: string, groupId?: string, description?: string }
 */
router.post('/items', validate(createItemSchema), createItemController);

/**
 * @route   GET /api/business/items/:clientId
 * @desc    Get all items for client (optionally filter by group)
 * @query   { groupId?: string }
 */
router.get(
  '/items/:clientId',
  validateMultiple({ params: clientIdParam, query: getItemsQuerySchema }),
  getItemsController,
);

/**
 * @route   PUT /api/business/items/:clientId/:itemId
 * @desc    Update item
 */
router.put(
  '/items/:clientId/:itemId',
  validateMultiple({ params: clientAndItemIdParams, body: updateItemSchema }),
  updateItemController,
);

/**
 * @route   DELETE /api/business/items/:clientId/:itemId
 * @desc    Delete (deactivate) item
 */
router.delete(
  '/items/:clientId/:itemId',
  validate(clientAndItemIdParams, 'params'),
  deleteItemController,
);

// ============================================================================
// CLIENT CUSTOMER ROUTES (clientCustomers with name and phone)
// ============================================================================

/**
 * @route   POST /api/business/client-customers
 * @desc    Create or update client customer
 * @body    { clientId: string, name: string, phone: string }
 */
router.post(
  '/client-customers',
  validate(createCustomerSchema),
  createclientCustomerController,
);

/**
 * @route   GET /api/business/client-customers/:clientId
 * @desc    Get all client customers for client
 */
router.get(
  '/client-customers/:clientId',
  validate(clientIdParam, 'params'),
  getClientCustomersController,
);

/**
 * @route   GET /api/business/client-customers/:clientId/:phone
 * @desc    Get client customer by phone
 */
router.get(
  '/client-customers/:clientId/:phone',
  validate(clientAndPhoneParams, 'params'),
  getClientCustomerByPhoneController,
);

/**
 * @route   PUT /api/business/client-customers/:clientId/:clientCustomerId
 * @desc    Update client customer
 */
router.put(
  '/client-customers/:clientId/:clientCustomerId',
  validateMultiple({
    params: clientAndCustomerIdParams,
    body: updateCustomerSchema,
  }),
  updateClientCustomerController,
);

/**
 * @route   DELETE /api/business/client-customers/:clientId/:clientCustomerId
 * @desc    Delete client customer
 */
router.delete(
  '/client-customers/:clientId/:clientCustomerId',
  validate(clientAndCustomerIdParams, 'params'),
  deleteClientCustomerController,
);

// ============================================================================
// CART ROUTES
// ============================================================================

/**
 * @route   POST /api/business/carts
 * @desc    Create new cart
 * @body    { clientId: string, clientCustomerPhone?: string }
 */
router.post('/carts', validate(createCartSchema), createCartController);

/**
 * @route   POST /api/business/carts/add-item
 * @desc    Add item to cart
 * @body    { cartId: string, itemId: string, itemName: string, unitPrice: number, quantity: number }
 */
router.post(
  '/carts/add-item',
  validate(addCartItemSchema),
  addToCartController,
);

/**
 * @route   POST /api/business/carts/remove-item
 * @desc    Remove item from cart
 * @body    { cartId: string, cartItemId: string }
 */
router.post(
  '/carts/remove-item',
  validate(removeCartItemSchema),
  removeFromCartController,
);

/**
 * @route   GET /api/business/carts/:cartId
 * @desc    Get cart details with items
 */
router.get(
  '/carts/:cartId',
  validate(cartIdParam, 'params'),
  getCartController,
);

/**
 * @route   POST /api/business/carts/clear
 * @desc    Clear cart
 * @body    { cartId: string }
 */
router.post('/carts/clear', validate(clearCartSchema), clearCartController);

// ============================================================================
// INVOICE & PAYMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/business/invoices/generate
 * @desc    Generate invoice (paid = total)
 * @body    { clientId: string, clientCustomerId?: string, cartId: string, totalAmount: number, paidAmount: number, notes?: string }
 */
router.post(
  '/invoices/generate',
  validate(generateInvoiceSchema),
  generateInvoiceController,
);
router.post(
  '/invoices/generatewithproducts',
  validate(generateInvoiceWithProductsSchema),
  generateInvoiceWithProductsController,
);

/**
 * @route   GET /api/business/invoices/:clientId
 * @desc    Get all invoices for client
 */
router.get(
  '/invoices/:clientId',
  validate(clientIdParam, 'params'),
  getInvoicesController,
);

/**
 * @route   POST /api/business/invoices/pay
 * @desc    Record a payment against an invoice (supports multiple payments)
 * @body    { clientId: string, invoiceId: string, amount: number, method?: string, note?: string }
 */
router.post('/invoices/pay', validate(paymentSchema), recordPaymentController);

/**
 * @route   GET /api/business/invoices/:invoiceId/payments
 * @desc    Get payments for an invoice (scoped by clientId)
 * @query   { clientId: string }
 */
router.get(
  '/invoices/:invoiceId/payments',
  validate(invoiceIdParam, 'params'),
  getPaymentsController,
);

/**
 * @route   GET /api/business/purchase-history/:clientId
 * @desc    Get purchase history (optionally filter by client clientCustomer)
 * @query   { clientCustomerId?: string }
 */
router.get(
  '/purchase-history/:clientId',
  validate(clientIdParam, 'params'),
  getPurchaseHistoryController,
);

/**
 * @route   GET /api/business/pending-invoices/:clientId
 * @desc    Get pending invoices (unpaid/partial)
 */
router.get(
  '/pending-invoices/:clientId',
  validate(clientIdParam, 'params'),
  getPendingInvoicesController,
);

/**
 * @route   GET /api/business/pending-invoices/:clientId/:clientCustomerId
 * @desc    Get pending invoices for a client customer
 * @query   { clientCustomerPhone?: string }
 */
router.get(
  '/pending-invoices/:clientId/:clientCustomerId',
  validate(clientCustomerInvoicesParams, 'params'),
  getPendingInvoicesByClientCustomerController,
);

/**
 * @route   GET /api/business/paid-invoices/:clientId/:clientCustomerId
 * @desc    Get fully paid invoices for a client customer
 * @query   { clientCustomerPhone?: string }
 */
router.get(
  '/paid-invoices/:clientId/:clientCustomerId',
  validate(clientCustomerInvoicesParams, 'params'),
  getPaidInvoicesByClientCustomerController,
);

/**
 * @route   GET /api/business/payment-report/:clientId
 * @desc    Get payment breakdown and summary
 */
router.get(
  '/payment-report/:clientId',
  validate(clientIdParam, 'params'),
  getPaymentReportController,
);

// ============================================================================
// INVOICE HISTORY & PAYMENT HISTORY WITH ANALYTICS
// ============================================================================

/**
 * @route   GET /api/business/invoice-history/:clientId/:clientCustomerId
 * @desc    Get invoice history for a specific client customer with analytics
 * @query   { startDate?: string, endDate?: string, status?: string, limit?: number, offset?: number }
 */
router.get(
  '/invoice-history/:clientId/:clientCustomerId',
  getInvoiceHistoryController,
);

/**
 * @route   GET /api/business/invoice-history/:clientId
 * @desc    Get invoice history for all client customers with comprehensive analytics
 * @query   { startDate?: string, endDate?: string, status?: string, limit?: number, offset?: number }
 */
router.get('/invoice-history/:clientId', getInvoiceHistoryController);

/**
 * @route   GET /api/business/payment-history/:clientId/:invoiceId
 * @desc    Get payment history for a specific invoice with analytics
 */
router.get(
  '/payment-history/:clientId/:invoiceId',
  getPaymentHistoryController,
);

/**
 * @route   GET /api/business/payment-history/:clientId
 * @desc    Get payment history for all invoices with comprehensive analytics
 */
router.get('/payment-history/:clientId', getPaymentHistoryController);

export default router;
