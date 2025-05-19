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
  processReviewedAiQuestionsHandler,
} from "../controllers/questionBankController";
import { protect, restrictTo } from "../middleware/authMiddleware";
import {
  handleValidationErrors,
  validateObjectId,
  validateCreateQuestionBankBody,
  validateUpdateQuestionBankBody,
  validateAddQuestionToBankBody,
  validateCreateQuestionBankFromMenuBody,
  validateCategoryNameBody,
  validateCategoryNameParam,
} from "../middleware/validationMiddleware";

const router = express.Router();

// Protect all question bank routes - only authenticated users can access
router.use(protect);

// All question bank operations should be restricted to restaurant owners/admins
// Applying restrictTo("restaurant") here will cover all subsequent routes for question banks.
// Individual route restrictions can be added if some routes need different roles.
router.use(restrictTo("restaurant"));

// Route to create a question bank from a menu
router.post(
  "/from-menu",
  validateCreateQuestionBankFromMenuBody,
  handleValidationErrors,
  createQuestionBankFromMenu
);

// General CRUD for question banks
router.post(
  "/",
  validateCreateQuestionBankBody,
  handleValidationErrors,
  createQuestionBank
);
router.get("/", getAllQuestionBanks);

router
  .route("/:bankId")
  .get(validateObjectId("bankId"), handleValidationErrors, getQuestionBank)
  .patch(
    validateObjectId("bankId"),
    validateUpdateQuestionBankBody,
    handleValidationErrors,
    updateQuestionBank
  )
  .delete(
    validateObjectId("bankId"),
    handleValidationErrors,
    deleteQuestionBank
  );

// Routes for managing categories within a question bank
router.post(
  "/:bankId/categories",
  validateObjectId("bankId"),
  validateCategoryNameBody,
  handleValidationErrors,
  addCategoryToQuestionBank
);
router.delete(
  "/:bankId/categories/:categoryName",
  validateObjectId("bankId"),
  validateCategoryNameParam,
  handleValidationErrors,
  removeCategoryFromQuestionBank
);

// Route to add/remove a question to/from a specific question bank
router.post(
  "/:bankId/questions",
  validateObjectId("bankId"),
  validateAddQuestionToBankBody,
  handleValidationErrors,
  addQuestionToBank
);
router.delete(
  "/:bankId/questions/:questionId",
  validateObjectId("bankId"),
  validateObjectId("questionId"),
  handleValidationErrors,
  removeQuestionFromBank
);

// Route to process reviewed AI questions for a specific question bank
router.post(
  "/:bankId/process-reviewed-questions",
  validateObjectId("bankId"),
  handleValidationErrors,
  processReviewedAiQuestionsHandler
);

export default router;
