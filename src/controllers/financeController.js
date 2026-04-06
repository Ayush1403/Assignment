import { z } from "zod";
import FinanceRecord, { TYPES, CATEGORIES } from "../models/FinanceRecord.js";
import ApiError from "../utils/apiError.js";

const recordSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(TYPES),
  category: z.enum(CATEGORIES),
  date: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// Build a MongoDB filter object from validated query params
const buildFilter = (query) => {
  const filter = {};

  if (query.type) filter.type = query.type;
  if (query.category) filter.category = query.category;

  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) filter.date.$gte = new Date(query.startDate);
    if (query.endDate) filter.date.$lte = new Date(query.endDate);
  }

  // Basic text search across notes and category
  if (query.search) {
    filter.$or = [
      { notes: { $regex: query.search, $options: "i" } },
      { category: { $regex: query.search, $options: "i" } },
    ];
  }

  return filter;
};

/**
 * GET /records
 * Supports filtering by type, category, date range, search, and pagination.
 * Analysts and admins can see all records. Viewers are blocked at the route level.
 */
export const getRecords = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter = buildFilter(req.query);

    const [records, total] = await Promise.all([
      FinanceRecord.find(filter)
        .populate("createdBy", "name email")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      FinanceRecord.countDocuments(filter),
    ]);

    res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: records,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /records/:id
 */
export const getRecord = async (req, res, next) => {
  try {
    const record = await FinanceRecord.findById(req.params.id).populate("createdBy", "name email");
    if (!record) throw new ApiError(404, "Record not found");
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /records
 * Admin only. Tags the record with the creating user's ID.
 */
export const createRecord = async (req, res, next) => {
  try {
    const data = recordSchema.safeParse(req.body);
    if (!data.success) throw new ApiError(400, data.error.errors.map((e) => e.message).join("; "));

    const record = await FinanceRecord.create({
      ...data.data,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /records/:id
 * Admin only. Partial updates supported — only provided fields are changed.
 */
export const updateRecord = async (req, res, next) => {
  try {
    const data = recordSchema.partial().safeParse(req.body);
    if (!data.success) throw new ApiError(400, data.error.errors.map((e) => e.message).join("; "));

    const record = await FinanceRecord.findByIdAndUpdate(req.params.id, data.data, {
      new: true,
      runValidators: true,
    });

    if (!record) throw new ApiError(404, "Record not found");
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /records/:id
 * Admin only. Soft delete — sets deletedAt timestamp rather than destroying the document.
 * The model's pre-find hook automatically excludes these from future queries.
 */
export const deleteRecord = async (req, res, next) => {
  try {
    const record = await FinanceRecord.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date() },
      { new: true }
    );

    if (!record) throw new ApiError(404, "Record not found");
    res.json({ success: true, message: "Record deleted", data: { id: record._id } });
  } catch (err) {
    next(err);
  }
};
