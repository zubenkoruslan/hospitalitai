import mongoose, { Types } from "mongoose";
import Menu, { IMenu } from "../models/Menu";
import MenuItem, { IMenuItem, ItemType, ITEM_TYPES } from "../models/MenuItem";
import { AppError } from "../utils/errorHandler";
import pdfParse from "pdf-parse";
import fs from "fs";
import {
  GoogleGenerativeAI,
  FunctionDeclaration,
  FunctionDeclarationSchemaType,
  FunctionDeclarationSchema,
} from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";
import {
  GeminiAIServiceOutput,
  MenuUploadPreview,
  ParsedMenuItem,
  FinalImportRequestBody,
  ImportResult,
  ImportResultItemDetail,
  ProcessConflictResolutionRequest,
  ProcessConflictResolutionResponse,
  MenuImportJobData,
  ImportActionStatus,
  ConflictResolutionStatus,
  IMenuImportJob,
} from "../types/menuUploadTypes";
import MenuImportJobModel, {
  IMenuImportJobDocument,
} from "../models/MenuImportJobModel";
import { menuImportQueue } from "../queues/menuImportQueue";
import {
  MAX_ITEM_NAME_LENGTH,
  MAX_ITEM_DESCRIPTION_LENGTH,
  MAX_INGREDIENTS,
  MAX_INGREDIENT_LENGTH,
  ASYNC_IMPORT_THRESHOLD,
} from "../utils/constants";

interface MenuData {
  name: string;
  description?: string;
  isActive?: boolean;
}

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

interface _InternalMenuAIDataStructure {
  menuName: string;
  menuItems: ExtractedMenuItem[];
}

const _systemInstruction = `System: You are an expert at parsing restaurant menu data from raw text extracted from PDF files. Your task is to analyze the provided text and extract structured menu data according to the specified schema. Follow these instructions carefully to ensure accurate parsing.\\n\\n**CRITICAL INSTRUCTION: You MUST use the 'extract_menu_data' function to provide your response. Do NOT provide a text-based response or explanation. Your ONLY output should be the function call with the extracted data. No matter how difficult the menu or what issues you encounter, you must still attempt to call the function, even if it means some fields are empty or default values are used based on your best effort. Do not write any prose or conversational text.**\\n\\nInput Context Provided per Request:\\n- Raw text extracted from a PDF menu (labelled as \\"Input Text to Parse\\").\\n- Original filename of the PDF for context (labelled as \\"Original Filename\\").\\n\\nInstructions:\\n1. **Menu Name**:\\n   - Identify the menu name from the text (e.g., a title at the top like \\"Dinner Menu\\" or \\"Summer Menu\\").\\n   - If no clear menu name is found, use the \\"Original Filename\\" (without the \\".pdf\\" extension) as the menu name.\\n\\n2. **Menu Items**:\\n   - Extract each menu item from the \\"Input Text to Parse\\". Menu items often consist of a name, an optional description/ingredients, and a price.\\n   - **Layout Awareness**: Be mindful of multi-column layouts. Try to associate item names with their corresponding details (price, ingredients) even if they are in different visual columns. Read down columns where possible before moving across.\\n   - For each item, determine:\\n     - **Item Name**: The name of the dish or beverage. This is often the most prominent text for an item. **Aim for names that are between 2 and ${MAX_ITEM_NAME_LENGTH} characters. If a name is naturally very long on the menu, provide the most salient part that fits this range. Avoid extremely short or single-character names unless absolutely unavoidable and clearly the only identifier on the menu.**\\n     - **Item Price**: The numerical price. If no price is listed, or if terms like \\"Market Price\\" or \\"MP\\" are used, omit this field or set to null. Prices are often at the end of an item\\'s entry or in a separate column aligned with the item.\\n     - **Item Type**: Classify as \\"food\\" or \\"beverage\\".\\n     - **Item Ingredients**: Extract all listed or clearly described ingredients as an array of strings. Focus on nouns or noun phrases representing the food components. Omit general adjectives (e.g., 'delicious', 'fresh') unless part of a specific ingredient name (e.g., 'fresh mozzarella'). Ingredients may be in a list below the item name or integrated into a descriptive sentence.\\n     - **Item Category**: Identify the category primarily from section headers in the text (e.g., \\"Starters\\", \\"Mains\\", \\"Desserts\\", \\"Butchers block\\", \\"Sides\\", \\"For the Table\\", \\"Dish of the day\\"). Use the exact wording from the menu\\'s section header if available. These headers are typically larger or distinctly styled. **Where possible and not conflicting with clear menu typography, try to output categories in lowercase (e.g., \\"starters\\" instead of \\"STARTERS\\") to align with preferred system formatting.** If no explicit section headers exist directly above a group of items, infer the category based on the item\\'s position or typical menu structure (e.g., appetizers often appear first). Prioritize explicit headers found anywhere relevant before relying solely on positional inference. Sub-categories under a major header should generally be considered part of the major category unless the schema specifically asks for sub-categories (which it currently does not).\\n     - **Dietary Flags**: Identify dietary attributes (isGlutenFree, isVegan, isVegetarian) based on explicit indicators (e.g., (V), (VG), (GF)) or analysis of ingredients. Set to false if not clearly indicated. (isDairyFree is currently not requested for AI output but can be added if schema changes).\\n\\n3. **Output Schema**:\\n   - Return the parsed data in the JSON structure defined by the 'extract_menu_data' function.\\n\\n4. **Additional Notes on Robustness & Tricky Layouts**:\\n   - **Varied Formats**: Menus can have diverse visual structures. Try to identify patterns within the current menu to guide parsing.\\n   - **Multi-line Items**: An item\\'s name, description, or ingredients might span multiple lines. Consolidate this information for a single item. A new item typically starts with a distinctly formatted name or when a price for a previous item is clearly identified.\\n   - **Irrelevant Text**: Ignore page numbers, restaurant contact details, decorative text, and visual separators (lines, asterisks) that are not part of item names, descriptions, or categories.\\n   - **Price Association**: Ensure prices are correctly associated with their respective items, especially in multi-column layouts or when prices are listed separately but aligned with items.\\n   - **Currency**: Ensure prices are numbers (e.g., 12.99), not strings with currency symbols (e.g., \\"$12.99\\"). The function call schema expects a number or null.\\n\n(Example input/output omitted for brevity, assumed to be correct as per previous versions)\n`;

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
                "The price of the menu item as a number (e.g., 12.99). Null if not applicable or not listed.",
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
                'The category the item belongs to, e.g., "Starters", "Main Courses".',
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
        } as FunctionDeclarationSchema,
      },
    },
    required: ["menuName", "menuItems"],
  } as FunctionDeclarationSchema,
};

async function getAIRawExtraction(
  rawText: string,
  originalFileName?: string
): Promise<GeminiAIServiceOutput> {
  const GOOGLE_GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GOOGLE_GEMINI_API_KEY) {
    throw new AppError("Google Gemini API key is not configured.", 500);
  }
  const genAI = new GoogleGenerativeAI(GOOGLE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-latest",
    systemInstruction: _systemInstruction,
    tools: [{ functionDeclarations: [menuExtractionFunctionSchema] }],
  });

  const chat = model.startChat({});
  const promptParts = [
    `Original Filename: ${originalFileName || "Unknown"}`,
    `Input Text to Parse: ${rawText}`,
  ];

  try {
    const result = await chat.sendMessage(promptParts);
    const call = result.response.functionCalls()?.[0];

    if (call && call.name === "extract_menu_data") {
      return call.args as GeminiAIServiceOutput;
    } else {
      const responseText = result.response.text();
      console.error(
        "Gemini did not return the expected function call:",
        responseText
      );
      throw new AppError(
        "AI failed to process the menu using the expected function call structure. The response text was: " +
          responseText,
        500,
        {
          aiResponseText: responseText,
          reason: "No function call or incorrect function call name",
        }
      );
    }
  } catch (error: any) {
    console.error("Error during AI processing or sending message:", error);
    throw new AppError(`AI processing error: ${error.message}`, 500, {
      originalError: error.message,
      details: error.stack,
    });
  }
}

class MenuService {
  private static _prepareAndValidateNewItemData(
    itemFields: ParsedMenuItem["fields"],
    menuObjectId: Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Omit<
    IMenuItem,
    keyof mongoose.Document | "_id" | "createdAt" | "updatedAt"
  > & { _id?: Types.ObjectId } {
    const newItemData: any = {
      menuId: menuObjectId,
      restaurantId: restaurantId,
    };

    if (itemFields.name.value) {
      const name = String(itemFields.name.value).trim();
      if (!name) throw new Error("Item name cannot be empty.");
      if (name.length > MAX_ITEM_NAME_LENGTH)
        throw new Error(
          `Item name exceeds maximum length of ${MAX_ITEM_NAME_LENGTH} characters.`
        );
      newItemData.name = name;
    } else {
      throw new Error("Item name is required.");
    }

    newItemData.price =
      itemFields.price.value !== null &&
      itemFields.price.value !== undefined &&
      String(itemFields.price.value).trim() !== ""
        ? Number(itemFields.price.value)
        : undefined;
    if (
      newItemData.price !== undefined &&
      (isNaN(newItemData.price) || newItemData.price < 0)
    ) {
      throw new Error("Invalid item price. Must be a non-negative number.");
    }

    newItemData.description = String(
      itemFields.description?.value || ""
    ).trim();
    if (newItemData.description.length > MAX_ITEM_DESCRIPTION_LENGTH)
      throw new Error(
        `Item description exceeds maximum length of ${MAX_ITEM_DESCRIPTION_LENGTH} characters.`
      );

    newItemData.category = String(
      itemFields.category.value || "Uncategorized"
    ).trim();

    newItemData.itemType = (
      ITEM_TYPES.includes(String(itemFields.itemType.value) as ItemType)
        ? String(itemFields.itemType.value)
        : "food"
    ) as ItemType;

    const ingredients = (
      Array.isArray(itemFields.ingredients.value)
        ? (itemFields.ingredients.value as string[])
        : []
    )
      .map((ing) => String(ing).trim())
      .filter((ing) => ing);
    if (ingredients.length > MAX_INGREDIENTS)
      throw new Error(
        `Number of ingredients exceeds maximum of ${MAX_INGREDIENTS}.`
      );
    ingredients.forEach((ing) => {
      if (ing.length > MAX_INGREDIENT_LENGTH)
        throw new Error(
          `Ingredient "${ing}" exceeds maximum length of ${MAX_INGREDIENT_LENGTH} characters.`
        );
    });
    newItemData.ingredients = ingredients;

    newItemData.isGlutenFree = Boolean(itemFields.isGlutenFree.value);
    newItemData.isVegan = Boolean(itemFields.isVegan.value);
    newItemData.isVegetarian = Boolean(itemFields.isVegetarian.value);
    newItemData.isDairyFree = false;

    return newItemData as Omit<
      IMenuItem,
      keyof mongoose.Document | "_id" | "createdAt" | "updatedAt"
    > & { _id?: Types.ObjectId };
  }

  private static _prepareAndValidateUpdatedItemData(
    itemFields: ParsedMenuItem["fields"],
    existingItemDoc: IMenuItem
  ): Record<string, any> {
    const updatePayload: Record<string, any> = {};

    if (
      itemFields.name.value !== undefined &&
      String(itemFields.name.value).trim() !== existingItemDoc.name
    ) {
      const name = String(itemFields.name.value).trim();
      if (!name) throw new Error("Item name cannot be empty.");
      if (name.length > MAX_ITEM_NAME_LENGTH)
        throw new Error(
          `Item name exceeds maximum length of ${MAX_ITEM_NAME_LENGTH} characters.`
        );
      updatePayload.name = name;
    }

    const newPrice =
      itemFields.price.value !== null &&
      itemFields.price.value !== undefined &&
      String(itemFields.price.value).trim() !== ""
        ? Number(itemFields.price.value)
        : undefined;

    if (newPrice !== undefined) {
      if (isNaN(newPrice) || newPrice < 0)
        throw new Error("Invalid item price. Must be a non-negative number.");
      if (newPrice !== existingItemDoc.price) updatePayload.price = newPrice;
    } else if (existingItemDoc.price !== undefined && newPrice === undefined) {
      updatePayload.price = undefined;
    }

    if (
      itemFields.description?.value !== undefined &&
      String(itemFields.description.value).trim() !==
        (existingItemDoc.description || "")
    ) {
      const description = String(itemFields.description.value).trim();
      if (description.length > MAX_ITEM_DESCRIPTION_LENGTH)
        throw new Error(
          `Item description exceeds maximum length of ${MAX_ITEM_DESCRIPTION_LENGTH} characters.`
        );
      updatePayload.description = description;
    }

    if (
      itemFields.category.value !== undefined &&
      String(itemFields.category.value).trim() !==
        (existingItemDoc.category || "Uncategorized")
    ) {
      updatePayload.category = String(itemFields.category.value).trim();
    }

    if (
      itemFields.itemType.value !== undefined &&
      String(itemFields.itemType.value) !== existingItemDoc.itemType
    ) {
      const itemType = ITEM_TYPES.includes(
        String(itemFields.itemType.value) as ItemType
      )
        ? String(itemFields.itemType.value)
        : existingItemDoc.itemType;
      updatePayload.itemType = itemType as ItemType;
    }

    if (itemFields.ingredients.value !== undefined) {
      const newIngredients = (
        Array.isArray(itemFields.ingredients.value)
          ? (itemFields.ingredients.value as string[])
          : []
      )
        .map((ing) => String(ing).trim())
        .filter((ing) => ing);
      if (newIngredients.length > MAX_INGREDIENTS)
        throw new Error(
          `Number of ingredients exceeds maximum of ${MAX_INGREDIENTS}.`
        );
      newIngredients.forEach((ing) => {
        if (ing.length > MAX_INGREDIENT_LENGTH)
          throw new Error(
            `Ingredient "${ing}" exceeds maximum length of ${MAX_INGREDIENT_LENGTH} characters.`
          );
      });
      if (
        JSON.stringify(newIngredients) !==
        JSON.stringify(existingItemDoc.ingredients || [])
      ) {
        updatePayload.ingredients = newIngredients;
      }
    }

    if (
      itemFields.isGlutenFree.value !== undefined &&
      Boolean(itemFields.isGlutenFree.value) !== existingItemDoc.isGlutenFree
    ) {
      updatePayload.isGlutenFree = Boolean(itemFields.isGlutenFree.value);
    }
    if (
      itemFields.isVegan.value !== undefined &&
      Boolean(itemFields.isVegan.value) !== existingItemDoc.isVegan
    ) {
      updatePayload.isVegan = Boolean(itemFields.isVegan.value);
    }
    if (
      itemFields.isVegetarian.value !== undefined &&
      Boolean(itemFields.isVegetarian.value) !== existingItemDoc.isVegetarian
    ) {
      updatePayload.isVegetarian = Boolean(itemFields.isVegetarian.value);
    }
    return updatePayload;
  }

  static async createMenu(
    data: MenuData,
    restaurantId: Types.ObjectId,
    session?: mongoose.ClientSession
  ): Promise<IMenu> {
    const existingMenu = await Menu.findOne({ name: data.name, restaurantId });
    if (existingMenu) {
      throw new AppError(
        `A menu with the name "${data.name}" already exists for this restaurant. Please choose a different name or update the existing menu.`,
        409
      );
    }
    const menu = new Menu({ ...data, restaurantId });
    await menu.save({ session });
    return menu;
  }

  static async getAllMenus(
    restaurantId: Types.ObjectId,
    status?: "all" | "active" | "inactive"
  ): Promise<IMenu[]> {
    const query: any = { restaurantId };
    if (status && status !== "all") {
      query.isActive = status === "active";
    }
    return Menu.find(query).sort({ name: 1 });
  }

  static async getMenuById(
    menuId: string | Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<any | null> {
    console.log(
      "[MenuService.getMenuById] Received menuId:",
      menuId,
      "- Type:",
      typeof menuId,
      "- Length:",
      String(menuId).length
    );
    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      console.error(
        "[MenuService.getMenuById] Validation failed for menuId:",
        menuId
      );
      throw new AppError("Invalid menu ID format", 400);
    }
    const menu = await Menu.findOne({ _id: menuId, restaurantId }).lean();
    if (!menu) {
      return null;
    }
    const items = await MenuItem.find({
      menuId: menu._id,
      restaurantId,
      isActive: true,
    }).lean();
    return { ...menu, items };
  }

  static async updateMenu(
    menuId: string | Types.ObjectId,
    updateData: Partial<MenuData>,
    restaurantId: Types.ObjectId
  ): Promise<IMenu | null> {
    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      throw new AppError("Invalid menu ID format", 400);
    }
    const menu = await Menu.findOne({ _id: menuId, restaurantId });
    if (!menu) {
      throw new AppError(
        "Menu not found or does not belong to this restaurant",
        404
      );
    }
    if (updateData.name && updateData.name !== menu.name) {
      const existingMenuWithName = await Menu.findOne({
        name: updateData.name,
        restaurantId,
        _id: { $ne: menuId },
      });
      if (existingMenuWithName) {
        throw new AppError(
          `Another menu with the name "${updateData.name}" already exists. Please choose a different name.`,
          409
        );
      }
    }
    Object.assign(menu, updateData);
    await menu.save();
    return menu;
  }

  static async deleteMenu(
    menuId: string | Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<{ deletedMenuCount: number; deletedItemsCount: number }> {
    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      throw new AppError("Invalid menu ID format", 400);
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const menu = await Menu.findOne({ _id: menuId, restaurantId }).session(
        session
      );
      if (!menu) {
        throw new AppError(
          "Menu not found or does not belong to this restaurant",
          404
        );
      }
      const deletedItemsResult = await MenuItem.deleteMany({
        menuId,
        restaurantId,
      }).session(session);
      const deletedMenuResult = await Menu.deleteOne({
        _id: menuId,
        restaurantId,
      }).session(session);
      if (deletedMenuResult.deletedCount === 0) {
        throw new AppError(
          "Menu not found during delete operation or does not belong to this restaurant",
          404
        );
      }
      await session.commitTransaction();
      return {
        deletedMenuCount: deletedMenuResult.deletedCount,
        deletedItemsCount: deletedItemsResult.deletedCount,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async updateMenuActivationStatus(
    menuId: string | Types.ObjectId,
    restaurantId: Types.ObjectId,
    isActive: boolean
  ): Promise<IMenu | null> {
    if (!mongoose.Types.ObjectId.isValid(menuId)) {
      throw new AppError("Invalid menu ID format", 400);
    }
    const menu = await Menu.findOne({ _id: menuId, restaurantId });
    if (!menu) {
      throw new AppError(
        "Menu not found or does not belong to this restaurant",
        404
      );
    }
    menu.isActive = isActive;
    await menu.save();
    return menu;
  }

  static async getMenuUploadPreview(
    multerFilePath: string,
    restaurantId: Types.ObjectId,
    originalFileName?: string
  ): Promise<MenuUploadPreview> {
    let rawText = "";
    let parsedAIOutput: GeminiAIServiceOutput | null = null;
    const previewId = uuidv4();
    const globalErrors: string[] = [];

    try {
      const dataBuffer = fs.readFileSync(multerFilePath);
      const pdfData = await pdfParse(dataBuffer);
      rawText = pdfData.text;
    } catch (error: any) {
      console.error("Error reading or parsing PDF for preview:", error);
      globalErrors.push(`Failed to read or parse PDF: ${error.message}`);
      return {
        previewId,
        filePath: multerFilePath,
        sourceFormat: "pdf",
        parsedMenuName:
          originalFileName?.replace(/\.pdf$/i, "") || "Menu from PDF",
        parsedItems: [],
        detectedCategories: [],
        summary: { totalItemsParsed: 0, itemsWithPotentialErrors: 0 },
        globalErrors,
        rawAIText: rawText.substring(0, 5000),
        rawAIOutput: null,
      };
    }

    if (!rawText.trim()) {
      globalErrors.push("No text content could be extracted from the PDF.");
    }

    try {
      if (rawText.trim()) {
        parsedAIOutput = await getAIRawExtraction(rawText, originalFileName);
      }
    } catch (error: any) {
      console.error("Error calling AI for preview:", error);
      globalErrors.push(`AI processing failed: ${error.message}`);
      if (error instanceof AppError && error.additionalDetails) {
        globalErrors.push(
          `AI Details: ${JSON.stringify(error.additionalDetails)}`
        );
      }
    }

    const parsedItems: ParsedMenuItem[] = [];
    const detectedCategories = new Set<string>();
    let itemsWithPotentialErrors = 0;

    if (parsedAIOutput && parsedAIOutput.menuItems) {
      parsedAIOutput.menuItems.forEach((aiItem, index) => {
        const itemId = uuidv4();
        let itemHasError = false;

        const fields: ParsedMenuItem["fields"] = {
          name: { value: aiItem.itemName?.trim() || "", isValid: true },
          price: {
            value:
              aiItem.itemPrice !== undefined && aiItem.itemPrice !== null
                ? Number(aiItem.itemPrice)
                : null,
            isValid: true,
          },
          description: { value: "", isValid: true },
          category: {
            value: aiItem.itemCategory?.trim() || "Uncategorized",
            isValid: true,
          },
          itemType: {
            value: ITEM_TYPES.includes(aiItem.itemType as ItemType)
              ? aiItem.itemType
              : "food",
            isValid: true,
          },
          ingredients: {
            value: Array.isArray(aiItem.itemIngredients)
              ? aiItem.itemIngredients
                  .map((i) => String(i).trim())
                  .filter((i) => i)
              : [],
            isValid: true,
          },
          isGlutenFree: { value: Boolean(aiItem.isGlutenFree), isValid: true },
          isVegan: { value: Boolean(aiItem.isVegan), isValid: true },
          isVegetarian: { value: Boolean(aiItem.isVegetarian), isValid: true },
        };

        if (!fields.name.value) {
          fields.name.isValid = false;
          fields.name.errorMessage = "Item name is missing from AI output.";
          itemHasError = true;
        }
        if (String(fields.name.value).length > MAX_ITEM_NAME_LENGTH) {
          fields.name.isValid = false;
          fields.name.errorMessage = `Name too long (max ${MAX_ITEM_NAME_LENGTH}). AI parsed: ${String(
            fields.name.value
          ).substring(0, MAX_ITEM_NAME_LENGTH)}...`;
          itemHasError = true;
        }
        if (
          fields.price.value !== null &&
          (isNaN(Number(fields.price.value)) || Number(fields.price.value) < 0)
        ) {
          fields.price.isValid = false;
          fields.price.errorMessage =
            "Invalid price (must be non-negative number).";
          itemHasError = true;
        }
        if (fields.category.value) {
          detectedCategories.add(String(fields.category.value));
        }

        if (itemHasError) itemsWithPotentialErrors++;

        parsedItems.push({
          id: itemId,
          internalIndex: index,
          fields,
          status: itemHasError ? "error_system_validation" : "new",
          originalSourceData: aiItem,
        });
      });
    }

    return {
      previewId,
      filePath: multerFilePath,
      sourceFormat: "pdf",
      parsedMenuName:
        parsedAIOutput?.menuName ||
        originalFileName?.replace(/\.pdf$/i, "") ||
        "Menu from PDF",
      parsedItems,
      detectedCategories: Array.from(detectedCategories),
      summary: {
        totalItemsParsed: parsedItems.length,
        itemsWithPotentialErrors,
      },
      globalErrors,
      rawAIText: rawText.substring(0, 5000),
      rawAIOutput: parsedAIOutput,
    };
  }

  static async processPdfMenuUpload(
    multerFilePath: string,
    restaurantId: Types.ObjectId,
    originalFileName?: string
  ): Promise<IMenu> {
    throw new AppError(
      "processPdfMenuUpload is deprecated, use getMenuUploadPreview and finalizeMenuImport.",
      500
    );
  }

  static async finalizeMenuImport(
    data: FinalImportRequestBody,
    restaurantId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<ImportResult | { jobId: string; message: string }> {
    const {
      filePath,
      parsedMenuName,
      targetMenuId,
      replaceAllItems,
      itemsToImport,
    } = data;

    if (itemsToImport.length > ASYNC_IMPORT_THRESHOLD) {
      const newMenuImportJobDocData = {
        userId,
        restaurantId,
        originalFilePath: filePath,
        parsedMenuName,
        targetMenuId: targetMenuId
          ? new Types.ObjectId(targetMenuId)
          : undefined,
        replaceAllItems,
        itemsToImport,
        status: "pending" as IMenuImportJob["status"],
        progress: 0,
        attempts: 0,
      };
      const newMenuImportJobDoc: IMenuImportJobDocument =
        new MenuImportJobModel(newMenuImportJobDocData);
      await newMenuImportJobDoc.save();

      const jobData: MenuImportJobData = {
        menuImportJobDocumentId: (
          newMenuImportJobDoc._id as Types.ObjectId
        ).toString(),
      };
      await menuImportQueue.add("menu-import-job", jobData);

      return {
        jobId: (newMenuImportJobDoc._id as Types.ObjectId).toString(),
        message: `Menu import with ${
          itemsToImport.length
        } items has been queued for processing. Job ID: ${(
          newMenuImportJobDoc._id as Types.ObjectId
        ).toString()}`,
      };
    }

    console.log(
      "Processing import synchronously as item count is below threshold."
    );
    const session = await mongoose.startSession();
    session.startTransaction();
    let menuObjectId: Types.ObjectId | undefined = targetMenuId
      ? new Types.ObjectId(targetMenuId)
      : undefined;
    let finalMenuName = parsedMenuName;
    const result: ImportResult = {
      overallStatus: "success",
      message: "",
      menuId: undefined,
      menuName: undefined,
      itemsProcessed: itemsToImport.length,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      itemsErrored: 0,
      errorDetails: [],
      errorReport: "",
    };
    const errorReportLines: string[] = [
      "ItemID,ItemName,ActionAttempted,ErrorReason",
    ];

    try {
      let menu: IMenu | null = null;
      if (targetMenuId) {
        menu = await Menu.findOne({ _id: targetMenuId, restaurantId }).session(
          session
        );
        if (!menu) {
          throw new AppError(
            `Target menu with ID "${targetMenuId}" not found.`,
            404
          );
        }
        menuObjectId = menu._id as Types.ObjectId;
        finalMenuName = menu.name;
        result.menuId = menuObjectId.toString();
        result.menuName = finalMenuName;
        if (replaceAllItems) {
          await MenuItem.deleteMany({
            menuId: menuObjectId,
            restaurantId,
          }).session(session);
          console.log(
            `All existing items deleted from menu "${finalMenuName}" as per replaceAllItems flag.`
          );
        }
      } else if (parsedMenuName) {
        menu = await Menu.findOne({
          name: parsedMenuName,
          restaurantId,
        }).session(session);
        if (!menu) {
          if (!parsedMenuName.trim()) {
            throw new AppError(
              "Menu name cannot be empty when creating a new menu.",
              400
            );
          }
          menu = await MenuService.createMenu(
            { name: parsedMenuName, isActive: true },
            restaurantId,
            session
          );
        }
        menuObjectId = menu._id as Types.ObjectId;
        finalMenuName = menu.name;
        result.menuId = menuObjectId.toString();
        result.menuName = finalMenuName;
        if (replaceAllItems) {
          await MenuItem.deleteMany({
            menuId: menuObjectId,
            restaurantId,
          }).session(session);
          console.log(
            `All existing items deleted from menu "${finalMenuName}" as per replaceAllItems flag.`
          );
        }
      } else {
        throw new AppError(
          "TargetMenuId or parsedMenuName must be provided.",
          400
        );
      }

      if (!menuObjectId) {
        throw new AppError(
          "Failed to identify target menu. Critical logic error.",
          500
        );
      }

      const bulkOperations: any[] = [];
      for (const item of itemsToImport) {
        try {
          if (item.importAction === "skip" || item.userAction === "ignore") {
            result.itemsSkipped++;
            continue;
          }
          if (item.importAction === "create") {
            const newItemData = MenuService._prepareAndValidateNewItemData(
              item.fields,
              menuObjectId,
              restaurantId
            );
            bulkOperations.push({ insertOne: { document: newItemData } });
            result.itemsCreated++;
          } else if (item.importAction === "update" && item.existingItemId) {
            const existingItem = await MenuItem.findOne({
              _id: item.existingItemId,
              restaurantId,
              menuId: menuObjectId,
            }).session(session);
            if (!existingItem)
              throw new Error(
                `Item to update (ID: ${item.existingItemId}) not found in target menu ${menuObjectId}.`
              );

            const updatePayload =
              MenuService._prepareAndValidateUpdatedItemData(
                item.fields,
                existingItem
              );
            if (Object.keys(updatePayload).length > 0) {
              bulkOperations.push({
                updateOne: {
                  filter: { _id: existingItem._id },
                  update: { $set: updatePayload },
                },
              });
              result.itemsUpdated++;
            } else {
              result.itemsSkipped++;
            }
          } else {
            throw new Error(
              `Invalid importAction '${item.importAction}' or missing existingItemId for update.`
            );
          }
        } catch (error: any) {
          result.itemsErrored++;
          const errorStatus: ImportActionStatus = "error";
          result.errorDetails?.push({
            id: item.id,
            name: String(item.fields.name.value || "N/A"),
            status: errorStatus,
            errorReason: error.message,
            existingItemId: item.existingItemId,
          });
          errorReportLines.push(
            `"${item.id}","${String(item.fields.name.value || "N/A").replace(
              /"/g,
              '""'
            )}","${item.importAction || "N/A"}","${error.message.replace(
              /"/g,
              '""'
            )}"`
          );
        }
      }

      if (bulkOperations.length > 0) {
        const bulkWriteResult = await MenuItem.bulkWrite(bulkOperations, {
          session,
        });
        if (bulkWriteResult.hasWriteErrors()) {
          bulkWriteResult.getWriteErrors().forEach((writeError: any) => {
            result.itemsErrored++;
            const errorStatus: ImportActionStatus = "error";
            result.errorDetails?.push({
              id: `bulkError_${writeError.index ?? "N/A"}`,
              name: "Bulk Op Error",
              status: errorStatus,
              errorReason: writeError.errmsg,
            });
            errorReportLines.push(
              `"bulkError_${
                writeError.index ?? "N/A"
              }","Bulk Op Error","bulk_operation","${(
                writeError.errmsg || "Unknown bulk error"
              ).replace(/"/g, '""')}"`
            );
          });
        }
      }

      result.overallStatus =
        result.itemsErrored > 0
          ? result.itemsErrored === itemsToImport.length - result.itemsSkipped
            ? "failed"
            : "partial_success"
          : "success";
      result.message =
        result.itemsErrored > 0
          ? `Import completed with ${result.itemsErrored} errors.`
          : `Successfully imported ${result.itemsCreated} new items and updated ${result.itemsUpdated} items. ${result.itemsSkipped} items were skipped.`;

      if (errorReportLines.length > 1)
        result.errorReport = errorReportLines.join("\\n");
      result.menuName = finalMenuName;
      await session.commitTransaction();

      if (filePath && fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err)
            console.error(
              "Error deleting temp PDF after sync import:",
              filePath,
              err
            );
          else console.log("Temp PDF deleted after sync import:", filePath);
        });
      }
    } catch (error: any) {
      await session.abortTransaction();
      result.overallStatus = "failed";
      result.message = error.message || "Unexpected error during import.";
      const errorStatus: ImportActionStatus = "error";
      if (error instanceof AppError && error.additionalDetails) {
        result.errorDetails?.push({
          id: "global_error",
          name: "Global Import Error",
          status: errorStatus,
          errorReason: JSON.stringify(error.additionalDetails),
        });
      } else {
        result.errorDetails?.push({
          id: "global_error",
          name: "Global Import Error",
          status: errorStatus,
          errorReason: error.message,
        });
      }
    } finally {
      session.endSession();
    }
    return result;
  }

  static async processQueuedMenuImport(
    menuImportJobDocumentId: string | Types.ObjectId
  ): Promise<ImportResult> {
    const jobDoc = await MenuImportJobModel.findById(
      menuImportJobDocumentId
    ).exec();
    if (!jobDoc) {
      return {
        overallStatus: "failed",
        message: `Critical error: MenuImportJob document not found for ID: ${menuImportJobDocumentId}.`,
        itemsProcessed: 0,
        itemsCreated: 0,
        itemsUpdated: 0,
        itemsSkipped: 0,
        itemsErrored: 0,
      };
    }

    jobDoc.status = "processing";
    jobDoc.processedAt = new Date();
    await jobDoc.save();

    const {
      restaurantId,
      originalFilePath,
      parsedMenuName,
      targetMenuId,
      replaceAllItems,
      itemsToImport,
    } = jobDoc;

    const jobRestaurantId = new Types.ObjectId(restaurantId);

    const session = await mongoose.startSession();
    session.startTransaction();

    let menuObjectId: Types.ObjectId | undefined = targetMenuId
      ? new Types.ObjectId(targetMenuId.toString())
      : undefined;
    let finalMenuName = parsedMenuName;

    const jobResult: ImportResult = {
      overallStatus: "success",
      message: "",
      menuId: undefined,
      menuName: undefined,
      itemsProcessed: itemsToImport.length,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      itemsErrored: 0,
      errorDetails: [],
      errorReport: "",
    };
    const errorReportLines: string[] = [
      "ItemID,ItemName,ActionAttempted,ErrorReason",
    ];

    try {
      let menu: IMenu | null = null;
      if (targetMenuId) {
        menu = await Menu.findOne({
          _id: targetMenuId,
          restaurantId: jobRestaurantId,
        }).session(session);
        if (!menu) {
          throw new AppError(
            `Target menu with ID "${targetMenuId}" not found for job ${jobDoc._id}.`,
            404
          );
        }
        menuObjectId = menu._id as Types.ObjectId;
        finalMenuName = menu.name;
        jobResult.menuId = menuObjectId.toString();
        jobResult.menuName = finalMenuName;
        if (replaceAllItems) {
          await MenuItem.deleteMany({
            menuId: menuObjectId,
            restaurantId: jobRestaurantId,
          }).session(session);
          console.log(
            `Job ${jobDoc._id}: All existing items deleted from menu "${finalMenuName}" as per replaceAllItems flag.`
          );
        }
      } else if (parsedMenuName) {
        menu = await Menu.findOne({
          name: parsedMenuName,
          restaurantId: jobRestaurantId,
        }).session(session);
        if (!menu) {
          if (!parsedMenuName.trim()) {
            throw new AppError(
              `Menu name cannot be empty when creating a new menu for job ${jobDoc._id}.`,
              400
            );
          }
          menu = await MenuService.createMenu(
            { name: parsedMenuName, isActive: true },
            jobRestaurantId,
            session
          );
        }
        menuObjectId = menu._id as Types.ObjectId;
        finalMenuName = menu.name;
        jobResult.menuId = menuObjectId.toString();
        jobResult.menuName = finalMenuName;

        if (replaceAllItems) {
          await MenuItem.deleteMany({
            menuId: menuObjectId,
            restaurantId: jobRestaurantId,
          }).session(session);
          console.log(
            `Job ${jobDoc._id}: All existing items deleted from menu "${finalMenuName}" as per replaceAllItems flag.`
          );
        }
      } else {
        throw new AppError(
          `TargetMenuId or parsedMenuName must be provided for job ${jobDoc._id}.`,
          400
        );
      }

      if (!menuObjectId) {
        throw new AppError(
          `Failed to identify target menu for job ${jobDoc._id}. Critical logic error.`,
          500
        );
      }

      const bulkOperations: any[] = [];
      for (const item of itemsToImport) {
        try {
          if (item.importAction === "skip" || item.userAction === "ignore") {
            jobResult.itemsSkipped++;
            continue;
          }
          if (item.importAction === "create") {
            const newItemData = MenuService._prepareAndValidateNewItemData(
              item.fields,
              menuObjectId,
              jobRestaurantId
            );
            bulkOperations.push({ insertOne: { document: newItemData } });
            jobResult.itemsCreated++;
          } else if (item.importAction === "update" && item.existingItemId) {
            const existingItem = await MenuItem.findOne({
              _id: item.existingItemId,
              restaurantId: jobRestaurantId,
              menuId: menuObjectId,
            }).session(session);
            if (!existingItem)
              throw new Error(
                `Item to update (ID: ${item.existingItemId}) not found in target menu ${menuObjectId} for job ${jobDoc._id}.`
              );

            const updatePayload =
              MenuService._prepareAndValidateUpdatedItemData(
                item.fields,
                existingItem
              );
            if (Object.keys(updatePayload).length > 0) {
              bulkOperations.push({
                updateOne: {
                  filter: { _id: existingItem._id },
                  update: { $set: updatePayload },
                },
              });
              jobResult.itemsUpdated++;
            } else {
              jobResult.itemsSkipped++;
            }
          } else {
            throw new Error(
              `Invalid importAction '${item.importAction}' or missing existingItemId for update on job ${jobDoc._id}.`
            );
          }
        } catch (error: any) {
          jobResult.itemsErrored++;
          const errorStatus: ImportActionStatus = "error";
          jobResult.errorDetails?.push({
            id: item.id,
            name: String(item.fields.name.value || "N/A"),
            status: errorStatus,
            errorReason: error.message,
            existingItemId: item.existingItemId,
          });
          errorReportLines.push(
            `"${item.id}","${String(item.fields.name.value || "N/A").replace(
              /"/g,
              '""'
            )}","${item.importAction || "N/A"}","${error.message.replace(
              /"/g,
              '""'
            )}"`
          );
        }
      }

      if (bulkOperations.length > 0) {
        const bulkWriteResult = await MenuItem.bulkWrite(bulkOperations, {
          session,
        });
        if (bulkWriteResult.hasWriteErrors()) {
          bulkWriteResult.getWriteErrors().forEach((writeError: any) => {
            jobResult.itemsErrored++;
            const errorStatus: ImportActionStatus = "error";
            jobResult.errorDetails?.push({
              id: `bulkError_${writeError.index ?? "N/A"}`,
              name: "Bulk Op Error",
              status: errorStatus,
              errorReason: writeError.errmsg,
            });
            errorReportLines.push(
              `"bulkError_${
                writeError.index ?? "N/A"
              }","Bulk Op Error","bulk_operation","${(
                writeError.errmsg || "Unknown bulk error"
              ).replace(/"/g, '""')}"`
            );
          });
        }
      }

      jobResult.overallStatus =
        jobResult.itemsErrored > 0
          ? jobResult.itemsErrored ===
            itemsToImport.length - jobResult.itemsSkipped
            ? "failed"
            : "partial_success"
          : "success";
      jobResult.message =
        jobResult.itemsErrored > 0
          ? `Import completed with ${jobResult.itemsErrored} errors for job ${jobDoc._id}.`
          : `Successfully imported ${jobResult.itemsCreated} new items and updated ${jobResult.itemsUpdated} items for job ${jobDoc._id}. ${jobResult.itemsSkipped} items were skipped.`;

      if (errorReportLines.length > 1)
        jobResult.errorReport = errorReportLines.join("\\n");
      jobResult.menuName = finalMenuName;

      await session.commitTransaction();
      jobDoc.status =
        jobResult.overallStatus === "failed"
          ? "failed"
          : jobResult.overallStatus === "partial_success"
          ? "partial_success"
          : "completed";
      jobDoc.errorMessage = jobResult.message;

      if (
        (jobDoc.status === "completed" ||
          jobDoc.status === "partial_success") &&
        originalFilePath &&
        fs.existsSync(originalFilePath)
      ) {
        fs.unlink(originalFilePath, (err) => {
          if (err)
            console.error(
              `Job ${jobDoc._id}: Error deleting temp PDF after async import:`,
              originalFilePath,
              err
            );
          else
            console.log(
              `Job ${jobDoc._id}: Temp PDF deleted after async import:`,
              originalFilePath
            );
        });
      }
    } catch (error: any) {
      await session.abortTransaction();
      jobResult.overallStatus = "failed";
      jobResult.message =
        error.message ||
        `Unexpected error during queued import for job ${jobDoc._id}.`;
      const errorStatus: ImportActionStatus = "error";
      if (error instanceof AppError && error.additionalDetails) {
        jobResult.errorDetails?.push({
          id: "global_job_error",
          name: "Global Job Error",
          status: errorStatus,
          errorReason: JSON.stringify(error.additionalDetails),
        });
      } else {
        jobResult.errorDetails?.push({
          id: "global_job_error",
          name: "Global Job Error",
          status: errorStatus,
          errorReason: error.message,
        });
      }
      jobDoc.status = "failed";
      if (!jobDoc.errorMessage) jobDoc.errorMessage = jobResult.message;
    } finally {
      session.endSession();
    }

    jobDoc.result = jobResult;
    jobDoc.completedAt = new Date();
    jobDoc.progress = 100;
    await jobDoc.save();
    return jobResult;
  }

  static async processMenuForConflictResolution(
    data: ProcessConflictResolutionRequest
  ): Promise<ProcessConflictResolutionResponse> {
    const {
      itemsToProcess,
      restaurantId: restaurantIdFromData,
      targetMenuId: targetMenuIdFromData,
    } = data;

    if (
      !restaurantIdFromData ||
      !mongoose.Types.ObjectId.isValid(restaurantIdFromData)
    ) {
      throw new AppError(
        "Invalid or missing restaurant ID for conflict resolution.",
        400
      );
    }
    const restaurantId = new mongoose.Types.ObjectId(restaurantIdFromData);

    const processedItems: ParsedMenuItem[] = [];
    let itemsRequiringUserAction = 0;
    let potentialUpdatesIdentified = 0;
    let newItemsConfirmed = 0;

    for (const item of itemsToProcess) {
      let conflictResolutionStatus: ConflictResolutionStatus = "no_conflict";
      let conflictMessage: string | undefined = undefined;
      let existingItemIdForUpdate: string | undefined = undefined;
      let candidateItemIdsForMultiple: string[] | undefined = undefined;

      if (item.userAction === "ignore") {
        conflictResolutionStatus = "skipped_by_user";
        processedItems.push({
          ...item,
          conflictResolution: { status: conflictResolutionStatus },
        });
        continue;
      }

      try {
        const itemNameTrimmed = String(item.fields.name.value).trim();
        if (!itemNameTrimmed) {
          throw new Error("Item name is empty, cannot process for conflicts.");
        }

        const findQuery: any = {
          restaurantId: restaurantId,
          name: {
            $regex: `^${itemNameTrimmed.replace(
              /[-\/\\^$*+?.()|[\]{}]/g,
              "\\$&"
            )}$`,
            $options: "i",
          },
        };

        if (
          targetMenuIdFromData &&
          mongoose.Types.ObjectId.isValid(targetMenuIdFromData)
        ) {
          findQuery.menuId = new mongoose.Types.ObjectId(targetMenuIdFromData);
        }

        const potentialDuplicates = await MenuItem.find(findQuery)
          .select("_id name menuId")
          .limit(5)
          .lean<
            Array<
              Pick<IMenuItem, "_id" | "name" | "menuId"> & {
                _id: Types.ObjectId;
              }
            >
          >();

        if (potentialDuplicates.length === 1) {
          const duplicate = potentialDuplicates[0];
          conflictResolutionStatus = "update_candidate";
          existingItemIdForUpdate = duplicate._id.toString();
          conflictMessage = `One existing item found with name "${duplicate.name}".`;
          potentialUpdatesIdentified++;
        } else if (potentialDuplicates.length > 1) {
          conflictResolutionStatus = "multiple_candidates";
          candidateItemIdsForMultiple = potentialDuplicates.map((dup) =>
            dup._id.toString()
          );
          conflictMessage = `${potentialDuplicates.length} existing items found with similar names. Please review.`;
          itemsRequiringUserAction++;
        } else {
          conflictResolutionStatus = "no_conflict";
          newItemsConfirmed++;
        }
      } catch (error: any) {
        console.error(
          `Error processing conflict for item "${String(
            item.fields.name.value
          )}": ${error.message}`
        );
        conflictResolutionStatus = "error_processing_conflict";
        conflictMessage = `Error during conflict check: ${error.message}`;
        itemsRequiringUserAction++;
      }
      processedItems.push({
        ...item,
        conflictResolution: {
          status: conflictResolutionStatus,
          message: conflictMessage,
          existingItemId: existingItemIdForUpdate,
          candidateItemIds: candidateItemIdsForMultiple,
        },
      });
    }
    return {
      processedItems,
      summary: {
        itemsRequiringUserAction,
        potentialUpdatesIdentified,
        newItemsConfirmed,
        totalProcessed: itemsToProcess.length,
      },
    };
  }
}

export default MenuService;
