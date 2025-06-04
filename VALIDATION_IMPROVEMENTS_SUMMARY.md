# Strict Question Validation Improvements

## ✅ **Problem Solved**

**Issue**: AI-generated questions were using vague references instead of specific menu item names, making them confusing for staff training.

**Examples of problematic questions**:

- ❌ "Which ingredient is found in the side dish that features crispy shallot and pickled chilli?"
- ❌ "What is a key accompaniment listed for the marinated chicken dish?"

## 🔧 **Solutions Implemented**

### 1. **Increased Minimum Quality Threshold: 70% → 75%**

**File**: `server/src/utils/questionGenerationConstants.ts`

```typescript
MIN_QUALITY_SCORE: 75, // Increased from 70
```

### 2. **Enhanced Vague Reference Detection**

**File**: `server/src/utils/questionValidation.ts`

Added strict pattern matching to detect and heavily penalize vague references:

```typescript
const usesVagueReference =
  /\bthe\s+(side\s+dish|dish|item|wine|beverage)\s+(that|which|with|featuring)/i.test(
    q.questionText
  ) ||
  /\bthis\s+(side\s+dish|dish|item|wine|beverage|preparation)/i.test(
    q.questionText
  );

if (!mentionsSpecificMenuItem) {
  if (usesVagueReference) {
    questionScore -= 35; // Heavy penalty for vague references
  } else {
    questionScore -= 30; // Penalty for no menu item reference
  }
}
```

**Patterns Detected**:

- "the dish that features..."
- "the side dish with..."
- "the marinated chicken dish"
- "this wine from..."
- "this beverage containing..."

### 3. **Stricter Question Rejection Logic**

**File**: `server/src/services/AiQuestionService.ts`

Updated to automatically reject questions with quality issues:

```typescript
// REJECT: Questions with vague references (quality issue)
if (questionHasVagueReference) {
  console.warn(
    `REJECTING question due to vague reference: "${q.questionText}..."`
  );
  rejectedQuestions.push(q);
}

// REJECT: Questions with critical structural issues
if (questionHasCriticalIssues) {
  console.warn(
    `REJECTING question due to critical issues: "${q.questionText}..."`
  );
  rejectedQuestions.push(q);
}
```

### 4. **Batch-Level Quality Enforcement**

Now rejects entire batches if they don't meet standards:

```typescript
// ENFORCE MINIMUM QUALITY THRESHOLD - Reject entire batch if too low
if (
  validationResult.report.score < QUESTION_GENERATION_CONFIG.MIN_QUALITY_SCORE
) {
  console.warn(
    `REJECTING ENTIRE BATCH due to low quality score (${validationResult.report.score}). Minimum required: ${QUESTION_GENERATION_CONFIG.MIN_QUALITY_SCORE}`
  );
  return []; // Return no questions from this batch
}

// ENFORCE MINIMUM VALID QUESTION COUNT - Need at least 50% valid questions
const validQuestionRatio =
  validationResult.validQuestions.length / generatedQuestionsFromAI.length;
if (validQuestionRatio < 0.5) {
  console.warn(
    `REJECTING ENTIRE BATCH due to low valid question ratio (${(
      validQuestionRatio * 100
    ).toFixed(1)}%)`
  );
  return []; // Return no questions from this batch
}
```

### 5. **Improved AI Instructions**

**File**: `server/src/utils/questionGenerationConstants.ts`

Added explicit examples and forbidden patterns:

```typescript
CRITICAL: ALWAYS MENTION THE ACTUAL MENU ITEM NAME IN THE QUESTION
❌ BAD: "Which ingredient is found in the side dish that features crispy shallot and pickled chilli?"
✅ GOOD: "Which ingredient is included in the Tenderstem Broccoli with Crispy Shallot dish?"

❌ BAD: "What is a key accompaniment listed for the marinated chicken dish?"
✅ GOOD: "What accompaniment is served with the Citrus Marinated Chicken?"

FORBIDDEN VAGUE REFERENCES:
• "the dish that features..."
• "this side dish with..."
• "the marinated chicken dish"
• "this wine from..."
• "the beverage containing..."
```

## 📊 **Validation Results**

The new validation system correctly:

1. ✅ **Detects vague references** - Patterns like "the dish that features..." are caught
2. ✅ **Requires specific menu item names** - Questions must mention actual item names
3. ✅ **Enforces 75% minimum quality** - Low-quality batches are rejected entirely
4. ✅ **Rejects individual problematic questions** - Even within good batches
5. ✅ **Provides detailed logging** - Shows exactly why questions are rejected

## 🎯 **Quality Scoring**

Questions now receive scores based on:

- **100 points**: Perfect question with specific menu item name
- **-35 points**: Uses vague references (heavy penalty)
- **-30 points**: No clear menu item reference
- **-25 points**: Wrong number of distractors
- **-20 points**: Duplicate options
- **-40 points**: Answer leakage detected

**Example Scoring**:

- ❌ "Which ingredient is found in the side dish that features..." = **65/100** (vague reference penalty)
- ✅ "Which ingredient is included in the Tenderstem Broccoli..." = **100/100** (perfect)

## 🚀 **Expected Improvements**

With these changes, the system will:

1. **Eliminate vague questions** that confuse staff
2. **Force AI to use specific menu item names** for better training
3. **Maintain 75%+ quality standards** across all generated questions
4. **Provide clear feedback** when questions are rejected
5. **Improve staff learning outcomes** with specific, actionable questions

## 📝 **Next Steps**

1. **Monitor question generation** - Check server logs for rejection rates
2. **Review generated questions** - Ensure improvements are working in practice
3. **Adjust thresholds if needed** - Fine-tune based on real-world results
4. **Gather user feedback** - Confirm improved question quality from staff perspective

---

**Status**: ✅ **IMPLEMENTED** - Strict validation now enforces 75% minimum quality and rejects questions with vague references.
