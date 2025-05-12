import express from "express";
import {
  createQuestion,
  getQuestionById,
  getAllQuestions,
  updateQuestion,
  deleteQuestion, // Added new controller function
  generateAiQuestionsController,
} from "../controllers/questionController";
import { protect, restrictTo } from "../middleware/authMiddleware";

const router = express.Router();

// All routes below are protected.
// Restaurant owners/admins should be able to manage questions for their restaurant.
router.use(protect);
// router.use(restrictTo('restaurant', 'admin')); // Add role restriction if needed, e.g. only restaurant owners can manage their questions

router.post("/generate", generateAiQuestionsController); // New route for AI question generation

router.route("/").post(createQuestion).get(getAllQuestions); // Added GET handler

router
  .route("/:questionId")
  .get(getQuestionById)
  .patch(updateQuestion)
  .delete(deleteQuestion); // Added DELETE handler

export default router;
