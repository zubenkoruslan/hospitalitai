import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { QuizService, CreateQuizFromBanksData } from "../services/quizService"; // Import CreateQuizFromBanksData
import { AppError } from "../utils/errorHandler"; // For error handling
import {
  GenerateQuizFromBanksRequestBody,
  SubmitQuizAttemptRequestBody,
  UpdateQuizRequestBody, // Added UpdateQuizRequestBody import
} from "../types/quizTypes"; // Added import
import QuizModel, { IQuiz } from "../models/QuizModel"; // Added IQuiz import
import NotificationService from "../services/notificationService";
import User from "../models/User";

// Removed local GenerateQuizFromBanksRequestBody interface
// Removed local SubmitQuizAttemptRequestBody interface

export const generateQuizFromBanksController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      title,
      description,
      questionBankIds,
      sourceSopDocumentId,
      numberOfQuestionsPerAttempt,
      targetRoles,
      retakeCooldownHours,
    } = req.body as GenerateQuizFromBanksRequestBody;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing.", 401)
      );
    }
    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);
    // Validation for body fields (title, questionBankIds, numberOfQuestionsPerAttempt)
    // is assumed to be handled by validateGenerateQuizFromBanksBody in the routes file.

    const quizData: CreateQuizFromBanksData = {
      title,
      description,
      restaurantId,
      questionBankIds,
      sourceSopDocumentId,
      numberOfQuestionsPerAttempt,
      retakeCooldownHours,
      targetRoles: targetRoles
        ? targetRoles.map((id) => new mongoose.Types.ObjectId(id))
        : undefined,
    };

    const newQuiz = await QuizService.generateQuizFromBanksService(quizData);

    // Create notifications for staff members when a new quiz is created
    try {
      let staffToNotify = [];

      // If quiz has target roles, notify only staff with those roles
      if (newQuiz.targetRoles && newQuiz.targetRoles.length > 0) {
        staffToNotify = await User.find({
          restaurantId: restaurantId,
          role: "staff",
          assignedRoleId: { $in: newQuiz.targetRoles },
        })
          .select("_id")
          .lean();
      } else {
        // If no target roles, notify all staff in the restaurant
        staffToNotify = await User.find({
          restaurantId: restaurantId,
          role: "staff",
        })
          .select("_id")
          .lean();
      }

      // Create notifications for all relevant staff members
      if (staffToNotify.length > 0) {
        const notifications = staffToNotify.map((staff) => ({
          type: "new_quiz" as const,
          content: `A new quiz "${newQuiz.title}" has been created and is available for you to take`,
          userId: staff._id,
          restaurantId: restaurantId,
          relatedId: newQuiz._id,
          metadata: { quizId: newQuiz._id },
        }));

        await NotificationService.createBulkNotifications(notifications);
        console.log(
          `Created ${notifications.length} notifications for new quiz: ${newQuiz.title}`
        );
      }
    } catch (notificationError) {
      console.error("Error creating quiz notifications:", notificationError);
      // Don't fail the quiz creation if notifications fail
    }

    res.status(201).json({
      message: "Quiz generated successfully from question banks.",
      data: newQuiz,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error(
        "Unexpected error in generateQuizFromBanksController:",
        error
      );
    }
    next(error);
  }
};

// Add other quiz controller functions here as needed

export const startQuizAttemptController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { quizId } = req.params;
    if (!req.user || !req.user.userId) {
      return next(new AppError("User not authenticated.", 401));
    }
    // quizId validation is assumed to be handled by validateQuizIdParam in the routes file.

    const staffUserId = new mongoose.Types.ObjectId(req.user.userId);
    const quizObjectId = new mongoose.Types.ObjectId(quizId);

    const questions = await QuizService.startQuizAttempt(
      staffUserId,
      quizObjectId
    );

    // No explicit attemptId is created or returned here by the service.
    // The client will receive the questions array directly.
    // If questions.length is 0, the service itself handles the logic of quiz completion or no availability.

    res.status(200).json({
      status: "success",
      message:
        questions.length > 0
          ? "Quiz attempt questions fetched."
          : "No new questions available for this quiz, or quiz completed.",
      data: questions, // Send the array of questions directly
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error("Unexpected error in startQuizAttemptController:", error);
    }
    next(error);
  }
};

export const submitQuizAttemptController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { quizId } = req.params;
    const attemptData = req.body as SubmitQuizAttemptRequestBody;

    if (!req.user || !req.user.userId) {
      return next(new AppError("User not authenticated.", 401));
    }
    // quizId validation is assumed to be handled by validateQuizIdParam in the routes file.
    // attemptData validation is assumed to be handled by validateSubmitQuizAttemptBody in the routes file.

    const staffUserId = new mongoose.Types.ObjectId(req.user.userId);
    const quizObjectId = new mongoose.Types.ObjectId(quizId);

    const result = await QuizService.submitQuizAttempt(
      staffUserId,
      quizObjectId,
      attemptData
    );

    // Create completion notification for the staff member
    try {
      const quiz = await QuizModel.findById(quizObjectId)
        .select("title")
        .lean<Pick<IQuiz, "title">>();
      if (quiz) {
        const percentage = Math.round(
          (result.score / result.totalQuestionsAttempted) * 100
        );

        await NotificationService.createNotification({
          type: "completed_training",
          content: `Congratulations! You completed "${quiz.title}" with a score of ${percentage}% (${result.score}/${result.totalQuestionsAttempted})`,
          userId: staffUserId,
          restaurantId: new mongoose.Types.ObjectId(req.user!.restaurantId!),
          relatedId: quizObjectId,
          metadata: {
            quizId: quizObjectId,
            score: result.score,
            totalQuestions: result.totalQuestionsAttempted,
            percentage: percentage,
          },
        });

        console.log(
          `Created completion notification for user ${staffUserId} completing quiz ${quiz.title}`
        );
      }
    } catch (notificationError) {
      console.error(
        "Error creating completion notification:",
        notificationError
      );
      // Don't fail the submission if notifications fail
    }

    res.status(200).json({
      status: "success",
      message: "Quiz attempt submitted successfully.",
      data: result,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error("Unexpected error in submitQuizAttemptController:", error);
    }
    next(error);
  }
};

export const getStaffQuizProgressController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { quizId } = req.params;
    if (!req.user || !req.user.userId) {
      return next(new AppError("User not authenticated.", 401));
    }
    // quizId validation is assumed to be handled by validateQuizIdParam in the routes file.

    const staffUserId = new mongoose.Types.ObjectId(req.user.userId);
    const quizObjectId = new mongoose.Types.ObjectId(quizId);

    const progress = await QuizService.getStaffQuizProgress(
      staffUserId,
      quizObjectId
    );

    // Note: Service now returns IStaffQuizProgressWithAttemptDetails | null
    // which might need adjustment if we are moving to a list of attempts here.
    // For now, this controller remains as is, focusing on adding the new one.

    res.status(200).json({
      status: "success",
      data: progress, // Could be null if no progress found
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error(
        "Unexpected error in getStaffQuizProgressController:",
        error
      );
    }
    next(error);
  }
};

export const getQuizAttemptDetailsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { attemptId } = req.params;
    const requestingUserId = req.user?.userId?.toString(); // req.user.userId should be string per AuthPayload

    if (!requestingUserId) {
      return next(
        new AppError("User not authenticated or user ID missing.", 401)
      );
    }
    // attemptId validation (e.g. isMongoId using validateObjectId('attemptId'))
    // is assumed to be handled in the routes file.

    const attemptDetails = await QuizService.getQuizAttemptDetails(
      attemptId, // attemptId will be a string from req.params
      requestingUserId
    );

    res.status(200).json({
      status: "success",
      data: attemptDetails,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error(
        "Unexpected error in getQuizAttemptDetailsController:",
        error
      );
    }
    next(error);
  }
};

export const getRestaurantQuizStaffProgressController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { quizId } = req.params;
    const restaurantIdFromParams = req.params.restaurantId; // This is optional in some route definitions

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError(
          "User not authenticated or restaurant association missing.",
          401
        )
      );
    }

    let restaurantObjectId: mongoose.Types.ObjectId;

    // restaurantIdFromParams validation (isMongoId using validateObjectId('restaurantId'))
    // is assumed to be handled in the routes file IF this param is mandatory for the route.
    // If the route allows restaurantId to be optional in params, then this logic is fine.
    if (restaurantIdFromParams) {
      // Authorization check:
      if (req.user.restaurantId.toString() !== restaurantIdFromParams) {
        return next(
          new AppError(
            "Forbidden: You do not have access to this restaurant's data.",
            403
          )
        );
      }
      restaurantObjectId = new mongoose.Types.ObjectId(restaurantIdFromParams);
    } else {
      // If restaurantId is not in params, use the logged-in user's restaurantId.
      restaurantObjectId = new mongoose.Types.ObjectId(req.user.restaurantId);
    }

    // quizId validation is assumed to be handled by validateQuizIdParam in the routes file.
    const quizObjectId = new mongoose.Types.ObjectId(quizId);

    const progressList = await QuizService.getRestaurantQuizStaffProgress(
      restaurantObjectId,
      quizObjectId
    );

    res.status(200).json({
      status: "success",
      data: progressList,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error(
        "Unexpected error in getRestaurantQuizStaffProgressController:",
        error
      );
    }
    next(error);
  }
};

export const resetQuizProgressController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { quizId } = req.params;
    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing.", 401)
      );
    }
    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);
    const quizObjectId = new mongoose.Types.ObjectId(quizId);

    const result = await QuizService.resetQuizProgressForEveryone(
      quizObjectId,
      restaurantId
    );

    res.status(200).json({
      status: "success",
      message: "Quiz progress reset successfully for all staff.",
      data: {
        updatedProgressCount: result.updatedProgressCount,
        deletedAttemptsCount: result.deletedAttemptsCount,
      },
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error("Unexpected error in resetQuizProgressController:", error);
    }
    next(error);
  }
};

export const updateQuizController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { quizId } = req.params;
    const updateDataFromRequest = req.body as UpdateQuizRequestBody;

    if (!req.user || !req.user.restaurantId) {
      return next(
        new AppError("User not authenticated or restaurantId missing.", 401)
      );
    }
    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId);
    const quizObjectId = new mongoose.Types.ObjectId(quizId);

    // Construct the final updateData object to be passed to the service
    const updateDataForService: Partial<IQuiz> = {
      ...(updateDataFromRequest.title && {
        title: updateDataFromRequest.title,
      }),
      ...(updateDataFromRequest.description && {
        description: updateDataFromRequest.description,
      }),
      ...(updateDataFromRequest.questionBankIds && {
        sourceQuestionBankIds: updateDataFromRequest.questionBankIds.map(
          (id) => new mongoose.Types.ObjectId(id)
        ),
      }),
      ...(updateDataFromRequest.numberOfQuestionsPerAttempt && {
        numberOfQuestionsPerAttempt:
          updateDataFromRequest.numberOfQuestionsPerAttempt,
      }),
      ...(typeof updateDataFromRequest.isAvailable === "boolean" && {
        isAvailable: updateDataFromRequest.isAvailable,
      }),
      ...(updateDataFromRequest.targetRoles && {
        targetRoles: updateDataFromRequest.targetRoles.map(
          (id) => new mongoose.Types.ObjectId(id)
        ),
      }),
      ...(updateDataFromRequest.retakeCooldownHours !== undefined && {
        // Added field
        retakeCooldownHours: updateDataFromRequest.retakeCooldownHours,
      }),
    };

    // Remove undefined properties to avoid overwriting with null if not provided
    Object.keys(updateDataForService).forEach(
      (key) =>
        (updateDataForService as any)[key] === undefined &&
        delete (updateDataForService as any)[key]
    );

    if (Object.keys(updateDataForService).length === 0) {
      return next(new AppError("No update data provided.", 400));
    }

    const updatedQuiz = await QuizService.updateQuiz(
      quizObjectId,
      restaurantId,
      updateDataForService
    );

    if (!updatedQuiz) {
      // This case might be redundant if service throws 404, but good for safety
      return next(new AppError("Quiz not found or failed to update.", 404));
    }

    res.status(200).json({
      message: "Quiz updated successfully.",
      data: updatedQuiz,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      console.error("Unexpected error in updateQuizController:", error);
    }
    next(error);
  }
};
