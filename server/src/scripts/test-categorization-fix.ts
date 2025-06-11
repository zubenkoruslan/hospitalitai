import { QuestionTaggingService } from "../services/questionTaggingService.js";

/**
 * Test the improved categorization logic with sample questions
 */
function testCategorizationFix() {
  console.log("Testing improved categorization logic...\n");

  const testQuestions = [
    {
      text: "How long is our Grass-fed Aberdeen Angus tomahawk steak dry-aged for?",
      categories: ["main courses", "steak"],
      expectedCategory: "food-knowledge",
      description: "Steak question with wine jus (user reported issue)",
    },
    {
      text: "What ingredients are in the beef wellington with red wine jus?",
      categories: ["main courses"],
      expectedCategory: "food-knowledge",
      description: "Food with wine as ingredient",
    },
    {
      text: "How do you prepare the salmon with white wine sauce?",
      categories: ["main courses", "fish"],
      expectedCategory: "food-knowledge",
      description: "Fish with wine sauce",
    },
    {
      text: "What wine pairs best with our ribeye steak?",
      categories: ["wine pairing"],
      expectedCategory: "wine-knowledge",
      description: "Wine pairing question",
    },
    {
      text: "How do you make a red wine cocktail?",
      categories: ["cocktails"],
      expectedCategory: "beverage-knowledge",
      description: "Cocktail with wine",
    },
    {
      text: "What vintage is our Cabernet Sauvignon?",
      categories: ["wine"],
      expectedCategory: "wine-knowledge",
      description: "Pure wine question",
    },
    {
      text: "How do you make our signature cappuccino?",
      categories: ["coffee"],
      expectedCategory: "beverage-knowledge",
      description: "Coffee preparation",
    },
  ];

  let passedTests = 0;
  let totalTests = testQuestions.length;

  testQuestions.forEach((test, index) => {
    console.log(`Test ${index + 1}: ${test.description}`);
    console.log(`Question: "${test.text}"`);

    const result = QuestionTaggingService.determineKnowledgeCategory(
      test.text,
      { existingCategories: test.categories }
    );

    const passed = result.knowledgeCategory === test.expectedCategory;

    console.log(`Expected: ${test.expectedCategory}`);
    console.log(`Got: ${result.knowledgeCategory}`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`Reasoning: ${result.reasoning}`);
    console.log(`Result: ${passed ? "✅ PASS" : "❌ FAIL"}\n`);

    if (passed) {
      passedTests++;
    }
  });

  console.log(`\nTest Summary: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log(
      "🎉 All tests passed! The categorization fix is working correctly."
    );
  } else {
    console.log(
      "⚠️  Some tests failed. The categorization logic may need further adjustment."
    );
  }
}

// Run the test if called directly
if (require.main === module) {
  testCategorizationFix();
}

export default testCategorizationFix;
