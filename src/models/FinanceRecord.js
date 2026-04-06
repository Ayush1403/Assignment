import mongoose from "mongoose";

const TYPES = ["income", "expense"];

// Keeping categories open-ended with a short list of sensible defaults.
// In a real product this would likely be user-configurable.
const CATEGORIES = [
  "salary",
  "freelance",
  "investment",
  "food",
  "rent",
  "utilities",
  "transport",
  "healthcare",
  "entertainment",
  "education",
  "other",
];

const financeRecordSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be positive"],
    },
    type: {
      type: String,
      enum: TYPES,
      required: [true, "Type is required (income or expense)"],
    },
    category: {
      type: String,
      enum: CATEGORIES,
      required: [true, "Category is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Soft delete: records are flagged rather than physically removed.
    // This preserves audit history and allows undo.
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Ensure all queries automatically exclude soft-deleted records
// unless the caller explicitly opts out with .setOptions({ includeDeleted: true })
financeRecordSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  next();
});

// Compound index to accelerate the most common dashboard query pattern
financeRecordSchema.index({ type: 1, date: -1 });
financeRecordSchema.index({ category: 1, date: -1 });

const FinanceRecord = mongoose.model("FinanceRecord", financeRecordSchema);
export { TYPES, CATEGORIES };
export default FinanceRecord;
