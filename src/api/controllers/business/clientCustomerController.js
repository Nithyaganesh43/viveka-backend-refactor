import * as businessService from '../../../services/businessService.js';
import {
  created,
  success,
  badRequest,
  serverError,
} from '../../../utils/response.js';

// ================= CLIENT CUSTOMER =================

export const createClientCustomerController = async (req, res) => {
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
  } catch (e) {
    // Handle duplicate or business logic errors
    if (e.message) {
      return badRequest(res, e.message);
    }
    return serverError(res, e);
  }
};

export const createclientCustomerController = async (req, res) =>
  createClientCustomerController(req, res);

export const getClientCustomersController = async (req, res) => {
  try {
    const result = await businessService.getclientCustomers(
      req.params.clientId,
    );
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getClientCustomerByPhoneController = async (req, res) => {
  try {
    const { clientId, phone } = req.params;
    const result = await businessService.getClientCustomerByPhone(
      clientId,
      phone,
    );
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const updateClientCustomerController = async (req, res) => {
  try {
    const { clientId, clientCustomerId } = req.params;
    const result = await businessService.updateClientCustomer(
      clientId,
      clientCustomerId,
      req.body,
    );
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const deleteClientCustomerController = async (req, res) => {
  try {
    const { clientId, clientCustomerId } = req.params;
    const result = await businessService.deleteClientCustomer(
      clientId,
      clientCustomerId,
    );
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};
