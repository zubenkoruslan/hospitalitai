import express, { Request, Response, Router, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import { protect, restrictTo } from "../middleware/authMiddleware";
import Quiz, { IQuiz, IQuestion } from "../models/Quiz";
import MenuItem, { IMenuItem } from "../models/MenuItem";
import QuizResult, { IQuizResult } from "../models/QuizResult";
import Menu from "../models/Menu"; // Import Menu model if needed for fetching items by menu
import User from "../models/User"; // Assuming User model exists and stores restaurantId for staff
import notificationService from "../services/notificationService";

const router: Router = express.Router();

// --- Helper Functions ---

// Shuffle array in place (Fisher-Yates algorithm)
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

// Generate incorrect choices (distractor strings) for ingredient/allergen list questions
async function generateDistractors(
  correctItems: string[],
  restaurantId: Types.ObjectId,
  fieldType: "ingredients", // Explicitly only support ingredients now
  excludeItemId: Types.ObjectId
): Promise<string[]> {
  const correctItemsString = correctItems.sort().join(", ");

  const sampleSize = 7;
  const otherItems = await MenuItem.find(
    {
      restaurantId: restaurantId,
      _id: { $ne: excludeItemId },
    },
    { [fieldType]: 1, name: 1 } // Select only ingredients
  ).limit(sampleSize);

  let potentialDistractorStrings: string[] = [];
  otherItems.forEach((item) => {
    // Only process ingredients
    const list = item.ingredients as string[] | undefined;
    if (list && list.length > 0) {
      const listString = list.sort().join(", ");
      if (listString !== correctItemsString) {
        potentialDistractorStrings.push(list.join(", ") || "None");
      }
    }
  });

  potentialDistractorStrings = Array.from(new Set(potentialDistractorStrings));
  shuffleArray(potentialDistractorStrings);
  const distractors = potentialDistractorStrings.slice(0, 3);

  // Padding logic remains mostly the same
  if (distractors.length < 3) {
    const placeholders = [
      "None of the other listed options",
      "Salt and Pepper only",
      "All of the above (Incorrect)",
      `Only items from ${otherItems[0]?.name || "another dish"}`,
    ];
    let placeholderIndex = 0;
    while (distractors.length < 3 && placeholderIndex < placeholders.length) {
      const currentPlaceholder = placeholders[placeholderIndex++];
      if (
        currentPlaceholder !== correctItems.join(", ") &&
        !distractors.includes(currentPlaceholder)
      ) {
        distractors.push(currentPlaceholder);
      }
    }
    while (distractors.length < 3) {
      distractors.push(`Placeholder ${distractors.length + 1}`);
    }
  }

  return distractors.slice(0, 3);
}

// === Middleware ===
router.use(protect); // All quiz routes require login

// === Routes ===

/**
 * @route   GET /api/quiz
 * @desc    Get all quizzes for the restaurant owner (for management)
 * @access  Private (Restaurant Role)
 */
router.get(
  "/",
  restrictTo("restaurant"),
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      if (!req.user) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }
      res.status(400).json({ message: "Restaurant ID not found for user" });
      return;
    }

    try {
      // Fetch quizzes and populate menuItem names for display
      const quizzes = await Quiz.find({ restaurantId }).populate(
        "menuItemIds",
        "name"
      ); // Populate names only
      res.status(200).json({ quizzes });
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      next(error);
    }
  }
);

/**
 * @route   POST /api/quiz/auto
 * @desc    Generate quiz questions based on selected menus
 * @access  Private (Restaurant Role)
 */
router.post(
  "/auto",
  restrictTo("restaurant"),
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { menuIds, title } = req.body; // Expect menuIds now
    const restaurantId = req.user?.restaurantId;

    // --- Validation ---
    if (!restaurantId) {
      if (!req.user) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }
      res.status(400).json({ message: "Restaurant ID not found for user" });
      return;
    }
    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({ message: "Quiz title is required" });
    }
    if (!menuIds || !Array.isArray(menuIds) || menuIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Please select at least one menu" }); // Updated message
    }
    if (!menuIds.every((id) => mongoose.Types.ObjectId.isValid(id))) {
      return res
        .status(400)
        .json({ message: "Invalid menu ID format provided" }); // Updated message
    }

    try {
      // --- Fetch All Menu Items from Selected Menus ---
      const objectIdMenuIds = menuIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
      const items = await MenuItem.find({
        menuId: { $in: objectIdMenuIds }, // Find items in any of the selected menus
        restaurantId: restaurantId,
      });

      if (items.length === 0) {
        return res.status(404).json({
          message:
            "No menu items found in the selected menus for this restaurant.",
        });
      }

      // --- Generate Questions ---
      const questions: IQuestion[] = [];

      for (const item of items) {
        const currentIngredients = item.ingredients || [];

        // Define potential question types
        const potentialTypes: string[] = [];
        if (currentIngredients.length > 0) potentialTypes.push("ingredients");
        potentialTypes.push("dietary_boolean");
        if (potentialTypes.length === 0)
          potentialTypes.push("generic_fallback");

        const randomType =
          potentialTypes[Math.floor(Math.random() * potentialTypes.length)];

        let questionText = "";
        let choices: string[] = [];
        let correctAnswerIndex = -1;
        let questionGenerated = false;

        if (randomType === "ingredients" && currentIngredients.length > 0) {
          questionText = `What are the main ingredients in ${item.name}?`;
          const correctChoice = currentIngredients.join(", ");
          const distractors = await generateDistractors(
            currentIngredients,
            restaurantId,
            "ingredients",
            item._id as Types.ObjectId
          );
          choices = shuffleArray([correctChoice, ...distractors]);
          correctAnswerIndex = choices.indexOf(correctChoice);
          if (correctAnswerIndex !== -1 && choices.length === 4)
            questionGenerated = true;
        } else if (randomType === "dietary_boolean") {
          const dietaryCategories = {
            "Gluten Free": "isGlutenFree",
            "Dairy Free": "isDairyFree",
            Vegetarian: "isVegetarian",
            Vegan: "isVegan",
          } as const;
          type CategoryKey = keyof typeof dietaryCategories;

          const availableCategories = Object.keys(
            dietaryCategories
          ) as CategoryKey[];
          const chosenCategory =
            availableCategories[
              Math.floor(Math.random() * availableCategories.length)
            ];
          const modelField = dietaryCategories[chosenCategory];

          const isDietaryPropertyTrue = Boolean((item as any)[modelField]);

          questionText = `Is ${item.name} ${chosenCategory}?`;
          choices = ["True", "False"];
          correctAnswerIndex = isDietaryPropertyTrue ? 0 : 1;
          questionGenerated = true;
        }

        // --- Fallback Question Logic ---
        if (!questionGenerated || randomType === "generic_fallback") {
          questionText = `Is the description for ${item.name} accurate?`;
          choices = ["True", "False", "N/A", "Partially"];
          correctAnswerIndex = 0;
        }

        // --- Padding and Pushing Question ---
        const finalChoices = choices.slice();
        if (randomType === "dietary_boolean" && choices.length === 2) {
          const dummyOptions = [
            "Contains some related ingredients",
            "Information not available",
            "Ask kitchen staff",
            "True only on Tuesdays",
          ];
          shuffleArray(dummyOptions);
          finalChoices.push(dummyOptions[0], dummyOptions[1]);
        }
        while (finalChoices.length < 4 && finalChoices.length > 0) {
          finalChoices.push("Option not available");
        }
        if (finalChoices.length === 0) {
          finalChoices.push("Yes", "No", "Maybe", "Always");
          correctAnswerIndex = 0;
        }

        if (
          correctAnswerIndex < 0 ||
          correctAnswerIndex >= finalChoices.length
        ) {
          console.warn(
            `Correct answer index ${correctAnswerIndex} out of bounds for choices: ${finalChoices}. Resetting to 0.`
          );
          correctAnswerIndex = 0;
        }

        questions.push({
          text: questionText,
          choices: finalChoices.slice(0, 4),
          correctAnswer: correctAnswerIndex,
          menuItemId: item._id as Types.ObjectId,
        });
      } // End of loop through items

      if (questions.length === 0) {
        return res.status(400).json({
          message:
            "Could not generate questions for the selected menus. Ensure items exist and have ingredients/allergens.",
        });
      }

      // --- Return Generated Quiz Data (Unsaved) ---
      const generatedQuizData = {
        title: title.trim(),
        menuItemIds: items.map((item) => item._id),
        questions: questions,
        restaurantId: restaurantId,
      };

      res.status(200).json({ quiz: generatedQuizData });
    } catch (error) {
      console.error("Error generating quiz:", error);
      next(error);
    }
  }
);

/**
 * @route   POST /api/quiz
 * @desc    Save a generated quiz
 * @access  Private (Restaurant Role)
 */
router.post(
  "/",
  restrictTo("restaurant"),
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { title, menuItemIds, questions } = req.body;
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      if (!req.user) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }
      res.status(400).json({ message: "Restaurant ID not found for user" });
      return;
    }
    if (
      !title ||
      !menuItemIds ||
      !questions ||
      !Array.isArray(menuItemIds) ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return res.status(400).json({ message: "Invalid quiz data provided" });
    }

    try {
      const newQuiz = new Quiz({
        title,
        menuItemIds,
        questions,
        restaurantId,
      });

      const savedQuiz = await newQuiz.save();

      // Notify all staff about the new quiz
      if (savedQuiz && savedQuiz._id) {
        await notificationService.notifyStaffAboutNewQuiz(
          restaurantId.toString(),
          savedQuiz._id.toString(),
          title
        );
      }

      res.status(201).json({ quiz: savedQuiz });
    } catch (error: any) {
      if (error.name === "ValidationError") {
        return res
          .status(400)
          .json({ message: "Validation failed", errors: error.errors });
      } else {
        console.error("Error saving quiz:", error);
        next(error);
      }
    }
  }
);

/**
 * @route   DELETE /api/quiz/:quizId
 * @desc    Delete a specific quiz and all associated quiz results
 * @access  Private (Restaurant Role)
 */
router.delete(
  "/:quizId",
  restrictTo("restaurant"),
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { quizId } = req.params;
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      if (!req.user) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }
      res.status(400).json({ message: "Restaurant ID not found for user" });
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ message: "Invalid Quiz ID format" });
    }

    try {
      // First, delete all associated quiz results
      const deletedResults = await QuizResult.deleteMany({
        quizId: new mongoose.Types.ObjectId(quizId),
        restaurantId: restaurantId,
      });

      console.log(
        `Deleted ${deletedResults.deletedCount} quiz results associated with quiz ${quizId}`
      );

      // Then delete the quiz itself
      const result = await Quiz.deleteOne({
        _id: new mongoose.Types.ObjectId(quizId),
        restaurantId: restaurantId,
      });

      if (result.deletedCount === 0) {
        return res
          .status(404)
          .json({ message: "Quiz not found or access denied" });
      }

      res.status(200).json({
        message: "Quiz deleted successfully",
        deletedResultsCount: deletedResults.deletedCount,
      });
    } catch (error) {
      console.error("Error deleting quiz:", error);
      next(error);
    }
  }
);

// --- Staff Routes ---

/**
 * @route   GET /api/quiz/available
 * @desc    Get quizzes available for the logged-in staff member's restaurant
 * @access  Private (Staff Role)
 */
router.get(
  "/available",
  restrictTo("staff"),
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      if (!req.user) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }
      res.status(400).json({
        message: "Restaurant association not found for staff member.",
      });
      return;
    }

    try {
      // Find quizzes for the restaurant, selecting only necessary fields for listing
      const availableQuizzes = await Quiz.find(
        { restaurantId },
        "_id title description createdAt questions" // Select ID, title, description, createdAt, and questions
      ).sort({ createdAt: -1 }); // Sort by newest first

      // Optionally add number of questions if needed
      const quizzesWithCounts = availableQuizzes.map((q) => ({
        _id: q._id,
        title: q.title,
        description: q.description, // Description now exists
        createdAt: q.createdAt, // createdAt exists due to timestamps
        numQuestions: q.questions.length, // Calculate question count from projected questions
      }));

      res.status(200).json({ quizzes: quizzesWithCounts });
    } catch (error) {
      console.error("Error fetching available quizzes for staff:", error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/quiz/:quizId/take
 * @desc    Get details of a specific quiz for a staff member to take (EXCLUDES ANSWERS)
 * @access  Private (Staff Role)
 */
router.get(
  "/:quizId/take",
  restrictTo("staff"),
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const { quizId } = req.params;
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      if (!req.user) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }
      res.status(400).json({
        message: "Restaurant association not found for staff member.",
      });
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      res.status(400).json({ message: "Invalid Quiz ID format" });
      return;
    }

    try {
      // Find the quiz, ensuring it belongs to the staff's restaurant
      // CRITICAL: Exclude the correctAnswer field from the questions array
      const quiz = await Quiz.findOne(
        {
          _id: new mongoose.Types.ObjectId(quizId),
          restaurantId: restaurantId,
        },
        { "questions.correctAnswer": 0 } // Projection to EXCLUDE correctAnswer
      );

      if (!quiz) {
        res.status(404).json({
          message: "Quiz not found or not accessible for this restaurant.",
        });
        return;
      }

      // Return the quiz data (without correct answers)
      res.status(200).json({ quiz });
    } catch (error) {
      console.error("Error fetching quiz for taking:", error);
      next(error);
    }
  }
);

// --- Shared Routes (Submit) ---

/**
 * @route   POST /api/quiz/:quizId/submit
 * @desc    Submit quiz answers and get results
 * @access  Private (Staff Role primarily - saves result, Restaurant can maybe use for checking?)
 */
router.post(
  "/:quizId/submit",
  restrictTo("staff"), // Changed to staff only
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    // Changed return type
    const { quizId } = req.params;
    const { answers } = req.body;
    const userId = req.user?.userId; // No type assertion needed
    const userName = req.user?.name;
    const userRole = req.user?.role;
    const restaurantId = req.user?.restaurantId; // No type assertion needed

    if (!userId || !userRole || !restaurantId) {
      if (!req.user) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }
      res.status(400).json({ message: "User information missing" });
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ message: "Invalid Quiz ID format" });
    }
    if (
      !answers ||
      !Array.isArray(answers) ||
      answers.some((ans) => typeof ans !== "number" || ans < 0 || ans > 3)
    ) {
      return res.status(400).json({
        message: "Invalid answers format. Must be an array of numbers (0-3).",
      });
    }

    try {
      const quiz = await Quiz.findOne({
        _id: new Types.ObjectId(quizId),
        restaurantId: restaurantId,
      });

      if (!quiz) {
        return res
          .status(404)
          .json({ message: "Quiz not found or not accessible" });
      }

      if (answers.length !== quiz.questions.length) {
        return res.status(400).json({
          message: `Number of answers (${answers.length}) does not match number of questions (${quiz.questions.length})`,
        });
      }

      let score = 0;
      const correctAnswers: (number | undefined)[] = [];
      quiz.questions.forEach((question, index) => {
        correctAnswers.push(question.correctAnswer);
        if (answers[index] === question.correctAnswer) {
          score++;
        }
      });

      let savedResult = null;
      if (userRole === "staff") {
        savedResult = await QuizResult.findOneAndUpdate(
          { quizId: quiz._id, userId: userId, restaurantId: restaurantId },
          {
            $set: {
              // Use $set for fields that should be overwritten
              answers: answers,
              score: score,
              totalQuestions: quiz.questions.length,
              status: "completed", // Mark as completed on submission
              completedAt: new Date(),
              // Consider adding/updating startedAt if tracking attempts
            },
            $inc: { retakeCount: 1 }, // Increment retake count on every submission
          },
          { new: true, upsert: true, runValidators: true }
        );

        // Send notification to restaurant managers about completed quiz
        try {
          // Find restaurant managers
          const managers = await User.find({
            restaurantId: restaurantId,
            role: "restaurant",
          });

          // Create notifications for each manager
          for (const manager of managers) {
            await notificationService.createCompletedTrainingNotification(
              manager._id as mongoose.Types.ObjectId,
              userId as mongoose.Types.ObjectId,
              userName || "A staff member",
              quiz._id as mongoose.Types.ObjectId,
              quiz.title,
              savedResult._id as mongoose.Types.ObjectId
            );
          }
        } catch (notificationError) {
          console.error(
            "Failed to create completion notification:",
            notificationError
          );
          // Don't reject the submission if notification fails
        }
      }

      res.status(200).json({
        message: "Quiz submitted successfully",
        score: score,
        totalQuestions: quiz.questions.length,
        correctAnswers: correctAnswers,
      });
    } catch (error) {
      console.error("Error submitting quiz:", error);
      next(error);
    }
  }
);

/**
 * @route   GET /api/quiz/staff-view
 * @desc    Get combined list of quizzes and results for logged-in staff
 * @access  Private (Staff Role)
 */
router.get(
  "/staff-view",
  restrictTo("staff"),
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const userId = req.user?.userId;
    const restaurantId = req.user?.restaurantId;

    if (!userId || !restaurantId) {
      return res.status(400).json({ message: "User or Restaurant ID missing" });
    }

    try {
      // 1. Fetch all quizzes for the restaurant
      const availableQuizzes = await Quiz.find(
        { restaurantId },
        "_id title description questions" // Include questions to get count
      ).lean(); // Use lean for performance, we only need plain objects

      // 2. Fetch all results for the user
      const userResults = await QuizResult.find(
        { userId: userId },
        "quizId score totalQuestions completedAt retakeCount status"
      ).lean(); // Use lean

      // 3. Create a map of results for easy lookup
      const resultsMap = new Map<string, Partial<IQuizResult>>();
      userResults.forEach((result) => {
        // Store the most recent result if multiple exist (optional, based on sort)
        // For now, assume find retrieves all, and we only care if *any* result exists.
        // If specific logic like 'latest' is needed, sort results by completedAt desc.
        if (result.quizId) {
          // Ensure quizId exists
          resultsMap.set(result.quizId.toString(), result);
        }
      });

      // 4. Merge the data
      const combinedView = availableQuizzes.map((quiz) => {
        const result = resultsMap.get(quiz._id.toString());
        return {
          _id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          numQuestions: quiz.questions?.length || 0,
          // Add result fields if found, otherwise null/undefined
          score: result?.score,
          totalQuestions: result?.totalQuestions,
          completedAt: result?.completedAt,
          retakeCount: result?.retakeCount,
          status: result?.status,
        };
      });

      res.status(200).json({ quizzes: combinedView });
    } catch (error) {
      console.error("Error fetching staff quiz view:", error);
      next(error);
    }
  }
);

/**
 * @route   POST /api/quiz/assign
 * @desc    Assign quiz to staff member(s)
 * @access  Private (Restaurant Role)
 */
router.post(
  "/assign",
  restrictTo("restaurant"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { quizId, staffIds } = req.body;
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      res.status(400).json({ message: "Restaurant ID not found for user" });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      res.status(400).json({ message: "Invalid Quiz ID format" });
      return;
    }

    if (!staffIds || !Array.isArray(staffIds) || staffIds.length === 0) {
      res.status(400).json({ message: "Staff IDs array is required" });
      return;
    }

    // Validate all staff IDs are valid ObjectIds
    if (staffIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      res.status(400).json({ message: "One or more invalid Staff IDs" });
      return;
    }

    try {
      // 1. Verify the quiz belongs to this restaurant
      const quiz = await Quiz.findOne({
        _id: new mongoose.Types.ObjectId(quizId),
        restaurantId: restaurantId,
      });

      if (!quiz) {
        res.status(404).json({
          message: "Quiz not found or not accessible for this restaurant",
        });
        return;
      }

      // 2. Verify all staff members belong to this restaurant
      const validStaffMembers = await User.find({
        _id: { $in: staffIds },
        restaurantId: restaurantId,
        role: "staff",
      }).select("_id name");

      if (validStaffMembers.length !== staffIds.length) {
        res.status(400).json({
          message:
            "One or more staff members do not exist or do not belong to this restaurant",
          validStaffCount: validStaffMembers.length,
          requestedStaffCount: staffIds.length,
        });
        return;
      }

      // 3. Create pending quiz results for each staff member
      const quizResults = [];
      const notificationPromises = [];

      for (const staff of validStaffMembers) {
        // Create or update quiz result to 'pending' status
        const result = await QuizResult.findOneAndUpdate(
          {
            quizId: quiz._id,
            userId: staff._id,
            restaurantId: restaurantId,
            status: { $ne: "completed" }, // Don't update if already completed
          },
          {
            $setOnInsert: {
              status: "pending",
              startedAt: null,
              answers: [],
              score: 0,
              totalQuestions: quiz.questions.length,
              restaurantId: restaurantId,
              retakeCount: 0,
            },
          },
          { upsert: true, new: true }
        );

        quizResults.push(result);

        // Create notification for the staff member
        try {
          const notification =
            await notificationService.createAssignmentNotification(
              staff._id as mongoose.Types.ObjectId,
              quiz._id as mongoose.Types.ObjectId,
              quiz.title
            );
          notificationPromises.push(notification);
        } catch (notificationError) {
          console.error(
            "Failed to create notification for staff",
            staff._id,
            ":",
            notificationError
          );
          // Continue with assignment even if notification fails
        }
      }

      // Wait for all notifications to be created
      await Promise.all(notificationPromises);

      res.status(200).json({
        message: `Quiz "${quiz.title}" successfully assigned to ${validStaffMembers.length} staff members`,
        quizResults: quizResults.map((result) => ({
          _id: result._id,
          userId: result.userId,
          status: result.status,
        })),
      });
    } catch (error) {
      console.error("Error assigning quiz to staff:", error);
      next(error);
    }
  }
);

export default router;
