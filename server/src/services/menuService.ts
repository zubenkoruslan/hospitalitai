import mongoose, { Types } from "mongoose";
import Menu, { IMenu } from "../models/Menu";
import MenuItem, { ItemType, ITEM_TYPES } from "../models/MenuItem";
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
  Part as _Part,
  FunctionDeclaration,
  FunctionDeclarationSchemaType,
  FunctionDeclarationSchema,
} from "@google/generative-ai"; // Import Gemini SDK

// Interface for data used in create/update
interface MenuData {
  name: string;
  description?: string;
  isActive?: boolean;
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

interface _ExtractedMenuData {
  menuName: string;
  menuItems: ExtractedMenuItem[];
}

// System instruction for the AI
const _systemInstruction = `System: You are an expert at parsing restaurant menu data from raw text extracted from PDF files. Your task is to analyze the provided text and extract structured menu data according to the specified schema. Follow these instructions carefully to ensure accurate parsing.\n\n**CRITICAL INSTRUCTION: You MUST use the 'extract_menu_data' function to provide your response. Do NOT provide a text-based response or explanation. Your ONLY output should be the function call with the extracted data. No matter how difficult the menu or what issues you encounter, you must still attempt to call the function, even if it means some fields are empty or default values are used based on your best effort. Do not write any prose or conversational text.**\n\nInput Context Provided per Request:\n- Raw text extracted from a PDF menu (labelled as \"Input Text to Parse\").\n- Original filename of the PDF for context (labelled as \"Original Filename\").\n\nInstructions:\n1. **Menu Name**:\n   - Identify the menu name from the text (e.g., a title at the top like \"Dinner Menu\" or \"Summer Menu\").\n   - If no clear menu name is found, use the \"Original Filename\" (without the \".pdf\" extension) as the menu name.\n\n2. **Menu Items**:\n   - Extract each menu item from the \"Input Text to Parse\". Menu items often consist of a name, an optional description/ingredients, and a price.\n   - **Layout Awareness**: Be mindful of multi-column layouts. Try to associate item names with their corresponding details (price, ingredients) even if they are in different visual columns. Read down columns where possible before moving across.\n   - For each item, determine:\n     - **Item Name**: The name of the dish or beverage. This is often the most prominent text for an item. **Aim for names that are between 2 and 50 characters. If a name is naturally very long on the menu, provide the most salient part that fits this range. Avoid extremely short or single-character names unless absolutely unavoidable and clearly the only identifier on the menu.**\n     - **Item Price**: The numerical price. If no price is listed, or if terms like \"Market Price\" or \"MP\" are used, omit this field or set to null. Prices are often at the end of an item\'s entry or in a separate column aligned with the item.\n     - **Item Type**: Classify as \"food\" or \"beverage\".\n     - **Item Ingredients**: Extract all listed or clearly described ingredients as an array of strings. Focus on nouns or noun phrases representing the food components. Omit general adjectives (e.g., \'delicious\', \'fresh\') unless part of a specific ingredient name (e.g., \'fresh mozzarella\'). Ingredients may be in a list below the item name or integrated into a descriptive sentence.\n     - **Item Category**: Identify the category primarily from section headers in the text (e.g., \"Starters\", \"Mains\", \"Desserts\", \"Butchers block\", \"Sides\", \"For the Table\", \"Dish of the day\"). Use the exact wording from the menu\'s section header if available. These headers are typically larger or distinctly styled. **Where possible and not conflicting with clear menu typography, try to output categories in lowercase (e.g., \"starters\" instead of \"STARTERS\") to align with preferred system formatting.** If no explicit section headers exist directly above a group of items, infer the category based on the item\'s position or typical menu structure (e.g., appetizers often appear first). Prioritize explicit headers found anywhere relevant before relying solely on positional inference. Sub-categories under a major header should generally be considered part of the major category unless the schema specifically asks for sub-categories (which it currently does not).\n     - **Dietary Flags**: Identify dietary attributes (isGlutenFree, isVegan, isVegetarian) based on explicit indicators (e.g., (V), (VG), (GF)) or analysis of ingredients. Set to false if not clearly indicated.\n\n3. **Output Schema**:\n   - Return the parsed data in the JSON structure defined by the 'extract_menu_data' function.\n\n4. **Additional Notes on Robustness & Tricky Layouts**:\n   - **Varied Formats**: Menus can have diverse visual structures. Try to identify patterns within the current menu to guide parsing.\n   - **Multi-line Items**: An item\'s name, description, or ingredients might span multiple lines. Consolidate this information for a single item. A new item typically starts with a distinctly formatted name or when a price for a previous item is clearly identified.\n   - **Irrelevant Text**: Ignore page numbers, restaurant contact details, decorative text, and visual separators (lines, asterisks) that are not part of item names, descriptions, or categories.\n   - **Price Association**: Ensure prices are correctly associated with their respective items, especially in multi-column layouts or when prices are listed separately but aligned with items.\n   - **Currency**: Ensure prices are numbers (e.g., 12.99), not strings with currency symbols (e.g., \"$12.99\"). The function call schema expects a number or null.\n\nExample Input Text (for your reference, this is an illustration of how an input might look, it is NOT the actual text to parse for the current request):\n\`\`\`
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

Example Output (for your reference, illustrating the expected JSON structure from the function call):
\`\`\`json
{
  "menuName": "Dinner Menu",
  "menuItems": [
    {
      "itemName": "Garlic Bread",
      "itemPrice": 8,
      "itemType": "food",
      "itemIngredients": ["toasted ciabatta", "garlic butter", "parsley", "bread"],
      "itemCategory": "Starters",
      "isGlutenFree": false,
      "isVegan": false,
      "isVegetarian": true
    },
    {
      "itemName": "Freedown Hill Wagyu Steak Burger",
      "itemPrice": 24,
      "itemType": "food",
      "itemIngredients": ["caramelised onion", "tomato relish", "double cheese", "tomato", "gem lettuce", "wagyu beef"],
      "itemCategory": "Main Courses",
      "isGlutenFree": false,
      "isVegan": false,
      "isVegetarian": false
    },
    {
      "itemName": "Vegan Curry",
      "itemPrice": 18,
      "itemType": "food",
      "itemIngredients": ["chickpeas", "spinach", "coconut milk", "basmati rice", "curry paste"],
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
Remember to use the actual "Input Text to Parse" and "Original Filename" provided in each request.
`;

// Define the schema for the function call for Gemini
const menuExtractionFunctionSchema: FunctionDeclaration = {
  name: "extract_menu_data",
  description:
    "Extracts structured menu data from raw menu text according to the provided instructions and schema.",
  parameters: {
    type: FunctionDeclarationSchemaType.OBJECT,
    properties: {
      menuName: {
        type: FunctionDeclarationSchemaType.STRING,
        description:
          'The overall name of the menu (e.g., "Dinner Menu"). Use original filename if not found in text.',
      },
      menuItems: {
        type: FunctionDeclarationSchemaType.ARRAY,
        description: "A list of all items found on the menu.",
        items: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            itemName: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                'The name of the menu item (e.g., "Classic Burger").',
            },
            itemPrice: {
              type: FunctionDeclarationSchemaType.NUMBER,
              description:
                'The price of the menu item as a number (e.g., 12.99). Null if not applicable (e.g. "Market Price") or not listed.',
            },
            itemType: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                'The type of the item, must be either "food" or "beverage".',
            },
            itemIngredients: {
              type: FunctionDeclarationSchemaType.ARRAY,
              description:
                'List of ingredients for the item (e.g., ["caramelised onion", "tomato relish"]).',
              items: {
                type: FunctionDeclarationSchemaType.STRING,
              } as FunctionDeclarationSchema,
            },
            itemCategory: {
              type: FunctionDeclarationSchemaType.STRING,
              description:
                'The category the item belongs to, ideally derived from section headers in the menu text (e.g., "Starters", "Main Courses", "Sides", "Butchers block"). If no header, infer from context. Use exact header wording if possible.',
            },
            isGlutenFree: {
              type: FunctionDeclarationSchemaType.BOOLEAN,
              description:
                "True if the item is marked or inferred as gluten-free, otherwise false.",
            },
            isVegan: {
              type: FunctionDeclarationSchemaType.BOOLEAN,
              description:
                "True if the item is marked or inferred as vegan, otherwise false.",
            },
            isVegetarian: {
              type: FunctionDeclarationSchemaType.BOOLEAN,
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
   * @param session - Optional Mongoose client session for transaction.
   * @returns A promise resolving to the created menu document.
   * @throws {AppError} If a menu with the same name already exists for the restaurant (400),
   *                    if Mongoose validation fails (e.g., name length) (400),
   *                    or if any database save operation fails (500).
   */
  static async createMenu(
    data: MenuData,
    restaurantId: Types.ObjectId,
    session?: mongoose.ClientSession
  ): Promise<IMenu> {
    const { name, description, isActive } = data;
    const trimmedName = name.trim();

    try {
      const existingMenuQuery = Menu.findOne({
        name: trimmedName,
        restaurantId: restaurantId,
      });
      if (session) {
        existingMenuQuery.session(session);
      }
      const existingMenu = await existingMenuQuery;

      if (existingMenu) {
        throw new AppError("A menu with this name already exists", 400);
      }

      const newMenuData: Partial<IMenu> = {
        name: trimmedName,
        restaurantId: restaurantId,
        isActive: isActive !== undefined ? isActive : true,
      };
      if (description) newMenuData.description = description.trim();

      const menu = new Menu(newMenuData);
      const savedMenu = await menu.save(session ? { session } : undefined);
      return savedMenu;
    } catch (error: any) {
      console.error("Error creating menu in service:", error);
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to create menu.", 500);
    }
  }

  /**
   * Retrieves all menus belonging to a specific restaurant.
   *
   * @param restaurantId - The ID of the restaurant whose menus are to be fetched.
   * @param status - Optional status filter (all, active, inactive)
   * @returns A promise resolving to an array of menu documents.
   * @throws {AppError} If any unexpected database error occurs (500).
   */
  static async getAllMenus(
    restaurantId: Types.ObjectId,
    status?: "all" | "active" | "inactive"
  ): Promise<IMenu[]> {
    try {
      const queryConditions: mongoose.FilterQuery<IMenu> = {
        restaurantId: restaurantId,
      };

      if (status === "active") {
        queryConditions.isActive = true;
      } else if (status === "inactive") {
        queryConditions.isActive = false;
      }
      // If status is 'all' or undefined, no isActive filter is added, fetching all.

      const menus = await Menu.find(queryConditions).lean();
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
  ): Promise<{ deletedMenuCount: number; deletedItemsCount: number }> {
    const menuObjectId =
      typeof menuId === "string" ? new Types.ObjectId(menuId) : menuId;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Verify the menu exists and belongs to the restaurant.
      const menu = await Menu.findOne({
        _id: menuObjectId,
        restaurantId: restaurantId,
      }).session(session);

      if (!menu) {
        throw new AppError(
          "Menu not found or does not belong to this restaurant.",
          404
        );
      }

      // 2. Delete associated MenuItems.
      const itemDeletionResult = await MenuItem.deleteMany(
        { menuId: menuObjectId, restaurantId: restaurantId },
        { session }
      );

      // 3. Delete the Menu document itself.
      const menuDeletionResult = await Menu.deleteOne({
        _id: menuObjectId,
        restaurantId: restaurantId,
      }).session(session);

      await session.commitTransaction();

      return {
        deletedMenuCount: menuDeletionResult.deletedCount || 0,
        deletedItemsCount: itemDeletionResult.deletedCount || 0,
      };
    } catch (error: any) {
      await session.abortTransaction();
      console.error("Error deleting menu and its items in service:", error);
      if (error instanceof AppError) {
        throw error;
      }
      if (error.name === "CastError" && error.path === "_id") {
        throw new AppError("Invalid Menu ID format.", 400);
      }
      throw new AppError("Failed to delete menu and associated items.", 500);
    } finally {
      session.endSession();
    }
  }

  /**
   * Updates the activation status of a menu.
   * @param menuId - The ID of the menu.
   * @param restaurantId - The ID of the restaurant for authorization.
   * @param isActive - The new activation status (true or false).
   * @returns A promise resolving to the updated menu document or null if not found/authorized.
   * @throws AppError on database or validation errors.
   */
  static async updateMenuActivationStatus(
    menuId: string | Types.ObjectId,
    restaurantId: Types.ObjectId,
    isActive: boolean
  ): Promise<IMenu | null> {
    const menuObjectId =
      typeof menuId === "string" ? new Types.ObjectId(menuId) : menuId;

    try {
      const updatedMenu = await Menu.findOneAndUpdate(
        { _id: menuObjectId, restaurantId: restaurantId },
        { $set: { isActive: isActive } },
        { new: true, runValidators: true }
      ).lean();

      if (!updatedMenu) {
        return null;
      }
      return updatedMenu as IMenu;
    } catch (error: any) {
      console.error("Error updating menu activation status in service:", error);
      if (error.name === "CastError" && error.path === "_id") {
        throw new AppError("Invalid Menu ID format.", 400);
      }
      // Simplified AppError call
      throw new AppError("Failed to update menu activation status.", 500);
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

    let session: mongoose.ClientSession | undefined = undefined; // Define session here to be accessible in finally

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

      // Initialize Gemini AI Client (this part remains outside transaction)
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
        systemInstruction: _systemInstruction,
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

      // Simplified prompt for the specific task, relying on systemInstruction for overall guidance
      const taskPrompt = `Input Text to Parse:\n-------------------------\n${rawText}\n-------------------------\n\nOriginal Filename (for context): ${
        originalFileName || "N/A"
      }\n\nNow, analyze the "Input Text to Parse" and directly call the 'extract_menu_data' function with the extracted structured menu data.`;

      const chat = model.startChat();
      const result = await chat.sendMessage(taskPrompt); // USE simplified taskPrompt
      const response = result.response;

      const functionCalls = response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        const functionCall = functionCalls[0];
        if (functionCall.name === "extract_menu_data") {
          const extractedData = functionCall.args as ExtractedMenuAIResponse;

          console.log(
            "[MenuService] AI extracted data:",
            JSON.stringify(extractedData, null, 2)
          );

          // --- Start Transaction ---
          session = await mongoose.startSession();
          session.startTransaction();

          const aiMenuName =
            extractedData.menuName ||
            (originalFileName
              ? path.parse(originalFileName).name.replace(/_/g, " ").trim()
              : "Imported Menu");
          const menuDataForCreate: MenuData = {
            name: aiMenuName.substring(0, 100),
            description: `Menu parsed from ${
              originalFileName || "uploaded PDF"
            } by AI.`.substring(0, 500),
            isActive: true,
          };

          const createdMenu = await MenuService.createMenu(
            menuDataForCreate,
            restaurantId,
            session
          );

          if (
            extractedData.menuItems &&
            Array.isArray(extractedData.menuItems)
          ) {
            for (const item of extractedData.menuItems) {
              const aiProvidedCategory: string = item.itemCategory;
              let resolvedItemType: ItemType;

              if (
                (ITEM_TYPES as ReadonlyArray<string>).includes(item.itemType)
              ) {
                resolvedItemType = item.itemType as ItemType;
              } else {
                console.warn(
                  `[MenuService] AI provided invalid itemType '${item.itemType}' for item '${item.itemName}'. Defaulting to 'food'.`
                );
                resolvedItemType = "food";
              }

              // Prepare and validate item name length before sending to ItemService
              let preparedItemName = String(
                item.itemName || "Unnamed AI Item"
              ).trim();
              if (preparedItemName.length < 2) {
                // If too short after trim, decide on a strategy:
                // Option 1: Skip this item
                // console.warn(`[MenuService] AI extracted item name '${item.itemName}' is too short. Skipping item.`);
                // continue;
                // Option 2: Use a modified placeholder that meets min length
                preparedItemName = `${preparedItemName} (AI Item)`.substring(
                  0,
                  50
                ); // Ensure it still fits if original was 1 char
                if (preparedItemName.length < 2)
                  preparedItemName = "Valid AI Item"; // Fallback if above is still too short
              }
              if (preparedItemName.length > 50) {
                preparedItemName = preparedItemName.substring(0, 50);
              }
              // At this point, preparedItemName should be between 2 and 50 chars if logic is correct

              const itemDataForService: Parameters<
                typeof ItemService.createItem
              >[0] = {
                name: preparedItemName, // Use the validated and potentially truncated name
                menuId: createdMenu._id as Types.ObjectId,
                itemType: resolvedItemType,
                category: aiProvidedCategory, // This is lowercased in ItemService.createItem
                description: undefined,
                price:
                  typeof item.itemPrice === "number"
                    ? item.itemPrice
                    : undefined,
                ingredients: item.itemIngredients || [],
                isGlutenFree: Boolean(item.isGlutenFree),
                isDairyFree: undefined,
                isVegetarian: Boolean(item.isVegetarian),
                isVegan: Boolean(item.isVegan),
              };
              try {
                await ItemService.createItem(
                  itemDataForService,
                  restaurantId,
                  session
                ); // Pass session
              } catch (itemError: any) {
                // If individual item creation fails, we might want to log and continue,
                // or abort the whole transaction. For now, let's rethrow to abort.
                console.warn(
                  `[MenuService] Error creating item "${item.itemName}" within transaction: ${itemError.message}. Aborting transaction.`
                );
                throw itemError; // This will be caught by the outer catch and abort the transaction
              }
            }
          }
          await session.commitTransaction();
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
        console.warn(
          "[MenuService] AI did not return a function call. Text response:",
          response.text()
        );
        throw new AppError(
          "AI processing error: AI did not return structured menu data as expected.",
          500
        );
      }
    } catch (error: any) {
      if (session && session.inTransaction()) {
        await session.abortTransaction();
      }
      console.error(
        "[MenuService] Error processing PDF menu upload with AI:",
        error
      );
      // Specific error handling from before remains relevant
      if (error instanceof AppError) throw error;
      if (error.message && error.message.includes("GEMINI_API_KEY")) {
        throw new AppError(
          "AI service configuration error. Please check API key.",
          500
        );
      }
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
    } finally {
      if (session) {
        session.endSession();
      }
      // Ensure file is deleted regardless of success or failure of the transaction/AI processing
      if (absoluteFilePath && fs.existsSync(absoluteFilePath)) {
        try {
          fs.unlinkSync(absoluteFilePath);
          console.log(
            `[MenuService] Successfully deleted temp file: ${absoluteFilePath}`
          );
        } catch (unlinkError: any) {
          console.error(
            `[MenuService] Failed to delete temp file ${absoluteFilePath}: ${unlinkError.message}`
          );
        }
      }
    }
  }
}

export default MenuService;
