import * as businessService from '../../../services/businessService.js';
import { success, unauthorized, serverError } from '../../../utils/response.js';

export const readyToSyncController = async (req, res) => {
  try {
    const clientId = req.auth?.clientId || req.body?.clientId || null;
    if (!clientId) return unauthorized(res);
    return success(res, { message: 'OK', clientId });
  } catch (e) {
    return serverError(res, e);
  }
};

export const syncController = async (req, res) => {
  try {
    const clientId = req.auth?.clientId || req.body?.clientId || null;
    const result = await businessService.syncClientData(clientId, req.body);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};
