import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import {
  FileParserService,
  ParsedMenuData,
  RawMenuItem,
} from "../fileParserService";
import { AppError } from "../../utils/errorHandler";

// Mock dependencies
jest.mock("fs");
jest.mock("xlsx");
jest.mock("csv-parser");
jest.mock("mammoth");

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedXLSX = XLSX as jest.Mocked<typeof XLSX>;

describe("FileParserService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("parseMenuFile", () => {
    it("should route to Excel parser for .xlsx files", async () => {
      const mockParseExcel = jest.spyOn(
        FileParserService as any,
        "parseExcelWithIntelligence"
      );
      mockParseExcel.mockResolvedValue({
        menuName: "Test Menu",
        items: [],
        sourceFormat: "excel",
        metadata: { processingTime: 100 },
      });

      const result = await FileParserService.parseMenuFile(
        "/test/file.xlsx",
        "menu.xlsx"
      );

      expect(mockParseExcel).toHaveBeenCalledWith(
        "/test/file.xlsx",
        "menu.xlsx"
      );
      expect(result.sourceFormat).toBe("excel");
    });

    it("should route to CSV parser for .csv files", async () => {
      const mockParseCSV = jest.spyOn(
        FileParserService as any,
        "parseCSVWithIntelligence"
      );
      mockParseCSV.mockResolvedValue({
        menuName: "Test Menu",
        items: [],
        sourceFormat: "csv",
        metadata: { processingTime: 50 },
      });

      const result = await FileParserService.parseMenuFile(
        "/test/file.csv",
        "menu.csv"
      );

      expect(mockParseCSV).toHaveBeenCalledWith("/test/file.csv", "menu.csv");
      expect(result.sourceFormat).toBe("csv");
    });

    it("should route to JSON parser for .json files", async () => {
      const mockParseJSON = jest.spyOn(
        FileParserService as any,
        "parseJSONWithIntelligence"
      );
      mockParseJSON.mockResolvedValue({
        menuName: "Test Menu",
        items: [],
        sourceFormat: "json",
        metadata: { processingTime: 75 },
      });

      const result = await FileParserService.parseMenuFile(
        "/test/file.json",
        "menu.json"
      );

      expect(mockParseJSON).toHaveBeenCalledWith(
        "/test/file.json",
        "menu.json"
      );
      expect(result.sourceFormat).toBe("json");
    });

    it("should route to Word parser for .docx files", async () => {
      const mockParseWord = jest.spyOn(
        FileParserService as any,
        "parseWordWithIntelligence"
      );
      mockParseWord.mockResolvedValue({
        menuName: "Test Menu",
        items: [],
        sourceFormat: "word",
        metadata: { processingTime: 200 },
      });

      const result = await FileParserService.parseMenuFile(
        "/test/file.docx",
        "menu.docx"
      );

      expect(mockParseWord).toHaveBeenCalledWith(
        "/test/file.docx",
        "menu.docx"
      );
      expect(result.sourceFormat).toBe("word");
    });

    it("should throw error for unsupported file formats", async () => {
      await expect(
        FileParserService.parseMenuFile("/test/file.txt", "menu.txt")
      ).rejects.toThrow(AppError);
    });

    it("should add processing time to metadata", async () => {
      const mockParseExcel = jest.spyOn(
        FileParserService as any,
        "parseExcelWithIntelligence"
      );
      mockParseExcel.mockResolvedValue({
        menuName: "Test Menu",
        items: [],
        sourceFormat: "excel",
        metadata: {},
      });

      const result = await FileParserService.parseMenuFile(
        "/test/file.xlsx",
        "menu.xlsx"
      );

      expect(result.metadata?.processingTime).toBeDefined();
      expect(typeof result.metadata?.processingTime).toBe("number");
    });
  });

  describe("Excel Parsing", () => {
    const mockWorkbook = {
      SheetNames: ["Sheet1"],
      Sheets: {
        Sheet1: {},
      },
    };

    beforeEach(() => {
      mockedXLSX.readFile.mockReturnValue(mockWorkbook as any);
    });

    it("should parse valid Excel file with menu items", async () => {
      const mockSheetData = [
        ["Name", "Price", "Category", "Description"],
        [
          "Caesar Salad",
          12.99,
          "Appetizers",
          "Fresh romaine with Caesar dressing",
        ],
        ["Grilled Salmon", 24.99, "Main Courses", "Atlantic salmon with herbs"],
      ];

      mockedXLSX.utils.sheet_to_json.mockReturnValue(mockSheetData as any);

      const parseExcel = (FileParserService as any).parseExcel;
      const result = await parseExcel("/test/menu.xlsx", "menu.xlsx");

      expect(result.menuName).toBe("menu");
      expect(result.sourceFormat).toBe("excel");
      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe("Caesar Salad");
      expect(result.items[0].price).toBe(12.99);
      expect(result.items[0].category).toBe("Appetizers");
    });

    it("should handle Excel files with wine data", async () => {
      const mockSheetData = [
        [
          "Name",
          "Price",
          "Category",
          "Wine Style",
          "Grape Variety",
          "Vintage",
          "Producer",
        ],
        [
          "Chardonnay Reserve",
          45.0,
          "Wine",
          "still",
          "Chardonnay",
          2021,
          "Domain Test",
        ],
      ];

      mockedXLSX.utils.sheet_to_json.mockReturnValue(mockSheetData as any);

      const parseExcel = (FileParserService as any).parseExcel;
      const result = await parseExcel("/test/wine.xlsx", "wine.xlsx");

      expect(result.items[0].itemType).toBe("wine");
      expect(result.items[0].wineStyle).toBe("still");
      expect(result.items[0].grapeVariety).toContain("Chardonnay");
      expect(result.items[0].vintage).toBe(2021);
      expect(result.items[0].producer).toBe("Domain Test");
    });

    it("should handle Excel files with dietary information", async () => {
      const mockSheetData = [
        ["Name", "Price", "Vegan", "Vegetarian", "Gluten Free", "Ingredients"],
        [
          "Quinoa Bowl",
          16.99,
          "TRUE",
          "TRUE",
          "TRUE",
          "quinoa,vegetables,tahini",
        ],
        [
          "Chicken Salad",
          14.99,
          "FALSE",
          "FALSE",
          "TRUE",
          "chicken,lettuce,dressing",
        ],
      ];

      mockedXLSX.utils.sheet_to_json.mockReturnValue(mockSheetData as any);

      const parseExcel = (FileParserService as any).parseExcel;
      const result = await parseExcel("/test/dietary.xlsx", "dietary.xlsx");

      expect(result.items[0].isVegan).toBe(true);
      expect(result.items[0].isVegetarian).toBe(true);
      expect(result.items[0].isGlutenFree).toBe(true);
      expect(result.items[0].ingredients).toEqual([
        "quinoa",
        "vegetables",
        "tahini",
      ]);

      expect(result.items[1].isVegan).toBe(false);
      expect(result.items[1].isVegetarian).toBe(false);
      expect(result.items[1].isGlutenFree).toBe(true);
    });

    it("should handle empty Excel files", async () => {
      mockedXLSX.utils.sheet_to_json.mockReturnValue([]);

      const parseExcel = (FileParserService as any).parseExcel;

      await expect(
        parseExcel("/test/empty.xlsx", "empty.xlsx")
      ).rejects.toThrow(AppError);
    });

    it("should handle Excel files without name column", async () => {
      const mockSheetData = [
        ["Price", "Category"],
        [12.99, "Appetizers"],
      ];

      mockedXLSX.utils.sheet_to_json.mockReturnValue(mockSheetData as any);

      const parseExcel = (FileParserService as any).parseExcel;

      await expect(
        parseExcel("/test/no-name.xlsx", "no-name.xlsx")
      ).rejects.toThrow(AppError);
    });

    it("should handle Excel parsing errors", async () => {
      mockedXLSX.readFile.mockImplementation(() => {
        throw new Error("File corrupted");
      });

      const parseExcel = (FileParserService as any).parseExcel;

      await expect(
        parseExcel("/test/corrupted.xlsx", "corrupted.xlsx")
      ).rejects.toThrow(AppError);
    });
  });

  describe("CSV Parsing", () => {
    beforeEach(() => {
      // Mock CSV file reading
      mockedFs.readFileSync.mockReturnValue(Buffer.from("test csv content"));
    });

    it("should parse valid CSV file with proper headers", async () => {
      const mockCSVData = [
        { name: "Caesar Salad", price: "12.99", category: "Appetizers" },
        { name: "Grilled Salmon", price: "24.99", category: "Main Courses" },
      ];

      // Mock csv-parser behavior
      const csvParser = require("csv-parser");
      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === "data") {
            mockCSVData.forEach(callback);
          } else if (event === "end") {
            callback();
          }
          return mockStream;
        }),
      };

      jest
        .spyOn(require("fs"), "createReadStream")
        .mockReturnValue(mockStream as any);

      const parseCSV = (FileParserService as any).parseCSV;
      const result = await parseCSV("/test/menu.csv", "menu.csv");

      expect(result.sourceFormat).toBe("csv");
      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe("Caesar Salad");
      expect(result.items[0].price).toBe(12.99);
    });

    it("should handle CSV files with different delimiters", async () => {
      const csvContent = "name;price;category\nTest Item;15.99;Main";
      mockedFs.readFileSync.mockReturnValue(Buffer.from(csvContent));

      const detectCSVOptions = (FileParserService as any).detectCSVOptions;
      const options = detectCSVOptions("/test/semicolon.csv");

      expect(options.delimiter).toBe(";");
    });

    it("should handle CSV encoding issues", async () => {
      const csvContent = "name,price\nCafé,12.99";
      mockedFs.readFileSync.mockReturnValue(Buffer.from(csvContent, "latin1"));

      const fixEncodingIssues = (FileParserService as any).fixEncodingIssues;
      const fixed = fixEncodingIssues("CafÃ©");

      expect(fixed).toBe("Café");
    });

    it("should skip empty CSV rows", async () => {
      const mockCSVData = [
        { name: "Valid Item", price: "12.99" },
        { name: "", price: "" }, // Empty row
        { name: "Another Item", price: "15.99" },
      ];

      const isEmptyCSVRow = (FileParserService as any).isEmptyCSVRow;
      expect(isEmptyCSVRow(mockCSVData[1])).toBe(true);
      expect(isEmptyCSVRow(mockCSVData[0])).toBe(false);
    });
  });

  describe("JSON Parsing", () => {
    it("should parse JSON with menu structure", async () => {
      const mockJSON = {
        menu: {
          name: "Test Restaurant Menu",
          items: [
            {
              name: "Caesar Salad",
              price: 12.99,
              category: "Appetizers",
              ingredients: ["romaine", "parmesan", "croutons"],
            },
          ],
        },
      };

      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockJSON));

      const parseJSON = (FileParserService as any).parseJSON;
      const result = await parseJSON("/test/menu.json", "menu.json");

      expect(result.sourceFormat).toBe("json");
      expect(result.menuName).toBe("Test Restaurant Menu");
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe("Caesar Salad");
      expect(result.items[0].ingredients).toEqual([
        "romaine",
        "parmesan",
        "croutons",
      ]);
    });

    it("should parse JSON with items array structure", async () => {
      const mockJSON = {
        items: [
          { name: "Item 1", price: 10.99 },
          { name: "Item 2", price: 15.99 },
        ],
      };

      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockJSON));

      const parseJSON = (FileParserService as any).parseJSON;
      const result = await parseJSON("/test/items.json", "items.json");

      expect(result.items).toHaveLength(2);
    });

    it("should parse JSON with direct array structure", async () => {
      const mockJSON = [
        { name: "Item 1", price: 10.99 },
        { name: "Item 2", price: 15.99 },
      ];

      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockJSON));

      const parseJSON = (FileParserService as any).parseJSON;
      const result = await parseJSON("/test/array.json", "array.json");

      expect(result.items).toHaveLength(2);
    });

    it("should handle invalid JSON files", async () => {
      mockedFs.readFileSync.mockReturnValue("invalid json content");

      const parseJSON = (FileParserService as any).parseJSON;

      await expect(
        parseJSON("/test/invalid.json", "invalid.json")
      ).rejects.toThrow(AppError);
    });

    it("should validate JSON wine structure", async () => {
      const item = {
        name: "Test Wine",
        itemType: "wine",
        grapeVariety: "Chardonnay", // Should be array
        servingOptions: "bottle", // Should be array
      };

      const warnings: string[] = [];
      const validateJSONWineStructure = (FileParserService as any)
        .validateJSONWineStructure;
      validateJSONWineStructure(item, warnings, 1);

      expect(warnings).toHaveLength(2);
      expect(warnings[0]).toContain("grape varieties should be an array");
      expect(warnings[1]).toContain("serving options should be an array");
    });
  });

  describe("Word Parsing", () => {
    it("should parse Word document with table structure", async () => {
      const mockExtractResult = {
        value: `
        APPETIZERS
        Caesar Salad - $12.99
        Fresh romaine lettuce with Caesar dressing
        
        MAIN COURSES  
        Grilled Salmon - $24.99
        Atlantic salmon with herbs
        `,
      };

      const mammoth = require("mammoth");
      mammoth.extractRawText = jest.fn().mockResolvedValue(mockExtractResult);

      const parseWord = (FileParserService as any).parseWord;
      const result = await parseWord("/test/menu.docx", "menu.docx");

      expect(result.sourceFormat).toBe("word");
      expect(result.items.length).toBeGreaterThan(0);
    });

    it("should extract prices from Word text", async () => {
      const extractPriceFromWordText = (FileParserService as any)
        .extractPriceFromWordText;

      expect(extractPriceFromWordText("Caesar Salad - $12.99")).toBe(12.99);
      expect(extractPriceFromWordText("No price here")).toBeNull();
      expect(extractPriceFromWordText("Multiple $10.99 and $15.99")).toBe(
        10.99
      );
    });

    it("should infer categories from Word context", async () => {
      const inferCategoryFromWordContext = (FileParserService as any)
        .inferCategoryFromWordContext;

      expect(inferCategoryFromWordContext("Caesar Salad")).toBe("Appetizers");
      expect(inferCategoryFromWordContext("Grilled Chicken")).toBe(
        "Main Courses"
      );
      expect(inferCategoryFromWordContext("Chocolate Cake")).toBe("Desserts");
      expect(inferCategoryFromWordContext("Chardonnay Wine")).toBe("Wine");
      expect(inferCategoryFromWordContext("Craft Beer")).toBe("Beverages");
      expect(inferCategoryFromWordContext("Unknown Item")).toBe(
        "Uncategorized"
      );
    });

    it("should handle Word parsing errors", async () => {
      const mammoth = require("mammoth");
      mammoth.extractRawText = jest
        .fn()
        .mockRejectedValue(new Error("Document corrupted"));

      const parseWord = (FileParserService as any).parseWord;

      await expect(
        parseWord("/test/corrupted.docx", "corrupted.docx")
      ).rejects.toThrow(AppError);
    });
  });

  describe("Format-Specific Intelligence", () => {
    it("should apply Excel intelligence enhancements", async () => {
      const mockData: ParsedMenuData = {
        menuName: "Test Menu",
        sourceFormat: "excel",
        items: [
          {
            name: "Test Item",
            price: -5.99, // Negative price
            itemType: "wine",
            vintage: 3000, // Invalid vintage
          },
        ],
      };

      const applyExcelIntelligence = (FileParserService as any)
        .applyExcelIntelligence;
      const result = applyExcelIntelligence(mockData, []);

      expect(result.items[0].price).toBe(5.99); // Should be corrected to positive
      expect(result.metadata?.warnings).toContain(
        'Invalid negative price for "Test Item": -5.99'
      );
    });

    it("should apply CSV intelligence enhancements", async () => {
      const mockData: ParsedMenuData = {
        menuName: "Test Menu",
        sourceFormat: "csv",
        items: [
          {
            name: '"Quoted Item"', // CSV artifacts
            description: "CafÃ©", // Encoding issue
          },
        ],
      };

      const applyCSVIntelligence = (FileParserService as any)
        .applyCSVIntelligence;
      const result = applyCSVIntelligence(mockData, []);

      expect(result.items[0].name).toBe("Quoted Item"); // Quotes removed
      expect(result.items[0].description).toBe("Café"); // Encoding fixed
    });

    it("should apply Word intelligence enhancements", async () => {
      const mockData: ParsedMenuData = {
        menuName: "Test Menu",
        sourceFormat: "word",
        items: [
          {
            name: "Test Item",
            description: "Great dish for $15.99",
            category: "Uncategorized",
          },
        ],
      };

      const applyWordIntelligence = (FileParserService as any)
        .applyWordIntelligence;
      const result = applyWordIntelligence(mockData, []);

      expect(result.items[0].price).toBe(15.99); // Price extracted from description
      expect(result.metadata?.documentStructure).toBeDefined();
    });
  });

  describe("Validation Enhancement", () => {
    it("should validate wine data consistency", async () => {
      const item: RawMenuItem = {
        name: "Test Wine",
        itemType: "wine",
        vintage: 3000, // Invalid
        wineStyle: "invalid_style", // Invalid
        grapeVariety: ["", "Chardonnay", ""], // Contains empty values
      };

      const warnings: string[] = [];
      const validateWineDataConsistency = (FileParserService as any)
        .validateWineDataConsistency;
      validateWineDataConsistency(item, warnings);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.includes("Invalid vintage"))).toBe(true);
      expect(warnings.some((w) => w.includes("Invalid wine style"))).toBe(true);
    });

    it("should perform cross-field validation", async () => {
      const item: RawMenuItem = {
        name: "Test Item",
        itemType: "food",
        isVegan: true,
        isVegetarian: false, // Inconsistent
        ingredients: ["chicken", "lettuce"], // Non-vegan ingredient
      };

      const warnings: string[] = [];
      const performCrossFieldValidation = (FileParserService as any)
        .performCrossFieldValidation;
      performCrossFieldValidation(item, 1, warnings);

      expect(
        warnings.some((w) =>
          w.includes("Vegan items should also be vegetarian")
        )
      ).toBe(true);
      expect(
        warnings.some((w) => w.includes("Marked as vegan but contains"))
      ).toBe(true);
    });

    it("should validate menu item fields", async () => {
      const item: RawMenuItem = {
        name: "", // Empty name
        price: "invalid" as any, // Invalid price type
        category: "A".repeat(150), // Too long category
        itemType: "invalid_type" as any, // Invalid item type
        ingredients: "should be array" as any, // Wrong type
      };

      const warnings: string[] = [];
      const validateMenuItem = (FileParserService as any).validateMenuItem;
      const result = validateMenuItem(item, 1, warnings);

      expect(result).toBeNull(); // Should be invalid due to empty name
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe("Helper Functions", () => {
    it("should parse prices correctly", async () => {
      const parsePrice = (FileParserService as any).parsePrice;

      expect(parsePrice("$12.99")).toBe(12.99);
      expect(parsePrice("€15,50")).toBe(15.5);
      expect(parsePrice("£20.00")).toBe(20.0);
      expect(parsePrice("25")).toBe(25);
      expect(parsePrice("invalid")).toBeNull();
      expect(parsePrice("")).toBeNull();
      expect(parsePrice(null)).toBeNull();
    });

    it("should parse array fields correctly", async () => {
      const parseArrayField = (FileParserService as any).parseArrayField;

      expect(parseArrayField("item1,item2,item3")).toEqual([
        "item1",
        "item2",
        "item3",
      ]);
      expect(parseArrayField("item1;item2;item3")).toEqual([
        "item1",
        "item2",
        "item3",
      ]);
      expect(parseArrayField("item1|item2|item3")).toEqual([
        "item1",
        "item2",
        "item3",
      ]);
      expect(parseArrayField(["item1", "item2"])).toEqual(["item1", "item2"]);
      expect(parseArrayField("")).toEqual([]);
    });

    it("should parse boolean values correctly", async () => {
      const parseBoolean = (FileParserService as any).parseBoolean;

      expect(parseBoolean("true")).toBe(true);
      expect(parseBoolean("TRUE")).toBe(true);
      expect(parseBoolean("yes")).toBe(true);
      expect(parseBoolean("1")).toBe(true);
      expect(parseBoolean("false")).toBe(false);
      expect(parseBoolean("FALSE")).toBe(false);
      expect(parseBoolean("no")).toBe(false);
      expect(parseBoolean("0")).toBe(false);
      expect(parseBoolean("")).toBeUndefined();
      expect(parseBoolean("maybe")).toBeUndefined();
    });

    it("should extract menu names correctly", async () => {
      const extractMenuName = (FileParserService as any).extractMenuName;

      expect(extractMenuName("restaurant_menu.xlsx", "Menu Items")).toBe(
        "restaurant menu - Menu Items"
      );
      expect(extractMenuName("menu.csv")).toBe("Menu");
      expect(extractMenuName("dinner-menu.json")).toBe("Dinner Menu");
    });
  });
});
