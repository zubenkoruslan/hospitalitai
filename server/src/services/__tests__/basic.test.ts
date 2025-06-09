import { FileParserService } from "../fileParserService";
import { TemplateService } from "../templateService";

describe("Basic Service Tests", () => {
  describe("FileParserService", () => {
    it("should be importable", () => {
      expect(FileParserService).toBeDefined();
    });

    it("should have parseMenuFile method", () => {
      expect(typeof FileParserService.parseMenuFile).toBe("function");
    });
  });

  describe("TemplateService", () => {
    it("should be importable", () => {
      expect(TemplateService).toBeDefined();
    });

    it("should have generateExcelTemplate method", () => {
      expect(typeof TemplateService.generateExcelTemplate).toBe("function");
    });

    it("should have generateCSVTemplate method", () => {
      expect(typeof TemplateService.generateCSVTemplate).toBe("function");
    });

    it("should have generateJSONTemplate method", () => {
      expect(typeof TemplateService.generateJSONTemplate).toBe("function");
    });

    it("should have generateWordTemplate method", () => {
      expect(typeof TemplateService.generateWordTemplate).toBe("function");
    });
  });

  describe("Constants and Interfaces", () => {
    it("should have basic functionality", () => {
      // Basic smoke test - services are importable and have methods
      expect(FileParserService).toBeDefined();
      expect(TemplateService).toBeDefined();
    });
  });
});
