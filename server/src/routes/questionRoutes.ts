import express from "express";
import {
  createQuestion,
  getQuestionById,
  getAllQuestions,
  updateQuestion,
  deleteQuestion,
  generateAiQuestionsController,
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

// All routes below are protected and restricted to "restaurant" role.
router.use(protect);
router.use(restrictTo("restaurant"));

router.post(
  "/generate",
  validateGenerateAiQuestionsBody,
  handleValidationErrors,
  generateAiQuestionsController
);

router
  .route("/")
  .post(validateCreateQuestionBody, handleValidationErrors, createQuestion)
  .get(getAllQuestions); // GET all typically doesn't need body/param validation beyond auth

router
  .route("/:questionId")
  .get(validateObjectId("questionId"), handleValidationErrors, getQuestionById)
  .patch(
    validateObjectId("questionId"),
    validateUpdateQuestionBody,
    handleValidationErrors,
    updateQuestion
  )
  .delete(
    validateObjectId("questionId"),
    handleValidationErrors,
    deleteQuestion
  );

export default router;
