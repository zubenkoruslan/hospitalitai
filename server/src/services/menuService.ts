import mongoose, { Types } from "mongoose";
import Menu, { IMenu } from "../models/Menu";
import MenuItem, {
  IMenuItem,
  ItemType,
  ItemCategory,
  FOOD_CATEGORIES,
  BEVERAGE_CATEGORIES,
  ITEM_TYPES,
  FoodCategory,
  BeverageCategory,
} from "../models/MenuItem";
import ItemService from "./itemService";
import { AppError } from "../utils/errorHandler";
// Import MenuItem if needed for future operations like cascade delete
// import MenuItem from '../models/MenuItem';
import pdfParse from "pdf-parse";
import fs from "fs";
import path from "path";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  SchemaType,
  Part,
  FunctionDeclaration,
} from "@google/generative-ai"; // Import Gemini SDK

// Interface for data used in create/update
interface MenuData {
  name: string;
  description?: string;
}

// Interface for data used by Gemini for structured extraction
interface ExtractedMenuItem {
  itemName: string;
  itemPrice?: number | null;
  itemType: "food" | "beverage";
  itemIngredients: string[];
  itemCategory: string;
  isGlutenFree: boolean;
  isVegan: boolean;
  isVegetarian: boolean;
}

interface ExtractedMenuData {
  menuName: string;
  menuItems: ExtractedMenuItem[];
}

// System instruction for the AI
const systemInstruction = `System: You are an expert at parsing restaurant menu data from raw text extracted from PDF files. Your task is to analyze the provided text and extract structured menu data according to the specified schema. Follow these instructions carefully to ensure accurate parsing.

**Crucially, you must call the provided 'extract_menu_data' function directly with the extracted data. Do NOT generate Python code, print statements, or any other form of code. Only use the function calling mechanism.**

Input:
- Raw text extracted from a PDF menu.
- Original filename of the PDF for context (e.g., to infer the menu name if not explicit in the text).

Instructions:
1. **Menu Name**:
   - Identify the menu name from the text (e.g., a title at the top like "Dinner Menu" or "Summer Menu").
   - If no clear menu name is found, use the original filename (without the ".pdf" extension) as the menu name.

2. **Menu Items**:
   - Extract each menu item from the text, identifying its details based on common menu formatting.
   - For each item, determine:
     - **Item Name**: The name of the dish or beverage.
     - **Item Price**: The numerical price. If no price is listed, omit this field or set to null.
     - **Item Type**: Classify as "food" or "beverage".
     - **Item Ingredients**: Extract all listed ingredients as an array of strings. Include only specific ingredients.
     - **Item Category**: Identify the category primarily from section headers in the text (e.g., "Starters", "Mains", "Desserts", "Butchers block", "Sides", "For the Table", "Dish of the day"). Use the exact wording from the menu's section header if available. If no explicit section headers exist, then infer the category based on the item's position or typical menu structure (e.g., appetizers often appear first). Do not use generic placeholders if a specific header was found.
     - **Dietary Flags**: Identify dietary attributes (isGlutenFree, isVegan, isVegetarian) based on explicit indicators or ingredient analysis. Set to false if not indicated.

3. **Output Schema**:
   - Return the parsed data in the JSON structure defined by the 'extract_menu_data' function.

4. **Additional Notes**:
   - Be robust to varied menu formats.
   - Ignore irrelevant text (e.g., restaurant address, phone number, decorative phrases not part of an item's details).
   - If an item seems to span multiple lines or has complex formatting, do your best to consolidate its information correctly.
   - Ensure prices are numbers, not strings with currency symbols.
`;

// Define the schema for the function call for Gemini
const menuExtractionFunctionSchema: FunctionDeclaration = {
  name: "extract_menu_data",
  description:
    "Extracts structured menu data from raw menu text according to the provided instructions and schema.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      menuName: {
        type: SchemaType.STRING,
        description:
          'The overall name of the menu (e.g., "Dinner Menu"). Use original filename if not found in text.',
      },
      menuItems: {
        type: SchemaType.ARRAY,
        description: "A list of all items found on the menu.",
        items: {
          type: SchemaType.OBJECT,
          properties: {
            itemName: {
              type: SchemaType.STRING,
              description:
                'The name of the menu item (e.g., "Classic Burger").',
            },
            itemPrice: {
              type: SchemaType.NUMBER,
              description:
                'The price of the menu item as a number (e.g., 12.99). Null if not applicable (e.g. "Market Price") or not listed.',
            },
            itemType: {
              type: SchemaType.STRING,
              description:
                'The type of the item, must be either "food" or "beverage".',
            },
            itemIngredients: {
              type: SchemaType.ARRAY,
              description:
                'List of ingredients for the item (e.g., ["caramelised onion", "tomato relish"]).',
              items: { type: SchemaType.STRING },
            },
            itemCategory: {
              type: SchemaType.STRING,
              description:
                'The category the item belongs to, ideally derived from section headers in the menu text (e.g., "Starters", "Main Courses", "Sides", "Butchers block"). If no header, infer from context. Use exact header wording if possible.',
            },
            isGlutenFree: {
              type: SchemaType.BOOLEAN,
              description:
                "True if the item is marked or inferred as gluten-free, otherwise false.",
            },
            isVegan: {
              type: SchemaType.BOOLEAN,
              description:
                "True if the item is marked or inferred as vegan, otherwise false.",
            },
            isVegetarian: {
              type: SchemaType.BOOLEAN,
              description:
                "True if the item is marked or inferred as vegetarian, otherwise false.",
            },
          },
          required: [
            "itemName",
            "itemType",
            "itemIngredients",
            "itemCategory",
            "isGlutenFree",
            "isVegan",
            "isVegetarian",
          ],
        },
      },
    },
    required: ["menuName", "menuItems"],
  },
};

// Define an interface for the expected AI response structure
interface ExtractedMenuAIResponse {
  menuName: string;
  menuItems: Array<{
    itemName: string;
    itemPrice?: number | null;
    itemType: string; // AI should return "food" or "beverage"
    itemIngredients: string[];
    itemCategory: string;
    isGlutenFree: boolean;
    isVegan: boolean;
    isVegetarian: boolean;
  }>;
}

class MenuService {
  /**
   * Creates a new menu for a specific restaurant.
   *
   * @param data - The data for the new menu (name, optional description).
   * @param restaurantId - The ID of the restaurant creating the menu.
   * @returns A promise resolving to the created menu document.
   * @throws {AppError} If a menu with the same name already exists for the restaurant (400),
   *                    if Mongoose validation fails (e.g., name length) (400),
   *                    or if any database save operation fails (500).
   */
  static async createMenu(
    data: MenuData,
    restaurantId: Types.ObjectId
  ): Promise<IMenu> {
    const { name, description } = data;
    const trimmedName = name.trim();

    try {
      // Check for existing menu with the same name for this restaurant
      const existingMenu = await Menu.findOne({
        name: trimmedName,
        restaurantId: restaurantId,
      });

      if (existingMenu) {
        throw new AppError("A menu with this name already exists", 400);
      }

      const newMenuData: Partial<IMenu> = {
        name: trimmedName,
        restaurantId: restaurantId,
      };
      if (description) newMenuData.description = description.trim();

      const menu = new Menu(newMenuData);
      const savedMenu = await menu.save();
      return savedMenu;
    } catch (error: any) {
      console.error("Error creating menu in service:", error);
      if (error instanceof AppError) throw error;
      // Handle potential Mongoose validation errors more specifically if needed
      throw new AppError("Failed to create menu.", 500);
    }
  }

  /**
   * Retrieves all menus belonging to a specific restaurant.
   *
   * @param restaurantId - The ID of the restaurant whose menus are to be fetched.
   * @returns A promise resolving to an array of menu documents.
   * @throws {AppError} If any unexpected database error occurs (500).
   */
  static async getAllMenus(restaurantId: Types.ObjectId): Promise<IMenu[]> {
    try {
      // Use lean() for performance as we only read data
      const menus = await Menu.find({ restaurantId }).lean();
      return menus;
    } catch (error: any) {
      console.error("Error fetching all menus in service:", error);
      throw new AppError("Failed to fetch menus.", 500);
    }
  }

  /**
   * Retrieves a single menu by its ID, ensuring it belongs to the specified restaurant.
   *
   * @param menuId - The ID of the menu to retrieve.
   * @param restaurantId - The ID of the restaurant to scope the search.
   * @returns A promise resolving to the menu document.
   * @throws {AppError} If the menu is not found or doesn't belong to the restaurant (404),
   *                    if the menuId format is invalid (400),
   *                    or if any unexpected database error occurs (500).
   */
  static async getMenuById(
    menuId: string | Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<IMenu | null> {
    const menuObjectId =
      typeof menuId === "string" ? new Types.ObjectId(menuId) : menuId;

    try {
      // Use lean() for performance
      const menu = await Menu.findOne({
        _id: menuObjectId,
        restaurantId,
      }).lean();
      if (!menu) {
        throw new AppError("Menu not found or access denied", 404);
      }
      return menu;
    } catch (error: any) {
      console.error("Error fetching menu by ID in service:", error);
      if (error instanceof AppError) throw error;
      // Handle potential CastError if menuId is invalid format
      if (error.name === "CastError") {
        throw new AppError("Invalid menu ID format.", 400);
      }
      throw new AppError("Failed to fetch menu.", 500);
    }
  }

  /**
   * Updates an existing menu.
   *
   * @param menuId - The ID of the menu to update.
   * @param updateData - An object containing the fields to update (name, description).
   * @param restaurantId - The ID of the restaurant owning the menu.
   * @returns A promise resolving to the updated menu document.
   * @throws {AppError} If a menu with the updated name already exists (400),
   *                    if the menu is not found or doesn't belong to the restaurant (404),
   *                    if Mongoose validation fails during update (400),
   *                    if the menuId format is invalid (400),
   *                    or if any unexpected database error occurs (500).
   */
  static async updateMenu(
    menuId: string | Types.ObjectId,
    updateData: Partial<MenuData>,
    restaurantId: Types.ObjectId
  ): Promise<IMenu | null> {
    const menuObjectId =
      typeof menuId === "string" ? new Types.ObjectId(menuId) : menuId;

    const preparedUpdate: { [key: string]: any } = {};
    if (updateData.name !== undefined)
      preparedUpdate.name = updateData.name.trim();
    if (updateData.description !== undefined)
      preparedUpdate.description = updateData.description.trim();

    // Return early if no actual fields to update
    if (Object.keys(preparedUpdate).length === 0) {
      // Optionally fetch and return the existing menu if no updates are provided
      return this.getMenuById(menuObjectId, restaurantId);
    }

    try {
      // Check for name conflict only if name is being updated
      if (preparedUpdate.name) {
        const existingMenu = await Menu.findOne({
          _id: { $ne: menuObjectId },
          name: preparedUpdate.name,
          restaurantId: restaurantId,
        });
        if (existingMenu) {
          throw new AppError(
            `A menu with the name '${preparedUpdate.name}' already exists`,
            400
          );
        }
      }

      // Find and update the menu
      const updatedMenu = await Menu.findOneAndUpdate(
        { _id: menuObjectId, restaurantId: restaurantId },
        { $set: preparedUpdate },
        { new: true, runValidators: true } // Return the updated doc, run validators
      );

      if (!updatedMenu) {
        throw new AppError("Menu not found or access denied", 404);
      }
      return updatedMenu;
    } catch (error: any) {
      console.error("Error updating menu in service:", error);
      if (error instanceof AppError) throw error;
      // Handle potential Mongoose validation errors
      throw new AppError("Failed to update menu.", 500);
    }
  }

  /**
   * Deletes a specific menu.
   * Note: This currently does NOT handle deletion of associated MenuItems.
   *
   * @param menuId - The ID of the menu to delete.
   * @param restaurantId - The ID of the restaurant owning the menu.
   * @returns A promise resolving to an object indicating the number of deleted documents (should be 1).
   * @throws {AppError} If the menu is not found or doesn't belong to the restaurant (404),
   *                    if the menuId format is invalid (400),
   *                    or if any unexpected database error occurs (500).
   */
  static async deleteMenu(
    menuId: string | Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<{ deletedCount: number }> {
    const menuObjectId =
      typeof menuId === "string" ? new Types.ObjectId(menuId) : menuId;

    try {
      // Add logic here to handle associated MenuItems if necessary
      // Example: await MenuItem.deleteMany({ menuId: menuObjectId, restaurantId });

      const result = await Menu.deleteOne({
        _id: menuObjectId,
        restaurantId: restaurantId,
      });

      if (result.deletedCount === 0) {
        throw new AppError("Menu not found or access denied", 404);
      }
      return { deletedCount: result.deletedCount };
    } catch (error: any) {
      console.error("Error deleting menu in service:", error);
      if (error instanceof AppError) throw error;
      // Handle potential CastError
      if (error.name === "CastError") {
        throw new AppError("Invalid menu ID format.", 400);
      }
      throw new AppError("Failed to delete menu.", 500);
    }
  }

  /**
   * Processes an uploaded PDF menu, extracts text, parses it into a menu structure,
   * and saves it to the database.
   *
   * @param multerFilePath The path to the uploaded PDF file.
   * @param restaurantId The ID of the restaurant this menu belongs to.
   * @param originalFileName Optional: The original name of the uploaded PDF file.
   * @returns A promise resolving to the created IMenu document with its items.
   * @throws {AppError} If PDF parsing fails, or if menu/item creation fails.
   */
  static async processPdfMenuUpload(
    multerFilePath: string,
    restaurantId: Types.ObjectId,
    originalFileName?: string
  ): Promise<IMenu> {
    const projectRootDir = path.resolve(__dirname, "../../..");
    const absoluteFilePath = path.resolve(projectRootDir, multerFilePath);

    console.log("[MenuService] Attempting to process PDF with Gemini AI.");
    console.log(`[MenuService] Multer provided path: ${multerFilePath}`);
    console.log(
      `[MenuService] Resolved absolute file path: ${absoluteFilePath}`
    );

    try {
      if (!fs.existsSync(absoluteFilePath)) {
        console.error(
          `[MenuService] CRITICAL: File not found at resolved absolute path: ${absoluteFilePath}.`
        );
        throw new AppError(
          `Uploaded file not found for AI processing. Path: ${absoluteFilePath}`,
          500
        );
      }

      const dataBuffer = fs.readFileSync(absoluteFilePath);
      const pdfData = await pdfParse(dataBuffer);
      const rawText = pdfData.text;

      if (!rawText || rawText.trim().length === 0) {
        throw new AppError(
          "Extracted text from PDF is empty. Cannot process.",
          400
        );
      }

      // Initialize Gemini AI Client
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error(
          "[MenuService] GEMINI_API_KEY is not set in environment variables."
        );
        throw new AppError(
          "AI service configuration error. API key missing.",
          500
        );
      }
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-latest",
        tools: [{ functionDeclarations: [menuExtractionFunctionSchema] }],
        // Optional: Configure safety settings if needed
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });

      // --- Prompt Engineering ---
      const prompt = `System: You are an expert at parsing restaurant menu data from raw text extracted from PDF files. Your task is to analyze the provided text and extract structured menu data according to the specified schema. Follow these instructions carefully to ensure accurate parsing.

Input:
- Raw text extracted from a PDF menu.
- Original filename of the PDF for context (e.g., to infer the menu name if not explicit in the text).

Instructions:
1. **Menu Name**:
   - Identify the menu name from the text (e.g., a title at the top like "Dinner Menu" or "Summer Menu").
   - If no clear menu name is found, use the original filename (without the ".pdf" extension) as the menu name.

2. **Menu Items**:
   - Extract each menu item from the text, identifying its details based on common menu formatting.
   - For each item, determine:
     - **Item Name**: The name of the dish or beverage.
     - **Item Price**: The numerical price. If no price is listed, omit this field or set to null.
     - **Item Type**: Classify as "food" or "beverage".
     - **Item Ingredients**: Extract all listed ingredients as an array of strings. Include only specific ingredients.
     - **Item Category**: Identify the category primarily from section headers in the text (e.g., "Starters", "Mains", "Desserts", "Butchers block", "Sides", "For the Table", "Dish of the day"). Use the exact wording from the menu's section header if available. If no explicit section headers exist, then infer the category based on the item's position or typical menu structure (e.g., appetizers often appear first). Do not use generic placeholders if a specific header was found.
     - **Dietary Flags**: Identify dietary attributes (isGlutenFree, isVegan, isVegetarian) based on explicit indicators or ingredient analysis. Set to false if not indicated.

3. **Output Schema**:
   - Return the parsed data in the JSON structure defined by the 'extract_menu_data' function.

4. **Additional Notes**:
   - Be robust to varied menu formats.
   - Ignore irrelevant text (e.g., restaurant address, phone number, decorative phrases not part of an item's details).
   - If an item seems to span multiple lines or has complex formatting, do your best to consolidate its information correctly.
   - Ensure prices are numbers, not strings with currency symbols.

Example Input Text (for your reference during parsing, this is NOT the actual text to parse for this request):
\`\`\`
Dinner Menu
Starters
Garlic Bread (V) - 8
Toasted ciabatta, garlic butter, parsley

Main Courses
Freedown Hill Wagyu Steak Burger - 24
Caramelised onion, tomato relish, double cheese, tomato, gem lettuce
Vegan Curry (VG) - 18
Chickpeas, spinach, coconut milk, basmati rice

Drinks
House Red Wine - 10
\`\`\`

Example Output (for your reference, ensure your output for the actual text matches the schema):
\`\`\`json
{
  "menuName": "Dinner Menu",
  "menuItems": [
    {
      "itemName": "Garlic Bread",
      "itemPrice": 8,
      "itemType": "food",
      "itemIngredients": ["toasted ciabatta", "garlic butter", "parsley"],
      "itemCategory": "Starters",
      "isGlutenFree": false,
      "isVegan": false,
      "isVegetarian": true
    },
    {
      "itemName": "Freedown Hill Wagyu Steak Burger",
      "itemPrice": 24,
      "itemType": "food",
      "itemIngredients": ["caramelised onion", "tomato relish", "double cheese", "tomato", "gem lettuce"],
      "itemCategory": "Main Courses",
      "isGlutenFree": false,
      "isVegan": false,
      "isVegetarian": false
    },
    {
      "itemName": "Vegan Curry",
      "itemPrice": 18,
      "itemType": "food",
      "itemIngredients": ["chickpeas", "spinach", "coconut milk", "basmati rice"],
      "itemCategory": "Main Courses",
      "isGlutenFree": true,
      "isVegan": true,
      "isVegetarian": true
    },
    {
      "itemName": "House Red Wine",
      "itemPrice": 10,
      "itemType": "beverage",
      "itemIngredients": [],
      "itemCategory": "Drinks",
      "isGlutenFree": true,
      "isVegan": true,
      "isVegetarian": true
    }
  ]
}
\`\`\`

Input Text to Parse:
-------------------------
${rawText}
-------------------------

Original Filename (for context): ${originalFileName || "N/A"}

Now, analyze the "Input Text to Parse" and directly call the 'extract_menu_data' function with the extracted structured menu data. Do not write any code.
`;

      const chat = model.startChat();
      const result = await chat.sendMessage(prompt);
      const response = result.response;

      // Check for function call in response
      const functionCalls = response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        const functionCall = functionCalls[0]; // Assuming one function call
        if (functionCall.name === "extract_menu_data") {
          const extractedData = functionCall.args as ExtractedMenuAIResponse;

          console.log(
            "[MenuService] AI extracted data:",
            JSON.stringify(extractedData, null, 2)
          );

          const aiMenuName =
            extractedData.menuName ||
            (originalFileName
              ? path.parse(originalFileName).name.replace(/_/g, " ").trim()
              : "Imported Menu");
          // Menu description is no longer explicitly extracted by AI per new schema
          const menuDataForCreate = {
            name: aiMenuName.substring(0, 100),
            description: `Menu parsed from ${
              originalFileName || "uploaded PDF"
            } by AI.`.substring(0, 500),
          };
          const createdMenu = await MenuService.createMenu(
            menuDataForCreate,
            restaurantId
          );

          if (
            extractedData.menuItems &&
            Array.isArray(extractedData.menuItems)
          ) {
            for (const item of extractedData.menuItems) {
              // Directly use the category string provided by the AI.
              // The ItemService.createItem method and MenuItem model are now configured to handle arbitrary strings for categories.
              const aiProvidedCategory: string = item.itemCategory;

              let resolvedItemType: ItemType;
              // Primarily trust the itemType from AI, as the schema requires it to be 'food' or 'beverage'.
              if (
                (ITEM_TYPES as ReadonlyArray<string>).includes(item.itemType)
              ) {
                resolvedItemType = item.itemType as ItemType;
              } else {
                // Fallback if AI provides an invalid itemType (not 'food' or 'beverage')
                // This should ideally not happen if AI adheres to the schema.
                console.warn(
                  `[MenuService] AI provided invalid itemType '${item.itemType}' for item '${item.itemName}'. Defaulting to 'food'. This may indicate an issue with AI adherence to the schema.`
                );
                resolvedItemType = "food"; // Default to 'food' or handle as an error case.
              }

              const itemDataForService: Parameters<
                typeof ItemService.createItem
              >[0] = {
                name: String(item.itemName || "Unnamed Item").substring(0, 100),
                menuId: createdMenu._id as Types.ObjectId,
                itemType: resolvedItemType,
                category: aiProvidedCategory, // Use the direct string from AI
                description: undefined, // itemDescription is no longer part of AI output
                price:
                  typeof item.itemPrice === "number"
                    ? item.itemPrice
                    : undefined,
                ingredients: item.itemIngredients || [], // Map from new AI field
                isGlutenFree: Boolean(item.isGlutenFree),
                isDairyFree: undefined, // isDairyFree is no longer part of AI output
                isVegetarian: Boolean(item.isVegetarian),
                isVegan: Boolean(item.isVegan),
              };
              try {
                await ItemService.createItem(itemDataForService, restaurantId);
              } catch (itemError: any) {
                console.warn(
                  `[MenuService] AI Skipping item "${item.itemName}" due to error: ${itemError.message}`
                );
              }
            }
          }
          fs.unlinkSync(absoluteFilePath);
          return createdMenu;
        } else {
          console.error(
            "[MenuService] AI responded with an unexpected function call:",
            functionCall.name
          );
          throw new AppError(
            "AI processing error: Unexpected function call by AI.",
            500
          );
        }
      } else {
        // If no function call, log the text response for debugging
        console.warn(
          "[MenuService] AI did not return a function call. Text response:",
          response.text()
        );
        // Fallback: try to parse response.text() if it happens to be structured JSON, or just error out
        throw new AppError(
          "AI processing error: AI did not return structured menu data as expected.",
          500
        );
      }
    } catch (error: any) {
      if (absoluteFilePath && fs.existsSync(absoluteFilePath)) {
        fs.unlinkSync(absoluteFilePath);
      }
      console.error(
        "[MenuService] Error processing PDF menu upload with AI:",
        error
      );
      if (error instanceof AppError) throw error;
      if (error.message && error.message.includes("GEMINI_API_KEY")) {
        // More specific check for API key issue
        throw new AppError(
          "AI service configuration error. Please check API key.",
          500
        );
      }
      // Check for safety settings block
      if (
        error.message &&
        (error.message.toLowerCase().includes("safety settings") ||
          error.message.toLowerCase().includes("blocked"))
      ) {
        console.error(
          "[MenuService] Gemini content blocked due to safety settings. Response:",
          error.response?.candidates?.[0]?.finishReason,
          error.response?.candidates?.[0]?.safetyRatings
        );
        throw new AppError(
          "Content generation blocked by AI safety settings. Please check the PDF content or adjust safety thresholds if appropriate.",
          400
        );
      }
      throw new AppError(
        "Failed to process PDF menu with AI: " + error.message,
        500
      );
    }
  }
}

export default MenuService;
