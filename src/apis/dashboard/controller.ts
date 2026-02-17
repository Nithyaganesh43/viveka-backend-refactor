import { Request, Response, NextFunction } from 'express';
import * as dashboardService from './service.js';
import { success, serverError } from '../../utils/response.js';
import type { ValidatedSalesTrendsQuery, ValidatedTopItemsQuery, ValidatedDashboardQuery } from './validation.js';

export const getDashboardSummaryController = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const clientId = req.query?.clientId as string || req.auth?.clientId;
    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Client ID is required' });
    }
    const result = await dashboardService.getDashboardSummary(clientId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getSalesTrendsController = async (req: Request<{}, {}, {}, ValidatedSalesTrendsQuery>, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const clientId = req.query?.clientId as string || req.auth?.clientId;
    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Client ID is required' });
    }
    const { months } = req.query;
    const result = await dashboardService.getSalesTrends(clientId, months);
    return res.status(200).json(result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getTopItemsController = async (req: Request<{}, {}, {}, ValidatedTopItemsQuery>, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const clientId = req.query?.clientId as string || req.auth?.clientId;
    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Client ID is required' });
    }
    const { limit } = req.query;
    const result = await dashboardService.getTopItems(clientId, limit);
    return res.status(200).json(result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getDashboardController = async (req: Request<{}, {}, {}, ValidatedDashboardQuery>, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const clientId = req.query?.clientId as string || req.auth?.clientId;
    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Client ID is required' });
    }
    const { months, limit } = req.query;
    const result = await dashboardService.getDashboard(clientId, months, limit);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};
