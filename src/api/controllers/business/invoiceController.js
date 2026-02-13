import * as businessService from '../../../services/businessService.js';
import {
  created,
  success,
  badRequest,
  serverError,
} from '../../../utils/response.js';

// Helper to validate ObjectId format
const isValidObjectId = (id) => /^[a-fA-F0-9]{24}$/.test(id);

// ================= INVOICE =================

export const generateInvoiceController = async (req, res) => {
  try {
    const { clientId } = req.body;
    const result = await businessService.generateInvoice(clientId, req.body);
    return created(res, result);
  } catch (e) {
    return badRequest(res, e.message);
  }
};

export const generateInvoiceWithProductsController = async (req, res) => {
  try {
    const { clientId } = req.body;
    const result = await businessService.generateInvoiceWithProduct(
      clientId,
      req.body,
    );
    return created(res, result);
  } catch (e) {
    return badRequest(res, e.message);
  }
};

export const getInvoicesController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await businessService.getInvoices(clientId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const recordPaymentController = async (req, res) => {
  try {
    const { clientId, invoiceId, amount, method, note } = req.body;
    const result = await businessService.recordPayment(
      clientId,
      invoiceId,
      amount,
      method,
      note,
    );
    return success(res, result);
  } catch (e) {
    return badRequest(res, e.message);
  }
};

export const getPaymentsController = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { clientId } = req.query;
    if (!clientId || !isValidObjectId(clientId)) {
      return badRequest(res, 'Valid clientId query parameter is required');
    }
    const result = await businessService.getPaymentsForInvoice(
      clientId,
      invoiceId,
    );
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getPurchaseHistoryController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { clientCustomerId, clientCustomerPhone } = req.query;
    const result = await businessService.getPurchaseHistory(
      clientId,
      clientCustomerId || null,
      clientCustomerPhone || null,
    );
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getPendingInvoicesController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await businessService.getPendingInvoices(clientId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getPaymentReportController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await businessService.getPaymentReport(clientId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getPendingInvoicesByClientCustomerController = async (
  req,
  res,
) => {
  try {
    const { clientId, clientCustomerId } = req.params;
    const { clientCustomerPhone } = req.query;
    const result = await businessService.getPendingInvoicesByClientCustomer(
      clientId,
      clientCustomerId,
      clientCustomerPhone || null,
    );
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getPaidInvoicesByClientCustomerController = async (req, res) => {
  try {
    const { clientId, clientCustomerId } = req.params;
    const { clientCustomerPhone } = req.query;
    const result = await businessService.getPaidInvoicesByClientCustomer(
      clientId,
      clientCustomerId,
      clientCustomerPhone || null,
    );
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getInvoiceHistoryController = async (req, res) => {
  try {
    const { clientId, clientCustomerId } = req.params;
    if (!clientId) return badRequest(res, 'clientId required');

    const { startDate, endDate, status, limit, offset } = req.query;

    // If clientCustomerId is provided, get invoice history for specific customer
    // Otherwise, get all invoices for the client
    if (clientCustomerId) {
      return res.json(
        await businessService.getInvoiceHistory(clientId, clientCustomerId, {
          startDate,
          endDate,
          status,
          limit: limit ? parseInt(limit) : 100,
          offset: offset ? parseInt(offset) : 0,
        }),
      );
    } else {
      return res.json(
        await businessService.getAllInvoiceHistory(clientId, {
          startDate,
          endDate,
          status,
          limit: limit ? parseInt(limit) : 100,
          offset: offset ? parseInt(offset) : 0,
        }),
      );
    }
  } catch (e) {
    return serverError(res, e);
  }
};

export const getPaymentHistoryController = async (req, res) => {
  try {
    const { clientId, invoiceId } = req.params;
    if (!clientId) return badRequest(res, 'clientId required');

    // If invoiceId is provided, get payment history for specific invoice
    // Otherwise, get all payments for the client
    if (invoiceId) {
      return res.json(
        await businessService.getPaymentHistory(clientId, invoiceId),
      );
    } else {
      return res.json(await businessService.getAllPaymentHistory(clientId));
    }
  } catch (e) {
    return serverError(res, e);
  }
};
