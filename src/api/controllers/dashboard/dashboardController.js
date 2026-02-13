import * as dashboardService from '../../../services/dashboardService.js';
import { success, unauthorized, serverError } from '../../../utils/response.js';

export const getDashboardSummaryController = async (req, res) => {
  try {
    const clientId = req.auth?.clientId;
    if (!clientId) {
      return unauthorized(res);
    }

    const summary = await dashboardService.getDashboardSummary(clientId);
    return success(res, summary);
  } catch (error) {
    return serverError(res, error.message);
  }
};

export const getSalesTrendsController = async (req, res) => {
  try {
    const clientId = req.auth?.clientId;
    if (!clientId) {
      return unauthorized(res);
    }

    const { months } = req.query;
    const trends = await dashboardService.getSalesTrends(clientId, months);
    return res.status(200).json(trends);
  } catch (error) {
    return serverError(res, error.message);
  }
};

export const getTopItemsController = async (req, res) => {
  try {
    const clientId = req.auth?.clientId;
    if (!clientId) {
      return unauthorized(res);
    }

    const { limit } = req.query;
    const items = await dashboardService.getTopItems(clientId, limit);
    return res.status(200).json(items);
  } catch (error) {
    return serverError(res, error.message);
  }
};

export const getDashboardController = async (req, res) => {
  try {
    const clientId = req.auth?.clientId;
    if (!clientId) {
      return unauthorized(res);
    }

    const { months, limit } = req.query;
    const dashboard = await dashboardService.getDashboard(
      clientId,
      months,
      limit,
    );
    return success(res, dashboard);
  } catch (error) {
    return serverError(res, error.message);
  }
};
