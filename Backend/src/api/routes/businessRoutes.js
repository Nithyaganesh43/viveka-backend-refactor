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
  getOrCreateCustomerController,
  getCustomersController,
  createCartController,
  addToCartController,
  removeFromCartController,
  getCartController,
  clearCartController,
  generateInvoiceController,
  createIncompleteSaleController,
  getInvoicesController,
  recordPaymentController,
  getPaymentsController,
  getPurchaseHistoryController,
} from '../controllers/businessController.js';

const router = express.Router();

// ============================================================================
// ITEM GROUP ROUTES
// ============================================================================

/**
 * @route   POST /api/business/item-groups
 * @desc    Create new item group
 * @body    { clientId: string, name: string, description?: string }
 */
router.post('/item-groups', createItemGroupController);

/**
 * @route   GET /api/business/item-groups/:clientId
 * @desc    Get all item groups for client
 */
router.get('/item-groups/:clientId', getItemGroupsController);

/**
 * @route   PUT /api/business/item-groups/:clientId/:groupId
 * @desc    Update item group
 */
router.put('/item-groups/:clientId/:groupId', updateItemGroupController);

/**
 * @route   DELETE /api/business/item-groups/:clientId/:groupId
 * @desc    Delete item group
 */
router.delete('/item-groups/:clientId/:groupId', deleteItemGroupController);

// ============================================================================
// ITEM ROUTES
// ============================================================================

/**
 * @route   POST /api/business/items
 * @desc    Create new item
 * @body    { clientId: string, name: string, price: number, unit?: string, groupId?: string, description?: string }
 */
router.post('/items', createItemController);

/**
 * @route   GET /api/business/items/:clientId
 * @desc    Get all items for client (optionally filter by group)
 * @query   { groupId?: string }
 */
router.get('/items/:clientId', getItemsController);

/**
 * @route   PUT /api/business/items/:clientId/:itemId
 * @desc    Update item
 */
router.put('/items/:clientId/:itemId', updateItemController);

/**
 * @route   DELETE /api/business/items/:clientId/:itemId
 * @desc    Delete (deactivate) item
 */
router.delete('/items/:clientId/:itemId', deleteItemController);

// ============================================================================
// CUSTOMER ROUTES
// ============================================================================

/**
 * @route   POST /api/business/customers
 * @desc    Get or create customer
 * @body    { clientId: string, phoneNumber: string }
 */
router.post('/customers', getOrCreateCustomerController);

/**
 * @route   GET /api/business/customers/:clientId
 * @desc    Get all customers for client
 */
router.get('/customers/:clientId', getCustomersController);

// ============================================================================
// CART ROUTES
// ============================================================================

/**
 * @route   POST /api/business/carts
 * @desc    Create new cart
 * @body    { clientId: string, customerPhone?: string }
 */
router.post('/carts', createCartController);

/**
 * @route   POST /api/business/carts/add-item
 * @desc    Add item to cart
 * @body    { cartId: string, itemId: string, itemName: string, unitPrice: number, quantity: number }
 */
router.post('/carts/add-item', addToCartController);

/**
 * @route   POST /api/business/carts/remove-item
 * @desc    Remove item from cart
 * @body    { cartId: string, cartItemId: string }
 */
router.post('/carts/remove-item', removeFromCartController);

/**
 * @route   GET /api/business/carts/:cartId
 * @desc    Get cart details with items
 */
router.get('/carts/:cartId', getCartController);

/**
 * @route   POST /api/business/carts/clear
 * @desc    Clear cart
 * @body    { cartId: string }
 */
router.post('/carts/clear', clearCartController);

// ============================================================================
// INVOICE & PAYMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/business/invoices/generate
 * @desc    Generate invoice (paid = total)
 * @body    { clientId: string, customerId?: string, cartId: string, totalAmount: number, paidAmount: number, notes?: string }
 */
router.post('/invoices/generate', generateInvoiceController);

/**
 * @route   POST /api/business/invoices/incomplete-sale
 * @desc    Create incomplete sale record (paid < total)
 * @body    { clientId: string, customerPhone: string, cartId: string, totalAmount: number, paidAmount: number, notes?: string }
 */
router.post('/invoices/incomplete-sale', createIncompleteSaleController);

/**
 * @route   GET /api/business/invoices/:clientId
 * @desc    Get all invoices for client
 */
router.get('/invoices/:clientId', getInvoicesController);

/**
 * @route   POST /api/business/invoices/pay
 * @desc    Record a payment against an invoice (supports multiple payments)
 * @body    { clientId: string, invoiceId: string, amount: number, method?: string, note?: string }
 */
router.post('/invoices/pay', recordPaymentController);

/**
 * @route   GET /api/business/invoices/:invoiceId/payments
 * @desc    Get payments for an invoice
 */
router.get('/invoices/:invoiceId/payments', getPaymentsController);

/**
 * @route   GET /api/business/purchase-history/:clientId
 * @desc    Get purchase history (optionally filter by customer)
 * @query   { customerId?: string }
 */
router.get('/purchase-history/:clientId', getPurchaseHistoryController);

export default router;
