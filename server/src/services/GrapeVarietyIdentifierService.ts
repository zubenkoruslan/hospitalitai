import { GoogleGenerativeAI } from "@google/generative-ai";

// Common grape varieties database for validation
const COMMON_GRAPE_VARIETIES = [
  // Red grapes
  "Cabernet Sauvignon",
  "Merlot",
  "Pinot Noir",
  "Syrah",
  "Shiraz",
  "Tempranillo",
  "Sangiovese",
  "Grenache",
  "Malbec",
  "Zinfandel",
  "Barbera",
  "Nebbiolo",
  "Chianti",
  "Primitivo",
  "Montepulciano",
  "Nero d'Avola",
  "Corvina",
  "Rondinella",
  "Molinara",
  "Dolcetto",
  "Aglianico",
  "Cannonau",
  "Carmenère",
  "Petite Sirah",
  "Mourvèdre",
  "Cinsault",
  "Carignan",
  "Gamay",
  "Beaujolais",
  "Côtes du Rhône",

  // White grapes
  "Chardonnay",
  "Sauvignon Blanc",
  "Riesling",
  "Pinot Grigio",
  "Pinot Gris",
  "Gewürztraminer",
  "Albariño",
  "Verdejo",
  "Moscato",
  "Prosecco",
  "Glera",
  "Trebbiano",
  "Vermentino",
  "Fiano",
  "Falanghina",
  "Greco",
  "Arneis",
  "Cortese",
  "Viognier",
  "Roussanne",
  "Marsanne",
  "Chenin Blanc",
  "Sémillon",
  "Muscadet",
  "Melon de Bourgogne",
  "Grüner Veltliner",
  "Welschriesling",

  // Sparkling specific
  "Champagne Blend",
  "Cava Blend",
  "Franciacorta Blend",
  "Crémant Blend",

  // Other varieties
  "Blend",
  "Field Blend",
  "Bordeaux Blend",
  "Rhône Blend",
  "GSM Blend",
  "Super Tuscan",
  "Rosé Blend",
  "Lambrusco",
  "Brachetto",
  "Frascati",
];

export interface GrapeIdentificationResult {
  grapeVarieties: string[];
  confidence: number; // 0-100
  reasoning: string;
  isBlend: boolean;
  primaryGrape?: string;
}

export class GrapeVarietyIdentifierService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Identify grape varieties from wine name and description
   */
  async identifyGrapeVarieties(
    wineName: string,
    description?: string,
    producer?: string,
    region?: string
  ): Promise<GrapeIdentificationResult> {
    try {
      console.log(`🍇 Identifying grape varieties for: ${wineName}`);

      // First try pattern matching for quick identification
      const patternResult = this.fallbackIdentification(wineName, description);
      if (
        patternResult.grapeVarieties.length > 0 &&
        patternResult.confidence >= 80
      ) {
        console.log(`🍇 High-confidence pattern match found, skipping AI call`);
        return {
          ...patternResult,
          reasoning: `Pattern matching: ${patternResult.reasoning}`,
        };
      }

      const model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: this.buildSystemInstruction(),
      });

      const prompt = this.buildPrompt(wineName, description, producer, region);

      // Use retry logic for rate limiting
      const result = await this.retryWithBackoff(async () => {
        return await model.generateContent(prompt);
      });

      const response = await result.response;
      const responseText = response.text();

      // Parse the AI response
      const identification = this.parseAIResponse(responseText);

      // Validate and enhance with known varieties
      const validated = this.validateAndEnhance(
        identification,
        wineName,
        description
      );

      console.log(
        `🍇 Identified ${validated.grapeVarieties.length} varieties with ${validated.confidence}% confidence`
      );

      return validated;
    } catch (error: any) {
      console.error("🚫 Grape variety identification failed:", error);

      // Check if it's a rate limit error
      if (error.status === 429) {
        console.log("⏰ Rate limit exceeded, using pattern matching fallback");
      }

      // Fallback: try simple pattern matching
      return this.fallbackIdentification(wineName, description);
    }
  }

  /**
   * Retry function with exponential backoff for rate limiting
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        if (error.status === 429 && attempt < maxRetries) {
          // Extract retry delay from error if available, otherwise use exponential backoff
          let delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s

          if (error.errorDetails) {
            const retryInfo = error.errorDetails.find(
              (detail: any) =>
                detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
            );
            if (retryInfo && retryInfo.retryDelay) {
              // Parse delay like "8s" to milliseconds
              const seconds = parseInt(retryInfo.retryDelay.replace("s", ""));
              delay = seconds * 1000;
            }
          }

          console.log(
            `⏳ Rate limited, retrying in ${
              delay / 1000
            }s (attempt ${attempt}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    throw new Error(`Max retries (${maxRetries}) exceeded`);
  }

  /**
   * Build system instruction for AI
   */
  private buildSystemInstruction(): string {
    return `
You are a wine expert specializing in grape variety identification. Your task is to identify grape varieties from wine names and descriptions.

GUIDELINES:
1. Analyze wine names, descriptions, producers, and regions for grape variety clues
2. Look for explicit grape mentions (e.g., "Chardonnay", "Cabernet Sauvignon")
3. Recognize regional styles (e.g., "Chianti" = Sangiovese, "Champagne" = Chardonnay/Pinot Noir blend)
4. Identify if it's a single variety or blend
5. Provide confidence level based on clarity of information
6. Use standard grape variety names

COMMON PATTERNS:
- "Pinot Grigio" or "Pinot Gris" = Pinot Grigio
- "Prosecco" = Glera grape
- "Chianti" = Sangiovese-based
- "Champagne" = Champagne blend (Chardonnay, Pinot Noir, Pinot Meunier)
- "Bordeaux" = Bordeaux blend (Cabernet Sauvignon, Merlot, etc.)
- "GSM" = Grenache, Syrah, Mourvèdre blend

RESPONSE FORMAT:
Return a JSON object:
{
  "grapeVarieties": ["Grape 1", "Grape 2"],
  "confidence": 85,
  "reasoning": "Explanation of identification",
  "isBlend": true/false,
  "primaryGrape": "Main grape if blend"
}

Be accurate and conservative. If uncertain, indicate lower confidence.
`.trim();
  }

  /**
   * Build prompt for AI
   */
  private buildPrompt(
    wineName: string,
    description?: string,
    producer?: string,
    region?: string
  ): string {
    let context = `Wine Name: ${wineName}`;

    if (description) context += `\nDescription: ${description}`;
    if (producer) context += `\nProducer: ${producer}`;
    if (region) context += `\nRegion: ${region}`;

    return `
Identify the grape varieties for this wine. Return only a JSON object.

${context}

Analyze all available information and return the grape variety identification as a JSON object.
`;
  }

  /**
   * Parse AI response
   */
  private parseAIResponse(responseText: string): GrapeIdentificationResult {
    try {
      // Clean response
      let cleanResponse = responseText.trim();
      if (cleanResponse.startsWith("```json")) {
        cleanResponse = cleanResponse
          .replace(/^```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (cleanResponse.startsWith("```")) {
        cleanResponse = cleanResponse
          .replace(/^```\s*/, "")
          .replace(/\s*```$/, "");
      }

      // Find JSON object
      const jsonStart = cleanResponse.indexOf("{");
      const jsonEnd = cleanResponse.lastIndexOf("}");

      if (jsonStart !== -1 && jsonEnd !== -1) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
      }

      const parsed = JSON.parse(cleanResponse);

      return {
        grapeVarieties: Array.isArray(parsed.grapeVarieties)
          ? parsed.grapeVarieties
          : [],
        confidence: Math.max(0, Math.min(100, parsed.confidence || 50)),
        reasoning: parsed.reasoning || "AI identification",
        isBlend: Boolean(parsed.isBlend),
        primaryGrape: parsed.primaryGrape,
      };
    } catch (error) {
      console.error("Failed to parse grape identification response:", error);
      return {
        grapeVarieties: [],
        confidence: 0,
        reasoning: "Failed to parse AI response",
        isBlend: false,
      };
    }
  }

  /**
   * Validate and enhance identification with known varieties
   */
  private validateAndEnhance(
    identification: GrapeIdentificationResult,
    wineName: string,
    description?: string
  ): GrapeIdentificationResult {
    // Validate grape varieties against known list
    const validatedVarieties = identification.grapeVarieties
      .map((grape) => this.normalizeGrapeName(grape))
      .filter((grape) => grape && grape.length > 0);

    // If no valid varieties found, try pattern matching
    if (validatedVarieties.length === 0) {
      const patternMatches = this.findGrapesByPattern(wineName, description);
      validatedVarieties.push(...patternMatches);
    }

    // Determine if it's a blend
    const isBlend =
      validatedVarieties.length > 1 ||
      identification.isBlend ||
      this.isKnownBlendStyle(wineName);

    // Determine primary grape for blends
    let primaryGrape = identification.primaryGrape;
    if (isBlend && !primaryGrape && validatedVarieties.length > 0) {
      primaryGrape = validatedVarieties[0];
    }

    // Adjust confidence based on validation
    let adjustedConfidence = identification.confidence;
    if (validatedVarieties.length === 0) {
      adjustedConfidence = Math.min(20, adjustedConfidence);
    } else if (
      validatedVarieties.length !== identification.grapeVarieties.length
    ) {
      adjustedConfidence = Math.min(70, adjustedConfidence);
    }

    return {
      grapeVarieties: validatedVarieties,
      confidence: adjustedConfidence,
      reasoning: identification.reasoning,
      isBlend,
      primaryGrape,
    };
  }

  /**
   * Normalize grape names to standard format
   */
  private normalizeGrapeName(grape: string): string {
    if (!grape) return "";

    const normalized = grape.trim();

    // Find closest match in known varieties
    const exactMatch = COMMON_GRAPE_VARIETIES.find(
      (known) => known.toLowerCase() === normalized.toLowerCase()
    );

    if (exactMatch) return exactMatch;

    // Try partial matches
    const partialMatch = COMMON_GRAPE_VARIETIES.find(
      (known) =>
        known.toLowerCase().includes(normalized.toLowerCase()) ||
        normalized.toLowerCase().includes(known.toLowerCase())
    );

    return partialMatch || normalized;
  }

  /**
   * Find grapes by pattern matching
   */
  private findGrapesByPattern(
    wineName: string,
    description?: string
  ): string[] {
    const text = `${wineName} ${description || ""}`.toLowerCase();
    const found: string[] = [];

    // Check for explicit grape mentions
    COMMON_GRAPE_VARIETIES.forEach((grape) => {
      if (text.includes(grape.toLowerCase())) {
        found.push(grape);
      }
    });

    // Regional patterns
    if (text.includes("chianti")) found.push("Sangiovese");
    if (text.includes("prosecco")) found.push("Glera");
    if (text.includes("champagne")) found.push("Champagne Blend");
    if (text.includes("cava")) found.push("Cava Blend");
    if (text.includes("lambrusco")) found.push("Lambrusco");
    if (text.includes("barolo") || text.includes("barbaresco"))
      found.push("Nebbiolo");

    return [...new Set(found)]; // Remove duplicates
  }

  /**
   * Check if wine name suggests a blend style
   */
  private isKnownBlendStyle(wineName: string): boolean {
    const name = wineName.toLowerCase();
    const blendKeywords = [
      "blend",
      "cuvée",
      "assemblage",
      "merge",
      "fusion",
      "gsm",
      "bordeaux",
      "rhône",
      "super tuscan",
      "rosé",
    ];

    return blendKeywords.some((keyword) => name.includes(keyword));
  }

  /**
   * Fallback identification using pattern matching only
   */
  private fallbackIdentification(
    wineName: string,
    description?: string
  ): GrapeIdentificationResult {
    const varieties = this.findGrapesByPattern(wineName, description);

    return {
      grapeVarieties: varieties,
      confidence: varieties.length > 0 ? 60 : 10,
      reasoning: "Pattern matching fallback (AI unavailable)",
      isBlend: varieties.length > 1 || this.isKnownBlendStyle(wineName),
      primaryGrape: varieties.length > 0 ? varieties[0] : undefined,
    };
  }

  /**
   * Batch identify grape varieties for multiple wines
   * Uses conservative rate limiting and smart batching
   */
  async identifyBatch(
    wines: Array<{
      name: string;
      description?: string;
      producer?: string;
      region?: string;
    }>
  ): Promise<GrapeIdentificationResult[]> {
    const results: GrapeIdentificationResult[] = [];
    let aiCallsUsed = 0;
    const maxAiCalls = 5; // Conservative limit to avoid rate limiting

    console.log(`🍇 Starting batch identification for ${wines.length} wines`);

    for (let i = 0; i < wines.length; i++) {
      const wine = wines[i];

      try {
        // First try pattern matching
        const patternResult = this.fallbackIdentification(
          wine.name,
          wine.description
        );

        // Use AI only if pattern matching has low confidence and we haven't hit the limit
        if (patternResult.confidence < 70 && aiCallsUsed < maxAiCalls) {
          console.log(
            `🤖 Using AI for wine ${i + 1}/${wines.length}: ${wine.name}`
          );

          const result = await this.identifyGrapeVarieties(
            wine.name,
            wine.description,
            wine.producer,
            wine.region
          );
          results.push(result);
          aiCallsUsed++;

          // Progressive delay to avoid rate limiting
          const delay = Math.min(2000, 500 + aiCallsUsed * 200);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          // Use pattern matching result
          console.log(
            `📋 Using pattern matching for wine ${i + 1}/${wines.length}: ${
              wine.name
            }`
          );
          results.push({
            ...patternResult,
            reasoning: `Pattern matching (batch mode, AI calls: ${aiCallsUsed}/${maxAiCalls})`,
          });
        }
      } catch (error) {
        console.error(`Failed to identify grapes for ${wine.name}:`, error);
        results.push(this.fallbackIdentification(wine.name, wine.description));
      }
    }

    console.log(
      `🍇 Batch complete: ${results.length} wines processed, ${aiCallsUsed} AI calls used`
    );
    return results;
  }
}
