import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errorHandler";
import { SopDocumentService } from "../services/sopDocumentService";
import mongoose from "mongoose";

export class SopDocumentController {
  // Placeholder for upload method
  static async uploadSopDocument(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Basic validation: user and restaurantId should be available from auth middleware
      if (!req.user || !req.user.restaurantId) {
        throw new AppError(
          "Authentication required: User or restaurantId not found.",
          401
        );
      }
      if (!req.file) {
        throw new AppError("No file uploaded.", 400);
      }
      const { title, description } = req.body;
      if (!title || typeof title !== "string" || title.trim() === "") {
        throw new AppError("Valid document title is required.", 400);
      }

      // Ensure restaurantId is a valid ObjectId string before converting
      let restaurantObjectId: mongoose.Types.ObjectId;
      try {
        restaurantObjectId = new mongoose.Types.ObjectId(req.user.restaurantId);
      } catch (error) {
        throw new AppError("Invalid restaurant ID format in user token.", 400);
      }

      const document = await SopDocumentService.handleDocumentUpload(
        req.file,
        restaurantObjectId,
        title.trim(),
        description?.trim()
      );

      res.status(201).json({
        message: "SOP Document uploaded successfully. Processing started.",
        documentId: document._id,
        title: document.title,
        status: document.status,
      });
    } catch (error: any) {
      // Check for Multer-specific error codes if needed, or generic message
      if (error.code === "LIMIT_FILE_SIZE") {
        return next(new AppError("File too large. Maximum size is 10MB.", 400));
      }
      // Check for custom error from sopFileFilter (based on message)
      if (
        error instanceof Error &&
        error.message.startsWith("Invalid file type")
      ) {
        return next(new AppError(error.message, 400));
      }
      // General catch for other errors from the service or unexpected issues
      next(error);
    }
  }

  static async listSopDocuments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.user.restaurantId) {
        throw new AppError(
          "Authentication required: User or restaurantId not found.",
          401
        );
      }
      const restaurantObjectId = new mongoose.Types.ObjectId(
        req.user.restaurantId
      );

      // Get status from query parameters
      const status = req.query.status as string | undefined;

      const documents = await SopDocumentService.listRestaurantSopDocuments(
        restaurantObjectId,
        status // Pass status to the service method
      );
      res.status(200).json({
        status: "success",
        results: documents.length,
        data: documents,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSopDocumentDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.user.restaurantId) {
        throw new AppError(
          "Authentication required: User or restaurantId not found.",
          401
        );
      }
      const { documentId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        throw new AppError("Invalid document ID format.", 400);
      }
      const restaurantObjectId = new mongoose.Types.ObjectId(
        req.user.restaurantId
      );
      const docObjectId = new mongoose.Types.ObjectId(documentId);

      const document = await SopDocumentService.getSopDocumentById(
        docObjectId,
        restaurantObjectId
      );

      if (!document) {
        throw new AppError(
          "SOP Document not found or not authorized for this restaurant.",
          404
        );
      }
      res.status(200).json({ status: "success", data: document });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSopDocument(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.user.restaurantId) {
        throw new AppError(
          "Authentication required: User or restaurantId not found.",
          401
        );
      }
      const { documentId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        throw new AppError("Invalid document ID format.", 400);
      }
      const restaurantObjectId = new mongoose.Types.ObjectId(
        req.user.restaurantId
      );
      const docObjectId = new mongoose.Types.ObjectId(documentId);

      const wasDeleted = await SopDocumentService.deleteSopDocument(
        docObjectId,
        restaurantObjectId
      );

      if (!wasDeleted) {
        throw new AppError(
          "SOP Document not found or not authorized for this restaurant, or delete failed.",
          404
        );
      }
      res.status(204).json({ status: "success", data: null });
    } catch (error) {
      next(error);
    }
  }

  static async getSopDocumentProcessingStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.user.restaurantId) {
        throw new AppError(
          "Authentication required: User or restaurantId not found.",
          401
        );
      }
      const { documentId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        throw new AppError("Invalid document ID format.", 400);
      }
      const restaurantObjectId = new mongoose.Types.ObjectId(
        req.user.restaurantId
      );
      const docObjectId = new mongoose.Types.ObjectId(documentId);

      const statusInfo = await SopDocumentService.getSopDocumentStatus(
        docObjectId,
        restaurantObjectId
      );

      if (!statusInfo) {
        throw new AppError(
          "SOP Document not found or not authorized for this restaurant.",
          404
        );
      }
      res.status(200).json({ status: "success", data: statusInfo });
    } catch (error) {
      next(error);
    }
  }

  // TODO: Add other controller methods (get, list, delete, getStatus)
}
