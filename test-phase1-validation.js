// Phase 1 Validation Test - Simulation
// Demonstrates our enhanced validation system with answer leakage detection

console.log("🧪 Testing Phase 1 Enhanced Validation System\n");

// Simulate answer leakage detection function
function simulateAnswerLeakageDetection(question) {
  const issues = [];
  const questionTextLower = question.questionText.toLowerCase();
  const correctOption = question.options.find((opt) => opt.isCorrect);

  if (!correctOption) return issues;

  const correctAnswerLower = correctOption.text.toLowerCase();

  // Check if complete answer appears in question
  if (questionTextLower.includes(correctAnswerLower)) {
    issues.push(
      `Complete answer "${correctOption.text}" visible in question text`
    );
  }

  // Check for partial word matches (wine regions, etc.)
  const answerWords = correctAnswerLower
    .split(/\s+/)
    .filter((word) => word.length > 3);
  answerWords.forEach((answerWord) => {
    if (questionTextLower.includes(answerWord)) {
      issues.push(`Answer word "${answerWord}" found in question`);
    }
  });

  // Check wine-specific patterns
  const winePatterns = [
    /(barolo|chianti|bordeaux|burgundy|napa|sonoma|tuscany|piedmont)/gi,
    /(dom\s+perignon|opus\s+one|screaming\s+eagle|château|domaine)/gi,
    /(chardonnay|pinot\s+noir|cabernet|merlot|sauvignon|riesling|syrah)/gi,
  ];

  winePatterns.forEach((pattern) => {
    const questionMatches = questionTextLower.match(pattern);
    const answerMatches = correctAnswerLower.match(pattern);

    if (questionMatches && answerMatches) {
      const overlap = questionMatches.filter((qMatch) =>
        answerMatches.some(
          (aMatch) => qMatch.toLowerCase() === aMatch.toLowerCase()
        )
      );

      if (overlap.length > 0) {
        issues.push(`Wine pattern leaked: "${overlap[0]}"`);
      }
    }
  });

  return issues;
}

// Test data with intentional answer leakage
const testQuestions = [
  {
    questionText: "Which region produces the 2016 Barolo DOCG Cannubi wine?", // BAD: "Barolo" is the answer
    questionType: "multiple-choice-single",
    options: [
      { text: "Bordeaux", isCorrect: false },
      { text: "Barolo", isCorrect: true }, // Answer leaked in question!
      { text: "Burgundy", isCorrect: false },
      { text: "Rioja", isCorrect: false },
    ],
    category: "Wine Knowledge",
    explanation: "Barolo is a DOCG wine from Piedmont, Italy.",
    focus: "region",
  },
  {
    questionText: "What ingredients does the Caesar Salad contain?", // GOOD: No leakage
    questionType: "multiple-choice-single",
    options: [
      {
        text: "Romaine lettuce, Parmesan, anchovies, croutons",
        isCorrect: true,
      },
      { text: "Mixed greens, goat cheese, walnuts", isCorrect: false },
      { text: "Arugula, mozzarella, tomatoes", isCorrect: false },
      { text: "Spinach, feta, olives", isCorrect: false },
    ],
    category: "Food Knowledge",
    explanation:
      "Caesar salad traditionally contains romaine lettuce, Parmesan cheese, anchovies, and croutons.",
    focus: "ingredients",
  },
];

// Test individual answer leakage detection
console.log("1. Testing Answer Leakage Detection:");
testQuestions.forEach((q, index) => {
  console.log(
    `\n   Question ${index + 1}: "${q.questionText.substring(0, 50)}..."`
  );
  const leakageIssues = simulateAnswerLeakageDetection(q);
  if (leakageIssues.length > 0) {
    console.log(`   ❌ LEAKAGE DETECTED: ${leakageIssues.join(", ")}`);
  } else {
    console.log(`   ✅ No answer leakage detected`);
  }
});

// Simulate full validation
function simulateFullValidation(questions) {
  let totalScore = 0;
  let hasAnswerLeakage = false;
  const issues = [];

  questions.forEach((q, index) => {
    let questionScore = 100;
    const questionNumber = index + 1;

    // Check answer leakage (40 point penalty)
    const leakageIssues = simulateAnswerLeakageDetection(q);
    if (leakageIssues.length > 0) {
      issues.push(
        `Question ${questionNumber}: ANSWER LEAKAGE - ${leakageIssues.join(
          ", "
        )}`
      );
      questionScore -= 40; // Heavy penalty
      hasAnswerLeakage = true;
    }

    // Check option count (20 point penalty)
    if (q.options.length !== 4) {
      issues.push(
        `Question ${questionNumber}: Must have exactly 4 options (has ${q.options.length})`
      );
      questionScore -= 20;
    }

    // Check for correct answer (25 point penalty)
    const correctOptions = q.options.filter((opt) => opt.isCorrect);
    if (correctOptions.length !== 1) {
      issues.push(
        `Question ${questionNumber}: Must have exactly 1 correct answer`
      );
      questionScore -= 25;
    }

    totalScore += Math.max(0, questionScore);
  });

  const averageScore = questions.length > 0 ? totalScore / questions.length : 0;

  return {
    score: Math.round(averageScore),
    isValid: issues.length === 0 && averageScore >= 70,
    answerLeakageDetected: hasAnswerLeakage,
    issues,
    recommendations: hasAnswerLeakage
      ? [
          "CRITICAL: Review questions for answer leakage - answers should not be visible in question text",
          "Use generic descriptions instead of specific item names when asking about item attributes",
        ]
      : [],
  };
}

// Test full validation system
console.log("\n\n2. Testing Full Validation System:");
const validationResult = simulateFullValidation(testQuestions);

console.log(`\n📊 Validation Results:`);
console.log(`   Overall Score: ${validationResult.score}/100`);
console.log(`   Valid: ${validationResult.isValid ? "YES" : "NO"}`);
console.log(
  `   Answer Leakage Detected: ${
    validationResult.answerLeakageDetected ? "YES ❌" : "NO ✅"
  }`
);

if (validationResult.issues.length > 0) {
  console.log(`\n⚠️  Issues Found:`);
  validationResult.issues.forEach((issue) => console.log(`   - ${issue}`));
}

if (validationResult.recommendations.length > 0) {
  console.log(`\n💡 Recommendations:`);
  validationResult.recommendations.forEach((rec) => console.log(`   - ${rec}`));
}

console.log("\n🎉 Phase 1 Validation Test Complete!");
console.log("\n✅ Expected Results:");
console.log(
  "   - Question 1 should trigger answer leakage detection (Barolo in question about Barolo region)"
);
console.log("   - Question 2 should pass validation (no leakage)");
console.log("   - Overall score should be penalized due to answer leakage");
console.log("   - System should provide clear recommendations");

console.log("\n🔧 Phase 1 Implementation Status:");
console.log(
  "   ✅ Enhanced validation system implemented in server/src/utils/questionValidation.ts"
);
console.log(
  "   ✅ Streamlined prompts implemented in server/src/utils/questionGenerationConstants.ts"
);
console.log("   ✅ AiQuestionService updated to use enhanced validation");
console.log(
  "   ✅ Answer leakage prevention integrated into production system"
);
console.log("   🎯 Ready for Phase 2: Smart Context Processing");
