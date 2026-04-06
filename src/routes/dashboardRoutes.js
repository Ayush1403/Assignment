import { Router } from "express";
import authenticate from "../middleware/authMiddleware.js";
import {
  getSummary,
  getCategoryBreakdown,
  getRecentTransactions,
  getMonthlyTrends,
} from "../controllers/dashboardController.js";

const router = Router();

// All roles can access dashboard — viewers are intentionally included here.
// Restriction to dashboard-only for viewers is enforced by blocking other route groups.
router.use(authenticate);

router.get("/summary", getSummary);
router.get("/category-breakdown", getCategoryBreakdown);
router.get("/recent", getRecentTransactions);
router.get("/monthly-trends", getMonthlyTrends);

export default router;
