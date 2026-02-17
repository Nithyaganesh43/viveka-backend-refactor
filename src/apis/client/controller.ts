import { Request, Response, NextFunction } from 'express';
import {
  getClientDetails,
  updateClientProfile,
} from './service.js';
import { success, badRequest, notFound } from '../../utils/response.js';
import type {
  ClientIdParams,
  UpdateClientRequest,
} from './dto.js';

export const getClientController = async (
  req: Request<ClientIdParams>,
  res: Response
) => {
  try {
    const { clientId } = req.params;
    const result = await getClientDetails(clientId);
    return success(res, result);
  } catch (error) {
    return notFound(res, error.message);
  }
};

export const updateClientController = async (
  req: Request<ClientIdParams, {}, UpdateClientRequest>,
  res: Response
) => {
  try {
    const { clientId } = req.params;
    const updateData = req.body || {};

    if (!Object.keys(updateData).length) {
      return badRequest(res, 'No updates provided');
    }

    const result = await updateClientProfile(clientId, updateData);
    return success(res, result);
  } catch (error) {
    return badRequest(res, error.message);
  }
};
