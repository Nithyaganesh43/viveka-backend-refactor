import * as dealerService from '../../../services/dealerService.js';
import {
  created,
  success,
  badRequest,
  serverError,
} from '../../../utils/response.js';

// Helper to safely parse pagination params with bounds
const parsePagination = (query) => {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 100);
  const skip = Math.max(parseInt(query.skip, 10) || 0, 0);
  return { limit, skip };
};

// Helper to validate ObjectId format
const isValidObjectId = (id) => /^[a-fA-F0-9]{24}$/.test(id);

// ================= DEALERS =================
export const createDealerController = async (req, res) => {
  try {
    const { clientId } = req.body;
    const result = await dealerService.createDealer(clientId, req.body);
    return created(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getDealersController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await dealerService.getDealers(clientId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const updateDealerController = async (req, res) => {
  try {
    const { clientId, dealerId } = req.params;
    const result = await dealerService.updateDealer(
      clientId,
      dealerId,
      req.body,
    );
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const deleteDealerController = async (req, res) => {
  try {
    const { clientId, dealerId } = req.params;
    const result = await dealerService.deleteDealer(clientId, dealerId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

// ================= DEALER ITEMS =================
export const getDealerItemsController = async (req, res) => {
  try {
    const { clientId, dealerId } = req.params;
    const result = await dealerService.getDealerItems(clientId, dealerId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getDealerLowStockItemsController = async (req, res) => {
  try {
    const { clientId, dealerId } = req.params;
    const result = await dealerService.getDealerItems(clientId, dealerId, {
      lowStockOnly: true,
    });
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getDealerOrderRecommendationsController = async (req, res) => {
  try {
    const { clientId, dealerId } = req.params;
    const result = await dealerService.recommendLowStockItems(
      clientId,
      dealerId,
    );
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

// ================= DEALER ORDERS =================
export const createDealerOrderController = async (req, res) => {
  try {
    const { clientId } = req.body;
    const result = await dealerService.createDealerOrder(clientId, req.body);
    return created(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getDealerOrdersController = async (req, res) => {
  try {
    const { clientId, dealerId } = req.params;
    const result = await dealerService.getDealerOrders(clientId, dealerId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getDealerOrderByIdController = async (req, res) => {
  try {
    const { clientId } = req.query;
    const { orderId } = req.params;
    if (!clientId || !isValidObjectId(clientId)) {
      return badRequest(res, 'Valid clientId query parameter is required');
    }
    const result = await dealerService.getDealerOrderById(clientId, orderId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const cancelDealerOrderController = async (req, res) => {
  try {
    const { clientId } = req.body;
    const { orderId } = req.params;
    const result = await dealerService.cancelDealerOrder(clientId, orderId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const markDealerOrderDeliveredController = async (req, res) => {
  try {
    const { clientId, deliveredBy, deliveryNote, totalAmount, dueDate } =
      req.body;
    const { orderId } = req.params;
    const result = await dealerService.markDealerOrderDelivered(
      clientId,
      orderId,
      {
        deliveredBy,
        deliveryNote,
        totalAmount,
        dueDate,
      },
    );
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

// ================= ORDER TOTAL UPDATE =================
export const updateOrderTotalController = async (req, res) => {
  try {
    const { clientId, totalAmount, dueDate } = req.body;
    const { orderId } = req.params;
    const result = await dealerService.updateOrderTotal(clientId, orderId, {
      totalAmount,
      dueDate,
    });
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getOrderPaymentsController = async (req, res) => {
  try {
    const { clientId } = req.query;
    const { orderId } = req.params;
    if (!clientId || !isValidObjectId(clientId)) {
      return badRequest(res, 'Valid clientId query parameter is required');
    }
    const result = await dealerService.getOrderPayments(clientId, orderId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

// ================= DEALER PAYMENTS =================
export const createDealerPaymentController = async (req, res) => {
  try {
    const { clientId } = req.body;
    const result = await dealerService.createDealerPayment(clientId, req.body);
    return created(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getDealerPaymentsController = async (req, res) => {
  try {
    const { clientId, dealerId } = req.params;
    const result = await dealerService.getDealerPayments(clientId, dealerId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getDealerSummaryController = async (req, res) => {
  try {
    const { clientId, dealerId } = req.params;
    const result = await dealerService.getDealerSummary(clientId, dealerId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

// ================= DEALER TRANSACTIONS =================
export const getDealerTransactionsController = async (req, res) => {
  try {
    const { clientId, dealerId } = req.params;
    const { limit, skip } = parsePagination(req.query);
    const result = await dealerService.getDealerTransactions(
      clientId,
      dealerId,
      { limit, skip },
    );
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getAllDealerTransactionsController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit, skip } = parsePagination(req.query);
    const result = await dealerService.getAllDealerTransactions(clientId, {
      limit,
      skip,
    });
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

// ================= ORDER PAYMENT TRANSACTIONS =================

/**
 * Get all orders with payment status
 * Query params: status (all|pending|partial|paid|no-bill), dealerId, limit, skip
 */
export const getOrderPaymentTransactionsController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { status, dealerId } = req.query;
    const { limit, skip } = parsePagination(req.query);
    const result = await dealerService.getOrderPaymentTransactions(clientId, {
      status: status || 'all',
      dealerId: dealerId || null,
      limit,
      skip,
    });
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

/**
 * Get payment details for a single order
 */
export const getOrderPaymentDetailsController = async (req, res) => {
  try {
    const { clientId } = req.query;
    const { orderId } = req.params;
    if (!clientId || !isValidObjectId(clientId)) {
      return badRequest(res, 'Valid clientId query parameter is required');
    }
    const result = await dealerService.getOrderPaymentDetails(
      clientId,
      orderId,
    );
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

/**
 * Get all payments with optional filters
 * Query params: dealerId, orderId, limit, skip
 */
export const getAllPaymentsController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { dealerId, orderId } = req.query;
    const { limit, skip } = parsePagination(req.query);
    const result = await dealerService.getAllPayments(clientId, {
      dealerId: dealerId || null,
      orderId: orderId || null,
      limit,
      skip,
    });
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

/**
 * Get a single payment by ID
 */
export const getPaymentByIdController = async (req, res) => {
  try {
    const { clientId } = req.query;
    const { paymentId } = req.params;
    if (!clientId || !isValidObjectId(clientId)) {
      return badRequest(res, 'Valid clientId query parameter is required');
    }
    const result = await dealerService.getPaymentById(clientId, paymentId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};
