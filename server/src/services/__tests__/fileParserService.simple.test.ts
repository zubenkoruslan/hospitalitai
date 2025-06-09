import { FileParserService } from "../fileParserService";
import { AppError } from "../../utils/errorHandler";

describe("FileParserService - Core Functionality", () => {
  describe("Format Detection", () => {
    it("should detect Excel format from extension", () => {
      expect(FileParserService.getFormatFromFilename("menu.xlsx")).toBe(
        "excel"
      );
      expect(FileParserService.getFormatFromFilename("menu.xls")).toBe("excel");
    });

    it("should detect CSV format from extension", () => {
      expect(FileParserService.getFormatFromFilename("menu.csv")).toBe("csv");
    });

    it("should detect JSON format from extension", () => {
      expect(FileParserService.getFormatFromFilename("menu.json")).toBe("json");
    });

    it("should detect Word format from extension", () => {
      expect(FileParserService.getFormatFromFilename("menu.docx")).toBe("word");
    });

    it("should throw error for unsupported formats", () => {
      expect(() => FileParserService.getFormatFromFilename("menu.txt")).toThrow(
        AppError
      );
    });
  });

  describe("Helper Functions", () => {
    it("should parse prices correctly", () => {
      const parsePrice = (FileParserService as any).parsePrice;

      expect(parsePrice("$12.99")).toBe(12.99);
      expect(parsePrice("€15.50")).toBe(15.5);
      expect(parsePrice("£20.00")).toBe(20.0);
      expect(parsePrice("25")).toBe(25);
      expect(parsePrice("invalid")).toBeNull();
      expect(parsePrice("")).toBeNull();
      expect(parsePrice(null)).toBeNull();
    });

    it("should parse array fields correctly", () => {
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

    it("should parse boolean values correctly", () => {
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

    it("should extract menu names correctly", () => {
      const extractMenuName = (FileParserService as any).extractMenuName;

      expect(extractMenuName("restaurant_menu.xlsx", "Menu Items")).toBe(
        "restaurant menu - Menu Items"
      );
      expect(extractMenuName("menu.csv")).toBe("Menu");
      expect(extractMenuName("dinner-menu.json")).toBe("Dinner Menu");
    });
  });

  describe("Data Validation", () => {
    it("should validate wine data consistency", () => {
      const validateWineDataConsistency = (FileParserService as any)
        .validateWineDataConsistency;
      const warnings: string[] = [];

      const item = {
        name: "Test Wine",
        itemType: "wine",
        vintage: 3000, // Invalid
        wineStyle: "invalid_style", // Invalid
        grapeVariety: ["", "Chardonnay", ""], // Contains empty values
      };

      validateWineDataConsistency(item, warnings);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.includes("Invalid vintage"))).toBe(true);
    });

    it("should perform cross-field validation", () => {
      const performCrossFieldValidation = (FileParserService as any)
        .performCrossFieldValidation;
      const warnings: string[] = [];

      const item = {
        name: "Test Item",
        itemType: "food",
        isVegan: true,
        isVegetarian: false, // Inconsistent
        ingredients: ["chicken", "lettuce"], // Non-vegan ingredient
      };

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
  });

  describe("Column Mapping", () => {
    it("should map common header variations", () => {
      const normalizeHeader = (FileParserService as any).normalizeHeader;

      expect(normalizeHeader("Menu Item")).toBe("name");
      expect(normalizeHeader("ITEM_NAME")).toBe("name");
      expect(normalizeHeader("Product")).toBe("name");
      expect(normalizeHeader("Food Item")).toBe("name");

      expect(normalizeHeader("Cost")).toBe("price");
      expect(normalizeHeader("$")).toBe("price");
      expect(normalizeHeader("USD")).toBe("price");

      expect(normalizeHeader("Section")).toBe("category");
      expect(normalizeHeader("Course")).toBe("category");
      expect(normalizeHeader("Group")).toBe("category");
    });

    it("should map wine-specific headers", () => {
      const normalizeHeader = (FileParserService as any).normalizeHeader;

      expect(normalizeHeader("Wine Type")).toBe("wineStyle");
      expect(normalizeHeader("Style")).toBe("wineStyle");
      expect(normalizeHeader("Grapes")).toBe("grapeVariety");
      expect(normalizeHeader("Varietal")).toBe("grapeVariety");
      expect(normalizeHeader("Year")).toBe("vintage");
      expect(normalizeHeader("Harvest Year")).toBe("vintage");
      expect(normalizeHeader("Winery")).toBe("producer");
      expect(normalizeHeader("Estate")).toBe("producer");
    });

    it("should map dietary headers", () => {
      const normalizeHeader = (FileParserService as any).normalizeHeader;

      expect(normalizeHeader("Is Vegan")).toBe("isVegan");
      expect(normalizeHeader("V")).toBe("isVegan");
      expect(normalizeHeader("Plant Based")).toBe("isVegan");

      expect(normalizeHeader("Is Vegetarian")).toBe("isVegetarian");
      expect(normalizeHeader("Veg")).toBe("isVegetarian");

      expect(normalizeHeader("Gluten Free")).toBe("isGlutenFree");
      expect(normalizeHeader("GF")).toBe("isGlutenFree");
      expect(normalizeHeader("No Gluten")).toBe("isGlutenFree");
    });
  });

  describe("Data Processing", () => {
    it("should categorize ingredients correctly", () => {
      const categorizeIngredients = (FileParserService as any)
        .categorizeIngredients;

      const ingredients = [
        "chicken",
        "beef",
        "salmon",
        "shrimp",
        "lettuce",
        "tomato",
      ];
      const categorized = categorizeIngredients(ingredients);

      expect(categorized.primaryProteins).toContain("chicken");
      expect(categorized.primaryProteins).toContain("beef");
      expect(categorized.primaryProteins).toContain("salmon");
      expect(categorized.seafood).toContain("salmon");
      expect(categorized.seafood).toContain("shrimp");
      expect(categorized.vegetables).toContain("lettuce");
      expect(categorized.vegetables).toContain("tomato");
    });

    it("should detect allergens from ingredients", () => {
      const detectAllergens = (FileParserService as any).detectAllergens;

      const ingredients = [
        "milk",
        "eggs",
        "wheat flour",
        "peanuts",
        "shellfish",
      ];
      const allergens = detectAllergens(ingredients);

      expect(allergens).toContain("dairy");
      expect(allergens).toContain("eggs");
      expect(allergens).toContain("gluten");
      expect(allergens).toContain("nuts");
      expect(allergens).toContain("shellfish");
    });

    it("should determine dietary flags from ingredients", () => {
      const determineDietaryFlags = (FileParserService as any)
        .determineDietaryFlags;

      // Vegan ingredients
      const veganIngredients = ["lettuce", "tomato", "olive oil", "quinoa"];
      const veganFlags = determineDietaryFlags(veganIngredients);
      expect(veganFlags.isVegan).toBe(true);
      expect(veganFlags.isVegetarian).toBe(true);

      // Vegetarian but not vegan
      const vegetarianIngredients = ["lettuce", "cheese", "eggs"];
      const vegetarianFlags = determineDietaryFlags(vegetarianIngredients);
      expect(vegetarianFlags.isVegan).toBe(false);
      expect(vegetarianFlags.isVegetarian).toBe(true);

      // Contains meat
      const meatIngredients = ["chicken", "lettuce", "tomato"];
      const meatFlags = determineDietaryFlags(meatIngredients);
      expect(meatFlags.isVegan).toBe(false);
      expect(meatFlags.isVegetarian).toBe(false);
      expect(meatFlags.isPescatarian).toBe(false);

      // Contains fish
      const fishIngredients = ["salmon", "vegetables", "herbs"];
      const fishFlags = determineDietaryFlags(fishIngredients);
      expect(fishFlags.isVegan).toBe(false);
      expect(fishFlags.isVegetarian).toBe(false);
      expect(fishFlags.isPescatarian).toBe(true);
    });
  });

  describe("Wine Processing", () => {
    it("should process wine intelligence correctly", () => {
      const processWineIntelligence = (FileParserService as any)
        .processWineIntelligence;

      const wineItem = {
        name: "Chardonnay Reserve",
        itemType: "wine",
        wineStyle: "still_white",
        grapeVariety: ["Chardonnay"],
        vintage: 2021,
        producer: "Test Winery",
        region: "Burgundy",
      };

      const result = processWineIntelligence(wineItem);

      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.complexityLevel).toBeDefined();
      expect(result.recommendedQuestions).toBeDefined();
      expect(result.recommendedQuestions.length).toBeGreaterThan(0);
      expect(result.foodPairings).toBeDefined();
      expect(result.foodPairings.length).toBeGreaterThan(0);
    });

    it("should calculate wine quality scores", () => {
      const calculateWineQuality = (FileParserService as any)
        .calculateWineQuality;

      // High quality wine
      const premiumWine = {
        producer: "Dom Pérignon",
        region: "Champagne",
        vintage: 2015,
        grapeVariety: ["Chardonnay", "Pinot Noir"],
      };

      const premiumScore = calculateWineQuality(premiumWine);
      expect(premiumScore).toBeGreaterThan(0.8);

      // Basic wine
      const basicWine = {
        producer: "House Wine",
        region: "Unknown",
        vintage: null,
        grapeVariety: [],
      };

      const basicScore = calculateWineQuality(basicWine);
      expect(basicScore).toBeLessThan(0.5);
    });
  });

  describe("Format-Specific Processing", () => {
    it("should generate CSV insights", () => {
      const generateCSVInsights = (FileParserService as any)
        .generateCSVInsights;

      const mockData = {
        items: [
          { name: "Item 1", price: 10.99 },
          { name: "Item 2", price: 15.99 },
        ],
      };

      const insights = generateCSVInsights(mockData, []);

      expect(insights.delimiter).toBe(",");
      expect(insights.encoding).toBe("UTF-8");
      expect(insights.rowCount).toBe(2);
    });

    it("should generate JSON schema validation", () => {
      const validateJSONSchema = (FileParserService as any).validateJSONSchema;

      const validStructure = {
        menu: {
          name: "Test Menu",
          items: [{ name: "Item 1", price: 10.99 }],
        },
      };

      const validation = validateJSONSchema(validStructure);
      expect(validation.isValid).toBe(true);
      expect(validation.structure).toBe("menu_object");

      const invalidStructure = { random: "data" };
      const invalidValidation = validateJSONSchema(invalidStructure);
      expect(invalidValidation.isValid).toBe(false);
    });

    it("should generate Word document insights", () => {
      const generateWordInsights = (FileParserService as any)
        .generateWordInsights;

      const mockData = {
        items: [
          { name: "Item 1", category: "Appetizers" },
          { name: "Item 2", category: "Main Courses" },
        ],
      };

      const insights = generateWordInsights(mockData);

      expect(insights.hasHeaders).toBe(true);
      expect(insights.categories).toEqual(["Appetizers", "Main Courses"]);
      expect(insights.hasTableStructure).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle empty file names gracefully", () => {
      expect(() => FileParserService.getFormatFromFilename("")).toThrow(
        AppError
      );
      expect(() =>
        FileParserService.getFormatFromFilename(null as any)
      ).toThrow(AppError);
    });

    it("should handle invalid data types in parsing", () => {
      const parsePrice = (FileParserService as any).parsePrice;

      expect(parsePrice(undefined)).toBeNull();
      expect(parsePrice({})).toBeNull();
      expect(parsePrice([])).toBeNull();
    });

    it("should handle malformed ingredient lists", () => {
      const parseArrayField = (FileParserService as any).parseArrayField;

      expect(parseArrayField(null)).toEqual([]);
      expect(parseArrayField(undefined)).toEqual([]);
      expect(parseArrayField(123 as any)).toEqual([]);
    });
  });
});
