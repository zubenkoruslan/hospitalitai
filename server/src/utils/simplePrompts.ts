// Simple, Human-Like Prompt Templates
// No complex JSON structures or over-engineering

export const SIMPLE_SYSTEM_PROMPTS = {
  MENU_TRAINING: `You are an experienced restaurant manager training new staff members. 

Create quiz questions that sound natural and conversational - like how you would actually quiz a new server on their first day.

GOOD QUESTION EXAMPLES:
• "What's the main protein in our Grilled Atlantic Salmon?"
• "Which allergen should you warn customers about in the Caesar Salad?"  
• "What wine region is our house Chianti from?"
• "How is the duck breast prepared in our Confit Duck?"
• "What temperature should our Pinot Noir be served at?"

RULES:
- Sound conversational and natural
- Be specific about "our" menu items
- Focus on practical knowledge servers need
- Avoid robotic or formulaic language
- Create realistic but clearly wrong answer options
- One question per menu item unless specified otherwise

QUESTION TYPES - FOLLOW EXACTLY:
- Multiple choice: Use "multiple-choice-single" with exactly 4 options, 1 correct
- True/false: Use "true-false" with exactly 2 options (True/False), 1 correct

CRITICAL: Match question type to option count exactly:
- "multiple-choice-single" = 4 options
- "true-false" = 2 options only

Always return valid JSON array format.`,

  SOP_TRAINING: `You are a restaurant trainer teaching staff about procedures and protocols.

Create quiz questions about important operational knowledge that staff need to know.

FOCUS AREAS:
- Safety procedures and protocols
- Customer service standards  
- Food handling requirements
- Emergency procedures
- Daily operational tasks

Make questions practical and actionable - test knowledge they'll actually use on the job.
Sound conversational and natural, like a manager would ask.

Always return valid JSON array format.`,
};

export const buildMenuPrompt = (
  menuItems: any[],
  questionCount: number,
  focusArea: string
): string => {
  let focusInstruction = "";
  switch (focusArea) {
    case "ingredients":
      focusInstruction =
        "Focus on ingredients, main components, and what goes into each dish.";
      break;
    case "allergens":
      focusInstruction =
        "Focus on allergens and dietary restrictions customers need to know about.";
      break;
    case "wine":
      focusInstruction =
        "Focus on wine knowledge - grapes, regions, vintages, and food pairings.";
      break;
    case "preparation":
      focusInstruction =
        "Focus on how dishes are prepared, cooking methods, and techniques.";
      break;
    default:
      focusInstruction = "Focus on general knowledge about these menu items.";
  }

  const menuItemsText = menuItems
    .map((item) => {
      let itemText = `• ${item.name}: ${item.description}`;
      if (item.ingredients && item.ingredients.length > 0) {
        itemText += `\n  Ingredients: ${item.ingredients.join(", ")}`;
      }
      if (item.allergens && item.allergens.length > 0) {
        itemText += `\n  Allergens: ${item.allergens.join(", ")}`;
      }
      if (item.grape) itemText += `\n  Grape: ${item.grape}`;
      if (item.region) itemText += `\n  Region: ${item.region}`;
      if (item.vintage) itemText += `\n  Vintage: ${item.vintage}`;
      if (item.producer) itemText += `\n  Producer: ${item.producer}`;
      return itemText;
    })
    .join("\n\n");

  return `${focusInstruction}

Here are our menu items:

${menuItemsText}

Create ${questionCount} conversational quiz questions about these items.
Make them sound natural - like how a manager would quiz their team.

Return your response as a JSON array with this exact format:

MULTIPLE CHOICE EXAMPLE (4 options exactly):
{
  "questionText": "What's the main protein in our Grilled Salmon?",
  "questionType": "multiple-choice-single",
  "options": [
    {"text": "Salmon", "isCorrect": true},
    {"text": "Tuna", "isCorrect": false},
    {"text": "Cod", "isCorrect": false},
    {"text": "Halibut", "isCorrect": false}
  ],
  "explanation": "The dish name clearly indicates salmon as the main protein."
}

TRUE/FALSE EXAMPLE (2 options exactly):
{
  "questionText": "Our Caesar Salad contains raw eggs in the dressing.",
  "questionType": "true-false",
  "options": [
    {"text": "True", "isCorrect": true},
    {"text": "False", "isCorrect": false}
  ],
  "explanation": "Traditional Caesar dressing includes raw eggs."
}`;
};

export const buildSopPrompt = (
  sopContent: string,
  questionCount: number
): string => {
  return `Based on this Standard Operating Procedure content:

---
${sopContent}
---

Create ${questionCount} practical quiz questions that test important operational knowledge.

Focus on:
- Key procedures staff must follow
- Safety requirements and protocols
- Important timeframes or measurements
- When to escalate issues
- Customer service standards

Make questions practical and actionable - like a manager would ask their team.

QUESTION TYPES - FOLLOW EXACTLY:
- Multiple choice: Use "multiple-choice-single" with exactly 4 options
- True/false: Use "true-false" with exactly 2 options (True/False)

Return as JSON array with this exact format:

MULTIPLE CHOICE EXAMPLE (4 options):
{
  "questionText": "What's the first step when handling a customer complaint?",
  "questionType": "multiple-choice-single",
  "options": [
    {"text": "Listen carefully and take notes", "isCorrect": true},
    {"text": "Immediately offer a discount", "isCorrect": false},
    {"text": "Call the manager right away", "isCorrect": false},
    {"text": "Explain why they're wrong", "isCorrect": false}
  ],
  "explanation": "Active listening is the foundation of good customer service recovery."
}

TRUE/FALSE EXAMPLE (2 options):
{
  "questionText": "Emergency exits must be checked every shift.",
  "questionType": "true-false",
  "options": [
    {"text": "True", "isCorrect": true},
    {"text": "False", "isCorrect": false}
  ],
  "explanation": "Safety protocols require checking emergency exits during each shift."
}`;
};
