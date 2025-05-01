import { Request, Response, NextFunction } from "express";
import {
  body,
  validationResult,
  ValidationChain,
  param,
} from "express-validator";

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

// Validation rules for /api/quiz
export const validateQuizIdParam: ValidationChain[] = [
  param("quizId", "Invalid Quiz ID format").isMongoId(),
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

export const validateSubmitAnswers: ValidationChain[] = [
  param("quizId", "Invalid Quiz ID format").isMongoId(),
  body("answers", "Answers must be an array of numbers between 0 and 3")
    .isArray({ min: 1 }) // Must have at least one answer
    .withMessage("Answers array cannot be empty."),
  body("answers.*", "Each answer must be an integer between 0 and 3")
    .isInt({ min: 0, max: 3 })
    .toInt(),
];

export const validateAssignQuiz: ValidationChain[] = [
  body("quizId", "Invalid Quiz ID format").isMongoId(),
  body("staffIds", "Staff IDs must be an array with at least one ID")
    .isArray({ min: 1 })
    .withMessage("At least one staff ID must be provided."),
  body("staffIds.*", "Invalid Staff ID format provided").isMongoId(),
];
