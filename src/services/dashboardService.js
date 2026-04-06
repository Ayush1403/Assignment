import FinanceRecord from "../models/FinanceRecord.js";

/**
 * All aggregation pipelines live here rather than in the controller.
 * Separating this out makes the business logic independently testable
 * and keeps the controller thin.
 */

export const getSummary = async () => {
  const result = await FinanceRecord.aggregate([
    { $match: { deletedAt: null } },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const income = result.find((r) => r._id === "income") || { total: 0, count: 0 };
  const expense = result.find((r) => r._id === "expense") || { total: 0, count: 0 };

  return {
    totalIncome: income.total,
    totalExpenses: expense.total,
    netBalance: income.total - expense.total,
    recordCount: {
      income: income.count,
      expense: expense.count,
    },
  };
};

export const getCategoryBreakdown = async () => {
  return FinanceRecord.aggregate([
    { $match: { deletedAt: null } },
    {
      $group: {
        _id: { category: "$category", type: "$type" },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.category",
        breakdown: {
          $push: {
            type: "$_id.type",
            total: "$total",
            count: "$count",
          },
        },
        categoryTotal: { $sum: "$total" },
      },
    },
    { $sort: { categoryTotal: -1 } },
    {
      $project: {
        _id: 0,
        category: "$_id",
        breakdown: 1,
        categoryTotal: 1,
      },
    },
  ]);
};

export const getRecentTransactions = async (limit = 5) => {
  return FinanceRecord.find()
    .populate("createdBy", "name")
    .sort({ date: -1 })
    .limit(limit)
    .select("amount type category date notes createdBy");
};

export const getMonthlyTrends = async () => {
  return FinanceRecord.aggregate([
    { $match: { deletedAt: null } },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
          type: "$type",
        },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: { year: "$_id.year", month: "$_id.month" },
        totals: {
          $push: {
            type: "$_id.type",
            total: "$total",
            count: "$count",
          },
        },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        month: "$_id.month",
        // Human-readable label like "2024-06"
        label: {
          $concat: [
            { $toString: "$_id.year" },
            "-",
            {
              $cond: [
                { $lt: ["$_id.month", 10] },
                { $concat: ["0", { $toString: "$_id.month" }] },
                { $toString: "$_id.month" },
              ],
            },
          ],
        },
        totals: 1,
      },
    },
  ]);
};
