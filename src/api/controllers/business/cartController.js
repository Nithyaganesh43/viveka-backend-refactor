import * as businessService from '../../../services/businessService.js';
import {
  created,
  success,
  badRequest,
  serverError,
} from '../../../utils/response.js';

// ================= CART =================

export const createCartController = async (req, res) => {
  try {
    const clientId = req.auth?.clientId;
    const { clientCustomerPhone } = req.body;
    const result = await businessService.createCart(
      clientId,
      clientCustomerPhone || null,
    );
    return created(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const addToCartController = async (req, res) => {
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
  } catch (e) {
    return badRequest(res, e.message);
  }
};

export const removeFromCartController = async (req, res) => {
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
  } catch (e) {
    return badRequest(res, e.message);
  }
};

export const getCartController = async (req, res) => {
  try {
    const clientId = req.auth?.clientId;
    if (!clientId) {
      return badRequest(res, 'Authentication required');
    }
    const { cartId } = req.params;
    const result = await businessService.getCart(clientId, cartId);
    return success(res, result);
  } catch (e) {
    return badRequest(res, e.message);
  }
};

export const clearCartController = async (req, res) => {
  try {
    const clientId = req.auth?.clientId;
    if (!clientId) {
      return badRequest(res, 'Authentication required');
    }
    const { cartId } = req.body;
    const result = await businessService.clearCart(clientId, cartId);
    return success(res, result);
  } catch (e) {
    return badRequest(res, e.message);
  }
};
