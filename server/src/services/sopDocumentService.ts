import SopDocumentModel, {
  ISopDocument,
  ISopCategory,
} from "../models/SopDocumentModel";
import { AppError } from "../utils/errorHandler";
import mongoose, { Types } from "mongoose";
import fs from "fs-extra"; // For file system operations
import path from "path"; // For path manipulation
import pdf from "pdf-parse"; // For PDF parsing
import mammoth from "mammoth"; // For DOCX parsing
import { AICategorizationService } from "./aiCategorizationService"; // Import the new service
// import fs from 'fs-extra'; // For file system operations
// import path from 'path'; // For path manipulation
// import pdf from 'pdf-parse'; // For PDF parsing
// import mammoth from 'mammoth'; // For DOCX parsing

// Placeholder for your AI Categorization Service client
// You'll need to implement this service to call your chosen AI model (e.g., OpenAI, Gemini, etc.)
// Example: import { aiCategorizationService } from './aiCategorizationService';

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

const AI_PROMPT_FOR_SOP = `
You are an AI assistant tasked with intelligently segmenting and categorizing Standard Operating Procedure (SOP) documents into a HIERARCHICAL structure. Your goal is to break down the provided SOP text into logical main sections and potentially nested sub-sections, each with a descriptive title and its corresponding content.

**Input:**
You will receive a single string containing the full extracted text content of an SOP document. This text may use various heading levels (e.g., H1, H2, H3) or numbering schemes (e.g., 1., 1.1, 1.1.1, A., a.) to denote structure.

**Task:**
1.  Analyze the entire SOP text to understand its structure and hierarchy.
2.  Identify distinct main sections and any nested sub-sections within them.
3.  For each identified section or sub-section:
    a.  Determine a concise and meaningful title (category name). This title should ideally be derived from existing headings in the text. Preserve the hierarchical relationship in your output.
    b.  Extract all the text content that *directly* belongs to this specific section/sub-section, excluding content that belongs to its own children sub-sections.
4.  Ensure that all substantive parts of the SOP document are allocated to a category or sub-category.

**Output Format:**
Return your analysis as a JSON array of *top-level* category objects. Each category object must have the following properties:
-   "name": The title of the category/section (string).
-   "content": The text content directly belonging to this category (string). If a category primarily serves as a container for sub-categories and has no direct content other than its heading, this can be a brief introductory sentence or an empty string.
-   "subCategories": An OPTIONAL array of category objects, following this same structure recursively, for any sub-sections found under this category. If no sub-sections, omit this field or provide an empty array.

Example of Hierarchical Output:
[
  {
    "name": "Chapter 1: Introduction",
    "content": "This SOP outlines the procedures for...",
    "subCategories": [
      {
        "name": "1.1 Purpose of this SOP",
        "content": "The primary purpose is to ensure safety and efficiency...",
        "subCategories": [] // Or omit if no further nesting
      },
      {
        "name": "1.2 Scope",
        "content": "This SOP applies to all kitchen staff..."
      }
    ]
  },
  {
    "name": "Chapter 2: Safety Protocols",
    "content": "General safety guidelines are as follows.", // Parent content
    "subCategories": [
      {
        "name": "2.1 Fire Safety",
        "content": "Detailed fire safety measures..."
      },
      {
        "name": "2.2 Equipment Handling",
        "content": "Proper handling of kitchen equipment...",
        "subCategories": [
          {
            "name": "2.2.1 Knife Safety",
            "content": "Specific rules for knife handling..."
          }
        ]
      }
    ]
  },
  {
    "name": "Appendix A: Forms",
    "content": "This section contains all relevant forms."
    // No subCategories for this one implies it's a flat section
  }
]

**Guidelines for Categorization:**
*   **Hierarchical Structure:** Pay close attention to heading levels (H1, H2, H3, etc.), numbering (1., 1.1, A., a.), and indentation to determine the hierarchy. Your output JSON MUST reflect this hierarchy using the "subCategories" array.
*   **Content Specificity:** The "content" field for a category should only contain text that directly belongs to it, not the aggregated text of its sub-categories. If a heading primarily introduces sub-sections, its direct "content" might be minimal or empty.
*   **Prioritize Existing Structure:** Use existing headings from the text as category/sub-category names whenever possible. Adapt them to be concise if necessary.
*   **Title Conciseness:** Category names should be descriptive but not overly long (e.g., aim for 1-7 words).
*   **Comprehensive Coverage:** Aim to categorize all relevant procedural text. Minor introductory phrases or concluding remarks might be grouped with adjacent logical sections.
*   **Handling Short/Unstructured Documents:** If a document is very short or has no discernible internal structure, it might result in a single top-level category with no sub-categories, or a few top-level categories.
*   **Avoid Over-Fragmentation:** Do not create excessively deep or numerous tiny sub-categories unless the document structure clearly dictates it. Group related minor points appropriately.
*   **Table of Contents/Index:** If the input text includes a table of contents or an index, do not treat these as procedural content sections themselves. Focus on the main body of the SOP.

**What to Avoid:**
*   Flattening the hierarchy: If the document has sub-sections, represent them in the "subCategories" array.
*   Creating categories with empty or non-substantive content unless they are parent categories whose content is entirely within their sub-categories.
*   Titles that are too long or are full sentences.
*   Losing any part of the original document's substantive text.

Think step-by-step to identify logical breaks and the hierarchical relationships between them. Your understanding of common SOP and document structures will be beneficial.
`;

export class SopDocumentService {
  /**
   * Handles the initial upload and creation of an SOP document entry.
   * Actual file processing (text extraction, categorization) should be triggered asynchronously.
   * @param fileData - The uploaded file object (e.g., from multer).
   * @param restaurantId - The ID of the restaurant uploading the document.
   * @param title - The user-defined title for the document.
   * @param description - Optional description for the document.
   * @returns The created SopDocument database entry.
   */
  static async handleDocumentUpload(
    fileData: UploadedFile,
    restaurantId: Types.ObjectId,
    title: string,
    description?: string
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
      description,
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

      // --- AI-Powered Categorization Logic ---
      if (extractedText && extractedText.trim().length > 0) {
        try {
          const aiGeneratedCategories =
            await AICategorizationService.categorizeText(
              extractedText,
              AI_PROMPT_FOR_SOP
            );

          if (
            aiGeneratedCategories &&
            aiGeneratedCategories.length > 0 &&
            aiGeneratedCategories.some(
              (c) => c.content && c.content.trim().length > 0
            )
          ) {
            // Optional: Add further validation or filtering on AI results if needed
            doc.categories = aiGeneratedCategories.filter(
              (c) =>
                c.name &&
                c.name.length <= 150 &&
                c.content &&
                c.content.length >= 10
            );

            if (doc.categories.length === 0) {
              // Fallback if AI results are filtered out or empty
              console.warn(
                `AI categorization for doc ${doc._id} resulted in empty or invalid categories after filtering. Falling back.`
              );
              doc.categories = [
                {
                  name: "Full Document Content",
                  content: extractedText.trim(),
                },
              ];
            }
          } else {
            console.warn(
              `AI categorization for doc ${doc._id} returned no valid categories. Falling back.`
            );
            doc.categories = [
              { name: "Full Document Content", content: extractedText.trim() },
            ];
          }
        } catch (aiError: any) {
          console.error(
            `AI categorization failed for SopDocument ${doc._id}:`,
            aiError
          );
          doc.status = "error";
          doc.errorMessage = `AI categorization failed: ${
            aiError.message || "Unknown AI error"
          }`;
          // Fallback to full document content if AI fails
          doc.categories = [
            {
              name: "Full Document Content",
              content:
                extractedText.trim() ||
                "Content extraction failed or AI error.",
            },
          ];
        }
      } else {
        // No text extracted, or text is empty
        doc.categories = [
          {
            name: "Full Document Content",
            content:
              "No text was extracted from the document, or the document is empty.",
          },
        ];
      }
      // --- End AI-Powered Categorization Logic ---

      // If no error occurred during AI categorization, set status to processed
      if (doc.status !== "error") {
        doc.status = "processed";
        doc.errorMessage = undefined; // Clear any previous error message
      }

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
   * @param status - Optional status filter.
   * @returns An array of SOP documents.
   */
  static async listRestaurantSopDocuments(
    restaurantId: Types.ObjectId,
    status?: string
  ): Promise<ISopDocument[]> {
    try {
      const query: any = { restaurantId };
      if (status) {
        query.status = status;
      }

      const documents = await SopDocumentModel.find(query)
        .select("-extractedText -storagePath")
        .sort({ uploadedAt: -1 });
      return documents;
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
    uploadedAt?: Date; // Frontend should format this Date object as needed (e.g., DD/MM/YYYY)
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

// --- NEW METHODS FOR EDITING ---

export class SopDocumentEditService {
  // Tentatively placing in a new class for clarity, can be merged later
  /**
   * Updates the main title of an SOP document.
   */
  static async updateSopDocumentTitle(
    documentId: Types.ObjectId,
    newTitle: string,
    restaurantId: Types.ObjectId
  ): Promise<ISopDocument | null> {
    try {
      const document = await SopDocumentModel.findOneAndUpdate(
        { _id: documentId, restaurantId },
        { $set: { title: newTitle, updatedAt: new Date() } }, // Ensure updatedAt is manually updated if not relying on Mongoose hook for this specific operation
        { new: true }
      );
      if (!document) {
        throw new AppError(
          "Document not found or not authorized to update.",
          404
        );
      }
      return document;
    } catch (error: any) {
      console.error(
        `Error updating SOP document title for ${documentId}:`,
        error
      );
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to update SOP document title.", 500);
    }
  }

  /**
   * Updates the description of an SOP document.
   */
  static async updateSopDocumentDescription(
    documentId: Types.ObjectId,
    newDescription: string,
    restaurantId: Types.ObjectId
  ): Promise<ISopDocument | null> {
    try {
      const document = await SopDocumentModel.findOneAndUpdate(
        { _id: documentId, restaurantId },
        { $set: { description: newDescription, updatedAt: new Date() } },
        { new: true }
      );
      if (!document) {
        throw new AppError(
          "Document not found or not authorized to update description.",
          404
        );
      }
      return document;
    } catch (error: any) {
      console.error(
        `Error updating SOP document description for ${documentId}:`,
        error
      );
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to update SOP document description.", 500);
    }
  }

  /**
   * Adds a new category or subcategory to an SOP document.
   * @param documentId ID of the SOP document.
   * @param parentCategoryId ID of the parent category (null if adding a top-level category).
   * @param categoryData Object containing { name: string, content: string } for the new category.
   * @param restaurantId ID of the restaurant for ownership verification.
   */
  static async addCategoryToSop(
    documentId: Types.ObjectId,
    parentCategoryId: string | null,
    categoryData: { name: string; content: string },
    restaurantId: Types.ObjectId
  ): Promise<ISopDocument | null> {
    try {
      const document = await SopDocumentModel.findOne({
        _id: documentId,
        restaurantId,
      });
      if (!document) {
        throw new AppError("Document not found or not authorized.", 404);
      }

      const newCategory = {
        _id: new mongoose.Types.ObjectId(), // Generate new ID for the category
        name: categoryData.name,
        content: categoryData.content,
        subCategories: [],
      };

      let updateQuery;
      if (parentCategoryId) {
        // Adding as a subcategory - this requires finding the parent category within the potentially nested array
        // and pushing to its subCategories. This is complex with MongoDB's positional operators
        // for deeply nested arrays. A common approach is to fetch the document, modify in code, then save.
        // Or use arrayFilters for targeted updates if nesting is not too deep or path is known.

        // For simplicity in this pass, we'll assume we need to manually find and update.
        // A more robust solution might involve a recursive helper function.
        const parentCategoryPath = SopDocumentEditService.findCategoryPath(
          document.categories,
          parentCategoryId
        );
        if (!parentCategoryPath) {
          throw new AppError("Parent category not found.", 404);
        }
        updateQuery = {
          $push: { [parentCategoryPath + ".subCategories"]: newCategory },
        };
      } else {
        // Adding as a top-level category
        updateQuery = { $push: { categories: newCategory } };
      }

      const updatedDocument = await SopDocumentModel.findOneAndUpdate(
        { _id: documentId, restaurantId }, // Ensure restaurantId for security
        { ...updateQuery, $set: { updatedAt: new Date() } },
        { new: true }
      );

      if (!updatedDocument) {
        // This might happen if the initial findOneAndUpdate in a more complex scenario fails to match
        throw new AppError("Failed to add category to document.", 500);
      }
      return updatedDocument;
    } catch (error: any) {
      console.error(`Error adding category to SOP ${documentId}:`, error);
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to add category.", 500);
    }
  }

  /**
   * Updates an existing category or subcategory within an SOP document.
   * @param documentId ID of the SOP document.
   * @param categoryId ID of the category/subcategory to update.
   * @param updates Object containing { name?: string, content?: string }.
   * @param restaurantId ID of the restaurant.
   */
  static async updateSopCategory(
    documentId: Types.ObjectId,
    categoryId: string,
    updates: { name?: string; content?: string },
    restaurantId: Types.ObjectId
  ): Promise<ISopDocument | null> {
    try {
      // Finding and updating a specific subdocument by _id in a nested array structure is complex.
      // MongoDB arrayFilters are powerful here.
      const document = await SopDocumentModel.findOne({
        _id: documentId,
        restaurantId,
      });
      if (!document) {
        throw new AppError("Document not found or not authorized.", 404);
      }

      // Create an object for $set operation, filtering out undefined values
      const fieldsToUpdate: Record<string, any> = {};
      if (updates.name !== undefined)
        fieldsToUpdate[`categories.$[cat].name`] = updates.name;
      if (updates.content !== undefined)
        fieldsToUpdate[`categories.$[cat].content`] = updates.content;

      // This needs to be extended for subCategories recursively
      // For deeply nested updates, recursively building arrayFilters or fetching and modifying in app code might be needed.
      // Example for first-level category:
      let updateResult = await SopDocumentModel.updateOne(
        {
          _id: documentId,
          restaurantId,
          "categories._id": new mongoose.Types.ObjectId(categoryId),
        },
        { $set: fieldsToUpdate },
        {
          arrayFilters: [
            { "cat._id": new mongoose.Types.ObjectId(categoryId) },
          ],
        }
      );

      // If not updated, try searching in subCategories (this is a simplified one-level deep search)
      // A true recursive update would require a more sophisticated approach.
      if (updateResult.modifiedCount === 0) {
        const subFieldsToUpdate: Record<string, any> = {};
        if (updates.name !== undefined)
          subFieldsToUpdate[`categories.$[].subCategories.$[subcat].name`] =
            updates.name;
        if (updates.content !== undefined)
          subFieldsToUpdate[`categories.$[].subCategories.$[subcat].content`] =
            updates.content;

        updateResult = await SopDocumentModel.updateOne(
          {
            _id: documentId,
            restaurantId,
            "categories.subCategories._id": new mongoose.Types.ObjectId(
              categoryId
            ),
          },
          { $set: subFieldsToUpdate },
          {
            arrayFilters: [
              { "subcat._id": new mongoose.Types.ObjectId(categoryId) },
            ],
          }
        );
      }

      // Add more levels or a recursive update function if deeper nesting is common.

      if (updateResult.modifiedCount === 0 && updateResult.matchedCount > 0) {
        // Found but not modified, perhaps data is the same
        console.log(
          `Category ${categoryId} found but not modified (data might be the same).`
        );
      } else if (updateResult.matchedCount === 0) {
        throw new AppError("Category not found within the document.", 404);
      }

      // Manually set updatedAt
      await SopDocumentModel.updateOne(
        { _id: documentId },
        { $set: { updatedAt: new Date() } }
      );

      return SopDocumentModel.findById(documentId); // Re-fetch the document to return the updated state
    } catch (error: any) {
      console.error(
        `Error updating category ${categoryId} in SOP ${documentId}:`,
        error
      );
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to update category.", 500);
    }
  }

  /**
   * Deletes a category or subcategory from an SOP document.
   * @param documentId ID of the SOP document.
   * @param categoryId ID of the category/subcategory to delete.
   * @param restaurantId ID of the restaurant.
   */
  static async deleteSopCategory(
    documentId: Types.ObjectId,
    categoryId: string,
    restaurantId: Types.ObjectId
  ): Promise<ISopDocument | null> {
    try {
      const categoryObjectId = new mongoose.Types.ObjectId(categoryId);

      const document = await SopDocumentModel.findOne({
        _id: documentId,
        restaurantId,
      });

      if (!document) {
        throw new AppError("Document not found or not authorized.", 404);
      }

      // Helper function to recursively remove a category
      const removeCategoryRecursive = (
        categories: ISopCategory[],
        idToRemove: Types.ObjectId
      ): boolean => {
        for (let i = categories.length - 1; i >= 0; i--) {
          const category = categories[i];
          if (category._id && category._id.equals(idToRemove)) {
            categories.splice(i, 1); // Remove the category from the array
            return true; // Category found and removed
          }
          if (category.subCategories && category.subCategories.length > 0) {
            if (removeCategoryRecursive(category.subCategories, idToRemove)) {
              return true; // Category found and removed in a sub-level
            }
          }
        }
        return false; // Category not found at this level
      };

      const categoryWasRemoved = removeCategoryRecursive(
        document.categories,
        categoryObjectId
      );

      if (!categoryWasRemoved) {
        // Category not found, could mean it was already deleted or ID is incorrect.
        // Depending on desired behavior, could throw an error or just return the document.
        // For now, let's assume if it's not found, it might have been already deleted.
        console.log(
          `Category ${categoryId} not found for deletion, possibly already deleted.`
        );
        // To ensure client gets an updated document if other concurrent changes happened, re-fetch.
        // However, if no change was made because category wasn't found, returning current document is fine.
        // Or we can check if anything changed in the categories array.
        // For simplicity, if not removed, we return the document as is (or re-fetch to be safe).
        // Let's try to save and see if mongoose detects a change.
      }

      document.updatedAt = new Date();
      const updatedDocument = await document.save();

      return updatedDocument;
    } catch (error: any) {
      console.error(
        `Error deleting category ${categoryId} from SOP ${documentId}:`,
        error
      );
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to delete category.", 500);
    }
  }

  // Helper function to find path to a category (simplified for addCategoryToSop)
  private static findCategoryPath(
    categories: ISopCategory[],
    categoryId: string
  ): string | null {
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      if (cat._id?.toString() === categoryId) {
        return `categories.${i}`;
      }
      if (cat.subCategories && cat.subCategories.length > 0) {
        for (let j = 0; j < cat.subCategories.length; j++) {
          const subCat = cat.subCategories[j];
          if (subCat._id?.toString() === categoryId) {
            return `categories.${i}.subCategories.${j}`;
            // This needs to be recursive for deeper levels
          }
          // Add recursive call here for deeper search
        }
      }
    }
    return null;
  }
}
