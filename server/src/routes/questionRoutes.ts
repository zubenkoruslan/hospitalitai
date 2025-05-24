import express from "express";
import {
  createQuestion,
  getQuestionById,
  getAllQuestions,
  updateQuestion,
  deleteQuestion,
  generateAiQuestionsController,
  getPendingReviewQuestionsHandler,
} from "../controllers/questionController";
import { protect, restrictTo } from "../middleware/authMiddleware";
import {
  handleValidationErrors,
  validateObjectId,
  validateCreateQuestionBody,
  validateUpdateQuestionBody,
  validateGenerateAiQuestionsBody,
} from "../middleware/validationMiddleware";

const router = express.Router();

router.use(protect); // Protect all routes first

// More granular restrictions per route type:

router.get(
  "/pending-review",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  getPendingReviewQuestionsHandler
);

router.post(
  "/generate",
  restrictTo("restaurantAdmin", "manager", "restaurant"),
  validateGenerateAiQuestionsBody,
  handleValidationErrors,
  generateAiQuestionsController
);

router
  .route("/")
  .post(
    restrictTo("restaurantAdmin", "manager", "restaurant"),
    validateCreateQuestionBody,
    handleValidationErrors,
    createQuestion
  )
  .get(
    restrictTo("restaurantAdmin", "manager", "restaurant", "staff"), // Staff can view all questions from their restaurant
    getAllQuestions
  );

router
  .route("/:questionId")
  .get(
    restrictTo("restaurantAdmin", "manager", "restaurant", "staff"), // Staff can view specific question details
    validateObjectId("questionId"),
    handleValidationErrors,
    getQuestionById
  )
  .patch(
    restrictTo("restaurantAdmin", "manager", "restaurant"),
    validateObjectId("questionId"),
    validateUpdateQuestionBody,
    handleValidationErrors,
    updateQuestion
  )
  .delete(
    restrictTo("restaurantAdmin", "manager", "restaurant"),
    validateObjectId("questionId"),
    handleValidationErrors,
    deleteQuestion
  );

export default router;
