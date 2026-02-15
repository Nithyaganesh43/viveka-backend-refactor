import * as dashboardService from './service.js';
import { success, serverError } from '../../utils/response.js';

export const getDashboardSummaryController = async (req, res) => {
  try {
    const clientId = req.query?.clientId || req.auth?.clientId;
    const result = await dashboardService.getDashboardSummary(clientId);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getSalesTrendsController = async (req, res) => {
  try {
    const clientId = req.query?.clientId || req.auth?.clientId;
    const { months } = req.query;
    const result = await dashboardService.getSalesTrends(clientId, months);
    return res.status(200).json(result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getTopItemsController = async (req, res) => {
  try {
    const clientId = req.query?.clientId || req.auth?.clientId;
    const { limit } = req.query;
    const result = await dashboardService.getTopItems(clientId, limit);
    return res.status(200).json(result);
  } catch (e) {
    return serverError(res, e);
  }
};

export const getDashboardController = async (req, res) => {
  try {
    const clientId = req.query?.clientId || req.auth?.clientId;
    const { months, limit } = req.query;
    const result = await dashboardService.getDashboard(clientId, months, limit);
    return success(res, result);
  } catch (e) {
    return serverError(res, e);
  }
};
