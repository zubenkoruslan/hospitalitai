import express from "express";
import {
  downloadExcelTemplate,
  downloadCSVTemplate,
  downloadWordTemplate,
  downloadJSONTemplate,
  getTemplateInfo,
} from "../controllers/templateController";
import { protect, restrictTo } from "../middleware/authMiddleware";

const router = express.Router();

/**
 * Template Download Routes
 * All routes require authentication as restaurant users
 */

// GET template information
router.get("/info", protect, restrictTo("restaurant"), getTemplateInfo);

// Download Excel template
router.get("/excel", protect, restrictTo("restaurant"), downloadExcelTemplate);

// Download CSV template
router.get("/csv", protect, restrictTo("restaurant"), downloadCSVTemplate);

// Download Word template
router.get("/word", protect, restrictTo("restaurant"), downloadWordTemplate);

// Download JSON template
router.get("/json", protect, restrictTo("restaurant"), downloadJSONTemplate);

export default router;
