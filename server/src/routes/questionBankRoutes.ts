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
  createQuestionBankFromSop,
  generateAiQuestionsForSopBank,
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
// router.use(restrictTo("restaurant")); // Original global restriction - commented out for more granular control below

// Route to create a question bank from a menu
router.post(
  "/from-menu",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  validateCreateQuestionBankFromMenuBody,
  handleValidationErrors,
  createQuestionBankFromMenu
);

// ADDED: Route to create a question bank from an SOP document
router.post(
  "/from-sop",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  createQuestionBankFromSop
);

// General CRUD for question banks
router.post(
  "/",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  validateCreateQuestionBankBody,
  handleValidationErrors,
  createQuestionBank
);
router.get(
  "/",
  restrictTo("restaurantAdmin", "manager", "staff", "restaurant"),
  getAllQuestionBanks
);

router
  .route("/:bankId")
  .get(
    restrictTo("restaurantAdmin", "manager", "staff", "restaurant"),
    validateObjectId("bankId"),
    handleValidationErrors,
    getQuestionBank
  )
  .patch(
    restrictTo("restaurantAdmin", "manager", "restaurant"),
    validateObjectId("bankId"),
    validateUpdateQuestionBankBody,
    handleValidationErrors,
    updateQuestionBank
  )
  .delete(
    restrictTo("restaurantAdmin", "manager", "restaurant"),
    validateObjectId("bankId"),
    handleValidationErrors,
    deleteQuestionBank
  );

// Routes for managing categories within a question bank
router.post(
  "/:bankId/categories",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  validateObjectId("bankId"),
  validateCategoryNameBody,
  handleValidationErrors,
  addCategoryToQuestionBank
);
router.delete(
  "/:bankId/categories/:categoryName",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  validateObjectId("bankId"),
  validateCategoryNameParam,
  handleValidationErrors,
  removeCategoryFromQuestionBank
);

// Route to add/remove a question to/from a specific question bank
router.post(
  "/:bankId/questions",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  validateObjectId("bankId"),
  validateAddQuestionToBankBody,
  handleValidationErrors,
  addQuestionToBank
);
router.delete(
  "/:bankId/questions/:questionId",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  validateObjectId("bankId"),
  validateObjectId("questionId"),
  handleValidationErrors,
  removeQuestionFromBank
);

// Route to process reviewed AI questions for a specific question bank
router.post(
  "/:bankId/process-reviewed-questions",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  validateObjectId("bankId"),
  handleValidationErrors,
  processReviewedAiQuestionsHandler
);

// ADDED: Route to trigger AI question generation for an SOP-sourced question bank
router.post(
  "/:bankId/generate-sop-questions",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  validateObjectId("bankId"),
  handleValidationErrors,
  generateAiQuestionsForSopBank
);

export default router;
