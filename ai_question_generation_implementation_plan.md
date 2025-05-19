# AI-Powered Question Generation: Implementation Plan

This document outlines the steps and considerations for implementing the AI-powered question generation feature for Question Banks.

## I. Core User Stories

1.  As a restaurant manager/admin, I want to select a menu, specific categories within that menu, and specific items to generate AI questions for.
2.  As a restaurant manager/admin, I want to specify what aspects of the menu items the AI questions should focus on (e.g., Name, Ingredients, Dietary Information, Description).
3.  As a restaurant manager/admin, I want to specify the number of questions to generate and their desired types (e.g., multiple-choice, true/false) and difficulty.
4.  As a restaurant manager/admin, I want to review AI-generated questions before they are added to a question bank.
5.  As a restaurant manager/admin, I want to edit or delete any AI-generated question during the review process.
6.  As a restaurant manager/admin, I want to accept reviewed questions to be permanently added to the question bank.
7.  As a restaurant manager/admin, I want to be able to save a batch of generated questions for later review.

## II. Backend Implementation

### 1. Update Models

- **`QuestionModel.ts` (`server/src/models/QuestionModel.ts`)**
  - [x] Add `status: string` field with enum `['active', 'pending_review', 'rejected']` (default: `'active'`).
  - [x] Add `createdBy: string` field with enum `['manual', 'ai']` (required).
  - [x] Add `explanation?: string` field for optional answer explanations from AI or user.
  - [x] Add `restaurantId: Types.ObjectId` (if not already universally present and enforced for all questions).
  - [x] Add index for `status` and `restaurantId`.
- **`QuestionBankModel.ts` (`server/src/models/QuestionBankModel.ts`)**
  - [x] Add/Ensure instance method `updateQuestionCountAndCategories()`: To be called after questions array is modified. This method should recalculate `questionCount` (based on active/linked questions) and aggregate `categories` from linked questions. (Method implemented, controller calls it).
- **`MenuModel.ts` (`server/src/models/MenuModel.ts`)**
  - [x] Created with necessary fields (name, description, restaurantId, items (ref MenuItem), categories, isActive).
- **`MenuItemModel.ts` (`server/src/models/MenuItemModel.ts`)**
  - [x] Created with necessary fields (name, description, menuId, restaurantId, category, price, ingredients, allergens, dietaryRestrictions, itemType, isActive, etc.).

### 2. AI Question Service (`AiQuestionService.ts` - new file in `server/src/services/`)

- [x] Create `AiQuestionService.ts`.
- [x] **`generateRawQuestionsFromMenuContent` method:**

  - **Input:** `{ menuId: string, itemIds?: string[], categories: string[], questionFocusAreas: string[], targetQuestionCount: number, questionTypes: string[], difficulty: string, additionalContext?: string, restaurantId: string }` (Defined via interface)
  - **Logic:**
    - [x] Fetch `MenuDocument` and relevant `MenuItemDocument`s based on `menuId` and `categories` (and potentially `itemIds`). (Implemented using actual Mongoose models).
    - [x] Distribute `targetQuestionCount` evenly among selected `questionFocusAreas` and categories. (Refined logic implemented)
    - [x] For each item and each selected `questionFocusArea`:
      - [x] Construct a detailed prompt for the LLM (see "Prompt Engineering" section below). (Refined logic implemented)
      - [x] Include menu item details: name, description, ingredients, allergens. (Incorporated into prompt payload)
      - [x] Call the external LLM API (Implemented `callActualLlmApi` function using `fetch` and env vars `LLM_API_ENDPOINT` & `GEMINI_API_KEY`; user to adjust response parsing for their specific LLM).
      - [x] Parse the LLM JSON response. (Basic parsing structure exists, relies on LLM output format)
      - [x] Perform basic validation on the structure of the AI's output. (Basic filter exists)
  - **Output:** Array of raw AI-generated question objects (matching the expected structure from the LLM but not yet `IQuestion` documents). (Defined by return type)

- [x] **`saveGeneratedQuestionsAsPendingReview` method:**
  - **Input:** `rawQuestions: AiGeneratedQuestion[], restaurantId: string, (optional) targetBankId?: string` (Defined via interface)
  - **Logic:**
    - [x] For each raw question:
      - [x] Transform into `IQuestion` format. (Implemented, including type casting and field mapping)
      - [x] Set `status: 'pending_review'`. (Implemented)
      - [x] Set `createdBy: 'ai'`. (Implemented)
      - [x] Set `restaurantId`. (Implemented, with ObjectId conversion)
      - [x] Save to `QuestionModel`. (Implemented with error handling)
      - [ ] If `targetBankId` is provided, consider a temporary link or note for grouping, but don't add to the bank's main `questions` array yet. (Not implemented - marked as optional/future)
  - **Output:** Array of newly saved `IQuestion` documents (with `_id`s and `pending_review` status). (Defined by return type)

### 3. API Endpoints (`server/src/routes/`)

- [x] **Generation Request Endpoint (`aiRoutes.ts` - new file or add to `questionBankRoutes.ts`):** (Created `aiRoutes.ts`, `aiController.ts`, and mounted in `server.ts`. Dependencies like `AppError` and auth middleware are placeholders.)

  - [x] `POST /api/ai/generate-questions` (or similar) (Defined)
  - [x] **Request Body:** Matches input for `AiQuestionService.generateRawQuestionsFromMenuContent`. (Defined in controller)
  - [x] **Controller Logic (`aiController.ts` or `questionBankController.ts`):** (Implemented in `aiController.ts`)
    - [x] Validate request body. (Basic validation added)
    - [x] Call `AiQuestionService.generateRawQuestionsFromMenuContent`. (Called)
    - [x] Call `AiQuestionService.saveGeneratedQuestionsAsPendingReview`. (Called)
    - [x] Respond with the array of saved "pending_review" questions (or just their IDs and a success message). (Implemented)
  - [x] Ensure authentication and authorization (only restaurant admins/managers). (Placeholder middleware added)

- [x] **Fetch Pending Questions Endpoint:** (Implemented in `questionController.ts` and `questionRoutes.ts`)

  - [x] `GET /api/questions/pending-review?restaurantId=xxx(&bankId=yyy)` (in `questionRoutes.ts`) (Implemented as `GET /api/questions/pending-review`, `restaurantId` from auth, `bankId` query optional but not primary focus)
  - [x] Controller fetches questions with `status: 'pending_review'` for the given `restaurantId` (and optionally `bankId` if a temporary link was made). (Implemented for `restaurantId` and `status: 'pending_review'`, `createdBy: 'ai'`)

- [x] **Review and Acceptance Endpoint (`questionBankRoutes.ts`):**
  - [x] `POST /api/question-banks/:bankId/process-reviewed-questions` (Defined)
  - [x] **Request Body:** `{ acceptedQuestions: IQuestion[], updatedQuestions: IQuestion[], deletedQuestionIds: string[] }` (Handled by controller)
  - [x] **Controller Logic (`questionBankController.ts`):** (Implemented - handler `processReviewedAiQuestionsHandler` is in place)
    - [x] Iterate through `acceptedQuestions`:
      - [x] If it has an `_id` and was `pending_review`, update it (including `status: 'active'`).
      - [x] If it's new (no `_id`), create it with `status: 'active'`, `createdBy: 'ai'`.
      - [x] Add its `_id` to `QuestionBankModel.questions` array for the given `:bankId`.
    - [x] Iterate through `updatedQuestions`:
      - [x] Find by `_id`, update content and set `status: 'active'`.
      - [x] Ensure its `_id` is in the `QuestionBankModel.questions` array.
    - [x] Iterate through `deletedQuestionIds`:
      - [x] Either delete from `QuestionModel` or update `status: 'rejected'`. (Implemented as update to 'rejected')
    - [x] Save changes to `QuestionBankModel` (including updating its question list and counts/categories).
  - [x] Ensure authentication and authorization. (Handled by route-level middleware in `questionBankRoutes.ts`)

### 4. Prompt Engineering (within `AiQuestionService.ts`)

- [x] **System Prompt:** Define the AI's role (expert curriculum designer for restaurants, focusing on provided data). (Handled via `additionalInstructions` in prompt payload and general prompt structure; user can customize this text).
- [x] **User Prompt Template(s):** (Structure defined in `promptPayload` within `AiQuestionService.generateRawQuestionsFromMenuContent`)
  - [x] Structure to include: `menuName`, `categoryName`, `item: { name, description, ingredients, allergens }`, `questionFocus` (e.g., "Ingredients"), `desiredQuestionCount`, `questionTypes`, `difficulty`, `outputFormatInstructions`. (All included)
  - [x] **`outputFormatInstructions`:** Crucial. Specify the exact JSON structure expected: (Detailed in `promptPayload`)
    ```json
    {
      "questionText": "string",
      "questionType": "enum('multiple-choice-single', 'true-false', etc.)",
      "options": [{ "text": "string", "isCorrect": boolean }, ...],
      "category": "[Original Category Name]",
      "difficulty": "enum('easy', 'medium', 'hard')",
      "explanation": "Optional brief explanation for the correct answer."
    }
    ```
  - Tailor example questions in the prompt based on the `questionFocus`.

## III. Frontend Implementation

### 1. Update AI Generation Forms

- **`CreateQuestionBankForm.tsx` (`client/src/components/questionBank/`)**
  - [x] Add a multi-select checkbox group for "Question Focus Areas": Name, Ingredients, Dietary, Description. (Also added Difficulty selector and state for Question Types)
  - [x] Pass selected focus areas in the API call when AI generation is triggered. (Form now calls new `/api/ai/generate-questions` endpoint via `triggerAiQuestionGenerationProcess` service after bank creation, passing focus areas, difficulty, and types. Old AI params in `createQuestionBankFromMenu` are bypassed.)
- **`GenerateAiQuestionsForm.tsx` (`client/src/components/questionBank/`)**
  - [x] (If this form is kept separate) Add similar "Question Focus Areas" checkboxes. (Added focus areas, difficulty selection, and requires `menuId` prop now)
  - [x] Update to call the new `POST /api/ai/generate-questions` endpoint. (Updated to use `triggerAiQuestionGenerationProcess` service)
  - [x] On successful generation, transition user to the new "Review AI Questions" UI, passing the generated questions. (The `onAiQuestionsGenerated` prop receives pending questions. Parent component, like `QuestionBankDetailPage`, is responsible for initiating the review modal. `menuId` made optional to accommodate different contexts.)

### 2. AI Question Review UI (New Component/Modal)

- [x] **`AiQuestionReviewModal.tsx` (e.g., in `client/src/components/questionBank/`)**
  - [x] Props: `generatedQuestions: IQuestion[]` (with `status: 'pending_review'`), `targetBankId: string`, `onClose: () => void`, `onReviewComplete: () => void`. (Assumed props are correctly defined)
  - [x] State: Manage local copies of questions for editing. (Implemented with `editableQuestions` state)
  - [x] Display:
    - [x] List each question.
    - [x] Show current question text, options, correct answer, category, difficulty.
  - [x] Editing:
    - [x] Allow inline editing for text fields.
    - [x] Allow changing the correct option.
    - [x] Allow changing category/difficulty via dropdowns.
    - [x] Button to "Delete" a single question from the review batch. (Implemented, styling TBD)
  - [x] Actions:
    - [x] "Save & Add to Bank": Calls the `/api/question-banks/:bankId/process-reviewed-questions` endpoint with edited/accepted questions. (Implemented in `handleProcessBatch`)
    - [x] "Discard Batch": Closes modal, questions are not saved or processed (current cancel button behavior).
    - [x] "Save for Later" (Optional): Closes modal, questions remain `pending_review`. (Cancel button effectively does this as no changes are sent)

### 3. Update Question Bank Detail Page

- **`QuestionBankDetailPage.tsx` (`client/src/pages/`)**
  - [x] Add a distinct section, tab, or button to access/view "AI Questions Pending Review" associated with that bank. (Button added to fetch all pending for restaurant and review against current bank)
  - [x] Clicking this should launch the `AiQuestionReviewModal.tsx` pre-filled with those pending questions. (Implemented)
  - [x] Consider how "Quick Generate AI Questions" (which uses `GenerateAiQuestionsForm`) integrates with review. Currently adds directly. (Acknowledged as future enhancement: route its output to `AiQuestionReviewModal` as well).

### 4. API Service Calls (`client/src/services/api.ts`)

- [x] Add function to call `POST /api/ai/generate-questions`. (This was `triggerAiQuestionGenerationProcess`)
- [x] Add function to call `GET /api/questions/pending-review`. (This is `getPendingReviewQuestions` - needs to be added or confirmed)
- [x] Add function to call `POST /api/question-banks/:bankId/process-reviewed-questions`. (Added as `processReviewedAiQuestions`)

## IV. Workflow Summary

1.  User initiates AI question generation from either "Create Question Bank" form or "Generate AI Questions" form within an existing bank, selecting menu, categories, items (future), focus areas, count, etc.
2.  Frontend calls `POST /api/ai/generate-questions`.
3.  Backend `AiQuestionService` fetches menu data, crafts targeted prompts, calls LLM.
4.  LLM responds with JSON.
5.  `AiQuestionService` parses, validates, and saves these questions with `status: 'pending_review'` and `createdBy: 'ai'`.
6.  Backend responds to frontend with the list of pending questions (or success).
7.  Frontend displays these questions in the `AiQuestionReviewModal.tsx`.
8.  User reviews, edits, and/or deletes questions in the modal.
9.  User clicks "Save & Add to Bank."
10. Frontend calls `POST /api/question-banks/:bankId/process-reviewed-questions` with the reviewed batch.
11. Backend updates/creates questions with `status: 'active'`, links them to the question bank.
12. User sees the questions now part of the active question bank.

## V. Future Considerations (Post-MVP)

- More sophisticated question type generation (e.g., matching, fill-in-the-blanks).
- Allowing users to provide feedback on individual AI question quality to refine prompts over time.
- Generating question explanations automatically.
- Targeting specific menu items directly instead of just whole categories.
- Batch processing and background jobs for very large generation requests.
- Cost estimation/tracking for LLM API calls.

This plan provides a structured approach. Each task can be broken down further into sub-tasks.
