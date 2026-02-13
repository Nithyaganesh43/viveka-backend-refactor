import * as businessService from '../../../services/businessService.js';
import {
  created,
  success,
  badRequest,
  serverError,
} from '../../../utils/response.js';

// ================= ITEM GROUP =================

export const createItemGroupController = async (req, res) => {
  try {
    const { clientId, name, description } = req.body;
    const result = await businessService.createItemGroup(
      clientId,
      name,
      description,
    );
    return created(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getItemGroupsController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await businessService.getItemGroups(clientId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const updateItemGroupController = async (req, res) => {
  try {
    const { clientId, groupId } = req.params;
    const result = await businessService.updateItemGroup(
      clientId,
      groupId,
      req.body,
    );
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const deleteItemGroupController = async (req, res) => {
  try {
    const { clientId, groupId } = req.params;
    const result = await businessService.deleteItemGroup(clientId, groupId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

// ================= ITEMS =================

export const createItemController = async (req, res) => {
  try {
    const {
      clientId,
      name,
      price,
      dealerIds,
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
      dealerIds,
      stock,
      lowStockQuantity,
      unit,
      groupId,
      description,
    );
    return created(res, result);
  } catch (e) {
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

export const getItemsController = async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await businessService.getItems(clientId, req.query.groupId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const updateItemController = async (req, res) => {
  try {
    const { clientId, itemId } = req.params;
    const result = await businessService.updateItem(clientId, itemId, req.body);
    return success(res, result);
  } catch (e) {
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

export const deleteItemController = async (req, res) => {
  try {
    const { clientId, itemId } = req.params;
    const result = await businessService.deleteItem(clientId, itemId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};
