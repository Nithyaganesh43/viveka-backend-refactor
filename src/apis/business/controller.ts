import { Request, Response } from 'express';
import * as businessService from './service.js';
import {
  created,
  success,
  badRequest,
  serverError,
} from '../../utils/response.js';

// Helper to validate ObjectId format
const isValidObjectId = (id: string): boolean => /^[a-fA-F0-9]{24}$/.test(id);

// ================= ITEM GROUP =================

export const createItemGroupController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { clientId, name, description } = req.body;
    const result = await businessService.createItemGroup(
      clientId,
      name,
      description,
    );
    return created(res, result);
  } catch (e: any) {
    return serverError(res, e);
  }
};

export const getItemGroupsController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { clientId } = req.params;
    const result = await businessService.getItemGroups(clientId);
    return success(res, result);
  } catch (e: any) {
    return serverError(res, e);
  }
};

export const updateItemGroupController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { clientId, groupId } = req.params;
    const result = await businessService.updateItemGroup(
      clientId,
      groupId,
      req.body,
    );
    return success(res, result);
  } catch (e: any) {
    return serverError(res, e);
  }
};

export const deleteItemGroupController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { clientId, groupId } = req.params;
    const result = await businessService.deleteItemGroup(clientId, groupId);
    return success(res, result);
  } catch (e: any) {
    return serverError(res, e);
  }
};

// ================= ITEMS =================

export const createItemController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const {
      clientId,
      name,
      price,
      stock,
      lowStockQuantity,
      unit,
      groupId,
      description,
    } = req.body;
    const result = await businessService.createItem(
      clientId,
      name,
      price,
      stock,
      lowStockQuantity,
      unit,
      groupId,
      description,
    );
    return created(res, result);
  } catch (e: any) {
    // Handle validation errors (like invalid dealer IDs) as bad requests
    if (
      e.message.includes('invalid') ||
      e.message.includes('not found') ||
      e.message.includes('do not belong')
    ) {
      return badRequest(res, e.message);
    }
    return serverError(res, e);
  }
};

export const getItemsController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { clientId } = req.params;
    const result = await businessService.getItems(clientId, req.query.groupId);
    return success(res, result);
  } catch (e: any) {
    return serverError(res, e);
  }
};

export const updateItemController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { clientId, itemId } = req.params;
    const result = await businessService.updateItem(clientId, itemId, req.body);
    return success(res, result);
  } catch (e: any) {
    // Handle validation errors (like invalid dealer IDs) as bad requests
    if (
      e.message.includes('invalid') ||
      e.message.includes('not found') ||
      e.message.includes('do not belong')
    ) {
      return badRequest(res, e.message);
    }
    return serverError(res, e);
  }
};

export const deleteItemController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { clientId, itemId } = req.params;
    const result = await businessService.deleteItem(clientId, itemId);
    return success(res, result);
  } catch (e: any) {
    return serverError(res, e);
  }
};

// ================= CART =================

export const createCartController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const clientId = req.auth?.clientId;
    const { clientCustomerPhone } = req.body;
    const result = await businessService.createCart(
      clientId,
      clientCustomerPhone || null,
    );
    return created(res, result);
  } catch (e: any) {
    return serverError(res, e);
  }
};

export const addToCartController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const clientId = req.auth?.clientId;
    if (!clientId) {
      return badRequest(res, 'Authentication required');
    }
    const { cartId, itemId, itemName, unitPrice, quantity } = req.body;
    const result = await businessService.addToCart(
      clientId,
      cartId,
      itemId,
      itemName,
      unitPrice,
      quantity,
    );
    return success(res, result);
  } catch (e: any) {
    return badRequest(res, e.message);
  }
};

export const removeFromCartController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const clientId = req.auth?.clientId;
    if (!clientId) {
      return badRequest(res, 'Authentication required');
    }
    const { cartId, cartItemId } = req.body;
    const result = await businessService.removeFromCart(
      clientId,
      cartId,
      cartItemId,
    );
    return success(res, result);
  } catch (e: any) {
    return badRequest(res, e.message);
  }
};

export const getCartController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const clientId = req.auth?.clientId;
    if (!clientId) {
      return badRequest(res, 'Authentication required');
    }
    const { cartId } = req.params;
    const result = await businessService.getCart(clientId, cartId);
    return success(res, result);
  } catch (e: any) {
    return badRequest(res, e.message);
  }
};

export const clearCartController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const clientId = req.auth?.clientId;
    if (!clientId) {
      return badRequest(res, 'Authentication required');
    }
    const { cartId } = req.body;
    const result = await businessService.clearCart(clientId, cartId);
    return success(res, result);
  } catch (e: any) {
    return badRequest(res, e.message);
  }
};

// ================= CLIENT CUSTOMER =================

export const createClientCustomerController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { clientId, name, phone, address, emailId, gstNo } = req.body;
    const result = await businessService.createclientCustomer(
      clientId,
      name,
      phone,
      address,
      emailId,
      gstNo,
    );
    return created(res, result);
  } catch (e: any) {
    // Handle duplicate or business logic errors
    if (e.message) {
      return badRequest(res, e.message);
    }
    return serverError(res, e);
  }
};

export const createclientCustomerController = async (req: Request, res: Response): Promise<Response> =>
  createClientCustomerController(req, res);

export const getClientCustomersController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const result = await businessService.getclientCustomers(
      req.params.clientId,
    );
    return success(res, result);
  } catch (e: any) {
    return serverError(res, e);
  }
};

export const getClientCustomerByPhoneController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { clientId, phone } = req.params;
    const result = await businessService.getClientCustomerByPhone(
      clientId,
      phone,
    );
    return success(res, result);
  } catch (e: any) {
    return serverError(res, e);
  }
};

export const updateClientCustomerController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { clientId, clientCustomerId } = req.params;
    const result = await businessService.updateClientCustomer(
      clientId,
      clientCustomerId,
      req.body,
    );
    return success(res, result);
  } catch (e: any) {
    return serverError(res, e);
  }
};

export const deleteClientCustomerController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { clientId, clientCustomerId } = req.params;
    const result = await businessService.deleteClientCustomer(
      clientId,
      clientCustomerId,
    );
    return success(res, result);
  } catch (e: any) {
    return serverError(res, e);
  }
};

// ================= INVOICE =================

export const generateInvoiceController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { clientId } = req.body;
    const result = await businessService.generateInvoice(clientId, req.body);
    return created(res, result);
  } catch (e: any) {
    return badRequest(res, e.message);
  }
};

export const generateInvoiceWithProductsController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { clientId } = req.body;
    const result = await businessService.generateInvoiceWithProduct(
      clientId,
      req.body,
    );
    return created(res, result);
  } catch (e: any) {
    return badRequest(res, e.message);
  }
};

export const getInvoicesController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { clientId } = req.params;
    const result = await businessService.getInvoices(clientId);
    return success(res, result);
  } catch (e: any) {
    return serverError(res, e);
  }
};

export const recordPaymentController = async (req: Request, res: Response): Promise<Response> => {
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
  } catch (e: any) {
    return badRequest(res, e.message);
  }
};

export const getPaymentsController = async (req: Request, res: Response): Promise<Response> => {
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
  } catch (e: any) {
    return serverError(res, e);
  }
};

export const getPurchaseHistoryController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { clientId } = req.params;
    const { clientCustomerId, clientCustomerPhone } = req.query;
    const result = await businessService.getPurchaseHistory(
      clientId,
      clientCustomerId || null,
      clientCustomerPhone || null,
    );
    return success(res, result);
  } catch (e: any) {
    return serverError(res, e);
  }
};

export const getPendingInvoicesController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { clientId } = req.params;
    const result = await businessService.getPendingInvoices(clientId);
    return success(res, result);
  } catch (e: any) {
    return serverError(res, e);
  }
};

export const getPaymentReportController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { clientId } = req.params;
    const result = await businessService.getPaymentReport(clientId);
    return success(res, result);
  } catch (e: any) {
    return serverError(res, e);
  }
};

export const getPendingInvoicesByClientCustomerController = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { clientId, clientCustomerId } = req.params;
    const { clientCustomerPhone } = req.query;
    const result = await businessService.getPendingInvoicesByClientCustomer(
      clientId,
      clientCustomerId,
      clientCustomerPhone || null,
    );
    return success(res, result);
  } catch (e: any) {
    return serverError(res, e);
  }
};

export const getPaidInvoicesByClientCustomerController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { clientId, clientCustomerId } = req.params;
    const { clientCustomerPhone } = req.query;
    const result = await businessService.getPaidInvoicesByClientCustomer(
      clientId,
      clientCustomerId,
      clientCustomerPhone || null,
    );
    return success(res, result);
  } catch (e: any) {
    return serverError(res, e);
  }
};

export const getInvoiceHistoryController = async (req: Request, res: Response): Promise<Response> => {
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
  } catch (e: any) {
    return serverError(res, e);
  }
};

export const getPaymentHistoryController = async (req: Request, res: Response): Promise<Response> => {
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
  } catch (e: any) {
    return serverError(res, e);
  }
};
