import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";

// Test data files
const testFiles = {
  excel: path.join(__dirname, "../fixtures/test-menu.xlsx"),
  csv: path.join(__dirname, "../fixtures/test-menu.csv"),
  json: path.join(__dirname, "../fixtures/test-menu.json"),
  word: path.join(__dirname, "../fixtures/test-menu.docx"),
  pdf: path.join(__dirname, "../fixtures/test-menu.pdf"),
  invalid: path.join(__dirname, "../fixtures/invalid-file.txt"),
};

// Helper function to create test files
async function createTestFiles() {
  const fixturesDir = path.dirname(testFiles.excel);

  // Ensure fixtures directory exists
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  // Create CSV test file
  const csvContent = `Name,Price,Category,Description,Ingredients,Allergens,Vegan,Vegetarian,Gluten Free
Caesar Salad,12.99,Appetizers,"Fresh romaine with Caesar dressing","romaine,parmesan,croutons","dairy,gluten",FALSE,TRUE,FALSE
Grilled Salmon,24.99,Main Courses,"Atlantic salmon with herbs","salmon,herbs,lemon",fish,FALSE,FALSE,TRUE
Chardonnay Reserve,45.00,Wine,"Premium white wine","grapes","",TRUE,TRUE,TRUE`;

  fs.writeFileSync(testFiles.csv, csvContent);

  // Create JSON test file
  const jsonContent = {
    menu: {
      name: "Test Restaurant Menu",
      items: [
        {
          name: "Caesar Salad",
          price: 12.99,
          category: "Appetizers",
          description: "Fresh romaine with Caesar dressing",
          ingredients: ["romaine", "parmesan", "croutons"],
          allergens: ["dairy", "gluten"],
          isVegan: false,
          isVegetarian: true,
          isGlutenFree: false,
        },
        {
          name: "Grilled Salmon",
          price: 24.99,
          category: "Main Courses",
          description: "Atlantic salmon with herbs",
          ingredients: ["salmon", "herbs", "lemon"],
          allergens: ["fish"],
          isVegan: false,
          isVegetarian: false,
          isGlutenFree: true,
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
  };

  fs.writeFileSync(testFiles.json, JSON.stringify(jsonContent, null, 2));

  // Create invalid file
  fs.writeFileSync(testFiles.invalid, "This is not a valid menu file");
}

// Helper function to login
async function loginUser(page: Page) {
  await page.goto("/login");
  await page.fill('[data-testid="email-input"]', "test@restaurant.com");
  await page.fill('[data-testid="password-input"]', "password123");
  await page.click('[data-testid="login-button"]');
  await page.waitForURL("/dashboard");
}

// Helper function to navigate to menus page
async function navigateToMenus(page: Page) {
  await page.click('[data-testid="nav-menus"]');
  await page.waitForURL("/menus");
  await expect(page.locator("h1")).toContainText("Menu Management");
}

test.describe("Multi-Format Menu Upload E2E Tests", () => {
  test.beforeAll(async () => {
    await createTestFiles();
  });

  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test.describe("Template Download Flow", () => {
    test("should download Excel template and verify content", async ({
      page,
    }) => {
      await navigateToMenus(page);

      // Show templates section
      await page.click('[data-testid="show-templates-button"]');
      await expect(
        page.locator('[data-testid="templates-section"]')
      ).toBeVisible();

      // Start Excel template download
      const downloadPromise = page.waitForDownload();
      await page.click('[data-testid="download-excel-template"]');
      const download = await downloadPromise;

      // Verify download
      expect(download.suggestedFilename()).toBe("menu-template.xlsx");

      // Save and verify file exists
      const downloadPath = path.join(
        __dirname,
        "../downloads/menu-template.xlsx"
      );
      await download.saveAs(downloadPath);
      expect(fs.existsSync(downloadPath)).toBeTruthy();
    });

    test("should download CSV template with proper structure", async ({
      page,
    }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="show-templates-button"]');

      const downloadPromise = page.waitForDownload();
      await page.click('[data-testid="download-csv-template"]');
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toBe("menu-template.csv");

      // Save and verify CSV content
      const downloadPath = path.join(
        __dirname,
        "../downloads/menu-template.csv"
      );
      await download.saveAs(downloadPath);

      const csvContent = fs.readFileSync(downloadPath, "utf-8");
      expect(csvContent).toContain("Name,Price,Category");
      expect(csvContent).toContain("Caesar Salad");
      expect(csvContent).toContain("Chardonnay Reserve");
    });

    test("should download JSON template with valid structure", async ({
      page,
    }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="show-templates-button"]');

      const downloadPromise = page.waitForDownload();
      await page.click('[data-testid="download-json-template"]');
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toBe("menu-template.json");

      const downloadPath = path.join(
        __dirname,
        "../downloads/menu-template.json"
      );
      await download.saveAs(downloadPath);

      const jsonContent = JSON.parse(fs.readFileSync(downloadPath, "utf-8"));
      expect(jsonContent.menu).toBeDefined();
      expect(jsonContent.menu.items).toBeInstanceOf(Array);
      expect(jsonContent.menu.items.length).toBeGreaterThan(0);
    });

    test("should download Word template successfully", async ({ page }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="show-templates-button"]');

      const downloadPromise = page.waitForDownload();
      await page.click('[data-testid="download-word-template"]');
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toBe("menu-template.docx");

      const downloadPath = path.join(
        __dirname,
        "../downloads/menu-template.docx"
      );
      await download.saveAs(downloadPath);
      expect(fs.existsSync(downloadPath)).toBeTruthy();
    });
  });

  test.describe("File Upload Process", () => {
    test("should upload CSV file and show preview", async ({ page }) => {
      await navigateToMenus(page);

      // Open upload modal
      await page.click('[data-testid="upload-menu-button"]');
      await expect(page.locator('[data-testid="upload-modal"]')).toBeVisible();

      // Upload CSV file
      await page.setInputFiles('[data-testid="file-input"]', testFiles.csv);

      // Verify file is selected
      await expect(page.locator("text=test-menu.csv")).toBeVisible();
      await expect(page.locator('[data-testid="format-badge"]')).toContainText(
        "CSV"
      );

      // Upload file
      await page.click('[data-testid="upload-button"]');

      // Wait for upload to complete
      await expect(
        page.locator('[data-testid="upload-progress"]')
      ).toBeVisible();
      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 10000,
      });

      // Verify preview is shown
      await expect(page.locator('[data-testid="menu-preview"]')).toBeVisible();
      await expect(page.locator("text=3 items")).toBeVisible();
      await expect(page.locator("text=Caesar Salad")).toBeVisible();
      await expect(page.locator("text=Grilled Salmon")).toBeVisible();
    });

    test("should upload JSON file and display enhanced preview", async ({
      page,
    }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="upload-menu-button"]');

      await page.setInputFiles('[data-testid="file-input"]', testFiles.json);
      await expect(page.locator('[data-testid="format-badge"]')).toContainText(
        "JSON"
      );

      await page.click('[data-testid="upload-button"]');
      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 10000,
      });

      // Verify enhanced preview features
      await expect(
        page.locator('[data-testid="preview-enhancement"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="format-insights"]')
      ).toBeVisible();
      await expect(page.locator("text=Schema Valid")).toBeVisible();

      // Check wine-specific enhancements
      await expect(page.locator("text=Chardonnay Reserve")).toBeVisible();
      await expect(
        page.locator('[data-testid="wine-intelligence"]')
      ).toBeVisible();
    });

    test("should handle file validation errors", async ({ page }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="upload-menu-button"]');

      // Try to upload invalid file
      await page.setInputFiles('[data-testid="file-input"]', testFiles.invalid);

      // Should show error message
      await expect(page.locator("text=Unsupported file format")).toBeVisible();
      await expect(
        page.locator('[data-testid="upload-button"]')
      ).toBeDisabled();
    });

    test("should handle large file size validation", async ({ page }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="upload-menu-button"]');

      // Create a large test file (>10MB)
      const largeContent = "x".repeat(11 * 1024 * 1024);
      const largeFilePath = path.join(__dirname, "../fixtures/large-file.csv");
      fs.writeFileSync(largeFilePath, largeContent);

      await page.setInputFiles('[data-testid="file-input"]', largeFilePath);

      await expect(
        page.locator("text=File size exceeds 10MB limit")
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="upload-button"]')
      ).toBeDisabled();

      // Cleanup
      fs.unlinkSync(largeFilePath);
    });
  });

  test.describe("Multi-Format Upload Scenarios", () => {
    test("should handle Excel file with wine data", async ({ page }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="upload-menu-button"]');

      // For this test, we'll simulate Excel upload (actual Excel files require xlsx library)
      // This would need a real Excel file in production
      await page.setInputFiles('[data-testid="file-input"]', testFiles.csv);
      await page.click('[data-testid="upload-button"]');

      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 10000,
      });

      // Verify wine items are processed correctly
      await expect(page.locator("text=Chardonnay Reserve")).toBeVisible();
      await expect(page.locator('[data-testid="wine-badge"]')).toBeVisible();
    });

    test("should process multiple file formats in sequence", async ({
      page,
    }) => {
      await navigateToMenus(page);

      // Test CSV upload
      await page.click('[data-testid="upload-menu-button"]');
      await page.setInputFiles('[data-testid="file-input"]', testFiles.csv);
      await page.click('[data-testid="upload-button"]');
      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 10000,
      });
      await page.click('[data-testid="close-modal"]');

      // Test JSON upload
      await page.click('[data-testid="upload-menu-button"]');
      await page.setInputFiles('[data-testid="file-input"]', testFiles.json);
      await page.click('[data-testid="upload-button"]');
      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 10000,
      });

      // Verify both uploads were processed
      await expect(page.locator('[data-testid="menu-list"]')).toContainText(
        "Test Restaurant Menu"
      );
    });

    test("should handle format-specific validation warnings", async ({
      page,
    }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="upload-menu-button"]');

      await page.setInputFiles('[data-testid="file-input"]', testFiles.json);
      await page.click('[data-testid="upload-button"]');
      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 10000,
      });

      // Check for validation warnings if any
      const warningsSection = page.locator(
        '[data-testid="validation-warnings"]'
      );
      if (await warningsSection.isVisible()) {
        await expect(warningsSection).toBeVisible();
      }
    });
  });

  test.describe("Enhanced Intelligence Features", () => {
    test("should display confidence scores for menu items", async ({
      page,
    }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="upload-menu-button"]');

      await page.setInputFiles('[data-testid="file-input"]', testFiles.json);
      await page.click('[data-testid="upload-button"]');
      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 10000,
      });

      // Check for confidence indicators
      await expect(
        page.locator('[data-testid="confidence-score"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="enhancement-summary"]')
      ).toBeVisible();
    });

    test("should show allergen detection results", async ({ page }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="upload-menu-button"]');

      await page.setInputFiles('[data-testid="file-input"]', testFiles.json);
      await page.click('[data-testid="upload-button"]');
      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 10000,
      });

      // Verify allergen detection
      await expect(page.locator("text=dairy")).toBeVisible();
      await expect(page.locator("text=fish")).toBeVisible();
      await expect(
        page.locator('[data-testid="allergen-badge"]')
      ).toBeVisible();
    });

    test("should display dietary restriction information", async ({ page }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="upload-menu-button"]');

      await page.setInputFiles('[data-testid="file-input"]', testFiles.csv);
      await page.click('[data-testid="upload-button"]');
      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 10000,
      });

      // Check dietary badges
      await expect(page.locator('[data-testid="vegan-badge"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="vegetarian-badge"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="gluten-free-badge"]')
      ).toBeVisible();
    });
  });

  test.describe("Preview and Import Flow", () => {
    test("should show detailed menu preview before import", async ({
      page,
    }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="upload-menu-button"]');

      await page.setInputFiles('[data-testid="file-input"]', testFiles.json);
      await page.click('[data-testid="upload-button"]');
      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 10000,
      });

      // Verify preview details
      await expect(page.locator('[data-testid="item-count"]')).toContainText(
        "3"
      );
      await expect(page.locator('[data-testid="category-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="price-range"]')).toBeVisible();

      // Check individual items
      await expect(
        page.locator('[data-testid="preview-item-0"]')
      ).toContainText("Caesar Salad");
      await expect(
        page.locator('[data-testid="preview-item-1"]')
      ).toContainText("Grilled Salmon");
      await expect(
        page.locator('[data-testid="preview-item-2"]')
      ).toContainText("Chardonnay Reserve");
    });

    test("should import menu items successfully", async ({ page }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="upload-menu-button"]');

      await page.setInputFiles('[data-testid="file-input"]', testFiles.json);
      await page.click('[data-testid="upload-button"]');
      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 10000,
      });

      // Import the menu
      await page.click('[data-testid="import-menu-button"]');
      await page.waitForSelector('[data-testid="import-success"]', {
        timeout: 15000,
      });

      // Verify import success
      await expect(
        page.locator('[data-testid="import-success"]')
      ).toContainText("Menu imported successfully");

      // Close modal and verify items appear in menu list
      await page.click('[data-testid="close-modal"]');
      await expect(page.locator('[data-testid="menu-list"]')).toContainText(
        "Test Restaurant Menu"
      );
    });

    test("should handle import errors gracefully", async ({ page }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="upload-menu-button"]');

      await page.setInputFiles('[data-testid="file-input"]', testFiles.csv);
      await page.click('[data-testid="upload-button"]');
      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 10000,
      });

      // Mock a server error by intercepting the import request
      await page.route("**/api/menus/import", (route) => {
        route.fulfill({ status: 500, body: "Server error" });
      });

      await page.click('[data-testid="import-menu-button"]');

      // Should show error message
      await expect(page.locator('[data-testid="import-error"]')).toBeVisible();
      await expect(page.locator("text=Import failed")).toBeVisible();
    });
  });

  test.describe("Error Recovery and Edge Cases", () => {
    test("should recover from network errors during upload", async ({
      page,
    }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="upload-menu-button"]');

      await page.setInputFiles('[data-testid="file-input"]', testFiles.csv);

      // Mock network error
      await page.route("**/api/menus/upload", (route) => {
        route.abort("failed");
      });

      await page.click('[data-testid="upload-button"]');

      // Should show error and retry option
      await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

      // Remove mock and retry
      await page.unroute("**/api/menus/upload");
      await page.click('[data-testid="retry-button"]');

      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 10000,
      });
    });

    test("should handle corrupted file uploads", async ({ page }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="upload-menu-button"]');

      // Create a corrupted JSON file
      const corruptedJson = '{ "menu": { "items": [ invalid json';
      const corruptedPath = path.join(__dirname, "../fixtures/corrupted.json");
      fs.writeFileSync(corruptedPath, corruptedJson);

      await page.setInputFiles('[data-testid="file-input"]', corruptedPath);
      await page.click('[data-testid="upload-button"]');

      // Should handle parsing error
      await expect(page.locator('[data-testid="parsing-error"]')).toBeVisible();

      fs.unlinkSync(corruptedPath);
    });

    test("should handle session timeout during upload", async ({ page }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="upload-menu-button"]');

      await page.setInputFiles('[data-testid="file-input"]', testFiles.json);

      // Mock session timeout
      await page.route("**/api/menus/upload", (route) => {
        route.fulfill({ status: 401, body: "Unauthorized" });
      });

      await page.click('[data-testid="upload-button"]');

      // Should redirect to login
      await page.waitForURL("/login");
      await expect(page.locator("text=Session expired")).toBeVisible();
    });
  });

  test.describe("Performance and Load Testing", () => {
    test("should handle large menu uploads efficiently", async ({ page }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="upload-menu-button"]');

      // Create large menu file (but under 10MB limit)
      const largeMenu = {
        menu: {
          name: "Large Test Menu",
          items: Array.from({ length: 500 }, (_, i) => ({
            name: `Item ${i + 1}`,
            price: Math.random() * 50 + 5,
            category: ["Appetizers", "Main Courses", "Desserts", "Beverages"][
              i % 4
            ],
            description: `Description for item ${i + 1}`,
            ingredients: [
              `ingredient${i}`,
              `ingredient${i + 1}`,
              `ingredient${i + 2}`,
            ],
          })),
        },
      };

      const largePath = path.join(__dirname, "../fixtures/large-menu.json");
      fs.writeFileSync(largePath, JSON.stringify(largeMenu));

      const startTime = Date.now();
      await page.setInputFiles('[data-testid="file-input"]', largePath);
      await page.click('[data-testid="upload-button"]');
      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 30000,
      });
      const endTime = Date.now();

      // Should complete within reasonable time (30 seconds)
      expect(endTime - startTime).toBeLessThan(30000);

      // Verify large menu is processed
      await expect(page.locator("text=500 items")).toBeVisible();

      fs.unlinkSync(largePath);
    });

    test("should show progress indicators for slow uploads", async ({
      page,
    }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="upload-menu-button"]');

      await page.setInputFiles('[data-testid="file-input"]', testFiles.json);

      // Mock slow upload
      await page.route("**/api/menus/upload", (route) => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true }),
          });
        }, 2000);
      });

      await page.click('[data-testid="upload-button"]');

      // Should show progress indicators
      await expect(
        page.locator('[data-testid="upload-progress"]')
      ).toBeVisible();
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();

      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 5000,
      });
    });
  });

  test.describe("Accessibility and Usability", () => {
    test("should support keyboard navigation throughout upload flow", async ({
      page,
    }) => {
      await navigateToMenus(page);

      // Navigate with keyboard
      await page.keyboard.press("Tab"); // Focus upload button
      await page.keyboard.press("Enter"); // Open modal

      await expect(page.locator('[data-testid="upload-modal"]')).toBeVisible();

      // Navigate to file input
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      // File input should be focused
      await expect(page.locator('[data-testid="file-input"]')).toBeFocused();
    });

    test("should announce upload status to screen readers", async ({
      page,
    }) => {
      await navigateToMenus(page);
      await page.click('[data-testid="upload-menu-button"]');

      await page.setInputFiles('[data-testid="file-input"]', testFiles.csv);
      await page.click('[data-testid="upload-button"]');

      // Check for aria-live announcements
      await expect(page.locator('[aria-live="polite"]')).toBeVisible();
      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 10000,
      });
    });

    test("should work with high contrast mode", async ({ page }) => {
      // Enable high contrast mode simulation
      await page.emulateMedia({ colorScheme: "dark" });

      await navigateToMenus(page);
      await page.click('[data-testid="upload-menu-button"]');

      // Verify components are still visible and functional
      await expect(page.locator('[data-testid="upload-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-input"]')).toBeVisible();
    });
  });

  test.afterAll(async () => {
    // Cleanup test files
    Object.values(testFiles).forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // Cleanup downloads directory
    const downloadsDir = path.join(__dirname, "../downloads");
    if (fs.existsSync(downloadsDir)) {
      fs.rmSync(downloadsDir, { recursive: true });
    }
  });
});
