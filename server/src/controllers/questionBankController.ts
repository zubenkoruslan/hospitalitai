import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errorHandler"; // Assuming you have a custom error handler
import * as QuestionBankService from "../services/questionBankService";
import mongoose from "mongoose";
import {
  CreateQuestionBankData as _CreateQuestionBankData,
  UpdateQuestionBankData as _UpdateQuestionBankData,
  CreateQuestionBankFromMenuData,
  CreateQuestionBankFromSopData,
} from "../services/questionBankService";
import QuestionModel, { IQuestion } from "../models/QuestionModel"; // Import QuestionModel and IQuestion
import QuestionBankModel from "../models/QuestionBankModel"; // Import QuestionBankModel
import AiQuestionService, {
  GenerateQuestionsFromSopParams,
} from "../services/AiQuestionService"; // Import AiQuestionService and relevant types

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
  console.log("\n[ReviewCtrl DEBUG] Handler started.");
  try {
    const { bankId } = req.params;
    console.log(`[ReviewCtrl DEBUG] Bank ID: ${bankId}`);
    const {
      acceptedQuestions = [],
      updatedQuestions = [],
      deletedQuestionIds = [],
    }: ProcessReviewedQuestionsBody = req.body;

    console.log(
      "[ReviewCtrl DEBUG] Received req.body:",
      JSON.stringify(req.body, null, 2)
    );

    if (!req.user || !req.user.restaurantId) {
      console.error(
        "[ReviewCtrl DEBUG] Auth error: User or restaurantId missing."
      );
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId as mongoose.Types.ObjectId;

    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      console.error(`[ReviewCtrl DEBUG] Invalid Bank ID: ${bankId}`);
      return next(new AppError("Invalid Question Bank ID format.", 400));
    }

    const bank = await QuestionBankModel.findOne({
      _id: bankId,
      restaurantId,
    });

    if (!bank) {
      console.error(`[ReviewCtrl DEBUG] Bank not found: ${bankId}`);
      return next(
        new AppError(
          `Question Bank with ID ${bankId} not found for this restaurant.`,
          404
        )
      );
    }
    console.log(`[ReviewCtrl DEBUG] Found bank: ${bank.name}`);

    const questionIdsToAddToBank = new Set<string>(
      bank.questions.map((q) => q.toString())
    );
    const questionsToSave: mongoose.Document<unknown, {}, IQuestion>[] = [];

    if (deletedQuestionIds.length > 0) {
      console.log(
        `[ReviewCtrl DEBUG] Processing ${deletedQuestionIds.length} deletedQuestionIds.`
      );
      await QuestionModel.updateMany(
        { _id: { $in: deletedQuestionIds }, restaurantId },
        { $set: { status: "rejected" } }
      );
      deletedQuestionIds.forEach((id) => questionIdsToAddToBank.delete(id));
    }

    if (updatedQuestions.length > 0) {
      console.log(
        `[ReviewCtrl DEBUG] Processing ${updatedQuestions.length} updated questions.`
      );
    }
    for (const qData of updatedQuestions) {
      console.log("[ReviewCtrl DEBUG] Processing updated qData (summary):", {
        _id: qData._id,
        textStart: qData.questionText?.substring(0, 20),
        statusFromClient: qData.status,
      });
      if (!qData._id || !mongoose.Types.ObjectId.isValid(qData._id)) {
        console.warn(
          "[ReviewCtrl DEBUG] Skipping update for question with invalid/missing _id:",
          qData._id
        );
        continue;
      }
      const question = await QuestionModel.findOne({
        _id: qData._id,
        restaurantId,
      });
      if (question) {
        console.log(
          `[ReviewCtrl DEBUG] Found existing question to update: ${question._id}, current status: ${question.status}`
        );
        Object.assign(question, qData);
        question.status = "active";
        console.log(
          `[ReviewCtrl DEBUG] Setting updated question ${question._id} status to active.`
        );
        question.restaurantId = restaurantId;
        question.createdBy = question.createdBy || "ai";
        questionsToSave.push(question);
        questionIdsToAddToBank.add(question._id.toString());
      } else {
        console.warn(
          `[ReviewCtrl DEBUG] Question with _id ${qData._id} not found for update.`
        );
      }
    }

    if (acceptedQuestions.length > 0) {
      console.log(
        `[ReviewCtrl DEBUG] Processing ${acceptedQuestions.length} accepted questions.`
      );
    }
    for (const qData of acceptedQuestions) {
      console.log("[ReviewCtrl DEBUG] Processing accepted qData (summary):", {
        _id: qData._id,
        textStart: qData.questionText?.substring(0, 20),
        statusFromClient: qData.status,
      });
      if (qData._id && mongoose.Types.ObjectId.isValid(qData._id)) {
        const question = await QuestionModel.findOne({
          _id: qData._id,
          restaurantId,
        });
        if (question) {
          console.log(
            `[ReviewCtrl DEBUG] Found existing question to accept: ${question._id}, current status: ${question.status}`
          );
          if (
            question.status === "pending_review" ||
            question.status === "rejected"
          ) {
            Object.assign(question, qData);
            question.status = "active";
            console.log(
              `[ReviewCtrl DEBUG] Setting accepted question ${question._id} status to active.`
            );
            question.restaurantId = restaurantId;
            question.createdBy = question.createdBy || "ai";
            questionsToSave.push(question);
            questionIdsToAddToBank.add(question._id.toString());
          } else if (question.status === "active") {
            console.log(
              `[ReviewCtrl DEBUG] Question ${question._id} already active, ensuring in bank.`
            );
            questionIdsToAddToBank.add(question._id.toString());
          }
        } else {
          console.warn(
            `[ReviewCtrl DEBUG] Accepted question with _id ${qData._id} not found.`
          );
        }
      } else {
        console.log(
          "[ReviewCtrl DEBUG] Processing accepted qData as new question (no valid _id).",
          {
            textStart: qData.questionText?.substring(0, 20),
            statusFromClient: qData.status,
          }
        );
        const newQuestionDocument = new QuestionModel({
          ...qData,
          status: "active",
          createdBy: "ai",
          restaurantId,
        });
        questionsToSave.push(newQuestionDocument);
      }
    }

    if (questionsToSave.length > 0) {
      console.log(
        `[ReviewCtrl DEBUG] Attempting to bulkSave ${questionsToSave.length} questions.`
      );
      for (const q of questionsToSave) {
        // Safely access properties for logging, assuming q is a Mongoose document for IQuestion
        const qAsIQuestion = q as any as IQuestion; // Cast to IQuestion for easier access in log
        console.log(
          `[ReviewCtrl DEBUG]  - Saving Q_ID: ${qAsIQuestion._id}, Status: ${
            qAsIQuestion.status
          }, TextStart: ${qAsIQuestion.questionText?.substring(0, 30)}`
        );
      }
      await QuestionModel.bulkSave(questionsToSave);
      console.log("[ReviewCtrl DEBUG] bulkSave completed.");

      questionsToSave.forEach((doc) => {
        if (doc && doc._id && !questionIdsToAddToBank.has(doc._id.toString())) {
          console.log(
            `[ReviewCtrl DEBUG] Adding newly saved Q_ID ${doc._id} to bank's list.`
          );
          questionIdsToAddToBank.add(doc._id.toString());
        }
      });
    }

    const finalQuestionIdsForBank = Array.from(questionIdsToAddToBank).map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    console.log(
      `[ReviewCtrl DEBUG] Final ${finalQuestionIdsForBank.length} question IDs for bank ${bank.name}:`,
      finalQuestionIdsForBank.map((id) => id.toString())
    );
    bank.questions = finalQuestionIdsForBank;

    if (typeof (bank as any).updateQuestionCountAndCategories === "function") {
      console.log(
        "[ReviewCtrl DEBUG] Calling bank.updateQuestionCountAndCategories()."
      );
      await (bank as any).updateQuestionCountAndCategories();
    } else {
      console.warn(
        "[ReviewCtrl DEBUG] bank.updateQuestionCountAndCategories() method not found. Recalculating manually."
      );
      bank.questionCount = bank.questions.length;
      const activeQuestionsInBank = await QuestionModel.find({
        _id: { $in: bank.questions },
        status: "active",
        restaurantId: restaurantId,
      }).lean();
      const categories = new Set<string>();
      activeQuestionsInBank.forEach((q) => {
        if (q.categories && Array.isArray(q.categories)) {
          q.categories.forEach((cat: string) => categories.add(cat));
        }
      });
      bank.categories = Array.from(categories);
      console.log(
        `[ReviewCtrl DEBUG] Manual recalculation: count=${
          bank.questionCount
        }, categories=${bank.categories.join(",")}`
      );
    }
    console.log("[ReviewCtrl DEBUG] Saving bank changes.");
    await bank.save();
    console.log(
      "[ReviewCtrl DEBUG] Bank saved. Handler finished successfully."
    );

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

// Controller to create a Question Bank from an SOP Document
export const createQuestionBankFromSop = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, sopDocumentId, selectedCategoryNames } =
      req.body;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId as mongoose.Types.ObjectId;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim() === "") {
      return next(new AppError("Question bank name is required.", 400));
    }
    if (!sopDocumentId || !mongoose.Types.ObjectId.isValid(sopDocumentId)) {
      return next(new AppError("Valid SOP Document ID is required.", 400));
    }
    if (
      !selectedCategoryNames ||
      !Array.isArray(selectedCategoryNames) ||
      selectedCategoryNames.some(
        (cat) => typeof cat !== "string" || cat.trim() === ""
      )
    ) {
      // Allow empty array for selectedCategoryNames (meaning use all/default from SOP), but if provided, must be valid strings.
      // If an empty array is not allowed, add selectedCategoryNames.length === 0 to the condition.
      if (selectedCategoryNames && selectedCategoryNames.length > 0) {
        // Only validate content if array is not empty
        return next(
          new AppError(
            "selectedCategoryNames must be an array of non-empty strings if provided.",
            400
          )
        );
      } else if (!selectedCategoryNames) {
        // If undefined/null, treat as an issue if it must be at least an empty array.
        return next(
          new AppError(
            "selectedCategoryNames (even if empty) is required.",
            400
          )
        );
      }
    }

    const bankData: CreateQuestionBankFromSopData = {
      name: name.trim(),
      description: description?.trim(),
      restaurantId,
      sopDocumentId: new mongoose.Types.ObjectId(sopDocumentId),
      selectedCategoryNames: selectedCategoryNames || [], // Default to empty array if not provided
    };

    const newBank = await QuestionBankService.createBankFromSopDocumentService(
      bankData
    );

    res.status(201).json({
      status: "success",
      message: "Question bank created successfully from SOP document.",
      data: newBank,
    });
  } catch (error) {
    next(error);
  }
};

export const generateAiQuestionsForSopBank = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bankId } = req.params;
    const { targetQuestionCount, questionTypes, difficulty } = req.body;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantIdString = req.user.restaurantId.toString();

    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      return next(new AppError("Invalid Question Bank ID format.", 400));
    }

    const bank = await QuestionBankModel.findById(bankId);
    if (!bank) {
      return next(new AppError("Question Bank not found.", 404));
    }
    if (bank.sourceType !== "sop_document" || !bank.sourceDocumentId) {
      return next(
        new AppError(
          "This Question Bank is not sourced from an SOP document.",
          400
        )
      );
    }
    if (bank.restaurantId.toString() !== restaurantIdString) {
      return next(
        new AppError("Question Bank does not belong to this restaurant.", 403)
      );
    }
    if (!bank.selectedCategories || bank.selectedCategories.length === 0) {
      return next(
        new AppError(
          "SOP Question Bank has no selected categories to generate questions from.",
          400
        )
      );
    }

    if (
      !targetQuestionCount ||
      typeof targetQuestionCount !== "number" ||
      targetQuestionCount <= 0
    ) {
      return next(new AppError("Valid targetQuestionCount is required.", 400));
    }
    if (
      !questionTypes ||
      !Array.isArray(questionTypes) ||
      questionTypes.length === 0 ||
      questionTypes.some((qt) => typeof qt !== "string")
    ) {
      return next(
        new AppError("questionTypes must be a non-empty array of strings.", 400)
      );
    }
    if (!difficulty || typeof difficulty !== "string") {
      return next(new AppError("Difficulty level is required.", 400));
    }

    const sopQuestionParams: GenerateQuestionsFromSopParams = {
      sopDocumentId: bank.sourceDocumentId.toString(),
      selectedSopCategoryNames: bank.selectedCategories.map((sc) => sc.name),
      targetQuestionCount,
      questionTypes,
      difficulty,
      restaurantId: restaurantIdString,
    };

    const rawQuestions =
      await AiQuestionService.generateQuestionsFromSopCategoriesService(
        sopQuestionParams
      );

    if (!rawQuestions || rawQuestions.length === 0) {
      return next(
        new AppError(
          "AI failed to generate questions for the SOP content. Please review SOP content or parameters.",
          500
        )
      );
    }

    const pendingQuestions =
      await AiQuestionService.saveGeneratedQuestionsAsPendingReview(
        rawQuestions,
        restaurantIdString
      );

    res.status(200).json({
      status: "success",
      message: `${pendingQuestions.length} questions generated from SOP and saved as pending review.`,
      data: {
        questionBankId: bankId,
        pendingReviewQuestionIds: pendingQuestions.map((q: IQuestion) => q._id),
      },
    });
  } catch (error) {
    next(error);
  }
};
