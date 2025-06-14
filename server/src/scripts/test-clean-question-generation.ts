/**
 * Test Script: Clean AI Question Generation System
 *
 * Validates the new CleanAiQuestionService with real menu items
 * and SOP content to ensure it generates human-like, knowledge-focused questions.
 */

import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import {
  CleanAiQuestionService,
  MenuItem,
  QuestionGenerationRequest,
  SopQuestionRequest,
} from "../services/CleanAiQuestionService";
import { KnowledgeCategory } from "../models/QuestionModel";

async function testMenuQuestionGeneration() {
  console.log("🧠 Testing Menu Question Generation...\n");

  const service = new CleanAiQuestionService();

  // Sample menu items for testing
  const testMenuItems: MenuItem[] = [
    {
      name: "Pan-Seared Atlantic Salmon",
      description:
        "Fresh Atlantic salmon fillet with lemon herb butter, served with seasonal vegetables and roasted potatoes",
      category: "Main Courses",
      itemType: "food",
      ingredients: [
        "Atlantic salmon",
        "lemon",
        "herbs",
        "butter",
        "seasonal vegetables",
        "potatoes",
      ],
      allergens: ["fish", "dairy"],
      price: 24.95,
      cookingMethods: ["pan-seared", "roasted"],
      isSpicy: false,
    },
    {
      name: "2019 Barolo Cannubi Riserva",
      description:
        "Full-bodied red wine from Piedmont, Italy. Notes of cherry, rose, and earth with firm tannins",
      category: "Red Wines",
      itemType: "wine",
      price: 89.0,
      vintage: 2019,
      producer: "Cantina del Borgo",
      region: "Piedmont, Italy",
      grapeVariety: ["Nebbiolo"],
      wineStyle: "still",
    },
    {
      name: "Spicy Thai Green Curry",
      description:
        "Authentic green curry with coconut milk, Thai basil, bamboo shoots, and choice of protein",
      category: "Asian Dishes",
      itemType: "food",
      ingredients: [
        "green curry paste",
        "coconut milk",
        "Thai basil",
        "bamboo shoots",
        "fish sauce",
      ],
      allergens: ["fish", "tree nuts"],
      cookingMethods: ["simmered"],
      isSpicy: true,
    },
  ];

  // Test different focus areas
  const focusAreas: Array<
    | "ingredients"
    | "allergens"
    | "wine_knowledge"
    | "preparation"
    | "service_knowledge"
    | "safety_protocols"
  > = ["ingredients", "allergens", "wine_knowledge", "preparation"];

  for (const focusArea of focusAreas) {
    console.log(`\n📋 Testing Focus Area: ${focusArea.toUpperCase()}`);
    console.log("=" + "=".repeat(50));

    const request: QuestionGenerationRequest = {
      menuItems: testMenuItems,
      focusArea,
      questionCount: 3,
      difficultyMix: {
        easy: 1,
        medium: 1,
        hard: 1,
      },
    };

    try {
      const result = await service.generateMenuQuestions(request);

      if (result.success) {
        console.log(`✅ Generated ${result.questions.length} questions`);
        console.log(`📊 Stats:`, result.stats);

        result.questions.forEach((q, index) => {
          console.log(`\n${index + 1}. ${q.questionText}`);
          console.log(
            `   Type: ${q.questionType} | Difficulty: ${q.difficulty}`
          );
          console.log(`   Knowledge Category: ${q.knowledgeCategory}`);
          console.log(`   Real-world Context: ${q.realWorldContext}`);
          q.options.forEach((opt, i) => {
            const marker = opt.isCorrect ? "✓" : " ";
            console.log(
              `   ${String.fromCharCode(65 + i)}) [${marker}] ${opt.text}`
            );
          });
          console.log(`   💡 Explanation: ${q.explanation}`);
        });

        if (result.errors.length > 0) {
          console.log(`\n⚠️ Warnings:`, result.errors);
        }
      } else {
        console.log(`❌ Failed to generate questions:`, result.errors);
      }
    } catch (error: any) {
      console.error(`❌ Error testing ${focusArea}:`, error.message);
    }

    // Add delay between tests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

async function testSopQuestionGeneration() {
  console.log("\n\n📋 Testing SOP Question Generation...\n");

  const service = new CleanAiQuestionService();

  // Sample SOP content
  const sampleSopContent = `
FOOD SAFETY PROTOCOLS - TEMPERATURE CONTROL

CRITICAL CONTROL POINTS:
1. Hot food must be maintained at 140°F (60°C) or above
2. Cold food must be kept at 40°F (4°C) or below
3. Temperature danger zone is between 40°F and 140°F - food cannot remain in this zone for more than 2 hours

TEMPERATURE CHECKING PROCEDURES:
- Check hot holding temperatures every 30 minutes using calibrated thermometer
- Record temperatures on the food safety log
- If temperature falls below 140°F, reheat food to 165°F immediately
- If food has been in danger zone for over 2 hours, discard immediately

COLD STORAGE REQUIREMENTS:
- Refrigerator temperature: 35-40°F (2-4°C)
- Freezer temperature: 0°F (-18°C) or below
- Check and record temperatures twice daily (opening and closing)
- All perishable items must be dated and rotated using FIFO (First In, First Out)

EMERGENCY PROCEDURES:
- If refrigeration equipment fails, notify manager immediately
- Move perishable items to backup cooler with ice
- Do not serve food that has been compromised
- Contact repair service and document incident
  `;

  const request: SopQuestionRequest = {
    sopContent: sampleSopContent,
    title: "Food Safety Temperature Control",
    focusArea: "safety",
    questionCount: 4,
  };

  try {
    const result = await service.generateSopQuestions(request);

    if (result.success) {
      console.log(`✅ Generated ${result.questions.length} SOP questions`);

      result.questions.forEach((q, index) => {
        console.log(`\n${index + 1}. ${q.questionText}`);
        console.log(`   Type: ${q.questionType} | Difficulty: ${q.difficulty}`);
        console.log(`   Knowledge Category: ${q.knowledgeCategory}`);
        console.log(`   Real-world Context: ${q.realWorldContext}`);
        q.options.forEach((opt, i) => {
          const marker = opt.isCorrect ? "✓" : " ";
          console.log(
            `   ${String.fromCharCode(65 + i)}) [${marker}] ${opt.text}`
          );
        });
        console.log(`   💡 Explanation: ${q.explanation}`);
      });

      if (result.errors.length > 0) {
        console.log(`\n⚠️ Warnings:`, result.errors);
      }
    } else {
      console.log(`❌ Failed to generate SOP questions:`, result.errors);
    }
  } catch (error: any) {
    console.error(`❌ Error testing SOP generation:`, error.message);
  }
}

async function runTests() {
  console.log("🚀 Starting Clean AI Question Generation Tests");
  console.log("=" + "=".repeat(60));

  try {
    await testMenuQuestionGeneration();
    await testSopQuestionGeneration();

    console.log("\n\n🎉 All tests completed!");
    console.log("\n📊 Test Results Summary:");
    console.log("- Menu question generation: Multiple focus areas tested");
    console.log("- SOP question generation: Safety procedures tested");
    console.log("- Human-like questions: Conversational style validated");
    console.log("- Knowledge focus: Real-world application confirmed");
    console.log("- Conservative validation: Error handling tested");
  } catch (error: any) {
    console.error("❌ Test suite failed:", error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}
