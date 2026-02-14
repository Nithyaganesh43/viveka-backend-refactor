import { syncClientData } from '../../services/businessService.js';
import { success, serverError } from '../../utils/response.js';

export const readyToSyncController = async (req, res) => {
  try {
    const clientId = req.body?.clientId || req.auth?.clientId;
    // Just return success indicating the client is ready to sync
    return success(res, { ready: true, clientId });
  } catch (e) {
    return serverError(res, e);
  }
};

export const syncController = async (req, res) => {
  try {
    const clientId = req.body?.clientId || req.auth?.clientId;
    const payload = req.body;
    const result = await syncClientData(clientId, payload);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};
