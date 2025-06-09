import { Request, Response, NextFunction } from "express";
import { TemplateService } from "../services/templateService";
import { AppError } from "../utils/errorHandler";

/**
 * Template Controller for handling template download requests
 */

/**
 * Download Excel template
 */
export const downloadExcelTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log(
      "[templateController.downloadExcelTemplate] Generating Excel template"
    );

    const templateBuffer = TemplateService.generateExcelTemplate();
    const filename = TemplateService.getTemplateFilename("excel");
    const mimeType = TemplateService.getMimeType("excel");

    // Set response headers
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", templateBuffer.length);

    // Send the file
    res.send(templateBuffer);

    console.log(
      `[templateController.downloadExcelTemplate] Successfully sent Excel template: ${filename}`
    );
  } catch (error) {
    console.error("[templateController.downloadExcelTemplate] Error:", error);
    next(error);
  }
};

/**
 * Download CSV template
 */
export const downloadCSVTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log(
      "[templateController.downloadCSVTemplate] Generating CSV template"
    );

    const templateBuffer = TemplateService.generateCSVTemplate();
    const filename = TemplateService.getTemplateFilename("csv");
    const mimeType = TemplateService.getMimeType("csv");

    // Set response headers
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", templateBuffer.length);
    res.setHeader("Cache-Control", "no-cache");

    // Send the file
    res.send(templateBuffer);

    console.log(
      `[templateController.downloadCSVTemplate] Successfully sent CSV template: ${filename}`
    );
  } catch (error) {
    console.error("[templateController.downloadCSVTemplate] Error:", error);
    next(error);
  }
};

/**
 * Download Word template
 */
export const downloadWordTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log(
      "[templateController.downloadWordTemplate] Generating Word template"
    );

    const templateBuffer = TemplateService.generateWordTemplate();
    const filename = TemplateService.getTemplateFilename("word");
    const mimeType = TemplateService.getMimeType("word");

    // Set response headers
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", templateBuffer.length);

    // Send the file
    res.send(templateBuffer);

    console.log(
      `[templateController.downloadWordTemplate] Successfully sent Word template: ${filename}`
    );
  } catch (error) {
    console.error("[templateController.downloadWordTemplate] Error:", error);
    next(error);
  }
};

/**
 * Download JSON template
 */
export const downloadJSONTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log(
      "[templateController.downloadJSONTemplate] Generating JSON template"
    );

    const templateBuffer = TemplateService.generateJSONTemplate();
    const filename = TemplateService.getTemplateFilename("json");
    const mimeType = TemplateService.getMimeType("json");

    // Set response headers
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", templateBuffer.length);

    // Send the file
    res.send(templateBuffer);

    console.log(
      `[templateController.downloadJSONTemplate] Successfully sent JSON template: ${filename}`
    );
  } catch (error) {
    console.error("[templateController.downloadJSONTemplate] Error:", error);
    next(error);
  }
};

/**
 * Get template information (for API documentation or frontend)
 */
export const getTemplateInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const templateInfo = {
      formats: [
        {
          format: "excel",
          name: "Excel Spreadsheet",
          extension: "xlsx",
          mimeType: TemplateService.getMimeType("excel"),
          description:
            "Structured Excel file with multiple worksheets, data validation, and formatting",
          useCase:
            "Best for users familiar with Excel, supports complex formatting and validation",
          features: [
            "Multiple worksheets",
            "Data validation",
            "Column formatting",
            "Instructions sheet",
          ],
        },
        {
          format: "csv",
          name: "CSV File",
          extension: "csv",
          mimeType: TemplateService.getMimeType("csv"),
          description: "Simple comma-separated values file with UTF-8 encoding",
          useCase:
            "Universal format, works with Excel, Google Sheets, and any spreadsheet software",
          features: [
            "Universal compatibility",
            "UTF-8 with BOM",
            "Proper escaping",
            "Lightweight",
          ],
        },
        {
          format: "word",
          name: "Word Document",
          extension: "docx",
          mimeType: TemplateService.getMimeType("word"),
          description:
            "Structured Word document with formatted examples and instructions",
          useCase: "For restaurants that prefer document-based menu management",
          features: [
            "Formatted examples",
            "Clear instructions",
            "Section headers",
            "Easy to read",
          ],
        },
        {
          format: "json",
          name: "JSON File",
          extension: "json",
          mimeType: TemplateService.getMimeType("json"),
          description:
            "Structured JSON format with complete schema and examples",
          useCase:
            "For developers or technical users who prefer structured data formats",
          features: [
            "Complete schema",
            "Nested objects",
            "Field documentation",
            "Type examples",
          ],
        },
      ],
      fields: {
        required: ["name", "category"],
        optional: ["description", "price", "ingredients", "itemType"],
        dietary: ["isVegan", "isVegetarian", "isGlutenFree", "isDairyFree"],
        wine: ["wineStyle", "grapeVariety", "vintage", "region", "producer"],
      },
      examples: {
        itemTypes: ["food", "beverage", "wine"],
        wineStyles: ["still", "sparkling", "champagne", "dessert", "fortified"],
        categories: [
          "Appetizers",
          "Main Courses",
          "Desserts",
          "Beverages",
          "Wine",
        ],
      },
    };

    res.status(200).json(templateInfo);
  } catch (error) {
    console.error("[templateController.getTemplateInfo] Error:", error);
    next(error);
  }
};
