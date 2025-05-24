import SopDocumentModel, { ISopDocument } from "../models/SopDocumentModel";
import { AppError } from "../utils/errorHandler";
import mongoose, { Types } from "mongoose";
import fs from "fs-extra"; // For file system operations
import path from "path"; // For path manipulation
import pdf from "pdf-parse"; // For PDF parsing
import mammoth from "mammoth"; // For DOCX parsing
// import fs from 'fs-extra'; // For file system operations
// import path from 'path'; // For path manipulation
// import pdf from 'pdf-parse'; // For PDF parsing
// import mammoth from 'mammoth'; // For DOCX parsing

// Define a type for the file object expected from multer or similar middleware
interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}

export class SopDocumentService {
  /**
   * Handles the initial upload and creation of an SOP document entry.
   * Actual file processing (text extraction, categorization) should be triggered asynchronously.
   * @param fileData - The uploaded file object (e.g., from multer).
   * @param restaurantId - The ID of the restaurant uploading the document.
   * @param title - The user-defined title for the document.
   * @returns The created SopDocument database entry.
   */
  static async handleDocumentUpload(
    fileData: UploadedFile,
    restaurantId: Types.ObjectId,
    title: string
  ): Promise<ISopDocument> {
    let fileType: ISopDocument["fileType"] = "txt"; // Default
    if (fileData.mimetype === "application/pdf") {
      fileType = "pdf";
    } else if (
      fileData.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      fileType = "docx";
    } else if (fileData.originalname.endsWith(".md")) {
      fileType = "md";
    } else if (
      fileData.mimetype === "text/plain" ||
      fileData.originalname.endsWith(".txt")
    ) {
      fileType = "txt";
    }
    // TODO: Add more robust file type detection or validation

    const newSopDocument = new SopDocumentModel({
      title,
      originalFileName: fileData.originalname,
      storagePath: fileData.path, // This would be the path where multer saved the file
      fileType,
      restaurantId,
      status: "uploaded", // Initial status
      categories: [],
    });

    try {
      await newSopDocument.save();
      // Trigger asynchronous processing (fire and forget for now)
      SopDocumentService.processAndCategorizeDocument(newSopDocument._id).catch(
        (err) =>
          console.error(
            `Error during async processing of SopDocument ${newSopDocument._id}:`,
            err
          )
      );
      return newSopDocument;
    } catch (error: any) {
      // Attempt to clean up the uploaded file if DB save fails
      await fs
        .unlink(fileData.path)
        .catch((unlinkErr: Error) =>
          console.error(
            `Failed to delete temp file ${fileData.path} after DB error:`,
            unlinkErr
          )
        );
      if (error.code === 11000) {
        throw new AppError(
          "A document with this title already exists for your restaurant.",
          409
        );
      }
      throw new AppError(`Error saving SOP document: ${error.message}`, 500);
    }
  }

  /**
   * Processes an uploaded document to extract text and perform initial categorization.
   * This should ideally be run as a background/asynchronous task.
   * @param documentId - The ID of the SopDocument to process.
   */
  static async processAndCategorizeDocument(
    documentId: Types.ObjectId
  ): Promise<void> {
    const doc = await SopDocumentModel.findById(documentId);
    if (!doc) {
      console.error(`SopDocument not found for processing: ${documentId}`);
      return;
    }

    let extractedText = "";
    try {
      doc.status = "parsing";
      await doc.save();

      const filePath = doc.storagePath;
      if (!(await fs.pathExists(filePath))) {
        throw new Error(`File not found at path: ${filePath}`);
      }

      if (doc.fileType === "pdf") {
        const dataBuffer = await fs.readFile(filePath);
        const pdfData = await pdf(dataBuffer);
        extractedText = pdfData.text;
      } else if (doc.fileType === "docx") {
        const result = await mammoth.extractRawText({ path: filePath });
        extractedText = result.value;
      } else if (doc.fileType === "txt" || doc.fileType === "md") {
        extractedText = await fs.readFile(filePath, "utf8");
      }
      doc.extractedText = extractedText; // Save full extracted text

      doc.status = "categorizing";
      await doc.save();

      // New Categorization Logic
      if (extractedText && extractedText.trim().length > 0) {
        const lines = extractedText.split("\n");
        const generatedCategories: Array<{ name: string; content: string }> =
          [];
        let currentContentLines: string[] = [];
        let currentCategoryName: string = "Overview"; // Default for content before the first heading

        const isLikelyHeading = (
          lineContent: string,
          prevLineContent?: string,
          nextLineContent?: string
        ): boolean => {
          const trimmedLine = lineContent.trim();
          if (!trimmedLine) return false;

          const words = trimmedLine.split(/s+/);
          if (words.length === 0 || words.length > 10) return false;

          // Ends with sentence punctuation (common for non-headings in lists, but generally headings don't)
          if (/[.!?;]$/.test(trimmedLine)) {
            // Allow if it looks like "1. Heading." or "A) Heading."
            if (!/^s*(\d+.\.|[A-Za-z]\)).\S+/.test(trimmedLine)) {
              return false;
            }
          }
          if (/,$/.test(trimmedLine)) return false; // Headings rarely end with a comma

          const isAllCaps =
            trimmedLine === trimmedLine.toUpperCase() &&
            /[A-Z]/.test(trimmedLine);
          const isTitleCase =
            words.every(
              (w) => /^[A-Z]/.test(w) || !/[a-zA-Z]/.test(w) || /^d+$/.test(w)
            ) &&
            words.length >= 1 &&
            /[a-zA-Z]/.test(trimmedLine);

          // Pattern: Number/Letter followed by . or ) e.g., "1.", "A)", "i." Also allowing "Section 1" type patterns
          const isNumberedOrLetteredListHeading =
            /^s*((\d{1,2}(\.\d{1,2})*[.)]?)|([A-Za-z][.)])|([ivxlcdm]+[.)]?))\\s+/i.test(
              trimmedLine
            ) || /^section\s+\d+/i.test(trimmedLine);
          if (isNumberedOrLetteredListHeading && words.length <= 12)
            return true;

          if (isAllCaps && trimmedLine.length >= 3 && words.length <= 7)
            return true; // Min 3 chars for ALL CAPS
          if (isTitleCase && words.length <= 7 && words.length >= 1)
            return true; // Min 1 word for Title Case

          const prevIsEmpty =
            prevLineContent !== undefined && prevLineContent.trim() === "";
          const nextIsEmpty =
            nextLineContent !== undefined && nextLineContent.trim() === "";

          if (words.length <= 7 && !/[.!?,;:]$/.test(trimmedLine)) {
            if (prevIsEmpty && nextIsEmpty) return true; // Isolated line
            if (prevIsEmpty && words.length <= 5) return true; // Preceded by empty, fairly short
            if (nextIsEmpty && words.length <= 5) return true; // Followed by empty, fairly short
          }

          // A line with only a few words, no punctuation, often a heading.
          if (
            words.length <= 4 &&
            !/[.!?,;:\(\)]/.test(trimmedLine) &&
            /[a-zA-Z]/.test(trimmedLine)
          )
            return true;

          return false;
        };

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const prevLine = i > 0 ? lines[i - 1] : undefined;
          const nextLine = i < lines.length - 1 ? lines[i + 1] : undefined;

          if (isLikelyHeading(line, prevLine, nextLine)) {
            if (currentContentLines.join("\n").trim().length > 0) {
              generatedCategories.push({
                name: currentCategoryName,
                content: currentContentLines.join("\n").trim(),
              });
            }
            currentCategoryName = line.trim();
            currentContentLines = [];
          } else {
            currentContentLines.push(line);
          }
        }

        if (currentContentLines.join("\n").trim().length > 0) {
          generatedCategories.push({
            name: currentCategoryName,
            content: currentContentLines.join("\n").trim(),
          });
        }

        if (
          generatedCategories.length > 0 &&
          generatedCategories.some((c) => c.content.length > 0)
        ) {
          if (
            generatedCategories.length === 1 &&
            generatedCategories[0].name === "Overview"
          ) {
            generatedCategories[0].name = "Full Document Content";
          }
          // Filter out categories with names that are too long (likely not headings)
          // or content that is too short (likely just whitespace or minor artifacts)
          doc.categories = generatedCategories.filter(
            (c) => c.name.length <= 100 && c.content.length > 10
          );

          if (doc.categories.length === 0) {
            // If filtering removed everything, fallback
            doc.categories = [
              { name: "Full Document Content", content: extractedText.trim() },
            ];
          }
        } else {
          doc.categories = [
            { name: "Full Document Content", content: extractedText.trim() },
          ];
        }

        if (doc.categories.length === 0) {
          // Final fallback
          doc.categories = [
            {
              name: "Full Document Content",
              content:
                extractedText.trim() ||
                "No meaningful content could be categorized.",
            },
          ];
        }
      } else {
        doc.categories = [
          {
            name: "Full Document Content",
            content: "No text was extracted from the document.",
          },
        ];
      }
      // End New Categorization Logic

      doc.status = "processed";
      doc.errorMessage = undefined; // Clear any previous error message
      await doc.save();
      console.log(
        `SopDocument ${doc._id} processed and categorized successfully.`
      );
    } catch (error: any) {
      console.error(`Error processing SopDocument ${doc._id}:`, error);
      if (doc) {
        doc.status = "error";
        doc.errorMessage = error.message || "Unknown processing error";
        await doc
          .save()
          .catch((saveErr) =>
            console.error(
              `Failed to save error status for doc ${doc._id}`,
              saveErr
            )
          );
      }
    }
  }

  /**
   * Lists all SOP documents for a given restaurant.
   * @param restaurantId - The ID of the restaurant.
   * @returns An array of SOP documents.
   */
  static async listRestaurantSopDocuments(
    restaurantId: Types.ObjectId
  ): Promise<ISopDocument[]> {
    try {
      // Exclude extractedText and categories content for list view to keep payload small
      return await SopDocumentModel.find({ restaurantId })
        .select("-extractedText -categories.content")
        .sort({ uploadedAt: -1 });
    } catch (error: any) {
      console.error(
        `Error listing SOP documents for restaurant ${restaurantId}:`,
        error
      );
      throw new AppError("Failed to retrieve SOP documents.", 500);
    }
  }

  /**
   * Gets a specific SOP document by its ID, ensuring it belongs to the restaurant.
   * @param documentId - The ID of the SOP document.
   * @param restaurantId - The ID of the restaurant.
   * @returns The SOP document or null if not found or not owned.
   */
  static async getSopDocumentById(
    documentId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<ISopDocument | null> {
    try {
      const document = await SopDocumentModel.findOne({
        _id: documentId,
        restaurantId: restaurantId,
      });
      return document;
    } catch (error: any) {
      console.error(
        `Error fetching SOP document ${documentId} for restaurant ${restaurantId}:`,
        error
      );
      throw new AppError("Failed to retrieve SOP document details.", 500);
    }
  }

  /**
   * Deletes an SOP document, ensuring it belongs to the restaurant.
   * Also deletes the associated file from storage.
   * @param documentId - The ID of the SOP document to delete.
   * @param restaurantId - The ID of the restaurant.
   * @returns True if deleted successfully, false otherwise.
   */
  static async deleteSopDocument(
    documentId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<boolean> {
    try {
      const document = await SopDocumentModel.findOne({
        _id: documentId,
        restaurantId: restaurantId,
      });

      if (!document) {
        return false; // Or throw AppError(404) if preferred
      }

      // Attempt to delete the file from storage
      if (document.storagePath) {
        await fs.unlink(document.storagePath).catch((unlinkErr: Error) => {
          // Log error but proceed with DB deletion as file might be already gone or unrecoverable
          console.error(
            `Failed to delete file ${document.storagePath} for SOP document ${document._id}:`,
            unlinkErr
          );
        });
      }

      const deleteResult = await SopDocumentModel.deleteOne({
        _id: documentId,
        restaurantId: restaurantId, // Ensure ownership again for safety
      });

      return deleteResult.deletedCount === 1;
    } catch (error: any) {
      console.error(
        `Error deleting SOP document ${documentId} for restaurant ${restaurantId}:`,
        error
      );
      throw new AppError("Failed to delete SOP document.", 500);
    }
  }

  /**
   * Gets the processing status of a specific SOP document.
   * @param documentId - The ID of the SOP document.
   * @param restaurantId - The ID of the restaurant.
   * @returns The status and error message (if any) or null if not found.
   */
  static async getSopDocumentStatus(
    documentId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<{
    status: string;
    message?: string;
    title?: string;
    uploadedAt?: Date;
  } | null> {
    try {
      const document = await SopDocumentModel.findOne(
        { _id: documentId, restaurantId: restaurantId },
        "status errorMessage title uploadedAt" // Select only necessary fields
      ).lean<ISopDocument>();

      if (!document) {
        return null;
      }
      return {
        status: document.status,
        message: document.errorMessage,
        title: document.title,
        uploadedAt: document.uploadedAt,
      };
    } catch (error: any) {
      console.error(
        `Error fetching status for SOP document ${documentId}:`,
        error
      );
      throw new AppError("Failed to retrieve SOP document status.", 500);
    }
  }

  // TODO: Add other service methods (get, list, delete, updateCategories)
}
