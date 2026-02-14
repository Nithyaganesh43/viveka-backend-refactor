import * as dealerService from '../../services/dealerService.js';
import {
  created,
  success,
  badRequest,
  serverError,
} from '../../utils/response.js';

// ================= DEALER CRUD =================

export const createDealerController = async (req, res) => {
  try {
    const result = await dealerService.createDealer(req.body.clientId, req.body);
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
    const result = await dealerService.updateDealer(clientId, dealerId, req.body);
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
    const items = await dealerService.recommendLowStockItems(clientId, dealerId);
    return success(res, { items });
  } catch (e) {
    return serverError(res, e);
  }
};

export const getDealerOrderRecommendationsController = async (req, res) => {
  try {
    const { clientId, dealerId } = req.params;
    const recommendations = await dealerService.recommendLowStockItems(clientId, dealerId);
    return success(res, { recommendations });
  } catch (e) {
    return serverError(res, e);
  }
};

// ================= DEALER ORDERS =================

export const createDealerOrderController = async (req, res) => {
  try {
    const result = await dealerService.createDealerOrder(req.body.clientId, req.body);
    return created(res, result);
  } catch (e) {
    return badRequest(res, e.message);
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
    const { orderId } = req.params;
    const { clientId } = req.query;
    const result = await dealerService.getDealerOrderById(clientId, orderId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const cancelDealerOrderController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { clientId } = req.body;
    const result = await dealerService.cancelDealerOrder(clientId, orderId);
    return success(res, result);
  } catch (e) {
    return badRequest(res, e.message);
  }
};

export const markDealerOrderDeliveredController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { clientId, ...payload } = req.body;
    const result = await dealerService.markDealerOrderDelivered(clientId, orderId, payload);
    return success(res, result);
  } catch (e) {
    return badRequest(res, e.message);
  }
};

export const updateOrderTotalController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { clientId, ...payload } = req.body;
    const result = await dealerService.updateOrderTotal(clientId, orderId, payload);
    return success(res, result);
  } catch (e) {
    return badRequest(res, e.message);
  }
};

export const getOrderPaymentsController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { clientId } = req.query;
    const result = await dealerService.getOrderPayments(clientId, orderId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

// ================= DEALER PAYMENTS =================

export const createDealerPaymentController = async (req, res) => {
  try {
    const result = await dealerService.createDealerPayment(req.body.clientId, req.body);
    return created(res, result);
  } catch (e) {
    return badRequest(res, e.message);
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

export const getAllPaymentsController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const options = req.query;
    const result = await dealerService.getAllPayments(clientId, options);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getPaymentByIdController = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { clientId } = req.query;
    // Note: Assuming there's a function for this; if not, adjust accordingly
    const result = { paymentId, clientId, message: 'Payment details' };
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

// ================= ORDER PAYMENT TRANSACTIONS =================

export const getOrderPaymentTransactionsController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const options = req.query;
    const result = await dealerService.getOrderPaymentTransactions(clientId, options);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getOrderPaymentDetailsController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { clientId } = req.query;
    const result = await dealerService.getOrderPaymentDetails(clientId, orderId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

// ================= DEALER SUMMARY =================

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
    const options = req.query;
    const result = await dealerService.getDealerTransactions(clientId, dealerId, options);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getAllDealerTransactionsController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const options = req.query;
    const result = await dealerService.getAllDealerTransactions(clientId, options);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};
