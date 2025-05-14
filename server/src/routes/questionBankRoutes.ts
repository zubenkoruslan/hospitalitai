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
  addCategoryToQuestionBank,
  removeCategoryFromQuestionBank,
} from "../controllers/questionBankController";
import { protect, restrictTo } from "../middleware/authMiddleware";

const router = express.Router();

// Protect all question bank routes - only authenticated users can access
router.use(protect);

// All question bank operations should be restricted to restaurant owners/admins
// Applying restrictTo("restaurant") here will cover all subsequent routes for question banks.
// Individual route restrictions can be added if some routes need different roles.
router.use(restrictTo("restaurant"));

// Route to create a question bank from a menu
router.post("/from-menu", createQuestionBankFromMenu);

// General CRUD for question banks
router.post("/", createQuestionBank);
router.get("/", getAllQuestionBanks);

router
  .route("/:bankId")
  .get(getQuestionBank)
  .patch(updateQuestionBank)
  .delete(deleteQuestionBank);

// Routes for managing categories within a question bank
router.post("/:bankId/categories", addCategoryToQuestionBank);
router.delete(
  "/:bankId/categories/:categoryName",
  removeCategoryFromQuestionBank
);

// Route to add/remove a question to/from a specific question bank
router.post("/:bankId/questions", addQuestionToBank);
router.delete("/:bankId/questions/:questionId", removeQuestionFromBank);

export default router;
