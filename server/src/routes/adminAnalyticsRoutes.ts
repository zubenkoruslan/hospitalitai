import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware";
import {
  getPlatformOverview,
  getGrowthMetrics,
  getEngagementStats,
  getRevenueMetrics,
  getCohortAnalysis,
  generateInvestorReport,
} from "../controllers/adminAnalyticsController";

const router = express.Router();

// All routes require admin authentication
router.use(protect);
router.use(adminOnly);

// Platform overview metrics
router.get("/platform-overview", getPlatformOverview);

// Growth and user metrics
router.get("/growth-metrics", getGrowthMetrics);

// Engagement and usage statistics
router.get("/engagement-stats", getEngagementStats);

// Revenue and business metrics
router.get("/revenue-metrics", getRevenueMetrics);

// Cohort analysis and retention
router.get("/cohort-analysis", getCohortAnalysis);

// Report generation
router.post("/generate-report", generateInvestorReport);

export default router;
