import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errorHandler"; // Assuming you have a custom error handler
import * as QuestionBankService from "../services/questionBankService";
import mongoose from "mongoose";
import {
  CreateQuestionBankData,
  UpdateQuestionBankData,
  CreateQuestionBankFromMenuData,
} from "../services/questionBankService";

// Placeholder for createQuestionBank
export const createQuestionBank = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, categories, targetQuestionCount } = req.body;

    if (!req.user || !req.user.restaurantId) {
      // This should ideally be caught by protect middleware or a role check
      // but an additional check here is good for robustness.
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }

    if (
      !name // Categories are no longer required from client for bank creation
      // !categories ||
      // !Array.isArray(categories) ||
      // categories.length === 0
    ) {
      return next(
        new AppError(
          // "Missing required fields: name and categories (must be a non-empty array).",
          "Missing required field: name.",
          400
        )
      );
    }

    const restaurantId = req.user.restaurantId as mongoose.Types.ObjectId; // Cast because we checked its existence

    const bankData: QuestionBankService.CreateQuestionBankData = {
      name,
      description,
      categories: categories || [], // Default to empty array if not provided
      // targetQuestionCount, // Removed, as it's not part of CreateQuestionBankData anymore
      restaurantId,
    };

    const newBank = await QuestionBankService.createQuestionBankService(
      bankData
    );

    res.status(201).json({
      status: "success",
      message: "Question bank created successfully.",
      data: newBank,
    });
  } catch (error) {
    next(error);
  }
};

// Placeholder for getAllQuestionBanks
export const getAllQuestionBanks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId as mongoose.Types.ObjectId;

    const banks = await QuestionBankService.getAllQuestionBanksService(
      restaurantId
    );

    res.status(200).json({
      status: "success",
      results: banks.length,
      data: banks,
    });
  } catch (error) {
    next(error);
  }
};

// Placeholder for getQuestionBank
export const getQuestionBank = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bankId } = req.params;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId as mongoose.Types.ObjectId;

    // Validate bankId format
    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      return next(new AppError(`Invalid bank ID format: ${bankId}`, 400));
    }

    const bank = await QuestionBankService.getQuestionBankByIdService(
      bankId,
      restaurantId
    );

    if (!bank) {
      return next(
        new AppError(
          `Question bank not found with ID: ${bankId} for this restaurant.`,
          404
        )
      );
    }

    res.status(200).json({
      status: "success",
      data: bank,
    });
  } catch (error) {
    next(error);
  }
};

// Placeholder for updateQuestionBank
export const updateQuestionBank = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bankId } = req.params;
    const { name, description } = req.body;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId as mongoose.Types.ObjectId;

    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      return next(new AppError(`Invalid bank ID format: ${bankId}`, 400));
    }

    // Construct the update data object
    // Only include fields that are actually provided in the request body
    const updateData: QuestionBankService.UpdateQuestionBankData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    if (Object.keys(updateData).length === 0) {
      return next(new AppError("No valid fields provided for update.", 400));
    }

    const updatedBank = await QuestionBankService.updateQuestionBankService(
      bankId,
      restaurantId,
      updateData
    );

    if (!updatedBank) {
      return next(
        new AppError(
          `Question bank not found with ID: ${bankId} for this restaurant, or update failed.`,
          404
        )
      );
    }

    res.status(200).json({
      status: "success",
      message: "Question bank updated successfully.",
      data: updatedBank,
    });
  } catch (error) {
    next(error);
  }
};

// Placeholder for deleteQuestionBank
export const deleteQuestionBank = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bankId } = req.params;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId as mongoose.Types.ObjectId;

    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      return next(new AppError(`Invalid bank ID format: ${bankId}`, 400));
    }

    const wasDeleted = await QuestionBankService.deleteQuestionBankService(
      bankId,
      restaurantId
    );

    if (!wasDeleted) {
      return next(
        new AppError(
          `Question bank not found with ID: ${bankId} for this restaurant, or delete failed.`,
          404
        )
      );
    }

    res.status(204).json({
      status: "success",
      data: null, // Or message: "Question bank deleted successfully."
    });
  } catch (error) {
    next(error);
  }
};

// Controller to add an existing question to a question bank
export const addQuestionToBank = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bankId } = req.params;
    const { questionId } = req.body; // Assuming questionId is sent in the request body

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId as mongoose.Types.ObjectId;

    if (!questionId) {
      return next(new AppError("Missing questionId in request body.", 400));
    }

    // Service function will validate bankId and questionId formats
    const updatedBank = await QuestionBankService.addQuestionToBankService(
      bankId,
      restaurantId,
      questionId
    );

    // addQuestionToBankService throws specific AppErrors for not found, etc.
    // So, if we get here, it means success or a non-null return from a no-op (like duplicate add).

    res.status(200).json({
      status: "success",
      message: "Question added to bank successfully.", // Or a more nuanced message if it was a no-op
      data: updatedBank,
    });
  } catch (error) {
    next(error);
  }
};

// Controller to remove a question from a question bank
export const removeQuestionFromBank = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bankId, questionId } = req.params; // Assuming questionId will be part of the route path

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId as mongoose.Types.ObjectId;

    // Service function will validate bankId and questionId formats
    const updatedBank = await QuestionBankService.removeQuestionFromBankService(
      bankId,
      restaurantId,
      questionId
    );

    // removeQuestionFromBankService throws specific AppErrors for not found, etc.
    // If we reach here, the operation was successful.

    res.status(200).json({
      status: "success",
      message: "Question removed from bank successfully.",
      data: updatedBank,
    });
  } catch (error) {
    next(error);
  }
};

export const createQuestionBankFromMenu = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req;
    if (!user || user.role !== "restaurant" || !user.restaurantId) {
      return next(
        new AppError("User not authorized or restaurant ID missing", 403)
      );
    }

    const {
      name,
      description,
      menuId,
      selectedCategoryNames,
      generateAiQuestions,
      aiParams,
    } = req.body as Omit<CreateQuestionBankFromMenuData, "restaurantId">;

    if (
      !menuId ||
      !selectedCategoryNames ||
      !Array.isArray(selectedCategoryNames) ||
      selectedCategoryNames.length === 0
    ) {
      return next(
        new AppError(
          "Menu ID and at least one selected category name are required.",
          400
        )
      );
    }

    const serviceData: CreateQuestionBankFromMenuData = {
      name,
      description,
      restaurantId: user.restaurantId as mongoose.Types.ObjectId,
      menuId: menuId as unknown as mongoose.Types.ObjectId,
      selectedCategoryNames,
      generateAiQuestions,
      aiParams,
    };

    const newBank = await QuestionBankService.createQuestionBankFromMenuService(
      serviceData
    );
    res.status(201).json({
      message: "Question bank created successfully from menu.",
      data: newBank,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    console.error("Error in createQuestionBankFromMenu controller:", error);
    return next(new AppError("Failed to create question bank from menu.", 500));
  }
};

export const getQuestionBankById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bankId } = req.params;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId as mongoose.Types.ObjectId;

    // Validate bankId format
    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      return next(new AppError(`Invalid bank ID format: ${bankId}`, 400));
    }

    const bank = await QuestionBankService.getQuestionBankByIdService(
      bankId,
      restaurantId
    );

    if (!bank) {
      return next(
        new AppError(
          `Question bank not found with ID: ${bankId} for this restaurant.`,
          404
        )
      );
    }

    res.status(200).json({
      status: "success",
      data: bank,
    });
  } catch (error) {
    next(error);
  }
};
