import { Request, Response, NextFunction } from "express";
import { SopDocumentEditService } from "../services/sopDocumentService";
import { AppError } from "../utils/errorHandler";
import mongoose from "mongoose";

// Assuming authMiddleware populates req.user with a structure like AuthPayload
// from your authMiddleware.ts or global Express types.
// Ensure this matches the actual structure of req.user
interface AuthPayloadForController {
  userId: mongoose.Types.ObjectId; // Corrected: Changed from id: string
  role: string; // Added: from AuthPayload
  name: string; // Added: from AuthPayload
  restaurantId?: mongoose.Types.ObjectId; // Corrected: Type and optionality match AuthPayload
  restaurantName?: string; // Added: from AuthPayload (optional)
  professionalRole?: string; // Added: from AuthPayload (optional)
  // iat and exp are also in AuthPayload but not typically used directly in controllers
}

interface AuthenticatedRequest extends Request {
  user?: AuthPayloadForController; // Use the more aligned interface
}

export class SopDocumentEditController {
  /**
   * Updates the title of an SOP document.
   * Expects: documentId in params, { title } in body.
   */
  static async updateTitle(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { documentId } = req.params;
      const { title } = req.body;
      const restaurantIdFromUser = req.user?.restaurantId; // Correctly access restaurantId

      if (!req.user || !restaurantIdFromUser) {
        // Check req.user itself as well
        return next(
          new AppError(
            "Authentication error: Restaurant ID not found on user.",
            401
          )
        );
      }
      if (!title || typeof title !== "string" || title.trim() === "") {
        return next(new AppError("Valid title is required.", 400));
      }
      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        return next(new AppError("Invalid document ID format.", 400));
      }
      // restaurantIdFromUser is already a mongoose.Types.ObjectId if it exists and matches AuthPayload

      const updatedDocument =
        await SopDocumentEditService.updateSopDocumentTitle(
          new mongoose.Types.ObjectId(documentId),
          title,
          restaurantIdFromUser // Pass it directly
        );

      if (!updatedDocument) {
        return next(
          new AppError("Document not found or failed to update.", 404)
        );
      }
      res.status(200).json({ status: "success", data: updatedDocument });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates the description of an SOP document.
   * Expects: documentId in params, { description } in body.
   */
  static async updateDescription(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { documentId } = req.params;
      const { description } = req.body; // Description can be an empty string to clear it
      const restaurantIdFromUser = req.user?.restaurantId;

      if (!req.user || !restaurantIdFromUser) {
        return next(
          new AppError(
            "Authentication error: Restaurant ID not found on user.",
            401
          )
        );
      }
      if (description === undefined || typeof description !== "string") {
        return next(
          new AppError(
            "Valid description (string, can be empty) is required.",
            400
          )
        );
      }
      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        return next(new AppError("Invalid document ID format.", 400));
      }

      const updatedDocument =
        await SopDocumentEditService.updateSopDocumentDescription(
          new mongoose.Types.ObjectId(documentId),
          description, // Pass the description (can be empty)
          restaurantIdFromUser
        );

      if (!updatedDocument) {
        return next(
          new AppError(
            "Document not found or failed to update description.",
            404
          )
        );
      }
      res.status(200).json({ status: "success", data: updatedDocument });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Adds a category to an SOP document.
   * Expects: documentId in params, { name, content, parentCategoryId? } in body.
   */
  static async addCategory(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { documentId } = req.params;
      const { name, content, parentCategoryId } = req.body; // parentCategoryId is optional
      const restaurantIdFromUser = req.user?.restaurantId;

      if (!req.user || !restaurantIdFromUser) {
        return next(
          new AppError(
            "Authentication error: Restaurant ID not found on user.",
            401
          )
        );
      }
      if (!name || typeof name !== "string" || name.trim() === "") {
        return next(new AppError("Category name is required.", 400));
      }
      if (content === undefined || typeof content !== "string") {
        // Allow empty string for content
        return next(
          new AppError(
            "Category content is required (can be an empty string).",
            400
          )
        );
      }
      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        return next(new AppError("Invalid document ID format.", 400));
      }
      if (
        parentCategoryId &&
        !mongoose.Types.ObjectId.isValid(parentCategoryId)
      ) {
        return next(new AppError("Invalid parent category ID format.", 400));
      }

      const updatedDocument = await SopDocumentEditService.addCategoryToSop(
        new mongoose.Types.ObjectId(documentId),
        parentCategoryId ? parentCategoryId.toString() : null, // Service expects string or null
        { name, content },
        restaurantIdFromUser
      );

      if (!updatedDocument) {
        return next(
          new AppError("Document not found or failed to add category.", 404)
        );
      }
      res.status(201).json({ status: "success", data: updatedDocument });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates an existing category within an SOP document.
   * Expects: documentId, categoryId in params, { name?, content? } in body.
   */
  static async updateCategory(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { documentId, categoryId } = req.params;
      const { name, content } = req.body;
      const restaurantIdFromUser = req.user?.restaurantId;

      if (!req.user || !restaurantIdFromUser) {
        return next(
          new AppError(
            "Authentication error: Restaurant ID not found on user.",
            401
          )
        );
      }
      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        return next(new AppError("Invalid document ID format.", 400));
      }
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return next(new AppError("Invalid category ID format.", 400));
      }
      if (name === undefined && content === undefined) {
        return next(
          new AppError(
            "At least name or content must be provided for update.",
            400
          )
        );
      }
      if (
        name !== undefined &&
        (typeof name !== "string" || name.trim() === "")
      ) {
        return next(
          new AppError(
            "If provided, category name must be a non-empty string.",
            400
          )
        );
      }
      if (content !== undefined && typeof content !== "string") {
        return next(
          new AppError("If provided, category content must be a string.", 400)
        );
      }

      const updates: { name?: string; content?: string } = {};
      if (name !== undefined) updates.name = name;
      if (content !== undefined) updates.content = content;

      const updatedDocument = await SopDocumentEditService.updateSopCategory(
        new mongoose.Types.ObjectId(documentId),
        categoryId,
        updates,
        restaurantIdFromUser
      );

      if (!updatedDocument) {
        return next(
          new AppError(
            "Document or category not found, or failed to update.",
            404
          )
        );
      }
      res.status(200).json({ status: "success", data: updatedDocument });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deletes a category from an SOP document.
   * Expects: documentId, categoryId in params.
   */
  static async deleteCategory(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { documentId, categoryId } = req.params;
      const restaurantIdFromUser = req.user?.restaurantId;

      if (!req.user || !restaurantIdFromUser) {
        return next(
          new AppError(
            "Authentication error: Restaurant ID not found on user.",
            401
          )
        );
      }
      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        return next(new AppError("Invalid document ID format.", 400));
      }
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return next(new AppError("Invalid category ID format.", 400));
      }

      const updatedDocument = await SopDocumentEditService.deleteSopCategory(
        new mongoose.Types.ObjectId(documentId),
        categoryId,
        restaurantIdFromUser
      );

      if (!updatedDocument) {
        // The service method itself might throw or return null.
        // If it returns null after attempting deletion, it could mean the category was not found or document not found.
        return next(
          new AppError(
            "Document or category not found, or failed to delete. It might have been already deleted.",
            404
          )
        );
      }
      res.status(200).json({ status: "success", data: updatedDocument }); // Or 204 No Content if not returning the document
    } catch (error) {
      next(error);
    }
  }
}
