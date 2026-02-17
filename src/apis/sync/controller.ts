import { Request, Response } from "express";
import { syncClientData } from "./service";
import { success, serverError } from "../../utils/response";

interface AuthRequest extends Request {
  auth?: {
    clientId?: string;
  };
}

export const readyToSyncController = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const clientId = req.body?.clientId || req.auth?.clientId;

    return success(res, { ready: true, clientId });
  } catch (e) {
    return serverError(res, e);
  }
};

export const syncController = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const clientId = req.body?.clientId || req.auth?.clientId;
    const payload = req.body;

    const result = await syncClientData(clientId, payload);

    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};
