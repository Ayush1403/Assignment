import { Router } from "express";
import authenticate from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";
import {
  getRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
} from "../controllers/financeController.js";

const router = Router();

router.use(authenticate);

// Analysts and admins can read records; viewers cannot
router.get("/", authorize("analyst", "admin"), getRecords);
router.get("/:id", authorize("analyst", "admin"), getRecord);

// Only admins can mutate records
router.post("/", authorize("admin"), createRecord);
router.put("/:id", authorize("admin"), updateRecord);
router.delete("/:id", authorize("admin"), deleteRecord);

export default router;
