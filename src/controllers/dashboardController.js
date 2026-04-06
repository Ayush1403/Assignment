import * as dashboardService from "../services/dashboardService.js";

/**
 * Dashboard controllers are intentionally thin — all the
 * aggregation logic lives in dashboardService.js.
 */

// GET /dashboard/summary
export const getSummary = async (req, res, next) => {
  try {
    const data = await dashboardService.getSummary();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /dashboard/category-breakdown
export const getCategoryBreakdown = async (req, res, next) => {
  try {
    const data = await dashboardService.getCategoryBreakdown();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /dashboard/recent
export const getRecentTransactions = async (req, res, next) => {
  try {
    const limit = Math.min(20, parseInt(req.query.limit) || 5);
    const data = await dashboardService.getRecentTransactions(limit);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /dashboard/monthly-trends
export const getMonthlyTrends = async (req, res, next) => {
  try {
    const data = await dashboardService.getMonthlyTrends();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
