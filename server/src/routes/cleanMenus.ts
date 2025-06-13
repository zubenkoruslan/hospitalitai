import express from "express";
import {
  cleanMenuController,
  uploadMiddleware,
} from "../controllers/cleanMenuController";

const router = express.Router();

/**
 * Test endpoint
 */
router.get("/test", cleanMenuController.testEndpoint);

/**
 * Upload and parse menu
 * POST /api/upload/upload
 */
router.post("/upload", uploadMiddleware, cleanMenuController.uploadMenu);

/**
 * Import clean menu results
 * POST /api/upload/import
 */
router.post("/import", cleanMenuController.importCleanMenu);

export default router;
