import { Request, Response, NextFunction } from "express";
import {
  body,
  validationResult,
  ValidationChain,
  param,
  // sanitizeParam, // Removed as it's not a standard export and was commented out
} from "express-validator";
import mongoose from "mongoose";
import {
  MAX_ITEM_NAME_LENGTH,
  MAX_ITEM_DESCRIPTION_LENGTH,
  MAX_INGREDIENTS,
  MAX_INGREDIENT_LENGTH,
} from "../utils/constants";

// Middleware to handle validation errors
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Enhanced logging for debugging validation errors
    console.error("[Validation Error] Request URL:", req.originalUrl);
    console.error("[Validation Error] Request Method:", req.method);
    console.error(
      "[Validation Error] Request Body:",
      JSON.stringify(req.body, null, 2)
    );
    console.error(
      "[Validation Error] Validation Errors:",
      JSON.stringify(errors.array(), null, 2)
    );

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

  // body("professionalRole").custom((value, { req }) => {
  //   if (req.body.role === "staff" && (!value || String(value).trim() === "")) {
  //     throw new Error("Professional role is required for staff role");
  //   }
  //   if (req.body.role === "restaurant" && value) {
  //     throw new Error(
  //       "Professional role should not be provided for restaurant role"
  //     );
  //   }
  //   return true;
  // }),
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

// Validation for creating a quiz from question banks or SOP
export const validateCreateQuizFromBanksBody: ValidationChain[] = [
  body("title", "Quiz title is required").trim().notEmpty(),
  body("description", "Description must be a string")
    .optional()
    .isString()
    .trim(),
  body("questionBankIds", "questionBankIds must be an array of MongoIDs")
    .optional()
    .isArray()
    .custom((value) => {
      if (
        value &&
        !value.every((id: string) => mongoose.Types.ObjectId.isValid(id))
      ) {
        throw new Error("Each item in questionBankIds must be a valid MongoID");
      }
      return true;
    }),
  body("sourceSopDocumentId", "sourceSopDocumentId must be a valid MongoID")
    .optional()
    .isMongoId(),
  body(
    "numberOfQuestionsPerAttempt",
    "Number of questions per attempt is required and must be at least 1"
  )
    .isInt({ min: 1 })
    .toInt(),
  body("targetRoles", "targetRoles must be an array of MongoIDs")
    .optional()
    .isArray()
    .custom((value) => {
      if (
        value &&
        !value.every((id: string) => mongoose.Types.ObjectId.isValid(id))
      ) {
        throw new Error("Each item in targetRoles must be a valid MongoID");
      }
      return true;
    }),
  body("retakeCooldownHours", "Retake cooldown must be a non-negative number")
    .optional()
    .isNumeric({ no_symbols: true })
    .toInt()
    .custom((value) => {
      if (value < 0) {
        throw new Error("Retake cooldown cannot be negative.");
      }
      return true;
    }),
  // Ensure either questionBankIds or sourceSopDocumentId is provided
  body().custom((value, { req }) => {
    if (!req.body.questionBankIds && !req.body.sourceSopDocumentId) {
      throw new Error(
        "Either questionBankIds or sourceSopDocumentId must be provided."
      );
    }
    if (req.body.questionBankIds && req.body.sourceSopDocumentId) {
      throw new Error(
        "Provide either questionBankIds or sourceSopDocumentId, not both."
      );
    }
    return true;
  }),
];

// Validation for updating an existing quiz
export const validateUpdateQuizBody: ValidationChain[] = [
  body("title", "Quiz title must be a non-empty string")
    .optional()
    .trim()
    .notEmpty(),
  body("description", "Description must be a string")
    .optional()
    .isString()
    .trim(),
  body("questionBankIds", "questionBankIds must be an array of MongoIDs")
    .optional()
    .isArray()
    .custom((value) => {
      if (
        value &&
        !value.every((id: string) => mongoose.Types.ObjectId.isValid(id))
      ) {
        throw new Error("Each item in questionBankIds must be a valid MongoID");
      }
      return true;
    }),
  body(
    "numberOfQuestionsPerAttempt",
    "Number of questions per attempt must be at least 1"
  )
    .optional()
    .isInt({ min: 1 })
    .toInt(),
  body("isAvailable", "isAvailable must be a boolean").optional().isBoolean(),
  body("targetRoles", "targetRoles must be an array of MongoIDs")
    .optional()
    .isArray()
    .custom((value) => {
      if (
        value &&
        !value.every((id: string) => mongoose.Types.ObjectId.isValid(id))
      ) {
        throw new Error("Each item in targetRoles must be a valid MongoID");
      }
      return true;
    }),
  body("retakeCooldownHours", "Retake cooldown must be a non-negative number")
    .optional()
    .isNumeric({ no_symbols: true })
    .toInt()
    .custom((value) => {
      if (value < 0) {
        throw new Error("Retake cooldown cannot be negative.");
      }
      return true;
    }),
  // Ensure at least one field is provided for update
  body().custom((value, { req }) => {
    const fields = [
      "title",
      "description",
      "questionBankIds",
      "numberOfQuestionsPerAttempt",
      "isAvailable",
      "targetRoles",
      "retakeCooldownHours",
    ];
    if (fields.every((field) => req.body[field] === undefined)) {
      throw new Error(
        "No update data provided. Please provide at least one field to update."
      );
    }
    return true;
  }),
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
  body("description", "Description must be a non-empty string")
    .optional()
    .isString()
    .trim()
    .notEmpty(), // If provided, it cannot be empty

  // Validate sourceSopDocumentId if provided
  body("sourceSopDocumentId")
    .optional()
    .isMongoId()
    .withMessage("sourceSopDocumentId must be a valid MongoDB ObjectId string"),

  // Conditional validation for questionBankIds
  body("questionBankIds")
    .optional() // Make it optional at the top level
    .isArray()
    .withMessage("questionBankIds must be an array if provided")
    .custom((value, { req }) => {
      const sourceSopId = req.body.sourceSopDocumentId;
      const bankIds = value;

      if (sourceSopId) {
        // If sourceSopDocumentId is present, questionBankIds is truly optional (can be empty or not provided)
        if (bankIds && bankIds.length > 0) {
          // If bankIds are also provided with SOP ID, they might be ignored by service, or could be an error.
          // For now, let's allow it, service will prioritize SOP ID.
          // Or, throw new Error('Cannot provide both sourceSopDocumentId and questionBankIds.');
        }
        return true;
      }
      // If sourceSopDocumentId is NOT present, questionBankIds becomes mandatory and must not be empty
      if (!bankIds || bankIds.length === 0) {
        throw new Error(
          "Either sourceSopDocumentId or a non-empty array of questionBankIds must be provided."
        );
      }
      return true;
    }),
  body(
    "questionBankIds.*",
    "Each questionBankId must be a valid MongoDB ObjectId string"
  ) // This will only run if questionBankIds is an array and not empty
    .if(
      body("questionBankIds").exists({ checkFalsy: false }).isArray({ min: 1 })
    ) // Ensure it's an array with items before validating elements
    .isMongoId(),

  body(
    "numberOfQuestionsPerAttempt",
    "numberOfQuestionsPerAttempt is required and must be a positive integer"
  )
    .isInt({ min: 1 })
    .toInt(),
  body("targetRoles")
    .optional()
    .isArray()
    .withMessage("targetRoles must be an array of role IDs"),
  body("targetRoles.*")
    .isMongoId()
    .withMessage(
      "Each targetRole ID in targetRoles must be a valid MongoDB ObjectId string"
    ),
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

  // Knowledge Analytics fields
  body("knowledgeCategory", "Knowledge category must be a valid string")
    .optional()
    .isString()
    .trim()
    .isIn([
      "food-knowledge",
      "beverage-knowledge",
      "wine-knowledge",
      "procedures-knowledge",
    ])
    .withMessage(
      "Knowledge category must be one of: food-knowledge, beverage-knowledge, wine-knowledge, procedures-knowledge"
    ),
  body("knowledgeSubcategories", "Knowledge subcategories must be an array")
    .optional()
    .isArray()
    .withMessage("Knowledge subcategories must be an array"),
  body(
    "knowledgeSubcategories.*",
    "Each knowledge subcategory must be a non-empty string"
  )
    .optional()
    .isString()
    .trim()
    .notEmpty(),
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
  body("explanation", "Explanation must be a string")
    .optional()
    .isString()
    .trim(),

  // Knowledge Analytics fields
  body("knowledgeCategory", "Knowledge category must be a valid string")
    .optional()
    .isString()
    .trim()
    .isIn([
      "food-knowledge",
      "beverage-knowledge",
      "wine-knowledge",
      "procedures-knowledge",
    ])
    .withMessage(
      "Knowledge category must be one of: food-knowledge, beverage-knowledge, wine-knowledge, procedures-knowledge"
    ),
  body("knowledgeSubcategories", "Knowledge subcategories must be an array")
    .optional()
    .isArray()
    .withMessage("Knowledge subcategories must be an array"),
  body(
    "knowledgeSubcategories.*",
    "Each knowledge subcategory must be a non-empty string"
  )
    .optional()
    .isString()
    .trim()
    .notEmpty(),
];

// === QuestionBank Controller Validators ===
export const validateCreateQuestionBankBody: ValidationChain[] = [
  body("name", "Question bank name is required").isString().trim().notEmpty(),
  body("description", "Description must be a string")
    .optional()
    .isString()
    .trim(),
  body(
    "restaurantId",
    "Restaurant ID is required and must be a valid MongoDB ObjectId"
  ).isMongoId(),
  body(
    "sourceType",
    "Source type is required and must be one of SOP, MENU, MANUAL"
  ).isIn(["SOP", "MENU", "MANUAL"]),
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

  // Conditional validation for SOP source
  body("sourceSopDocumentId")
    .if(body("sourceType").equals("SOP"))
    .isMongoId()
    .withMessage(
      "sourceSopDocumentId is required and must be a valid MongoDB ObjectId for SOP sourceType"
    ),
  body("generationMethod")
    .if(body("sourceType").equals("SOP"))
    .isIn(["AI", "MANUAL"])
    .withMessage(
      "generationMethod is required and must be 'AI' or 'MANUAL' for SOP sourceType"
    ),

  // Conditional validation for MENU source
  body("sourceMenuId")
    .if(body("sourceType").equals("MENU"))
    .isMongoId()
    .withMessage(
      "sourceMenuId is required and must be a valid MongoDB ObjectId for MENU sourceType"
    ),
];

export const validateUpdateQuestionBankBody: ValidationChain[] = [
  body().custom((value, { req }) => {
    if (
      req.body.name === undefined &&
      req.body.description === undefined &&
      req.body.targetQuestionCount === undefined &&
      req.body.categories === undefined &&
      req.body.sourceMenuId === undefined
    ) {
      throw new Error(
        "No update data provided. Provide name, description, targetQuestionCount, categories, or sourceMenuId."
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
  body("categories", "Categories must be an array of strings")
    .optional()
    .isArray(),
  body("categories.*", "Each category must be a non-empty string")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage(
      "Category names cannot be empty if categories array is provided."
    ),
  body(
    "sourceMenuId",
    "Source menu ID must be a valid MongoDB ObjectId or null"
  )
    .optional()
    .custom((value) => {
      if (value === null || value === "") {
        return true; // Allow null/empty to remove menu connection
      }
      if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
        return true; // Valid ObjectId string
      }
      throw new Error(
        "Source menu ID must be a valid MongoDB ObjectId or null"
      );
    }),
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
    .isLength({ min: 2, max: 200 })
    .withMessage("Item name must be between 2 and 200 characters"),
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
    .isLength({ min: 2, max: 200 })
    .withMessage("Item name must be between 2 and 200 characters"),
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
  // Wine-specific field validations
  body("wineStyle", "Wine style must be a valid option")
    .optional()
    .isIn(["still", "sparkling", "champagne", "dessert", "fortified", "other"]),
  body("producer", "Producer must be a string").optional().isString().trim(),
  body("grapeVariety", "Grape variety must be an array of strings")
    .optional()
    .isArray(),
  body("grapeVariety.*", "Each grape variety must be a non-empty string")
    .optional()
    .isString()
    .trim()
    .notEmpty(),
  body("vintage", "Vintage must be a valid year")
    .optional()
    .isInt({ min: 1000, max: new Date().getFullYear() + 10 }),
  body("region", "Region must be a string").optional().isString().trim(),
  body("servingOptions", "Serving options must be an array")
    .optional()
    .isArray(),
  body("servingOptions.*.size", "Serving option size must be a string")
    .optional()
    .isString()
    .trim()
    .notEmpty(),
  body(
    "servingOptions.*.price",
    "Serving option price must be a non-negative number"
  )
    .optional()
    .isFloat({ min: 0 }),
  body(
    "suggestedPairingsText",
    "Suggested pairings must be an array of strings"
  )
    .optional()
    .isArray(),
  body("suggestedPairingsText.*", "Each pairing must be a non-empty string")
    .optional()
    .isString()
    .trim()
    .notEmpty(),
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

export const validateProfileUpdateRequest = [
  body("name")
    .optional()
    .notEmpty()
    .withMessage("Name cannot be empty.")
    .trim()
    .escape(),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Must be a valid email address.")
    .normalizeEmail(),
  // Restaurant name update is tricky here. If a restaurant owner updates their name,
  // it might be the user's name or the restaurant entity's name.
  // This depends on how User and Restaurant models are linked and updated.
  // For now, allowing it, assuming service layer handles the logic.
  body("restaurantName")
    .optional()
    .notEmpty()
    .withMessage("Restaurant name cannot be empty.")
    .trim()
    .escape(),
  // Ensure at least one field is being updated
  body().custom((value, { req }) => {
    if (!req.body.name && !req.body.email && !req.body.restaurantName) {
      throw new Error(
        "At least one field (name, email, or restaurantName) must be provided for update."
      );
    }
    return true;
  }),
];

export const validatePasswordChangeRequest = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required.")
    .trim(),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required.")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long."),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("New passwords do not match.");
    }
    return true;
  }),
];

export const validateFinalMenuImportData = [
  body("previewId")
    .isString()
    .withMessage("Preview ID must be a string.")
    .notEmpty()
    .withMessage("Preview ID is required."),
  body("filePath")
    .isString()
    .withMessage("File path must be a string.")
    .notEmpty()
    .withMessage("File path is required."),
  // parsedMenuName is optional
  body("parsedMenuName")
    .optional()
    .isString()
    .withMessage("Parsed menu name must be a string if provided.")
    .isLength({ min: 1, max: 100 })
    .withMessage(
      "Parsed menu name must be between 1 and 100 characters if provided."
    ),
  // targetMenuId is optional, but if provided, should be a valid ObjectId
  body("targetMenuId")
    .optional()
    .isMongoId()
    .withMessage(
      "Target menu ID must be a valid MongoDB ObjectId if provided."
    ),
  // replaceAllItems is optional boolean
  body("replaceAllItems")
    .optional()
    .isBoolean()
    .withMessage("Replace all items flag must be a boolean if provided."),

  body("itemsToImport")
    .isArray({ min: 0 })
    .withMessage("Items to import must be an array."),
  // Basic validation for each item in the array
  body("itemsToImport.*.id")
    .isString()
    .withMessage("Each item to import must have an ID (string).")
    .notEmpty()
    .withMessage("Item ID cannot be empty."),
  body("itemsToImport.*.importAction")
    .isIn(["create", "update", "skip"])
    .withMessage(
      "Each item importAction must be one of: create, update, skip."
    ),

  // Validate structure of fields for items being created or updated (more detailed)
  body("itemsToImport").custom((items, { req }) => {
    if (!Array.isArray(items)) return true; // Already handled by isArray

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.importAction === "create" || item.importAction === "update") {
        if (!item.fields) {
          throw new Error(
            `Item at index ${i} with action '${item.importAction}' is missing 'fields' object.`
          );
        }
        if (
          !item.fields.name ||
          typeof item.fields.name.value !== "string" ||
          item.fields.name.value.trim() === ""
        ) {
          throw new Error(
            `Item at index ${i} (action: '${item.importAction}') must have a non-empty name string.`
          );
        }
        if (
          item.fields.name.value.trim().length < 2 ||
          item.fields.name.value.trim().length > MAX_ITEM_NAME_LENGTH
        ) {
          throw new Error(
            `Item name for item at index ${i} (action: '${item.importAction}') must be between 2 and ${MAX_ITEM_NAME_LENGTH} characters.`
          );
        }
        if (
          !item.fields.category ||
          typeof item.fields.category.value !== "string" ||
          item.fields.category.value.trim() === ""
        ) {
          throw new Error(
            `Item at index ${i} (action: '${item.importAction}') must have a non-empty category string.`
          );
        }
        if (
          !item.fields.itemType ||
          typeof item.fields.itemType.value !== "string" ||
          !["food", "beverage", "wine"].includes(item.fields.itemType.value)
        ) {
          throw new Error(
            `Item at index ${i} (action: '${item.importAction}') must have a valid itemType ('food', 'beverage', or 'wine').`
          );
        }
        if (
          item.fields.price &&
          item.fields.price.value !== null &&
          typeof item.fields.price.value !== "number"
        ) {
          throw new Error(
            `Price for item at index ${i} (action: '${item.importAction}') must be a number or null if provided.`
          );
        }
        // Add more checks for other fields as necessary (ingredients, booleans etc.)
        if (
          item.fields.ingredients &&
          !Array.isArray(item.fields.ingredients.value)
        ) {
          throw new Error(
            `Ingredients for item at index ${i} (action: '${item.importAction}') must be an array if provided.`
          );
        }
        if (
          item.fields.isGlutenFree &&
          typeof item.fields.isGlutenFree.value !== "boolean"
        ) {
          throw new Error(
            `isGlutenFree for item at index ${i} (action: '${item.importAction}') must be a boolean if provided.`
          );
        }
        // Validate wine-specific fields if itemType is 'wine'
        if (item.fields.itemType.value === "wine") {
          if (!item.fields.wineStyle || !item.fields.wineStyle.value) {
            throw new Error(
              `Wine style is required for wine item at index ${i}.`
            );
          }

          // For wine items during conflict resolution, wine style is optional but must be valid if provided
          if (
            item.fields.wineStyle &&
            item.fields.wineStyle.value &&
            typeof item.fields.wineStyle.value !== "string"
          ) {
            throw new Error(
              `Wine style value for item at index ${i} must be a string if provided.`
            );
          }

          if (
            item.fields.wineStyle &&
            item.fields.wineStyle.value &&
            ![
              "still",
              "sparkling",
              "champagne",
              "dessert",
              "fortified",
              "other",
            ].includes(item.fields.wineStyle.value)
          ) {
            throw new Error(
              `Wine style for item at index ${i} must be one of: still, sparkling, champagne, dessert, fortified, other.`
            );
          }
        }
        // etc. for isVegan, isVegetarian
      }
    }
    return true;
  }),
  handleValidationErrors, // Generic handler for express-validator errors
];

// Validation for POST /api/menus/upload/process (Conflict Resolution)
export const validateProcessConflictResolutionData: ValidationChain[] = [
  body("itemsToProcess")
    .isArray({ min: 1 })
    .withMessage("itemsToProcess must be a non-empty array."),
  // Validate each item in the itemsToProcess array
  body("itemsToProcess.*.id")
    .isString()
    .withMessage("Each item in itemsToProcess must have a string id."),
  body("itemsToProcess.*.fields")
    .isObject()
    .withMessage("Each item in itemsToProcess must have a fields object."),
  body("itemsToProcess.*.fields.name")
    .isObject()
    .withMessage("Each item fields must have a name object."),
  body("itemsToProcess.*.fields.name.value")
    .isString()
    .notEmpty()
    .withMessage("Each item name.value must be a non-empty string.")
    .isLength({ min: 1, max: 200 }) // Increased to 200 to accommodate longer menu item descriptions
    .withMessage("Item name.value must be between 1 and 200 characters."),

  // Add validation for required fields that might be missing
  body("itemsToProcess.*.fields.itemType")
    .isObject()
    .withMessage("Each item fields must have an itemType object."),
  body("itemsToProcess.*.fields.itemType.value")
    .isString()
    .isIn(["food", "beverage", "wine"])
    .withMessage("Item itemType.value must be one of: food, beverage, wine."),

  body("itemsToProcess.*.fields.category")
    .isObject()
    .withMessage("Each item fields must have a category object."),
  body("itemsToProcess.*.fields.category.value")
    .isString()
    .notEmpty()
    .withMessage("Item category.value must be a non-empty string."),

  // Validate wine-specific fields for wine items
  body("itemsToProcess").custom((items, { req }) => {
    if (!Array.isArray(items)) return true; // Already handled by isArray

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Check if this is a wine item
      if (item.fields?.itemType?.value === "wine") {
        // For wine items during conflict resolution, wine style is optional but must be valid if provided
        if (
          item.fields.wineStyle &&
          item.fields.wineStyle.value &&
          typeof item.fields.wineStyle.value !== "string"
        ) {
          throw new Error(
            `Wine style value for item at index ${i} must be a string if provided.`
          );
        }

        if (
          item.fields.wineStyle &&
          item.fields.wineStyle.value &&
          ![
            "still",
            "sparkling",
            "champagne",
            "dessert",
            "fortified",
            "other",
          ].includes(item.fields.wineStyle.value)
        ) {
          throw new Error(
            `Wine style for item at index ${i} must be one of: still, sparkling, champagne, dessert, fortified, other.`
          );
        }

        // Validate other wine fields if they exist
        if (
          item.fields.wineProducer &&
          typeof item.fields.wineProducer.value !== "string" &&
          item.fields.wineProducer.value !== null
        ) {
          throw new Error(
            `Wine producer value for item at index ${i} must be a string or null if provided.`
          );
        }

        if (
          item.fields.wineVintage &&
          item.fields.wineVintage.value !== null &&
          typeof item.fields.wineVintage.value !== "number" &&
          typeof item.fields.wineVintage.value !== "string"
        ) {
          throw new Error(
            `Wine vintage value for item at index ${i} must be a number, string, or null if provided.`
          );
        }

        if (
          item.fields.wineRegion &&
          typeof item.fields.wineRegion.value !== "string" &&
          item.fields.wineRegion.value !== null
        ) {
          throw new Error(
            `Wine region value for item at index ${i} must be a string or null if provided.`
          );
        }

        if (
          item.fields.wineGrapeVariety &&
          typeof item.fields.wineGrapeVariety.value !== "string" &&
          item.fields.wineGrapeVariety.value !== null
        ) {
          throw new Error(
            `Wine grape variety value for item at index ${i} must be a string or null if provided.`
          );
        }

        if (
          item.fields.winePairings &&
          typeof item.fields.winePairings.value !== "string" &&
          item.fields.winePairings.value !== null
        ) {
          throw new Error(
            `Wine pairings value for item at index ${i} must be a string or null if provided.`
          );
        }

        if (
          item.fields.wineServingOptions &&
          item.fields.wineServingOptions.value !== null &&
          !Array.isArray(item.fields.wineServingOptions.value)
        ) {
          throw new Error(
            `Wine serving options value for item at index ${i} must be an array or null if provided.`
          );
        }
      }

      // Validate other common fields
      if (
        item.fields.price &&
        item.fields.price.value !== null &&
        typeof item.fields.price.value !== "number"
      ) {
        throw new Error(
          `Price value for item at index ${i} must be a number or null if provided.`
        );
      }

      if (
        item.fields.ingredients &&
        !Array.isArray(item.fields.ingredients.value) &&
        item.fields.ingredients.value !== null
      ) {
        throw new Error(
          `Ingredients value for item at index ${i} must be an array or null if provided.`
        );
      }

      // Validate boolean fields
      const booleanFields = ["isGlutenFree", "isVegan", "isVegetarian"];
      for (const fieldName of booleanFields) {
        if (
          item.fields[fieldName] &&
          typeof item.fields[fieldName].value !== "boolean"
        ) {
          throw new Error(
            `${fieldName} value for item at index ${i} must be a boolean if provided.`
          );
        }
      }
    }
    return true;
  }),
];

// You might have other validators here...
// Ensure the file ends correctly.
