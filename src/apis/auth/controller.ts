// controller.ts

import { Request, Response } from "express";
import {
  registerClient,
  loginClient,
  logoutClient,
} from "./service";
import {
  created,
  success,
  badRequest,
  unauthorized,
  serverError,
} from "../../utils/response";

export const registerController = async (req: Request, res: Response) => {
  try {
    const result = await registerClient(req.body);
    return created(res, result);
  } catch (error: any) {
    return badRequest(res, error.message);
  }
};

export const loginController = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, otp, deviceId } = req.body;
    const result = await loginClient(phoneNumber, otp, deviceId);
    return success(res, result);
  } catch (error: any) {
    return unauthorized(res, error.message);
  }
};

export const logoutController = async (req: Request, res: Response) => {
  try {
    const clientId = req.auth?.clientId as string;
    const deviceSessionId = req.auth?.deviceSessionId as string;

    if (!deviceSessionId) {
      return badRequest(res, "Device session ID is required");
    }

    const result = await logoutClient(clientId, deviceSessionId);
    return success(res, { ...result, deviceSessionId });
  } catch (error) {
    return serverError(res, error);
  }
};
