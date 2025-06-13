import dotenv from "dotenv";
import path from "path";

// Configure environment
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { GrapeVarietyIdentifierService } from "../services/GrapeVarietyIdentifierService";

async function testGrapeIdentifier() {
  console.log("🍇 Testing Grape Variety Identifier Service");
  console.log("===========================================");

  const identifier = new GrapeVarietyIdentifierService();

  // Test cases with various wine types
  const testWines = [
    {
      name: "LINI 910, LAMBRUSCA ROSATO",
      producer: "LINI",
      region: "Emilia-Romagna, Italy",
      description: "Salamino, Ancellotta",
    },
    {
      name: "PROSECCO SUPERIORE TREVISIOL",
      producer: "TREVISIOL",
      region: "Valdobbiadene, Italy",
      description: "100% Glera",
    },
    {
      name: "BAROLO RISERVA",
      producer: "Giuseppe Mascarello",
      region: "Piedmont, Italy",
    },
    {
      name: "Chardonnay Reserve",
      producer: "Kendall-Jackson",
      region: "California, USA",
    },
    {
      name: "Côtes du Rhône",
      producer: "Domaine de la Janasse",
      region: "Rhône Valley, France",
    },
    {
      name: "Bordeaux Blend",
      producer: "Château Margaux",
      region: "Bordeaux, France",
    },
    {
      name: "Dom Pérignon Champagne",
      producer: "Moët & Chandon",
      region: "Champagne, France",
    },
  ];

  console.log(`🧪 Testing ${testWines.length} wine samples\n`);

  for (const [index, wine] of testWines.entries()) {
    try {
      console.log(`${index + 1}. Testing: ${wine.name}`);
      console.log(`   Producer: ${wine.producer}`);
      console.log(`   Region: ${wine.region}`);
      if (wine.description) console.log(`   Description: ${wine.description}`);

      const result = await identifier.identifyGrapeVarieties(
        wine.name,
        wine.description,
        wine.producer,
        wine.region
      );

      console.log(`   🎯 Results:`);
      console.log(
        `   ├─ Grape Varieties: ${
          result.grapeVarieties.join(", ") || "None identified"
        }`
      );
      console.log(`   ├─ Confidence: ${result.confidence}%`);
      console.log(`   ├─ Is Blend: ${result.isBlend ? "Yes" : "No"}`);
      if (result.primaryGrape)
        console.log(`   ├─ Primary Grape: ${result.primaryGrape}`);
      console.log(`   └─ Reasoning: ${result.reasoning}`);
      console.log();

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      console.log();
    }
  }

  // Test batch processing
  console.log("🔄 Testing batch processing...");
  try {
    const batchResults = await identifier.identifyBatch(testWines.slice(0, 3));

    console.log(
      `✅ Batch processing completed for ${batchResults.length} wines:`
    );
    batchResults.forEach((result, index) => {
      console.log(
        `   ${index + 1}. ${testWines[index].name}: ${
          result.grapeVarieties.join(", ") || "None"
        } (${result.confidence}%)`
      );
    });
  } catch (error: any) {
    console.error(`❌ Batch processing failed: ${error.message}`);
  }

  console.log("\n🎯 Grape variety identification test completed!");
}

// Run test
testGrapeIdentifier()
  .then(() => {
    console.log("\n✅ All tests completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Test failed:", error);
    process.exit(1);
  });
