import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { AppError } from "../utils/errorHandler";

/**
 * Template Service for generating downloadable menu templates
 * Supports Excel, CSV, Word, and JSON formats with example data and instructions
 */
export class TemplateService {
  /**
   * Generate Excel template with multiple worksheets and data validation
   */
  static generateExcelTemplate(): Buffer {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // INSTRUCTIONS WORKSHEET
      const instructionsData = [
        ["QuizCrunch Menu Template - Instructions"],
        [""],
        [
          "Welcome! This template helps you upload your menu data to QuizCrunch.",
        ],
        ["Please follow these guidelines for best results:"],
        [""],
        ["REQUIRED FIELDS:"],
        ["• name: The menu item name (e.g., 'Caesar Salad', 'Grilled Salmon')"],
        [
          "• category: Menu section (e.g., 'Appetizers', 'Main Courses', 'Desserts')",
        ],
        [""],
        ["OPTIONAL FIELDS:"],
        ["• description: Brief description of the item"],
        ["• price: Item price (numbers only, e.g., 18.95)"],
        [
          "• ingredients: Comma-separated list (e.g., 'lettuce, parmesan, croutons')",
        ],
        ["• itemType: 'food', 'beverage', or 'wine' (defaults to 'food')"],
        [""],
        ["DIETARY FLAGS (use TRUE/FALSE):"],
        ["• isVegan: True if the item is vegan"],
        ["• isVegetarian: True if the item is vegetarian"],
        ["• isGlutenFree: True if the item is gluten-free"],
        ["• isDairyFree: True if the item is dairy-free"],
        [""],
        ["WINE-SPECIFIC FIELDS (only for wine items):"],
        [
          "• wineStyle: 'still', 'sparkling', 'champagne', 'dessert', 'fortified'",
        ],
        [
          "• grapeVariety: Comma-separated list (e.g., 'Chardonnay, Pinot Noir')",
        ],
        ["• vintage: Year (e.g., 2020)"],
        ["• region: Wine region (e.g., 'Napa Valley', 'Bordeaux')"],
        ["• producer: Winery name"],
        [""],
        ["TIPS:"],
        ["• Fill out the 'Menu Items' worksheet with your data"],
        ["• Use the example rows as a guide"],
        ["• Delete example rows before uploading"],
        ["• Our AI will enhance your data with additional intelligence"],
        ["• Supported currencies: $, €, £, ¥"],
        [""],
        ["Need help? Contact support@quizcrunch.com"],
      ];

      const instructionsWS = XLSX.utils.aoa_to_sheet(instructionsData);

      // Style the instructions worksheet
      instructionsWS["!cols"] = [{ width: 70 }];

      XLSX.utils.book_append_sheet(workbook, instructionsWS, "Instructions");

      // MENU ITEMS WORKSHEET
      const headers = [
        "name",
        "description",
        "price",
        "category",
        "ingredients",
        "itemType",
        "isVegan",
        "isVegetarian",
        "isGlutenFree",
        "isDairyFree",
        "wineStyle",
        "grapeVariety",
        "vintage",
        "region",
        "producer",
      ];

      const exampleData = [
        [
          "Caesar Salad",
          "Fresh romaine lettuce with parmesan cheese, croutons, and caesar dressing",
          14.95,
          "Appetizers",
          "romaine lettuce, parmesan cheese, croutons, caesar dressing, anchovies",
          "food",
          false,
          true,
          false,
          false,
          "",
          "",
          "",
          "",
          "",
        ],
        [
          "Grilled Atlantic Salmon",
          "Fresh salmon fillet with seasonal vegetables and lemon butter sauce",
          28.5,
          "Main Courses",
          "salmon, seasonal vegetables, butter, lemon, herbs",
          "food",
          false,
          false,
          true,
          false,
          "",
          "",
          "",
          "",
          "",
        ],
        [
          "Dom Pérignon Vintage",
          "Premium champagne from France with complex flavors and fine bubbles",
          250.0,
          "Champagne",
          "",
          "wine",
          true,
          true,
          true,
          true,
          "champagne",
          "Chardonnay, Pinot Noir",
          2015,
          "Champagne, France",
          "Dom Pérignon",
        ],
      ];

      const menuItemsData = [headers, ...exampleData];
      const menuItemsWS = XLSX.utils.aoa_to_sheet(menuItemsData);

      // Set column widths
      menuItemsWS["!cols"] = [
        { width: 25 }, // name
        { width: 40 }, // description
        { width: 10 }, // price
        { width: 15 }, // category
        { width: 30 }, // ingredients
        { width: 12 }, // itemType
        { width: 12 }, // isVegan
        { width: 15 }, // isVegetarian
        { width: 15 }, // isGlutenFree
        { width: 15 }, // isDairyFree
        { width: 15 }, // wineStyle
        { width: 20 }, // grapeVariety
        { width: 10 }, // vintage
        { width: 20 }, // region
        { width: 20 }, // producer
      ];

      XLSX.utils.book_append_sheet(workbook, menuItemsWS, "Menu Items");

      // Convert to buffer
      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });
      return excelBuffer;
    } catch (error) {
      console.error("Error generating Excel template:", error);
      throw new AppError("Failed to generate Excel template", 500);
    }
  }

  /**
   * Generate CSV template with headers and example data
   */
  static generateCSVTemplate(): Buffer {
    try {
      const headers = [
        "name",
        "description",
        "price",
        "category",
        "ingredients",
        "itemType",
        "isVegan",
        "isVegetarian",
        "isGlutenFree",
        "isDairyFree",
        "wineStyle",
        "grapeVariety",
        "vintage",
        "region",
        "producer",
      ];

      const exampleData = [
        [
          "Caesar Salad",
          "Fresh romaine lettuce with parmesan cheese, croutons, and caesar dressing",
          "14.95",
          "Appetizers",
          "romaine lettuce, parmesan cheese, croutons, caesar dressing, anchovies",
          "food",
          "FALSE",
          "TRUE",
          "FALSE",
          "FALSE",
          "",
          "",
          "",
          "",
          "",
        ],
        [
          "Grilled Atlantic Salmon",
          "Fresh salmon fillet with seasonal vegetables and lemon butter sauce",
          "28.50",
          "Main Courses",
          "salmon, seasonal vegetables, butter, lemon, herbs",
          "food",
          "FALSE",
          "FALSE",
          "TRUE",
          "FALSE",
          "",
          "",
          "",
          "",
          "",
        ],
        [
          "Dom Pérignon Vintage",
          "Premium champagne from France with complex flavors and fine bubbles",
          "250.00",
          "Champagne",
          "",
          "wine",
          "TRUE",
          "TRUE",
          "TRUE",
          "TRUE",
          "champagne",
          "Chardonnay, Pinot Noir",
          "2015",
          "Champagne, France",
          "Dom Pérignon",
        ],
      ];

      // Create CSV content with UTF-8 BOM for Excel compatibility
      const csvRows = [headers, ...exampleData];
      const csvContent = csvRows
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

      // Add UTF-8 BOM for Excel compatibility
      const bom = "\uFEFF";
      const csvWithBom = bom + csvContent;

      return Buffer.from(csvWithBom, "utf8");
    } catch (error) {
      console.error("Error generating CSV template:", error);
      throw new AppError("Failed to generate CSV template", 500);
    }
  }

  /**
   * Generate Word template with formatted table and instructions
   */
  static generateWordTemplate(): Buffer {
    try {
      // For this implementation, we'll create a simple structured text document
      // In a full implementation, you'd use a library like officegen or docx to create proper .docx files

      const content = `QUIZCRUNCH MENU TEMPLATE

INSTRUCTIONS:
This template helps you format your menu data for upload to QuizCrunch.

REQUIRED FIELDS:
• Name: The menu item name
• Category: Menu section (e.g., 'Appetizers', 'Main Courses')

OPTIONAL FIELDS:
• Description: Brief description of the item
• Price: Item price (e.g., 18.95)
• Ingredients: Comma-separated list
• Item Type: 'food', 'beverage', or 'wine'

DIETARY FLAGS (use TRUE/FALSE):
• Vegan, Vegetarian, Gluten-Free, Dairy-Free

WINE-SPECIFIC FIELDS:
• Wine Style: still, sparkling, champagne, dessert, fortified
• Grape Variety: Comma-separated list
• Vintage: Year (e.g., 2020)
• Region: Wine region
• Producer: Winery name

EXAMPLE MENU ITEMS:

=== CAESAR SALAD ===
Category: Appetizers
Description: Fresh romaine lettuce with parmesan cheese, croutons, and caesar dressing
Price: 14.95
Ingredients: romaine lettuce, parmesan cheese, croutons, caesar dressing, anchovies
Item Type: food
Vegetarian: TRUE
Gluten-Free: FALSE

=== GRILLED ATLANTIC SALMON ===
Category: Main Courses
Description: Fresh salmon fillet with seasonal vegetables and lemon butter sauce
Price: 28.50
Ingredients: salmon, seasonal vegetables, butter, lemon, herbs
Item Type: food
Gluten-Free: TRUE

=== DOM PÉRIGNON VINTAGE ===
Category: Champagne
Description: Premium champagne from France with complex flavors and fine bubbles
Price: 250.00
Item Type: wine
Wine Style: champagne
Grape Variety: Chardonnay, Pinot Noir
Vintage: 2015
Region: Champagne, France
Producer: Dom Pérignon
Vegan: TRUE

FORMATTING TIPS:
• Use the === ITEM NAME === format for each menu item
• Include category, description, and price for each item
• Add dietary flags as needed
• For wine items, include wine-specific information
• Our AI will enhance your data with additional intelligence

Need help? Contact support@quizcrunch.com`;

      return Buffer.from(content, "utf8");
    } catch (error) {
      console.error("Error generating Word template:", error);
      throw new AppError("Failed to generate Word template", 500);
    }
  }

  /**
   * Generate JSON template with complete schema and examples
   */
  static generateJSONTemplate(): Buffer {
    try {
      const template = {
        $schema: "https://quizcrunch.com/menu-schema.json",
        menuName: "My Restaurant Menu",
        description: "Template for QuizCrunch menu upload",
        instructions: {
          overview:
            "This JSON template helps you structure your menu data for QuizCrunch",
          requiredFields: ["name", "category"],
          optionalFields: ["description", "price", "ingredients", "itemType"],
          dietaryFlags: [
            "isVegan",
            "isVegetarian",
            "isGlutenFree",
            "isDairyFree",
          ],
          wineFields: [
            "wineStyle",
            "grapeVariety",
            "vintage",
            "region",
            "producer",
          ],
          itemTypes: ["food", "beverage", "wine"],
          wineStyles: [
            "still",
            "sparkling",
            "champagne",
            "dessert",
            "fortified",
          ],
          tips: [
            "Replace example items with your actual menu data",
            "Remove this instructions object before uploading",
            "Our AI will enhance your data with additional intelligence",
            "Supported currencies: $, €, £, ¥",
          ],
        },
        items: [
          {
            name: "Caesar Salad",
            description:
              "Fresh romaine lettuce with parmesan cheese, croutons, and caesar dressing",
            price: 14.95,
            category: "Appetizers",
            ingredients: [
              "romaine lettuce",
              "parmesan cheese",
              "croutons",
              "caesar dressing",
              "anchovies",
            ],
            itemType: "food",
            isVegan: false,
            isVegetarian: true,
            isGlutenFree: false,
            isDairyFree: false,
          },
          {
            name: "Grilled Atlantic Salmon",
            description:
              "Fresh salmon fillet with seasonal vegetables and lemon butter sauce",
            price: 28.5,
            category: "Main Courses",
            ingredients: [
              "salmon",
              "seasonal vegetables",
              "butter",
              "lemon",
              "herbs",
            ],
            itemType: "food",
            isVegan: false,
            isVegetarian: false,
            isGlutenFree: true,
            isDairyFree: false,
          },
          {
            name: "Dom Pérignon Vintage",
            description:
              "Premium champagne from France with complex flavors and fine bubbles",
            price: 250.0,
            category: "Champagne",
            ingredients: [],
            itemType: "wine",
            isVegan: true,
            isVegetarian: true,
            isGlutenFree: true,
            isDairyFree: true,
            wineStyle: "champagne",
            grapeVariety: ["Chardonnay", "Pinot Noir"],
            vintage: 2015,
            region: "Champagne, France",
            producer: "Dom Pérignon",
          },
        ],
      };

      const jsonString = JSON.stringify(template, null, 2);
      return Buffer.from(jsonString, "utf8");
    } catch (error) {
      console.error("Error generating JSON template:", error);
      throw new AppError("Failed to generate JSON template", 500);
    }
  }

  /**
   * Get template filename with timestamp
   */
  static getTemplateFilename(format: string): string {
    const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const formatExtensions = {
      excel: "xlsx",
      csv: "csv",
      word: "docx",
      json: "json",
    };

    const extension =
      formatExtensions[format as keyof typeof formatExtensions] || "txt";
    return `QuizCrunch_Menu_Template_${timestamp}.${extension}`;
  }

  /**
   * Get MIME type for template format
   */
  static getMimeType(format: string): string {
    const mimeTypes = {
      excel:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      csv: "text/csv",
      word: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      json: "application/json",
    };

    return (
      mimeTypes[format as keyof typeof mimeTypes] || "application/octet-stream"
    );
  }
}
