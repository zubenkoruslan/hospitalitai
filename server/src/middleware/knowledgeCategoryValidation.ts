import { Request, Response, NextFunction } from "express";
import { body, param, query, ValidationChain } from "express-validator";
import { KnowledgeCategory } from "../models/QuestionModel";

// Validation rules for knowledge categories
export const knowledgeCategoryValues = Object.values(KnowledgeCategory);

// Validation middleware for creating/updating questions with knowledge categories
export const validateKnowledgeCategory: ValidationChain[] = [
  body("knowledgeCategory")
    .isIn(knowledgeCategoryValues)
    .withMessage(
      `Knowledge category must be one of: ${knowledgeCategoryValues.join(", ")}`
    ),

  body("knowledgeSubcategories")
    .optional()
    .isArray({ max: 3 })
    .withMessage(
      "Knowledge subcategories must be an array with maximum 3 items"
    )
    .custom((subcategories: string[]) => {
      // Validate each subcategory is a non-empty string
      if (subcategories && subcategories.length > 0) {
        for (const subcategory of subcategories) {
          if (
            typeof subcategory !== "string" ||
            subcategory.trim().length === 0
          ) {
            throw new Error("Each subcategory must be a non-empty string");
          }
          if (subcategory.length > 50) {
            throw new Error("Each subcategory must be 50 characters or less");
          }
        }
      }
      return true;
    }),

  body("knowledgeCategoryAssignedBy")
    .isIn(["manual", "ai", "restaurant_edit"])
    .withMessage(
      "Knowledge category assigned by must be one of: manual, ai, restaurant_edit"
    ),
];

// Validation for bulk knowledge category updates
export const validateBulkKnowledgeCategoryUpdate: ValidationChain[] = [
  body("questionIds")
    .isArray({ min: 1, max: 100 })
    .withMessage("Question IDs must be an array with 1-100 items")
    .custom((questionIds: string[]) => {
      // Validate each ID is a valid MongoDB ObjectId format
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      for (const id of questionIds) {
        if (!objectIdRegex.test(id)) {
          throw new Error(`Invalid question ID format: ${id}`);
        }
      }
      return true;
    }),

  body("knowledgeCategory")
    .isIn(knowledgeCategoryValues)
    .withMessage(
      `Knowledge category must be one of: ${knowledgeCategoryValues.join(", ")}`
    ),

  body("knowledgeSubcategories")
    .optional()
    .isArray({ max: 3 })
    .withMessage(
      "Knowledge subcategories must be an array with maximum 3 items"
    ),
];

// Validation for knowledge analytics queries
export const validateKnowledgeAnalyticsQuery: ValidationChain[] = [
  query("category")
    .optional()
    .isIn(knowledgeCategoryValues)
    .withMessage(
      `Category must be one of: ${knowledgeCategoryValues.join(", ")}`
    ),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),

  query("userId")
    .optional()
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage("User ID must be a valid MongoDB ObjectId"),
];

// Middleware to validate knowledge category assignment permissions
export const validateKnowledgeCategoryPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as any; // Assuming user is attached by auth middleware
    const { knowledgeCategoryAssignedBy } = req.body;

    // Check if user has permission to assign categories manually
    if (
      knowledgeCategoryAssignedBy === "manual" ||
      knowledgeCategoryAssignedBy === "restaurant_edit"
    ) {
      // Only restaurant managers and above can manually assign or edit categories
      if (
        !user ||
        (user.role !== "manager" &&
          user.role !== "owner" &&
          user.role !== "admin")
      ) {
        res.status(403).json({
          error:
            "Insufficient permissions to manually assign knowledge categories",
        });
        return;
      }
    }

    // AI assignment is always allowed for system operations
    if (knowledgeCategoryAssignedBy === "ai") {
      // This should typically come from system operations, not direct user requests
      // Add additional validation if needed
    }

    next();
  } catch (error) {
    res.status(500).json({
      error: "Error validating knowledge category permissions",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Middleware to validate knowledge category consistency
export const validateKnowledgeCategoryConsistency = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { knowledgeCategory, knowledgeSubcategories } = req.body;

    // Define valid subcategories for each knowledge category
    const validSubcategories: Record<KnowledgeCategory, string[]> = {
      [KnowledgeCategory.FOOD_KNOWLEDGE]: [
        "ingredients",
        "allergens",
        "preparation",
        "nutrition",
        "menu-items",
        "dietary-restrictions",
        "cooking-methods",
        "food-safety",
      ],
      [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: [
        "coffee",
        "tea",
        "soft-drinks",
        "juices",
        "smoothies",
        "preparation",
        "equipment",
        "temperature",
      ],
      [KnowledgeCategory.WINE_KNOWLEDGE]: [
        "varieties",
        "regions",
        "vintages",
        "pairings",
        "service",
        "storage",
        "tasting-notes",
        "production",
      ],
      [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: [
        "safety",
        "hygiene",
        "service-standards",
        "opening-procedures",
        "closing-procedures",
        "emergency-protocols",
        "customer-service",
      ],
    };

    // Validate subcategories are appropriate for the knowledge category
    if (knowledgeSubcategories && knowledgeSubcategories.length > 0) {
      const validSubs =
        validSubcategories[knowledgeCategory as KnowledgeCategory];

      for (const subcategory of knowledgeSubcategories) {
        if (!validSubs.includes(subcategory)) {
          res.status(400).json({
            error: `Invalid subcategory "${subcategory}" for knowledge category "${knowledgeCategory}"`,
            validSubcategories: validSubs,
          });
          return;
        }
      }
    }

    next();
  } catch (error) {
    res.status(500).json({
      error: "Error validating knowledge category consistency",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Export all validation middlewares
export const knowledgeCategoryValidationMiddleware = {
  validateKnowledgeCategory,
  validateBulkKnowledgeCategoryUpdate,
  validateKnowledgeAnalyticsQuery,
  validateKnowledgeCategoryPermissions,
  validateKnowledgeCategoryConsistency,
};

export default knowledgeCategoryValidationMiddleware;
