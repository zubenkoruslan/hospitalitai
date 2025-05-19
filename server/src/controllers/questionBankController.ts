import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errorHandler"; // Assuming you have a custom error handler
import * as QuestionBankService from "../services/questionBankService";
import mongoose from "mongoose";
import {
  CreateQuestionBankData as _CreateQuestionBankData,
  UpdateQuestionBankData as _UpdateQuestionBankData,
  CreateQuestionBankFromMenuData,
} from "../services/questionBankService";
import QuestionModel, { IQuestion } from "../models/QuestionModel"; // Import QuestionModel and IQuestion
import QuestionBankModel from "../models/QuestionBankModel"; // Import QuestionBankModel

// Placeholder for createQuestionBank
export const createQuestionBank = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, categories, targetQuestionCount } = req.body;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId as mongoose.Types.ObjectId;

    const bankData: QuestionBankService.CreateQuestionBankData = {
      name,
      description,
      categories: categories || [],
      targetQuestionCount,
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
    const { name, description, targetQuestionCount } = req.body;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId as mongoose.Types.ObjectId;

    const updateData: QuestionBankService.UpdateQuestionBankData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (targetQuestionCount !== undefined)
      updateData.targetQuestionCount = targetQuestionCount;

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

    res.status(204).send();
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
    const { questionId } = req.body;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId as mongoose.Types.ObjectId;

    const updatedBank = await QuestionBankService.addQuestionToBankService(
      bankId,
      restaurantId,
      questionId
    );

    if (!updatedBank) {
      return next(
        new AppError(
          "Failed to add question to bank. Bank or question may not exist.",
          404
        )
      );
    }

    res.status(200).json({
      status: "success",
      message: "Question added to bank successfully.",
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
    const { bankId, questionId } = req.params; // Assuming questionId is also in params for RESTfulness
    // If questionId is in body: const { questionId } = req.body;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId as mongoose.Types.ObjectId;

    // const { shouldRemoveQuestions } = req.body; // This was likely the source of the 4th param

    const result = await QuestionBankService.removeQuestionFromBankService(
      bankId,
      restaurantId,
      questionId
      // shouldRemoveQuestions // Removed 4th argument
    );

    if (!result) {
      return next(
        new AppError(
          `Failed to remove question. Bank ${bankId} or question ${questionId} not found, or question not in bank.`,
          404
        )
      );
    }

    res.status(200).json({
      status: "success",
      message: "Question removed from bank successfully.", // Static message
      data: result, // result is the updated IQuestionBank
      // removedQuestionsCount: result.removedQuestionsCount, // IQuestionBank does not have this
    });
  } catch (error) {
    next(error);
  }
};

// Create a question bank from a menu with optional AI question generation
export const createQuestionBankFromMenu = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      name,
      description,
      menuId,
      selectedCategoryNames, // Ensure this is what client sends
      generateAiQuestions,
      aiParams,
    } = req.body;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId as mongoose.Types.ObjectId;

    // Validate required fields
    if (!name || !menuId || !selectedCategoryNames) {
      return next(
        new AppError(
          "Missing required fields: name, menuId, and selectedCategoryNames are required.",
          400
        )
      );
    }
    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      return next(new AppError("Invalid menu ID format.", 400));
    }

    const bankData: QuestionBankService.CreateQuestionBankFromMenuData = {
      // Corrected Type
      name,
      description,
      restaurantId,
      menuId: new mongoose.Types.ObjectId(menuId),
      selectedCategoryNames,
      generateAiQuestions,
      aiParams,
    };

    const result = await QuestionBankService.createQuestionBankFromMenuService(
      // Corrected service call if it was createQuestionBankFromMenu
      bankData
      // req.user.restaurantId // This was likely an error if bankData already contains restaurantId
    );

    // If service returns null or throws error for not found, it will be caught by general error handler
    // or specific checks within service. Controller assumes success if no error is thrown.

    res.status(201).json({
      status: "success",
      message: "Question bank created successfully from menu.", // Static message
      data: result, // result is IQuestionBank
    });
  } catch (error) {
    next(error);
  }
};

// Get Question Bank by ID (already exists, shown for context if needed)
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

// Add a category to a Question Bank
export const addCategoryToQuestionBank = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bankId } = req.params;
    const { categoryName } = req.body;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId as mongoose.Types.ObjectId;

    if (!categoryName || typeof categoryName !== "string") {
      return next(new AppError("Category name is required.", 400));
    }

    const result = await QuestionBankService.addCategoryToQuestionBankService(
      bankId,
      restaurantId,
      categoryName
    );

    if (!result) {
      return next(
        new AppError(
          `Question bank not found with ID: ${bankId} for this restaurant, or category already exists / update failed.`,
          404 // Or 400 if category already exists and that's an error
        )
      );
    }

    res.status(200).json({
      status: "success",
      message: "Category added to question bank successfully.", // Static message
      data: result, // result is IQuestionBank
    });
  } catch (error) {
    next(error);
  }
};

// Remove a category from a Question Bank (and optionally its questions)
export const removeCategoryFromQuestionBank = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bankId } = req.params;
    const { categoryName } = req.body; // Or req.params if categoryName is part of URL

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId as mongoose.Types.ObjectId;

    if (!categoryName) {
      return next(new AppError("Category name is required.", 400));
    }

    const result =
      await QuestionBankService.removeCategoryFromQuestionBankService(
        bankId,
        restaurantId,
        categoryName
        // Ensure no 4th argument here if that was the TS2554 error source
      );

    if (!result) {
      return next(
        new AppError(
          `Question bank not found with ID: ${bankId}, or category not found.`,
          404
        )
      );
    }

    res.status(200).json({
      status: "success",
      message: "Category removed from question bank successfully.", // Static message
      data: result, // result is IQuestionBank
      // removedQuestionsCount: result.removedQuestionsCount, // IQuestionBank does not have this
    });
  } catch (error) {
    next(error);
  }
};

interface ProcessReviewedQuestionsBody {
  acceptedQuestions: Partial<IQuestion>[]; // Questions to make active and add to bank
  updatedQuestions: Partial<IQuestion & { _id: string }>[]; // Questions (likely pending) that were edited, to make active and add/confirm in bank
  deletedQuestionIds: string[]; // Question IDs (from pending batch) to mark as 'rejected'
}

// Controller to process reviewed AI questions
export const processReviewedAiQuestionsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bankId } = req.params;
    const {
      acceptedQuestions = [],
      updatedQuestions = [],
      deletedQuestionIds = [],
    }: ProcessReviewedQuestionsBody = req.body;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId as mongoose.Types.ObjectId;

    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      return next(new AppError("Invalid Question Bank ID format.", 400));
    }

    const bank = await QuestionBankModel.findOne({
      _id: bankId,
      restaurantId,
    });

    if (!bank) {
      return next(
        new AppError(
          `Question Bank with ID ${bankId} not found for this restaurant.`,
          404
        )
      );
    }

    const questionIdsToAddToBank = new Set<string>(
      bank.questions.map((q) => q.toString())
    );
    const questionsToSave: mongoose.Document<unknown, {}, IQuestion>[] = [];

    // Process deleted questions (mark as 'rejected')
    if (deletedQuestionIds.length > 0) {
      await QuestionModel.updateMany(
        { _id: { $in: deletedQuestionIds }, restaurantId },
        { $set: { status: "rejected" } }
      );
      // Remove from bank's list if they were somehow there
      deletedQuestionIds.forEach((id) => questionIdsToAddToBank.delete(id));
    }

    // Process updated questions
    for (const qData of updatedQuestions) {
      if (!qData._id || !mongoose.Types.ObjectId.isValid(qData._id)) {
        console.warn(
          "Skipping update for question with invalid/missing _id:",
          qData
        );
        continue;
      }
      const question = await QuestionModel.findOne({
        _id: qData._id,
        restaurantId,
      });
      if (question) {
        Object.assign(question, qData); // Apply updates from qData
        question.status = "active"; // Ensure status is active
        question.restaurantId = restaurantId; // Ensure restaurantId
        question.createdBy = question.createdBy || "ai"; // Preserve original creator or default to 'ai'
        questionsToSave.push(question);
        questionIdsToAddToBank.add(question._id.toString());
      } else {
        console.warn(`Question with _id ${qData._id} not found for update.`);
      }
    }

    // Process accepted questions
    for (const qData of acceptedQuestions) {
      if (qData._id && mongoose.Types.ObjectId.isValid(qData._id)) {
        // Existing pending question being accepted
        const question = await QuestionModel.findOne({
          _id: qData._id,
          restaurantId,
        });
        if (question) {
          // If it was pending_review or rejected, update it.
          if (
            question.status === "pending_review" ||
            question.status === "rejected"
          ) {
            Object.assign(question, qData); // Apply any edits made during review
            question.status = "active";
            question.restaurantId = restaurantId;
            question.createdBy = question.createdBy || "ai";
            questionsToSave.push(question);
            questionIdsToAddToBank.add(question._id.toString());
          } else if (question.status === "active") {
            // If already active but somehow in accepted list, ensure it's in bank.
            questionIdsToAddToBank.add(question._id.toString());
          }
        } else {
          console.warn(`Accepted question with _id ${qData._id} not found.`);
        }
      } else {
        // New question created during review (less likely for AI, but supported by plan)
        const newQuestionDocument = new QuestionModel({
          ...qData,
          status: "active",
          createdBy: "ai", // Or derive if possible, defaulting to 'ai' for this handler
          restaurantId,
        });
        questionsToSave.push(newQuestionDocument);
        // ID will be generated on save, add after save.
      }
    }

    // Save all new/updated questions
    if (questionsToSave.length > 0) {
      // Mongoose `bulkSave` saves an array of documents, good for performance.
      // It will insert new documents and update existing ones if they have an _id and version key.
      await QuestionModel.bulkSave(questionsToSave);

      // Add IDs of newly created questions to the set for bank update
      questionsToSave.forEach((doc) => {
        // After bulkSave, documents should have their _ids if they were new.
        if (doc && doc._id && !questionIdsToAddToBank.has(doc._id.toString())) {
          questionIdsToAddToBank.add(doc._id.toString());
        }
      });
    }

    // Update the bank with the final list of question IDs
    bank.questions = Array.from(questionIdsToAddToBank).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // Recalculate categories and questionCount
    // This assumes a method on the QuestionBankModel schema or a pre-save hook handles this.
    // If not, this logic needs to be implemented here or in a service.
    if (typeof (bank as any).updateQuestionCountAndCategories === "function") {
      await (bank as any).updateQuestionCountAndCategories();
    } else {
      // Fallback or warning if method doesn't exist
      console.warn(
        "bank.updateQuestionCountAndCategories() method not found. Count and categories might be stale."
      );
      // Basic recalculation (consider moving to a model method or pre-save hook)
      bank.questionCount = bank.questions.length;
      const activeQuestionsInBank = await QuestionModel.find({
        _id: { $in: bank.questions },
        status: "active",
      });
      const categories = new Set<string>();
      activeQuestionsInBank.forEach((q) =>
        q.categories.forEach((cat) => categories.add(cat))
      );
      bank.categories = Array.from(categories);
    }
    await bank.save();

    res.status(200).json({
      status: "success",
      message: "Reviewed questions processed successfully.",
      data: bank,
    });
  } catch (error) {
    console.error("Error in processReviewedAiQuestionsHandler:", error);
    if (error instanceof AppError) {
      next(error);
    } else if (error instanceof mongoose.Error.ValidationError) {
      next(new AppError(`Validation Error: ${error.message}`, 400));
    } else {
      next(
        new AppError(
          "An internal server error occurred while processing reviewed questions.",
          500
        )
      );
    }
  }
};
