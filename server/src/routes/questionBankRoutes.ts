import express from "express";
import {
  createQuestionBank,
  getAllQuestionBanks,
  getQuestionBank,
  updateQuestionBank,
  deleteQuestionBank,
  addQuestionToBank,
  removeQuestionFromBank,
  createQuestionBankFromMenu,
} from "../controllers/questionBankController";
import { protect, restrictTo } from "../middleware/authMiddleware";

const router = express.Router();

// Protect all question bank routes - only authenticated users can access
router.use(protect);

// Route to create a question bank from a menu
router.post("/from-menu", restrictTo("restaurant"), createQuestionBankFromMenu);

// General CRUD for question banks
router.post("/", restrictTo("restaurant"), createQuestionBank);
router.get("/", getAllQuestionBanks);

router
  .route("/:bankId")
  .get(getQuestionBank)
  .patch(updateQuestionBank)
  .delete(deleteQuestionBank);

// Route to add a question to a specific question bank
router.route("/:bankId/questions").post(addQuestionToBank);

router.route("/:bankId/questions/:questionId").delete(removeQuestionFromBank);

export default router;
