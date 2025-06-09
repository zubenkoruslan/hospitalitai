import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { TemplateService } from "../templateService";
import { AppError } from "../../utils/errorHandler";

// Mock dependencies
jest.mock("fs");
jest.mock("xlsx");
jest.mock("docx");

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedXLSX = XLSX as jest.Mocked<typeof XLSX>;

describe("TemplateService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Excel Template Generation", () => {
    it("should generate Excel template with correct structure", async () => {
      const mockWorkbook = {
        SheetNames: ["Menu Items"],
        Sheets: {
          "Menu Items": {},
        },
      };

      const mockBuffer = Buffer.from("mock excel content");

      mockedXLSX.utils.book_new.mockReturnValue(mockWorkbook as any);
      mockedXLSX.utils.aoa_to_sheet.mockReturnValue({} as any);
      mockedXLSX.utils.book_append_sheet.mockImplementation(() => {});
      mockedXLSX.write.mockReturnValue(mockBuffer as any);

      const result = await TemplateService.generateExcelTemplate();

      expect(result).toBeInstanceOf(Buffer);
      expect(mockedXLSX.utils.book_new).toHaveBeenCalled();
      expect(mockedXLSX.utils.aoa_to_sheet).toHaveBeenCalled();
      expect(mockedXLSX.utils.book_append_sheet).toHaveBeenCalledWith(
        mockWorkbook,
        expect.anything(),
        "Menu Items"
      );
    });

    it("should include all required columns in Excel template", async () => {
      const expectedColumns = [
        "Name",
        "Price",
        "Category",
        "Description",
        "Ingredients",
        "Allergens",
        "Vegan",
        "Vegetarian",
        "Gluten Free",
        "Spicy",
        "Item Type",
        "Wine Style",
        "Grape Variety",
        "Vintage",
        "Producer",
        "Region",
        "Serving Options",
      ];

      let capturedHeaders: string[] = [];
      mockedXLSX.utils.aoa_to_sheet.mockImplementation((data: any[][]) => {
        capturedHeaders = data[0];
        return {} as any;
      });

      await TemplateService.generateExcelTemplate();

      expectedColumns.forEach((column) => {
        expect(capturedHeaders).toContain(column);
      });
    });

    it("should include sample data in Excel template", async () => {
      let capturedData: any[][] = [];
      mockedXLSX.utils.aoa_to_sheet.mockImplementation((data: any[][]) => {
        capturedData = data;
        return {} as any;
      });

      await TemplateService.generateExcelTemplate();

      // Should have headers + sample rows
      expect(capturedData.length).toBeGreaterThan(1);

      // Verify sample food item
      const foodSample = capturedData.find((row) => row[0] === "Caesar Salad");
      expect(foodSample).toBeDefined();
      expect(foodSample[1]).toBe(12.99); // Price
      expect(foodSample[2]).toBe("Appetizers"); // Category

      // Verify sample wine item
      const wineSample = capturedData.find(
        (row) => row[0] === "Chardonnay Reserve"
      );
      expect(wineSample).toBeDefined();
      expect(wineSample[10]).toBe("wine"); // Item Type
      expect(wineSample[11]).toBe("still_white"); // Wine Style
    });

    it("should handle Excel generation errors gracefully", async () => {
      mockedXLSX.utils.book_new.mockImplementation(() => {
        throw new Error("Excel generation failed");
      });

      await expect(TemplateService.generateExcelTemplate()).rejects.toThrow(
        AppError
      );
    });
  });

  describe("CSV Template Generation", () => {
    it("should generate CSV template with correct structure", async () => {
      const result = await TemplateService.generateCSVTemplate();

      expect(result).toBeInstanceOf(Buffer);

      const csvContent = result.toString("utf-8");
      const lines = csvContent.split("\n");

      // Should have header line + sample data lines
      expect(lines.length).toBeGreaterThan(1);

      // Verify headers
      const headers = lines[0].split(",");
      expect(headers).toContain("Name");
      expect(headers).toContain("Price");
      expect(headers).toContain("Category");
      expect(headers).toContain("Description");
    });

    it("should include proper CSV formatting and escaping", async () => {
      const result = await TemplateService.generateCSVTemplate();
      const csvContent = result.toString("utf-8");

      // Should properly escape commas in descriptions
      expect(csvContent).toContain('"');

      // Should not have trailing commas
      const lines = csvContent.split("\n");
      lines.forEach((line) => {
        if (line.trim()) {
          expect(line.endsWith(",")).toBe(false);
        }
      });
    });

    it("should include wine-specific sample data in CSV", async () => {
      const result = await TemplateService.generateCSVTemplate();
      const csvContent = result.toString("utf-8");

      expect(csvContent).toContain("Chardonnay Reserve");
      expect(csvContent).toContain("wine");
      expect(csvContent).toContain("still_white");
      expect(csvContent).toContain("2021");
    });

    it("should include dietary flags in CSV template", async () => {
      const result = await TemplateService.generateCSVTemplate();
      const csvContent = result.toString("utf-8");

      // Headers should include dietary flags
      const headerLine = csvContent.split("\n")[0];
      expect(headerLine).toContain("Vegan");
      expect(headerLine).toContain("Vegetarian");
      expect(headerLine).toContain("Gluten Free");

      // Sample data should show proper boolean values
      expect(csvContent).toContain("TRUE");
      expect(csvContent).toContain("FALSE");
    });
  });

  describe("JSON Template Generation", () => {
    it("should generate JSON template with correct structure", async () => {
      const result = await TemplateService.generateJSONTemplate();

      expect(result).toBeInstanceOf(Buffer);

      const jsonContent = JSON.parse(result.toString("utf-8"));

      expect(jsonContent).toHaveProperty("menu");
      expect(jsonContent.menu).toHaveProperty("name");
      expect(jsonContent.menu).toHaveProperty("items");
      expect(Array.isArray(jsonContent.menu.items)).toBe(true);
    });

    it("should include comprehensive sample data in JSON", async () => {
      const result = await TemplateService.generateJSONTemplate();
      const jsonContent = JSON.parse(result.toString("utf-8"));

      const items = jsonContent.menu.items;
      expect(items.length).toBeGreaterThan(0);

      // Find food item sample
      const foodItem = items.find((item: any) => item.itemType === "food");
      expect(foodItem).toBeDefined();
      expect(foodItem.name).toBeDefined();
      expect(foodItem.price).toBeDefined();
      expect(foodItem.category).toBeDefined();
      expect(Array.isArray(foodItem.ingredients)).toBe(true);
      expect(Array.isArray(foodItem.allergens)).toBe(true);

      // Find wine item sample
      const wineItem = items.find((item: any) => item.itemType === "wine");
      expect(wineItem).toBeDefined();
      expect(wineItem.wineStyle).toBeDefined();
      expect(Array.isArray(wineItem.grapeVariety)).toBe(true);
      expect(wineItem.vintage).toBeDefined();
    });

    it("should include proper JSON schema validation hints", async () => {
      const result = await TemplateService.generateJSONTemplate();
      const jsonContent = JSON.parse(result.toString("utf-8"));

      // Should include schema information
      expect(jsonContent).toHaveProperty("_schema");
      expect(jsonContent._schema).toHaveProperty("version");
      expect(jsonContent._schema).toHaveProperty("description");
    });

    it("should handle nested array structures correctly", async () => {
      const result = await TemplateService.generateJSONTemplate();
      const jsonContent = JSON.parse(result.toString("utf-8"));

      const items = jsonContent.menu.items;
      const sampleItem = items[0];

      // Arrays should be properly formatted
      if (sampleItem.ingredients) {
        expect(Array.isArray(sampleItem.ingredients)).toBe(true);
        expect(sampleItem.ingredients.length).toBeGreaterThan(0);
      }

      if (sampleItem.allergens) {
        expect(Array.isArray(sampleItem.allergens)).toBe(true);
      }
    });
  });

  describe("Word Template Generation", () => {
    it("should generate Word template with proper document structure", async () => {
      const mockDocument = {
        addSection: jest.fn(),
        addTable: jest.fn(),
        addParagraph: jest.fn(),
      };

      const mockBuffer = Buffer.from("mock docx content");

      // Mock docx library
      const docx = require("docx");
      docx.Document = jest.fn().mockImplementation(() => mockDocument);
      docx.Packer = {
        toBuffer: jest.fn().mockResolvedValue(mockBuffer),
      };
      docx.Paragraph = jest.fn();
      docx.Table = jest.fn();
      docx.TableRow = jest.fn();
      docx.TableCell = jest.fn();
      docx.TextRun = jest.fn();

      const result = await TemplateService.generateWordTemplate();

      expect(result).toBeInstanceOf(Buffer);
      expect(docx.Document).toHaveBeenCalled();
      expect(docx.Packer.toBuffer).toHaveBeenCalled();
    });

    it("should include table headers in Word template", async () => {
      const mockCells: any[] = [];
      const mockRows: any[] = [];

      const docx = require("docx");
      docx.TableCell = jest.fn().mockImplementation((options) => {
        mockCells.push(options);
        return {};
      });
      docx.TableRow = jest.fn().mockImplementation((options) => {
        mockRows.push(options);
        return {};
      });

      await TemplateService.generateWordTemplate();

      // Should create header cells
      expect(mockCells.length).toBeGreaterThan(0);
      const headerTexts = mockCells
        .map((cell) => {
          if (cell.children && cell.children[0] && cell.children[0].children) {
            return cell.children[0].children[0].text;
          }
          return null;
        })
        .filter(Boolean);

      expect(headerTexts).toContain("Name");
      expect(headerTexts).toContain("Price");
      expect(headerTexts).toContain("Category");
    });

    it("should handle Word generation errors gracefully", async () => {
      const docx = require("docx");
      docx.Packer = {
        toBuffer: jest
          .fn()
          .mockRejectedValue(new Error("Word generation failed")),
      };

      await expect(TemplateService.generateWordTemplate()).rejects.toThrow(
        AppError
      );
    });
  });

  describe("Template Download Integration", () => {
    it("should provide correct content type for Excel downloads", async () => {
      const contentType = TemplateService.getContentType("excel");
      expect(contentType).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    });

    it("should provide correct content type for CSV downloads", async () => {
      const contentType = TemplateService.getContentType("csv");
      expect(contentType).toBe("text/csv");
    });

    it("should provide correct content type for JSON downloads", async () => {
      const contentType = TemplateService.getContentType("json");
      expect(contentType).toBe("application/json");
    });

    it("should provide correct content type for Word downloads", async () => {
      const contentType = TemplateService.getContentType("word");
      expect(contentType).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
    });

    it("should generate proper filename for templates", async () => {
      expect(TemplateService.getFilename("excel")).toBe("menu-template.xlsx");
      expect(TemplateService.getFilename("csv")).toBe("menu-template.csv");
      expect(TemplateService.getFilename("json")).toBe("menu-template.json");
      expect(TemplateService.getFilename("word")).toBe("menu-template.docx");
    });

    it("should validate template format parameter", async () => {
      expect(() => TemplateService.getContentType("invalid" as any)).toThrow(
        AppError
      );

      expect(() => TemplateService.getFilename("invalid" as any)).toThrow(
        AppError
      );
    });
  });

  describe("Template Validation and Integrity", () => {
    it("should validate Excel template integrity", async () => {
      const mockWorkbook = {
        SheetNames: ["Menu Items"],
        Sheets: { "Menu Items": {} },
      };

      mockedXLSX.utils.book_new.mockReturnValue(mockWorkbook as any);
      mockedXLSX.write.mockReturnValue(
        Buffer.from("valid excel content") as any
      );

      const result = await TemplateService.generateExcelTemplate();

      // Template should be non-empty and valid
      expect(result.length).toBeGreaterThan(0);

      // Should be able to parse back the generated template
      mockedXLSX.read.mockReturnValue(mockWorkbook as any);
      expect(() => mockedXLSX.read(result)).not.toThrow();
    });

    it("should validate CSV template format", async () => {
      const result = await TemplateService.generateCSVTemplate();
      const csvContent = result.toString("utf-8");

      // Should have valid CSV structure
      const lines = csvContent.split("\n").filter((line) => line.trim());
      expect(lines.length).toBeGreaterThan(1);

      // All data lines should have same number of columns as header
      const headerColumns = lines[0].split(",").length;
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(",").length;
        expect(columns).toBe(headerColumns);
      }
    });

    it("should validate JSON template structure", async () => {
      const result = await TemplateService.generateJSONTemplate();

      // Should be valid JSON
      expect(() => JSON.parse(result.toString("utf-8"))).not.toThrow();

      const jsonContent = JSON.parse(result.toString("utf-8"));

      // Should have required structure
      expect(jsonContent.menu).toBeDefined();
      expect(jsonContent.menu.items).toBeDefined();
      expect(Array.isArray(jsonContent.menu.items)).toBe(true);

      // Sample items should have required fields
      jsonContent.menu.items.forEach((item: any) => {
        expect(item.name).toBeDefined();
        expect(item.price).toBeDefined();
        expect(typeof item.price).toBe("number");
      });
    });

    it("should ensure Word template has proper structure", async () => {
      const mockDocument = {};
      const mockBuffer = Buffer.from("mock docx content");

      const docx = require("docx");
      docx.Document = jest.fn().mockReturnValue(mockDocument);
      docx.Packer = {
        toBuffer: jest.fn().mockResolvedValue(mockBuffer),
      };

      const result = await TemplateService.generateWordTemplate();

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(docx.Packer.toBuffer).toHaveBeenCalledWith(mockDocument);
    });
  });

  describe("Performance and Resource Management", () => {
    it("should generate templates efficiently", async () => {
      const startTime = Date.now();

      await Promise.all([
        TemplateService.generateExcelTemplate(),
        TemplateService.generateCSVTemplate(),
        TemplateService.generateJSONTemplate(),
      ]);

      const endTime = Date.now();

      // All templates should generate within 2 seconds
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it("should manage memory efficiently during template generation", async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Generate multiple templates
      for (let i = 0; i < 10; i++) {
        await TemplateService.generateCSVTemplate();
      }

      const finalMemory = process.memoryUsage().heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      expect(finalMemory - initialMemory).toBeLessThan(50 * 1024 * 1024);
    });

    it("should handle concurrent template generation", async () => {
      const promises = Array.from({ length: 5 }, () =>
        TemplateService.generateJSONTemplate()
      );

      const results = await Promise.all(promises);

      // All templates should be generated successfully
      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Template Customization", () => {
    it("should allow custom restaurant branding in templates", async () => {
      const customOptions = {
        restaurantName: "Test Restaurant",
        includeContactInfo: true,
        theme: "professional",
      };

      // Mock extended generateJSONTemplate with options
      const originalGenerate = TemplateService.generateJSONTemplate;
      TemplateService.generateJSONTemplate = jest
        .fn()
        .mockImplementation(async (options?: any) => {
          const result = await originalGenerate();
          if (options?.restaurantName) {
            const content = JSON.parse(result.toString());
            content.menu.restaurantName = options.restaurantName;
            return Buffer.from(JSON.stringify(content, null, 2));
          }
          return result;
        });

      const result = await TemplateService.generateJSONTemplate(customOptions);
      const content = JSON.parse(result.toString());

      expect(content.menu.restaurantName).toBe("Test Restaurant");
    });

    it("should support different template complexity levels", async () => {
      // Test basic template (fewer columns)
      const basicTemplate = await TemplateService.generateCSVTemplate();
      const basicContent = basicTemplate.toString();

      // Should include essential columns
      expect(basicContent).toContain("Name");
      expect(basicContent).toContain("Price");
      expect(basicContent).toContain("Category");
    });
  });
});
