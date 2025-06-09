import fs from "fs";
import path from "path";
import { MenuService } from "../menuService";
import { FileParserService } from "../fileParserService";
import { AppError } from "../../utils/errorHandler";

// Mock file system for test files
jest.mock("fs");
const mockedFs = fs as jest.Mocked<typeof fs>;

describe("MenuService Integration Tests", () => {
  let mockTestFiles: any;

  beforeAll(() => {
    // Setup mock test files
    mockTestFiles = {
      excel: {
        path: "/test/files/menu.xlsx",
        name: "menu.xlsx",
        content: "mock excel content",
      },
      csv: {
        path: "/test/files/menu.csv",
        name: "menu.csv",
        content:
          "name,price,category\nCaesar Salad,12.99,Appetizers\nGrilled Salmon,24.99,Main Courses",
      },
      json: {
        path: "/test/files/menu.json",
        name: "menu.json",
        content: JSON.stringify({
          menu: {
            name: "Test Restaurant Menu",
            items: [
              {
                name: "Caesar Salad",
                price: 12.99,
                category: "Appetizers",
                ingredients: ["romaine", "parmesan", "croutons"],
                isVegetarian: true,
                allergens: ["dairy", "gluten"],
              },
              {
                name: "Grilled Salmon",
                price: 24.99,
                category: "Main Courses",
                ingredients: ["salmon", "herbs", "lemon"],
                allergens: ["fish"],
              },
              {
                name: "Chardonnay Reserve",
                price: 45.0,
                category: "Wine",
                itemType: "wine",
                wineStyle: "still_white",
                grapeVariety: ["Chardonnay"],
                vintage: 2021,
                producer: "Test Winery",
                servingOptions: ["bottle", "glass"],
              },
            ],
          },
        }),
      },
      word: {
        path: "/test/files/menu.docx",
        name: "menu.docx",
        content: "mock word content",
      },
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock file existence checks
    mockedFs.existsSync.mockImplementation((filePath: any) => {
      return Object.values(mockTestFiles).some(
        (file) => file.path === filePath
      );
    });

    // Mock file reading
    mockedFs.readFileSync.mockImplementation((filePath: any) => {
      const file = Object.values(mockTestFiles).find(
        (f) => f.path === filePath
      );
      return file ? Buffer.from(file.content) : Buffer.from("");
    });
  });

  describe("Complete Menu Processing Flow", () => {
    it("should process Excel file through complete pipeline", async () => {
      // Mock Excel parsing
      const mockParsedData = {
        menuName: "Test Menu",
        sourceFormat: "excel" as const,
        items: [
          {
            name: "Caesar Salad",
            price: 12.99,
            category: "Appetizers",
            ingredients: ["romaine", "parmesan", "croutons"],
            isVegetarian: true,
          },
          {
            name: "Grilled Salmon",
            price: 24.99,
            category: "Main Courses",
            ingredients: ["salmon", "herbs", "lemon"],
          },
        ],
        metadata: {
          processingTime: 100,
          totalItems: 2,
          warnings: [],
        },
      };

      jest
        .spyOn(FileParserService, "parseMenuFile")
        .mockResolvedValue(mockParsedData);

      const result = await MenuService.processMenuUpload(
        mockTestFiles.excel.path,
        mockTestFiles.excel.name,
        "restaurant123"
      );

      expect(result).toBeDefined();
      expect(result.menuName).toBe("Test Menu");
      expect(result.sourceFormat).toBe("excel");
      expect(result.items).toHaveLength(2);

      // Verify enhanced processing was applied
      expect(result.items[0].enhancementData).toBeDefined();
      expect(result.items[0].enhancementData?.confidence).toBeDefined();
      expect(
        result.items[0].enhancementData?.confidence.overall
      ).toBeGreaterThan(0);

      // Verify allergen detection
      expect(result.items[0].allergens).toContain("dairy");
      expect(result.items[0].allergens).toContain("gluten");

      // Verify ingredient processing
      expect(result.items[0].processedIngredients).toBeDefined();
      expect(result.items[0].processedIngredients?.count).toBe(3);
    });

    it("should process CSV file with intelligence enhancements", async () => {
      const mockParsedData = {
        menuName: "CSV Menu",
        sourceFormat: "csv" as const,
        items: [
          {
            name: '"Caesar Salad"', // CSV artifacts
            price: 12.99,
            category: "Appetizers",
            description: "CafÃ© style salad", // Encoding issue
          },
        ],
        metadata: {
          processingTime: 50,
          totalItems: 1,
          warnings: [],
        },
      };

      jest
        .spyOn(FileParserService, "parseMenuFile")
        .mockResolvedValue(mockParsedData);

      const result = await MenuService.processMenuUpload(
        mockTestFiles.csv.path,
        mockTestFiles.csv.name,
        "restaurant123"
      );

      // Verify CSV intelligence was applied
      expect(result.items[0].name).toBe("Caesar Salad"); // Quotes removed
      expect(result.items[0].description).toBe("Café style salad"); // Encoding fixed
      expect(result.items[0].enhancementData?.formatSpecific).toBeDefined();
    });

    it("should process JSON file with schema validation", async () => {
      const mockParsedData = {
        menuName: "Test Restaurant Menu",
        sourceFormat: "json" as const,
        items: [
          {
            name: "Chardonnay Reserve",
            price: 45.0,
            category: "Wine",
            itemType: "wine",
            wineStyle: "still_white",
            grapeVariety: ["Chardonnay"],
            vintage: 2021,
            producer: "Test Winery",
            servingOptions: ["bottle", "glass"],
          },
        ],
        metadata: {
          processingTime: 75,
          totalItems: 1,
          warnings: [],
          schemaValid: true,
        },
      };

      jest
        .spyOn(FileParserService, "parseMenuFile")
        .mockResolvedValue(mockParsedData);

      const result = await MenuService.processMenuUpload(
        mockTestFiles.json.path,
        mockTestFiles.json.name,
        "restaurant123"
      );

      // Verify wine intelligence was applied
      const wineItem = result.items[0];
      expect(wineItem.wineIntelligence).toBeDefined();
      expect(wineItem.wineIntelligence?.qualityScore).toBeGreaterThan(0);
      expect(wineItem.wineIntelligence?.recommendedQuestions).toBeDefined();
      expect(
        wineItem.wineIntelligence?.recommendedQuestions.length
      ).toBeGreaterThan(0);

      // Verify JSON-specific metadata
      expect(result.metadata?.schemaValid).toBe(true);
    });

    it("should process Word file with document structure analysis", async () => {
      const mockParsedData = {
        menuName: "Word Menu",
        sourceFormat: "word" as const,
        items: [
          {
            name: "Grilled Chicken",
            price: 18.99,
            category: "Main Courses",
            description: "Herb-crusted chicken breast",
          },
        ],
        metadata: {
          processingTime: 200,
          totalItems: 1,
          warnings: [],
          documentStructure: {
            hasHeaders: true,
            tableCount: 2,
            formatting: "mixed",
          },
        },
      };

      jest
        .spyOn(FileParserService, "parseMenuFile")
        .mockResolvedValue(mockParsedData);

      const result = await MenuService.processMenuUpload(
        mockTestFiles.word.path,
        mockTestFiles.word.name,
        "restaurant123"
      );

      // Verify Word-specific intelligence
      expect(result.metadata?.documentStructure).toBeDefined();
      expect(result.metadata?.documentStructure?.hasHeaders).toBe(true);
      expect(result.metadata?.documentStructure?.tableCount).toBe(2);

      // Verify category inference was applied
      expect(result.items[0].category).toBe("Main Courses");
    });
  });

  describe("Enhanced Processing Pipeline", () => {
    it("should apply comprehensive enhancement to menu items", async () => {
      const mockItem = {
        name: "Pan-Seared Scallops",
        price: 28.99,
        category: "Appetizers",
        description: "Fresh sea scallops with bacon and herbs",
        ingredients: ["scallops", "bacon", "herbs", "butter"],
      };

      const enhanced = await MenuService.enhanceMenuItem(mockItem);

      // Verify ingredient processing
      expect(enhanced.processedIngredients).toBeDefined();
      expect(enhanced.processedIngredients?.count).toBe(4);
      expect(enhanced.processedIngredients?.primaryProteins).toContain(
        "scallops"
      );
      expect(enhanced.processedIngredients?.secondaryProteins).toContain(
        "bacon"
      );

      // Verify allergen detection
      expect(enhanced.allergens).toBeDefined();
      expect(enhanced.allergens?.length).toBeGreaterThan(0);
      expect(enhanced.allergens).toContain("shellfish");
      expect(enhanced.allergens).toContain("dairy");

      // Verify dietary flags
      expect(enhanced.isVegan).toBe(false);
      expect(enhanced.isVegetarian).toBe(false);
      expect(enhanced.isPescatarian).toBe(true);

      // Verify confidence scoring
      expect(enhanced.enhancementData?.confidence).toBeDefined();
      expect(enhanced.enhancementData?.confidence.overall).toBeGreaterThan(0.7);
      expect(enhanced.enhancementData?.confidence.ingredients).toBeGreaterThan(
        0.8
      );
      expect(enhanced.enhancementData?.confidence.allergens).toBeGreaterThan(
        0.8
      );
    });

    it("should handle wine enhancement with specialized intelligence", async () => {
      const mockWineItem = {
        name: "Cabernet Sauvignon Reserve",
        price: 65.0,
        category: "Wine",
        itemType: "wine" as const,
        wineStyle: "still_red" as const,
        grapeVariety: ["Cabernet Sauvignon", "Merlot"],
        vintage: 2019,
        producer: "Napa Valley Winery",
        region: "Napa Valley",
        servingOptions: ["bottle", "glass"],
      };

      const enhanced = await MenuService.enhanceMenuItem(mockWineItem);

      // Verify wine intelligence
      expect(enhanced.wineIntelligence).toBeDefined();
      expect(enhanced.wineIntelligence?.qualityScore).toBeGreaterThan(0);
      expect(enhanced.wineIntelligence?.complexityLevel).toBeDefined();
      expect(enhanced.wineIntelligence?.recommendedQuestions).toBeDefined();
      expect(
        enhanced.wineIntelligence?.recommendedQuestions.length
      ).toBeGreaterThanOrEqual(5);

      // Verify wine-specific confidence
      expect(enhanced.enhancementData?.confidence.wine).toBeGreaterThan(0.8);

      // Verify food pairing suggestions
      expect(enhanced.wineIntelligence?.foodPairings).toBeDefined();
      expect(enhanced.wineIntelligence?.foodPairings.length).toBeGreaterThan(0);
    });

    it("should generate preview data with format-specific enhancements", async () => {
      const mockParsedData = {
        menuName: "Integration Test Menu",
        sourceFormat: "excel" as const,
        items: [
          { name: "Test Item 1", price: 15.99, category: "Appetizers" },
          { name: "Test Item 2", price: 22.99, category: "Main Courses" },
        ],
        metadata: {
          processingTime: 100,
          totalItems: 2,
          warnings: ["Test warning"],
        },
      };

      jest
        .spyOn(FileParserService, "parseMenuFile")
        .mockResolvedValue(mockParsedData);

      const result = await MenuService.processMenuUpload(
        mockTestFiles.excel.path,
        mockTestFiles.excel.name,
        "restaurant123"
      );

      // Verify preview structure
      expect(result.preview).toBeDefined();
      expect(result.preview?.itemCount).toBe(2);
      expect(result.preview?.categories).toContain("Appetizers");
      expect(result.preview?.categories).toContain("Main Courses");
      expect(result.preview?.priceRange).toBeDefined();
      expect(result.preview?.priceRange?.min).toBe(15.99);
      expect(result.preview?.priceRange?.max).toBe(22.99);

      // Verify format-specific enhancements in preview
      expect(result.preview?.formatEnhancements).toBeDefined();
      expect(result.preview?.formatEnhancements?.sourceFormat).toBe("excel");
      expect(result.preview?.formatEnhancements?.processingTime).toBe(100);
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle file parsing errors gracefully", async () => {
      jest
        .spyOn(FileParserService, "parseMenuFile")
        .mockRejectedValue(new AppError("File parsing failed", 400));

      await expect(
        MenuService.processMenuUpload(
          "/test/invalid.xlsx",
          "invalid.xlsx",
          "restaurant123"
        )
      ).rejects.toThrow(AppError);
    });

    it("should handle enhancement errors without breaking pipeline", async () => {
      const mockParsedData = {
        menuName: "Error Test Menu",
        sourceFormat: "csv" as const,
        items: [{ name: "Test Item", price: 15.99, category: "Test" }],
        metadata: {
          processingTime: 50,
          totalItems: 1,
          warnings: [],
        },
      };

      jest
        .spyOn(FileParserService, "parseMenuFile")
        .mockResolvedValue(mockParsedData);

      // Mock enhancement error
      const originalEnhance = MenuService.enhanceMenuItem;
      jest
        .spyOn(MenuService, "enhanceMenuItem")
        .mockImplementation(async (item) => {
          if (item.name === "Test Item") {
            throw new Error("Enhancement failed");
          }
          return originalEnhance(item);
        });

      const result = await MenuService.processMenuUpload(
        mockTestFiles.csv.path,
        mockTestFiles.csv.name,
        "restaurant123"
      );

      // Should still return result with fallback data
      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.metadata?.errors).toBeDefined();
      expect(result.metadata?.errors?.length).toBeGreaterThan(0);
    });

    it("should validate restaurant access and permissions", async () => {
      const mockParsedData = {
        menuName: "Permission Test Menu",
        sourceFormat: "json" as const,
        items: [{ name: "Test Item", price: 15.99 }],
        metadata: { processingTime: 75, totalItems: 1, warnings: [] },
      };

      jest
        .spyOn(FileParserService, "parseMenuFile")
        .mockResolvedValue(mockParsedData);

      // Test with valid restaurant ID
      const result = await MenuService.processMenuUpload(
        mockTestFiles.json.path,
        mockTestFiles.json.name,
        "valid_restaurant_id"
      );

      expect(result).toBeDefined();
      expect(result.restaurantId).toBe("valid_restaurant_id");
    });
  });

  describe("Performance Benchmarking", () => {
    it("should complete processing within acceptable time limits", async () => {
      const mockParsedData = {
        menuName: "Performance Test Menu",
        sourceFormat: "excel" as const,
        items: Array.from({ length: 100 }, (_, i) => ({
          name: `Test Item ${i + 1}`,
          price: 10 + i * 0.5,
          category:
            i < 20 ? "Appetizers" : i < 60 ? "Main Courses" : "Desserts",
          ingredients: ["ingredient1", "ingredient2", "ingredient3"],
        })),
        metadata: {
          processingTime: 500,
          totalItems: 100,
          warnings: [],
        },
      };

      jest
        .spyOn(FileParserService, "parseMenuFile")
        .mockResolvedValue(mockParsedData);

      const startTime = Date.now();
      const result = await MenuService.processMenuUpload(
        mockTestFiles.excel.path,
        mockTestFiles.excel.name,
        "restaurant123"
      );
      const endTime = Date.now();

      // Should process 100 items within 5 seconds
      expect(endTime - startTime).toBeLessThan(5000);
      expect(result.items).toHaveLength(100);
      expect(result.metadata?.processingTime).toBeDefined();
    });

    it("should handle memory efficiently for large datasets", async () => {
      const largeDataset = {
        menuName: "Large Dataset Test",
        sourceFormat: "csv" as const,
        items: Array.from({ length: 1000 }, (_, i) => ({
          name: `Item ${i + 1}`,
          price: Math.random() * 50 + 5,
          category: ["Appetizers", "Main Courses", "Desserts", "Beverages"][
            i % 4
          ],
          description: `Description for item ${i + 1}`.repeat(10), // Long descriptions
          ingredients: Array.from(
            { length: 5 },
            (_, j) => `ingredient${j + 1}`
          ),
        })),
        metadata: {
          processingTime: 2000,
          totalItems: 1000,
          warnings: [],
        },
      };

      jest
        .spyOn(FileParserService, "parseMenuFile")
        .mockResolvedValue(largeDataset);

      const initialMemory = process.memoryUsage().heapUsed;
      const result = await MenuService.processMenuUpload(
        mockTestFiles.csv.path,
        mockTestFiles.csv.name,
        "restaurant123"
      );
      const finalMemory = process.memoryUsage().heapUsed;

      // Memory increase should be reasonable (less than 100MB for 1000 items)
      expect(finalMemory - initialMemory).toBeLessThan(100 * 1024 * 1024);
      expect(result.items).toHaveLength(1000);
    });

    it("should track and report processing metrics", async () => {
      const mockParsedData = {
        menuName: "Metrics Test Menu",
        sourceFormat: "word" as const,
        items: [
          { name: "Test Item 1", price: 15.99 },
          { name: "Test Item 2", price: 22.99 },
        ],
        metadata: {
          processingTime: 150,
          totalItems: 2,
          warnings: [],
        },
      };

      jest
        .spyOn(FileParserService, "parseMenuFile")
        .mockResolvedValue(mockParsedData);

      const result = await MenuService.processMenuUpload(
        mockTestFiles.word.path,
        mockTestFiles.word.name,
        "restaurant123"
      );

      // Verify metrics tracking
      expect(result.metadata?.processingMetrics).toBeDefined();
      expect(result.metadata?.processingMetrics?.totalTime).toBeGreaterThan(0);
      expect(result.metadata?.processingMetrics?.parsingTime).toBe(150);
      expect(
        result.metadata?.processingMetrics?.enhancementTime
      ).toBeGreaterThan(0);
      expect(
        result.metadata?.processingMetrics?.itemsPerSecond
      ).toBeGreaterThan(0);
    });
  });

  describe("Data Integrity and Validation", () => {
    it("should maintain data integrity throughout processing pipeline", async () => {
      const originalItems = [
        {
          name: "Caesar Salad",
          price: 12.99,
          category: "Appetizers",
          ingredients: ["romaine", "parmesan", "croutons"],
          isVegetarian: true,
        },
        {
          name: "Grilled Salmon",
          price: 24.99,
          category: "Main Courses",
          ingredients: ["salmon", "herbs", "lemon"],
        },
      ];

      const mockParsedData = {
        menuName: "Integrity Test Menu",
        sourceFormat: "json" as const,
        items: originalItems,
        metadata: {
          processingTime: 100,
          totalItems: 2,
          warnings: [],
        },
      };

      jest
        .spyOn(FileParserService, "parseMenuFile")
        .mockResolvedValue(mockParsedData);

      const result = await MenuService.processMenuUpload(
        mockTestFiles.json.path,
        mockTestFiles.json.name,
        "restaurant123"
      );

      // Verify original data is preserved
      expect(result.items[0].name).toBe("Caesar Salad");
      expect(result.items[0].price).toBe(12.99);
      expect(result.items[0].category).toBe("Appetizers");
      expect(result.items[0].isVegetarian).toBe(true);

      // Verify enhancements were added without overwriting original data
      expect(result.items[0].enhancementData).toBeDefined();
      expect(result.items[0].allergens).toBeDefined();
      expect(result.items[0].processedIngredients).toBeDefined();
    });

    it("should validate business rules across all processed items", async () => {
      const mockParsedData = {
        menuName: "Validation Test Menu",
        sourceFormat: "excel" as const,
        items: [
          { name: "Valid Item", price: 15.99, category: "Appetizers" },
          { name: "", price: -5.99, category: "Invalid" }, // Invalid item
          { name: "Wine Item", price: 45.0, itemType: "wine", vintage: 3000 }, // Invalid wine
        ],
        metadata: {
          processingTime: 100,
          totalItems: 3,
          warnings: [],
        },
      };

      jest
        .spyOn(FileParserService, "parseMenuFile")
        .mockResolvedValue(mockParsedData);

      const result = await MenuService.processMenuUpload(
        mockTestFiles.excel.path,
        mockTestFiles.excel.name,
        "restaurant123"
      );

      // Should filter out invalid items
      expect(result.items.length).toBeLessThan(3);
      expect(result.metadata?.validationSummary).toBeDefined();
      expect(result.metadata?.validationSummary?.totalValidated).toBe(3);
      expect(result.metadata?.validationSummary?.passed).toBeLessThan(3);
      expect(result.metadata?.validationSummary?.failed).toBeGreaterThan(0);
    });
  });
});
