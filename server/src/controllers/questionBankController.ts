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

// Controller to add a category to a question bank
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

    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      return next(new AppError(`Invalid bank ID format: ${bankId}`, 400));
    }

    if (
      !categoryName ||
      typeof categoryName !== "string" ||
      categoryName.trim() === ""
    ) {
      return next(
        new AppError(
          "Category name must be a non-empty string and provided in the request body.",
          400
        )
      );
    }

    const updatedBank =
      await QuestionBankService.addCategoryToQuestionBankService(
        bankId,
        restaurantId,
        categoryName.trim()
      );

    // The service throws a 404 if bank is not found, so we don't need to re-check here.
    // If updatedBank is null for other reasons (though service aims to throw), it would be an issue.

    res.status(200).json({
      status: "success",
      message: "Category added to question bank successfully.",
      data: updatedBank,
    });
  } catch (error) {
    next(error);
  }
};

// Controller to remove a category from a question bank
export const removeCategoryFromQuestionBank = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bankId, categoryName: categoryNameFromParams } = req.params; // categoryName from URL
    // For consistency, let's expect categoryName in params, matching the DELETE route structure.
    // If it were from body: const { categoryName: categoryNameFromBody } = req.body;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = req.user.restaurantId as mongoose.Types.ObjectId;

    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      return next(new AppError(`Invalid bank ID format: ${bankId}`, 400));
    }

    const categoryName = categoryNameFromParams; // Use the one from params

    if (
      !categoryName ||
      typeof categoryName !== "string" ||
      categoryName.trim() === ""
    ) {
      // This validation might be redundant if Express routing already ensures categoryName is present
      // but good for robustness if param might be missing or empty despite route structure.
      return next(
        new AppError(
          "Category name must be a non-empty string and provided in the URL path.",
          400
        )
      );
    }

    const updatedBank =
      await QuestionBankService.removeCategoryFromQuestionBankService(
        bankId,
        restaurantId,
        categoryName.trim()
      );

    // Service throws 404 if bank not found.

    res.status(200).json({
      status: "success",
      message: "Category removed from question bank successfully.",
      data: updatedBank, // Contains the bank state *after* removal.
      // If category wasn't there, $pull does nothing, bank is returned as is.
    });
  } catch (error) {
    next(error);
  }
};

export const processReviewedAiQuestionsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bankId } = req.params;
    const { acceptedQuestions, updatedQuestions, deletedQuestionIds } =
      req.body as {
        acceptedQuestions: IQuestion[];
        updatedQuestions: IQuestion[];
        deletedQuestionIds: string[];
      };

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing", 401)
      );
    }
    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);
    const mongoBankId = new mongoose.Types.ObjectId(bankId);

    // 1. Validate Bank exists and belongs to the user's restaurant
    const questionBank = await QuestionBankModel.findOne({
      _id: mongoBankId,
      restaurantId: restaurantId,
    });

    if (!questionBank) {
      return next(
        new AppError(
          `Question bank not found with ID: ${bankId} for your restaurant.`,
          404
        )
      );
    }

    const processedQuestionIds: mongoose.Types.ObjectId[] = [];
    const errors: { questionId?: string; message: string }[] = [];

    // 2. Process acceptedQuestions (new or pending_review questions to make active)
    if (acceptedQuestions && acceptedQuestions.length > 0) {
      for (const qData of acceptedQuestions) {
        try {
          let questionToSave: IQuestion;
          if (qData._id) {
            // Existing pending question being accepted/updated
            const existingQuestion = await QuestionModel.findOneAndUpdate(
              {
                _id: qData._id,
                restaurantId: restaurantId,
                status: "pending_review",
                createdBy: "ai",
              },
              {
                ...qData,
                status: "active",
                restaurantId: restaurantId,
                _id: qData._id,
              }, // Ensure restaurantId is part of update
              { new: true, runValidators: true }
            );
            if (!existingQuestion) {
              errors.push({
                questionId: qData._id.toString(),
                message:
                  "Failed to find or update pending question for acceptance.",
              });
              continue;
            }
            questionToSave = existingQuestion;
          } else {
            // Brand new question (e.g., user added one during review)
            const newQ = new QuestionModel({
              ...qData,
              restaurantId: restaurantId,
              status: "active",
              createdBy: "ai", // Or 'manual' if user can create brand new ones here
            });
            questionToSave = await newQ.save();
          }
          processedQuestionIds.push(questionToSave._id);
        } catch (err: any) {
          errors.push({
            questionId: qData._id?.toString(),
            message: `Error accepting question: ${err.message}`,
          });
        }
      }
    }

    // 3. Process updatedQuestions (existing pending questions that were modified)
    // This logic is largely covered by acceptedQuestions if they pass the full IQuestion object.
    // If updatedQuestions only contains partial updates for already pending items, this section would be different.
    // For now, assuming updatedQuestions are full IQuestion objects from pending_review, similar to accepted.
    if (updatedQuestions && updatedQuestions.length > 0) {
      for (const qData of updatedQuestions) {
        if (!qData._id) {
          errors.push({ message: "Updated question is missing an _id." });
          continue;
        }
        try {
          const updatedQ = await QuestionModel.findOneAndUpdate(
            {
              _id: qData._id,
              restaurantId: restaurantId,
              status: "pending_review",
              createdBy: "ai",
            },
            { ...qData, status: "active", restaurantId: restaurantId }, // Ensure all necessary fields are set
            { new: true, runValidators: true }
          );
          if (!updatedQ) {
            errors.push({
              questionId: qData._id.toString(),
              message: "Failed to find or update pending question.",
            });
            continue;
          }
          processedQuestionIds.push(updatedQ._id);
        } catch (err: any) {
          errors.push({
            questionId: qData._id.toString(),
            message: `Error updating question: ${err.message}`,
          });
        }
      }
    }

    // 4. Process deletedQuestionIds (mark as 'rejected' or delete)
    if (deletedQuestionIds && deletedQuestionIds.length > 0) {
      for (const id of deletedQuestionIds) {
        try {
          // Option 1: Mark as rejected
          const result = await QuestionModel.findOneAndUpdate(
            {
              _id: new mongoose.Types.ObjectId(id),
              restaurantId: restaurantId,
              createdBy: "ai",
            }, // ensure it was an AI question for this restaurant
            { status: "rejected" },
            { new: true }
          );
          // Option 2: Actually delete
          // await QuestionModel.deleteOne({ _id: id, restaurantId: restaurantId });
          if (
            !result &&
            (acceptedQuestions?.find((q) => q._id?.toString() === id) ||
              updatedQuestions?.find((q) => q._id?.toString() === id))
          ) {
            // If it was just accepted/updated, don't mark as error for deletion if not found as pending
          } else if (!result) {
            errors.push({
              questionId: id,
              message:
                "Failed to find AI question to mark as rejected or it was already processed.",
            });
          }
        } catch (err: any) {
          errors.push({
            questionId: id,
            message: `Error deleting/rejecting question: ${err.message}`,
          });
        }
      }
    }

    // 5. Update Question Bank with new, unique question IDs
    if (processedQuestionIds.length > 0) {
      const uniqueNewQuestionIds = processedQuestionIds.filter(
        (id) =>
          !questionBank.questions.some((existingId) => existingId.equals(id))
      );
      if (uniqueNewQuestionIds.length > 0) {
        questionBank.questions.push(...uniqueNewQuestionIds);
        await questionBank.save();
      }
    }

    if (errors.length > 0) {
      // Partial success if some questions were processed but errors occurred
      return res.status(207).json({
        status: "partial_success",
        message: "AI questions processed with some errors.",
        processedCount: processedQuestionIds.length,
        data: questionBank,
        errors,
      });
    }

    res.status(200).json({
      status: "success",
      message: "AI questions processed and added to bank successfully.",
      data: questionBank,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
      return next(new AppError(`Invalid ID format: ${error.message}`, 400));
    }
    next(error);
  }
};
