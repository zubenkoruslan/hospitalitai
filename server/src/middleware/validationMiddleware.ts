import { Request, Response, NextFunction } from "express";
import {
  body,
  validationResult,
  ValidationChain,
  param,
  // sanitizeParam, // Removed as it's not a standard export and was commented out
} from "express-validator";
import mongoose from "mongoose";

// Middleware to handle validation errors
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Send a 400 response with the validation errors
    // You might want to format the errors more specifically depending on frontend needs
    res
      .status(400)
      .json({ message: "Validation failed", errors: errors.array() });
    return; // Stop processing if errors exist
  }
  next(); // Proceed to the next middleware/handler if validation passes
};

// Validation rules for the /signup endpoint
export const validateSignupRequest: ValidationChain[] = [
  body("email", "Please provide a valid email address")
    .isEmail()
    .normalizeEmail(),

  body("password", "Password must be at least 6 characters long").isLength({
    min: 6,
  }),

  body("name", "Name is required").trim().notEmpty(),

  body("role", "Role must be either 'restaurant' or 'staff'").isIn([
    "restaurant",
    "staff",
  ]),

  // Conditional validation for restaurant role
  body("restaurantName").custom((value, { req }) => {
    if (
      req.body.role === "restaurant" &&
      (!value || String(value).trim() === "")
    ) {
      throw new Error("Restaurant name is required for restaurant role");
    }
    if (req.body.role === "staff" && value) {
      throw new Error("Restaurant name should not be provided for staff role");
    }
    return true;
  }),

  body("restaurantId").custom((value, { req }) => {
    if (req.body.role === "staff" && (!value || String(value).trim() === "")) {
      throw new Error("Restaurant ID is required for staff role");
    }
    if (req.body.role === "restaurant" && value) {
      throw new Error(
        "Restaurant ID should not be provided for restaurant role"
      );
    }
    // Optional: Add isMongoId check if value exists for staff
    // if (req.body.role === 'staff' && value && !mongoose.Types.ObjectId.isValid(value)) {
    //     throw new Error('Invalid Restaurant ID format');
    // }
    return true;
  }),

  body("professionalRole").custom((value, { req }) => {
    if (req.body.role === "staff" && (!value || String(value).trim() === "")) {
      throw new Error("Professional role is required for staff role");
    }
    if (req.body.role === "restaurant" && value) {
      throw new Error(
        "Professional role should not be provided for restaurant role"
      );
    }
    return true;
  }),
];

// Validation rules for the /login endpoint
export const validateLoginRequest: ValidationChain[] = [
  body("email", "Please provide a valid email address")
    .isEmail()
    .normalizeEmail(),

  body("password", "Password is required").notEmpty(),
];

// Validation rules for /api/menus
export const validateMenuIdParam: ValidationChain[] = [
  param("menuId", "Invalid Menu ID format").isMongoId(),
];

export const validateCreateMenu: ValidationChain[] = [
  body("name", "Menu name is required and must be a string")
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Menu name must be between 2 and 50 characters"),
  body("description", "Description must be a string")
    .optional()
    .isString()
    .trim(),
];

export const validateUpdateMenu: ValidationChain[] = [
  body("name", "Menu name must be a string")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Menu name must be between 2 and 50 characters"),
  body("description", "Description must be a string")
    .optional()
    .isString()
    .trim(),
  // Ensure at least one field is provided for update
  body().custom((value, { req }) => {
    if (req.body.name === undefined && req.body.description === undefined) {
      throw new Error("No update data provided. Provide name or description.");
    }
    return true;
  }),
];

// Generic validator for ObjectId in request params
export const validateObjectId = (paramName: string): ValidationChain[] => [
  param(paramName).custom((value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error(
        `Invalid ${paramName} format, must be a MongoDB ObjectId`
      );
    }
    return true;
  }),
];

// === Specific Quiz Validators ===
export const validateQuizIdParam: ValidationChain[] = [
  ...validateObjectId("quizId"),
];

export const validateAutoGenerateQuiz: ValidationChain[] = [
  body("title", "Quiz title is required").trim().notEmpty(),
  body("menuIds", "Please select at least one menu (must be an array of IDs)")
    .isArray({ min: 1 })
    .withMessage("At least one menu ID must be provided in the array."),
  body("menuIds.*", "Invalid menu ID format provided").isMongoId(), // Validate each element in the array
];

export const validateQuizBody: ValidationChain[] = [
  body("title", "Quiz title is required").trim().notEmpty(),
  body("menuItemIds", "menuItemIds must be an array of IDs")
    .isArray()
    .withMessage("menuItemIds must be an array."),
  // Allow empty array for menuItemIds initially, service layer can handle logic
  body(
    "menuItemIds.*",
    "Invalid menu item ID format in menuItemIds"
  ).isMongoId(),
  body("questions", "Questions must be an array")
    .isArray({ min: 1 })
    .withMessage("At least one question is required."),
  body("questions.*.text", "Question text is required").trim().notEmpty(),
  body("questions.*.choices", "Question choices must be an array of 4 strings")
    .isArray({ min: 4, max: 4 })
    .withMessage("Each question must have exactly 4 choices."),
  body("questions.*.choices.*", "Each choice must be a non-empty string")
    .isString()
    .trim()
    .notEmpty(),
  body(
    "questions.*.correctAnswer",
    "Correct answer index must be a number between 0 and 3"
  )
    .isInt({ min: 0, max: 3 })
    .toInt(), // Convert to integer
  body("questions.*.menuItemId", "Invalid menu item ID format in question")
    .optional() // Allow questions not linked to a specific item initially?
    .isMongoId(),
];

export const validateAssignQuiz: ValidationChain[] = [
  body("quizId", "Invalid Quiz ID format").isMongoId(),
  body("staffUserIds", "Staff user IDs must be an array of valid MongoIDs")
    .isArray({ min: 1 })
    .withMessage("At least one staff ID must be provided."),
  body("staffUserIds.*", "Invalid Staff ID format").isMongoId(),
];

// --- General Purpose Validators (Should be placed towards the end or grouped logically) ---

export const validateQuizStatusUpdate: ValidationChain[] = [
  body("isAvailable")
    .optional()
    .isBoolean()
    .withMessage("isAvailable must be a boolean"),
  // Add validation for other status fields if needed in the future
];

export const validateTargetQuestionCount: ValidationChain[] = [
  body(
    "targetQuestionCount",
    "Target question count must be a positive integer"
  )
    .optional()
    .isInt({ min: 1 })
    .toInt(),
];

// === Staff Validators ===
export const validateStaffIdParam: ValidationChain[] = [
  ...validateObjectId("id"), // Assuming staff ID comes from req.params.id
];

export const validateProfessionalRoleBody: ValidationChain[] = [
  body(
    "professionalRole",
    "Professional role is required and must be a non-empty string"
  )
    .isString()
    .trim()
    .notEmpty()
    .isLength({ min: 2, max: 50 })
    .withMessage("Professional role must be between 2 and 50 characters"),
];

// === Menu Validators ===
export const validateCategoryNameParam: ValidationChain[] = [
  param("categoryName", "Category name parameter must be a non-empty string")
    .isString()
    .trim()
    .notEmpty(),
];

// === Quiz Controller Validators ===
export const validateGenerateQuizFromBanksBody: ValidationChain[] = [
  body("title", "Title is required and must be a non-empty string")
    .isString()
    .trim()
    .notEmpty(),
  body("description", "Description must be a string")
    .optional()
    .isString()
    .trim(),
  body(
    "questionBankIds",
    "questionBankIds must be a non-empty array of valid MongoIDs"
  )
    .isArray({ min: 1 })
    .withMessage("At least one question bank ID must be provided."),
  body(
    "questionBankIds.*",
    "Each question bank ID must be a valid MongoID"
  ).isMongoId(),
  body(
    "numberOfQuestionsPerAttempt",
    "Number of questions per attempt must be a positive integer"
  )
    .isInt({ min: 1 })
    .toInt(),
];

export const validateSubmitQuizAttemptBody: ValidationChain[] = [
  body("questions", "Questions array is required and must not be empty")
    .isArray({ min: 1 })
    .withMessage("At least one question must be submitted."),
  body(
    "questions.*.questionId",
    "Each question must have a valid questionId (MongoID)"
  ).isMongoId(),
  body(
    "questions.*.answerGiven",
    "answerGiven is required for each question"
  ).exists(), // .exists() checks for presence, not for being non-empty if it's a string. Adjust if specific types are expected.
  body(
    "durationInSeconds",
    "Duration in seconds must be a non-negative integer"
  )
    .optional()
    .isInt({ min: 0 })
    .toInt(),
];

// === Question Controller Validators ===
export const validateCreateQuestionBody: ValidationChain[] = [
  body("questionText", "Question text is required")
    .isString()
    .trim()
    .notEmpty(),
  body(
    "questionType",
    "Question type is required and must be a valid type (e.g., multiple-choice)"
  )
    .isString()
    .trim()
    .notEmpty(), // Add .isIn(['multiple-choice', 'true-false']) etc. if types are fixed
  body(
    "options",
    "Options must be an array (e.g., for multiple-choice)"
  ).isArray(), // Further validation based on questionType might be needed in service
  // Example for multiple-choice options array elements:
  // body("options.*.text", "Option text is required").if(body("questionType").equals("multiple-choice")).isString().trim().notEmpty(),
  // body("options.*.isCorrect", "Option isCorrect flag must be a boolean").if(body("questionType").equals("multiple-choice")).isBoolean(),
  body("categories", "Categories must be a non-empty array of strings")
    .isArray({ min: 1 })
    .withMessage("At least one category is required."),
  body("categories.*", "Each category must be a non-empty string")
    .isString()
    .trim()
    .notEmpty(),
  body(
    "difficulty",
    "Difficulty must be a valid string (e.g., easy, medium, hard)"
  )
    .optional()
    .isString()
    .trim(), // Add .isIn(['easy', 'medium', 'hard']) if difficulties are fixed
];

export const validateUpdateQuestionBody: ValidationChain[] = [
  body().custom((value, { req }) => {
    if (Object.keys(req.body).length === 0) {
      throw new Error(
        "No update data provided. At least one field to update is required."
      );
    }
    return true;
  }),
  body("questionText", "Question text must be a non-empty string")
    .optional()
    .isString()
    .trim()
    .notEmpty(),
  body(
    "questionType",
    "Question type must be a valid type (e.g., multiple-choice)"
  )
    .optional()
    .isString()
    .trim()
    .notEmpty(), // Add .isIn(['multiple-choice', 'true-false']) etc. if types are fixed
  body("options", "Options must be an array (e.g., for multiple-choice)")
    .optional()
    .isArray(), // Further validation based on questionType might be needed in service
  body("categories", "Categories must be a non-empty array of strings")
    .optional()
    .isArray({ min: 1 })
    .withMessage(
      "If provided, categories must be a non-empty array with at least one category."
    ),
  body("categories.*", "Each category must be a non-empty string")
    .optional()
    .isString()
    .trim()
    .notEmpty(),
  body(
    "difficulty",
    "Difficulty must be a valid string (e.g., easy, medium, hard)"
  )
    .optional()
    .isString()
    .trim(), // Add .isIn(['easy', 'medium', 'hard']) if difficulties are fixed
];

// === QuestionBank Controller Validators ===
export const validateCreateQuestionBankBody: ValidationChain[] = [
  body("name", "Question bank name is required").isString().trim().notEmpty(),
  body("description", "Description must be a string")
    .optional()
    .isString()
    .trim(),
  body("categories", "Categories must be an array of strings")
    .optional()
    .isArray(),
  body("categories.*", "Each category must be a non-empty string")
    .optional()
    .isString()
    .trim()
    .notEmpty(),
  body(
    "targetQuestionCount",
    "Target question count must be a positive integer"
  )
    .optional()
    .isInt({ min: 1 })
    .toInt(),
];

export const validateUpdateQuestionBankBody: ValidationChain[] = [
  body().custom((value, { req }) => {
    if (Object.keys(req.body).length === 0) {
      throw new Error(
        "No update data provided. Provide name, description, or targetQuestionCount."
      );
    }
    // Check that at least one of the allowed fields is present
    if (
      req.body.name === undefined &&
      req.body.description === undefined &&
      req.body.targetQuestionCount === undefined
    ) {
      throw new Error(
        "No update data provided. Provide name, description, or targetQuestionCount."
      );
    }
    return true;
  }),
  body("name", "Question bank name must be a non-empty string")
    .optional()
    .isString()
    .trim()
    .notEmpty(),
  body("description", "Description must be a string")
    .optional()
    .isString()
    .trim(),
  body(
    "targetQuestionCount",
    "Target question count must be a positive integer"
  )
    .optional()
    .isInt({ min: 1 })
    .toInt(),
];

export const validateAddQuestionToBankBody: ValidationChain[] = [
  body(
    "questionId",
    "questionId is required and must be a valid MongoID"
  ).isMongoId(),
];

// === Item (MenuItem) Controller Validators ===
export const validateCreateItemBody: ValidationChain[] = [
  body("name", "Item name is required and must be a string")
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Item name must be between 2 and 100 characters"),
  body("menuId", "Menu ID is required and must be a valid MongoID").isMongoId(),
  body("itemType", "Item type is required").isString().trim().notEmpty(), // Could add .isIn(ITEM_TYPES) if ITEM_TYPES is accessible here
  body("category", "Category is required and must be a non-empty string")
    .isString()
    .trim()
    .notEmpty(),
  body("description", "Description must be a string")
    .optional()
    .isString()
    .trim(),
  body("price", "Price must be a non-negative number")
    .optional()
    .isFloat({ min: 0, max: 10000 }) // Adjust max as needed
    .withMessage("Price must be a number between 0 and 10000"),
  body("ingredients", "Ingredients must be an array of strings")
    .optional()
    .isArray(),
  body("ingredients.*", "Each ingredient must be a non-empty string")
    .optional()
    .isString()
    .trim()
    .notEmpty(),
  body("isGlutenFree", "isGlutenFree must be a boolean").optional().isBoolean(),
  body("isDairyFree", "isDairyFree must be a boolean").optional().isBoolean(),
  body("isVegetarian", "isVegetarian must be a boolean").optional().isBoolean(),
  body("isVegan", "isVegan must be a boolean").optional().isBoolean(),
];

export const validateUpdateItemBody: ValidationChain[] = [
  body().custom((value, { req }) => {
    if (Object.keys(req.body).length === 0) {
      throw new Error(
        "No update data provided. At least one field to update is required."
      );
    }
    return true;
  }),
  body("name", "Item name must be a string")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Item name must be between 2 and 100 characters"),
  body("menuId", "Menu ID must be a valid MongoID") // Usually not updated this way, but if allowed
    .optional()
    .isMongoId(),
  body("itemType", "Item type must be a string")
    .optional()
    .isString()
    .trim()
    .notEmpty(), // Add .isIn(ITEM_TYPES) if needed and accessible
  body("category", "Category must be a non-empty string")
    .optional()
    .isString()
    .trim()
    .notEmpty(),
  body("description", "Description must be a string")
    .optional()
    .isString()
    .trim(),
  body("price", "Price must be a non-negative number")
    .optional()
    .isFloat({ min: 0, max: 10000 })
    .withMessage("Price must be a number between 0 and 10000"),
  body("ingredients", "Ingredients must be an array of strings")
    .optional()
    .isArray(),
  body("ingredients.*", "Each ingredient must be a non-empty string")
    .optional()
    .isString()
    .trim()
    .notEmpty(),
  body("isGlutenFree", "isGlutenFree must be a boolean").optional().isBoolean(),
  body("isDairyFree", "isDairyFree must be a boolean").optional().isBoolean(),
  body("isVegetarian", "isVegetarian must be a boolean").optional().isBoolean(),
  body("isVegan", "isVegan must be a boolean").optional().isBoolean(),
];

// === Quiz Validators (Updates) ===
export const validateUpdateQuizBody: ValidationChain[] = [
  body().custom((value, { req }) => {
    if (
      req.body.title === undefined &&
      req.body.description === undefined &&
      req.body.sourceQuestionBankIds === undefined &&
      req.body.numberOfQuestionsPerAttempt === undefined &&
      req.body.isAvailable === undefined
    ) {
      throw new Error(
        "No update data provided. Provide title, description, sourceQuestionBankIds, numberOfQuestionsPerAttempt, or isAvailable."
      );
    }
    return true;
  }),
  body("title", "Title must be a non-empty string")
    .optional()
    .isString()
    .trim()
    .notEmpty(),
  body("description", "Description must be a string")
    .optional()
    .isString()
    .trim(),
  body(
    "sourceQuestionBankIds",
    "sourceQuestionBankIds must be an array of valid MongoIDs"
  )
    .optional()
    .isArray(), // Add .custom for each element if needed, or rely on service
  body(
    "sourceQuestionBankIds.*",
    "Each sourceQuestionBankId must be a valid MongoID"
  )
    .if(body("sourceQuestionBankIds").exists())
    .isMongoId(),
  body(
    "numberOfQuestionsPerAttempt",
    "Number of questions per attempt must be a positive integer"
  )
    .optional()
    .isInt({ min: 1 })
    .toInt(),
  body("isAvailable", "isAvailable must be a boolean").optional().isBoolean(),
];

// === Question Controller Validators (AI Generation) ===
export const validateGenerateAiQuestionsBody: ValidationChain[] = [
  body("menuId", "Menu ID is required for AI question generation").isMongoId(),
  body(
    "bankId",
    "Bank ID is required to save generated AI questions"
  ).isMongoId(),
  body("itemIds", "If provided, itemIds must be an array of valid MongoIDs")
    .optional()
    .isArray(),
  body("itemIds.*", "Each itemId must be a valid MongoID")
    .if(body("itemIds").exists())
    .isMongoId(),
  body(
    "categoriesToFocus",
    "If provided, categoriesToFocus must be an array of strings"
  )
    .optional()
    .isArray(),
  body("categoriesToFocus.*", "Each categoryToFocus must be a non-empty string")
    .if(body("categoriesToFocus").exists())
    .isString()
    .trim()
    .notEmpty(),
  body(
    "numQuestionsPerItem",
    "Number of questions per item must be a positive integer"
  )
    .optional()
    .isInt({ min: 1 })
    .toInt(),
];

// === QuestionBank Controller Validators ===
export const validateCreateQuestionBankFromMenuBody: ValidationChain[] = [
  body("name", "Question bank name is required").isString().trim().notEmpty(),
  body("menuId", "Menu ID is required for creating bank from menu").isMongoId(),
  body(
    "selectedCategoryNames",
    "At least one selected category name is required"
  )
    .isArray({ min: 1 })
    .withMessage("selectedCategoryNames must be a non-empty array."),
  body(
    "selectedCategoryNames.*",
    "Each selected category name must be a non-empty string"
  )
    .isString()
    .trim()
    .notEmpty(),
  body("description", "Description must be a string")
    .optional()
    .isString()
    .trim(),
  body("generateAiQuestions", "generateAiQuestions must be a boolean")
    .optional()
    .isBoolean(),
  body(
    "aiParams.targetQuestionCount",
    "AI target question count must be a positive integer"
  )
    .if(body("generateAiQuestions").equals("true")) // Only if generating AI questions
    .isInt({ min: 1 })
    .toInt(),
  // Add more validation for other aiParams if needed
];

export const validateCategoryNameBody: ValidationChain[] = [
  body(
    "categoryName",
    "Category name is required and must be a non-empty string"
  )
    .isString()
    .trim()
    .notEmpty(),
];

// You might have other validators here...
// Ensure the file ends correctly.
