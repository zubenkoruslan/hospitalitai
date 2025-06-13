import pdfParse from "pdf-parse";
import fs from "fs";

export interface PDFSection {
  title: string;
  content: string[];
  type: "header" | "wine_list" | "description" | "prices" | "other";
}

export interface WineEntry {
  vintage?: string;
  name: string;
  producer?: string;
  region?: string;
  country?: string;
  description?: string;
  prices: {
    glass?: number;
    carafe?: number;
    bottle?: number;
  };
  servingSizes?: string[];
  style?: string;
  grapeVariety?: string[];
  originalLine: string;
}

export interface StructuredMenuData {
  title: string;
  sections: {
    sparkling?: WineEntry[];
    white?: WineEntry[];
    red?: WineEntry[];
    rose?: WineEntry[];
    orange?: WineEntry[];
    dessert?: WineEntry[];
    port?: WineEntry[];
    other?: WineEntry[];
  };
  metadata: {
    totalItems: number;
    detectedFormat: string;
    processingNotes: string[];
  };
}

export class PdfToJsonService {
  /**
   * Convert PDF to structured JSON format
   */
  async convertPdfToStructuredJson(
    filePath: string,
    originalFileName?: string
  ): Promise<{
    success: boolean;
    data?: StructuredMenuData;
    errors: string[];
  }> {
    try {
      // Extract text from PDF
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      const rawText = pdfData.text?.trim() || "";

      if (!rawText) {
        return {
          success: false,
          errors: ["No text content could be extracted from the PDF"],
        };
      }

      // Detect if it's a wine menu
      const isWineMenu = this.detectWineMenu(rawText, originalFileName);

      if (isWineMenu) {
        const structuredData = this.parseWineMenu(rawText, originalFileName);
        return {
          success: true,
          data: structuredData,
          errors: [],
        };
      } else {
        // For non-wine menus, create a simpler structure
        const structuredData = this.parseGeneralMenu(rawText, originalFileName);
        return {
          success: true,
          data: structuredData,
          errors: [],
        };
      }
    } catch (error: any) {
      return {
        success: false,
        errors: [`PDF to JSON conversion error: ${error.message}`],
      };
    }
  }

  /**
   * Detect if the menu is a wine menu
   */
  private detectWineMenu(rawText: string, fileName?: string): boolean {
    const wineIndicators = [
      /\b(vintage|wine|sparkling|champagne|pinot|chardonnay|cabernet|merlot|syrah)\b/gi,
      /\b(bordeaux|burgundy|tuscany|napa|barolo|chianti)\b/gi,
      /\b(bottle|glass|125ml|175ml|carafe)\b/gi,
      /\d{4}\s+[A-Z]/g, // Vintage years followed by wine names
      /NV\s+[A-Z]/g, // Non-vintage wines
    ];

    const fileName_indicators = fileName
      ? /wine|vino|vin\b/gi.test(fileName)
      : false;

    const textMatches = wineIndicators.reduce(
      (count, regex) => count + (rawText.match(regex) || []).length,
      0
    );

    return fileName_indicators || textMatches >= 10;
  }

  /**
   * Parse wine menu into structured format
   */
  private parseWineMenu(
    rawText: string,
    originalFileName?: string
  ): StructuredMenuData {
    const lines = rawText.split(/\r?\n/);
    const sections: StructuredMenuData["sections"] = {};
    const processingNotes: string[] = [];

    let currentSection: string | null = null;
    let totalItems = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) continue;

      // Detect section headers
      const sectionType = this.detectWineSectionType(line);
      if (sectionType) {
        currentSection = sectionType;
        processingNotes.push(`Found section: ${sectionType.toUpperCase()}`);
        continue;
      }

      // Skip descriptive paragraphs and non-wine lines
      if (this.isDescriptiveLine(line)) {
        continue;
      }

      // Try to parse as wine entry
      if (currentSection) {
        const wineEntry = this.parseWineEntry(line, i);
        if (wineEntry) {
          if (!sections[currentSection as keyof typeof sections]) {
            sections[currentSection as keyof typeof sections] = [];
          }
          sections[currentSection as keyof typeof sections]!.push(wineEntry);
          totalItems++;
        }
      }
    }

    return {
      title: originalFileName?.replace(/\.pdf$/i, "") || "Wine Menu",
      sections,
      metadata: {
        totalItems,
        detectedFormat: "wine_menu",
        processingNotes,
      },
    };
  }

  /**
   * Detect wine section type from line
   */
  private detectWineSectionType(line: string): string | null {
    const cleanLine = line.toLowerCase().trim();

    const sectionMap: { [key: string]: string } = {
      sparkling: "sparkling",
      champagne: "sparkling",
      "white wine": "white",
      white: "white",
      "red wine": "red",
      red: "red",
      "rosé wine": "rose",
      rosé: "rose",
      rose: "rose",
      "orange wine": "orange",
      orange: "orange",
      "dessert wine": "dessert",
      dessert: "dessert",
      port: "port",
      "fortified wine": "port",
    };

    for (const [key, value] of Object.entries(sectionMap)) {
      if (cleanLine.includes(key) && cleanLine.length < 50) {
        return value;
      }
    }

    return null;
  }

  /**
   * Check if line is descriptive rather than a wine entry
   */
  private isDescriptiveLine(line: string): boolean {
    // Skip very long descriptive paragraphs
    if (line.length > 200) return true;

    // Skip lines that don't look like wine entries
    const hasWineIndicators =
      /\d{4}|NV|\d+ml|\d+\.?\d*\s*(?:\d+|bottle|glass)/i.test(line);
    const hasOnlyText = /^[A-Za-z\s,.'()-]+$/.test(line) && line.length > 100;

    return hasOnlyText && !hasWineIndicators;
  }

  /**
   * Parse individual wine entry from line
   */
  private parseWineEntry(line: string, lineNumber: number): WineEntry | null {
    try {
      // Basic wine entry pattern: [VINTAGE] [NAME] [PRODUCER] [REGION] [COUNTRY] [PRICES]

      // Extract vintage FIRST and remove from line
      const vintageMatch = line.match(/^(\d{4}|NV)\s+/);
      const vintage = vintageMatch ? vintageMatch[1] : undefined;
      let workingLine = vintage ? line.replace(/^(\d{4}|NV)\s+/, "") : line;

      // Extract prices from the end (more precise pattern to avoid vintage confusion)
      const pricePattern = /(\d+(?:\.\d{1,2})?(?:\s+\d+(?:\.\d{1,2})?)*)\s*$/;
      const priceMatches = workingLine.match(pricePattern);
      let priceNumbers: number[] = [];

      if (priceMatches) {
        // Extract all numbers from the price section
        const priceSection = priceMatches[1];
        priceNumbers = [...priceSection.matchAll(/(\d+(?:\.\d{1,2})?)/g)]
          .map((m) => parseFloat(m[1]))
          .filter((price) => price < 1000); // Filter out vintage years that got mixed in

        // Remove price section from working line
        workingLine = workingLine.replace(pricePattern, "").trim();
      }

      // Split remaining parts by comma or multiple spaces for wine details
      const parts = workingLine.split(/\s{2,}|,\s*/).filter((p) => p.trim());

      if (parts.length === 0) return null;

      const name = parts[0]?.trim() || "";
      let producer = parts[1]?.trim();
      let region = parts[2]?.trim();
      let country = parts[3]?.trim();

      // Clean up producer/region separation (handle cases where region got mixed in)
      if (producer && region) {
        // If producer contains location indicators, it might be region data
        const locationIndicators =
          /\b(valley|estate|vineyard|château|domaine)\b/i;
        if (
          locationIndicators.test(producer) &&
          !locationIndicators.test(region)
        ) {
          // Swap them
          [producer, region] = [region, producer];
        }
      }

      // Combine region and country for better formatting
      let fullRegion = region;
      if (region && country) {
        fullRegion = `${region}, ${country}`;
      } else if (country && !region) {
        fullRegion = country;
      }

      // Parse prices into glass/carafe/bottle format
      const priceObj: WineEntry["prices"] = {};

      // Smart price assignment based on typical wine menu patterns
      if (priceNumbers.length === 1) {
        // Single price - assume bottle
        priceObj.bottle = priceNumbers[0];
      } else if (priceNumbers.length === 2) {
        // Two prices - glass and bottle
        priceObj.glass = priceNumbers[0];
        priceObj.bottle = priceNumbers[1];
      } else if (priceNumbers.length === 3) {
        // Three prices - glass, carafe/125ml, bottle
        priceObj.glass = priceNumbers[0];
        priceObj.carafe = priceNumbers[1];
        priceObj.bottle = priceNumbers[2];
      }

      // Detect wine style from section or name
      const style = this.detectWineStyle(line);

      return {
        vintage: vintage === "NV" ? undefined : vintage, // Handle non-vintage
        name,
        producer,
        region: fullRegion,
        country: undefined, // Now combined into region
        prices: priceObj,
        style,
        originalLine: line,
      };
    } catch (error) {
      console.warn(`Failed to parse wine entry at line ${lineNumber}: ${line}`);
      return null;
    }
  }

  /**
   * Detect wine style from text
   */
  private detectWineStyle(text: string): string | undefined {
    const stylePatterns = {
      still: /\b(still|dry|medium|sweet)\b/i,
      sparkling: /\b(sparkling|champagne|prosecco|cava|crémant)\b/i,
      champagne: /\b(champagne)\b/i,
      dessert: /\b(dessert|sweet|port|madeira|sherry|sauternes)\b/i,
      fortified: /\b(port|sherry|madeira|marsala|fortified)\b/i,
    };

    for (const [style, pattern] of Object.entries(stylePatterns)) {
      if (pattern.test(text)) {
        return style;
      }
    }

    return "still"; // Default
  }

  /**
   * Parse general (non-wine) menu
   */
  private parseGeneralMenu(
    rawText: string,
    originalFileName?: string
  ): StructuredMenuData {
    const lines = rawText.split(/\r?\n/).filter((line) => line.trim());
    const otherItems: WineEntry[] = [];
    const processingNotes: string[] = ["Processed as general menu"];

    // Simple parsing for non-wine menus
    lines.forEach((line, index) => {
      if (line.trim().length > 10) {
        const priceMatch = line.match(/(\d+(?:\.\d{2})?)/);
        const price = priceMatch ? parseFloat(priceMatch[1]) : undefined;

        otherItems.push({
          name: line.trim(),
          prices: price ? { bottle: price } : {},
          originalLine: line,
        });
      }
    });

    return {
      title: originalFileName?.replace(/\.pdf$/i, "") || "Menu",
      sections: { other: otherItems },
      metadata: {
        totalItems: otherItems.length,
        detectedFormat: "general_menu",
        processingNotes,
      },
    };
  }
}
