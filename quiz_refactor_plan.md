# Quiz System Refactor Plan

## 1. Project Goals Recap

- Utilize question banks to create dynamic quizzes for staff.
- Restaurant user specifies the number of questions to be displayed per quiz attempt.
- Staff users receive random questions from the linked question bank(s) upon starting a quiz.
- Questions should not repeat for a staff member for a given quiz until all unique questions from the source bank(s) have been seen.
- Track overall quiz completion (per staff, per quiz) based on exhausting all unique questions from the source.
- Track daily completion progress (per staff, per quiz).
- Display overall quiz completion to the Restaurant user.

## 2. Core Model Changes & Additions

### 2.1. `Quiz` Model (Refactor `server/src/models/Quiz.ts`)

- [x] Modify `Quiz` schema:
  - [x] Keep `title: string`
  - [x] Keep `description?: string`
  - [x] Keep `restaurantId: Types.ObjectId` (ref: 'User')
  - [x] Keep `sourceQuestionBankIds: Types.ObjectId[]` (ref: 'QuestionBank')
  - [x] Rename `numberOfQuestions` to `numberOfQuestionsPerAttempt: number`
  - [x] Keep `isAvailable: boolean`
  - [x] Keep `isAssigned: boolean` (for admin lifecycle, if still desired)
  - [x] **REMOVE** `questions: MainIQuestion[]` (array of populated questions)
  - [x] **REMOVE** `menuItemIds?: Types.ObjectId[]` (if fully deprecated in favor of banks)
  - [x] Consider adding `totalUniqueQuestionsInSourceSnapshot: number` (optional, see discussion below).

### 2.2. `StaffQuizProgress` Model (New File: `server/src/models/StaffQuizProgress.ts`)

- [x] Create `StaffQuizProgressSchema`:
  - [x] `staffUserId: Types.ObjectId` (ref: 'User', indexed)
  - [x] `quizId: Types.ObjectId` (ref: 'Quiz', indexed) - Links to the Quiz _definition_
  - [x] `restaurantId: Types.ObjectId` (ref: 'User', indexed)
  - [x] `seenQuestionIds: Types.ObjectId[]` (ref: 'Question', default: [])
  - [x] `totalUniqueQuestionsInSource: number` (snapshot of unique questions from source bank(s) for this quiz)
  - [x] `isCompletedOverall: boolean` (default: `false`)
  - [x] `lastAttemptTimestamp?: Date`
  - [x] **RE-EVALUATE/REMOVE:** `questionsAnsweredToday: number` (default: 0)
  - [x] **RE-EVALUATE/REMOVE:** `lastActivityDateForDailyReset: Date`
  - [x] Add compound index on `staffUserId`, `quizId`.
- [x] Create `StaffQuizProgressModel`.

### 2.3. `QuizAttempt` Model (New or Refactor `server/src/models/QuizResult.ts`)

- [x] Decide if enhancing `QuizResult` or creating new `QuizAttempt`. **Decision: Created new `QuizAttempt.ts` model.**
- [x] Define schema:
  - [x] `staffUserId: Types.ObjectId` (ref: 'User')
  - [x] `quizId: Types.ObjectId` (ref: 'Quiz') - The Quiz _definition_
  - [x] `restaurantId: Types.ObjectId` (ref: 'User') // Consistent with other models
  - [x] `questionsPresented: [{ questionId: Types.ObjectId, answerGiven?: any, isCorrect?: boolean, sortOrder?: number }]` (Store actual questions and answers for this specific attempt)
  - [x] `score: number`
  - [x] `attemptDate: Date` (default: `Date.now`)
  - [x] `duration?: number` (time taken, optional) // Implemented as durationInSeconds

## 3. Backend Service Logic Refactor & Implementation

### 3.1. `quizService.ts` (`server/src/services/quizService.ts`)

- [x] **Refactor `generateQuizFromBanksService` (or new `createQuizDefinitionService`):**

  - [x] Adapt to save the new `Quiz` model structure (no fixed questions array, `numberOfQuestionsPerAttempt`).
  - [x] (Optional) When a quiz is created/activated, calculate and store `totalUniqueQuestionsInSourceSnapshot` on the `Quiz` model by fetching unique, active questions from linked banks. This is a design choice regarding when this count is fixed. (Implemented in `generateQuizFromBanksService` and `updateQuiz`)

- [x] **New `startQuizAttemptService(staffUserId, quizId)`:**

  - [x] Input: `staffUserId`, `quizId` (of the Quiz definition).
  - [x] Find or create `StaffQuizProgress` for this `staffUserId` and `quizId`.
    - [x] If new, calculate `totalUniqueQuestionsInSource` by fetching unique active question IDs from `quiz.sourceQuestionBankIds` and store it in `StaffQuizProgress`. (Note: Implemented by copying `quiz.totalUniqueQuestionsInSourceSnapshot` to `StaffQuizProgress.totalUniqueQuestionsInSource`)
  - [x] Fetch all active question IDs from the `Quiz` definition's `sourceQuestionBankIds`.
  - [x] Filter out question IDs already present in `StaffQuizProgress.seenQuestionIds`. This is the `availablePool`.
  - [x] If `availablePool` is empty:
    - [x] Set `StaffQuizProgress.isCompletedOverall = true` and save.
    - [x] Return a status indicating completion (e.g., no new questions, or a specific "completed" state).
  - [x] Randomly select `quiz.numberOfQuestionsPerAttempt` questions from the `availablePool`.
  - [x] Return the _full question objects_ for these selected IDs to the frontend.
  - [x] **Important:** Do _not_ add these questions to `seenQuestionIds` in `StaffQuizProgress` at this stage. Also, do _not_ update `attemptMadeOnDate` or `lastAttemptTimestamp` here; this occurs upon submission. (Adhered to, attemptMadeOnDate part is now moot)

- [x] **Refactor/New `submitQuizAttemptService(staffUserId, quizId, attemptData)`:**

  - [x] Input: `staffUserId`, `quizId`, `attemptData` (containing presented question IDs and their answers).
  - [x] Grade the attempt. (Basic grading implemented with TODO for comprehensive logic)
  - [x] Create a `QuizAttempt` (or `QuizResult`) document. (Implemented using new `QuizAttempt` model)
  - [x] Update `StaffQuizProgress` for `staffUserId` and `quizId`:
    - [x] Add all `questionId`s from the _current submitted attempt_ to `StaffQuizProgress.seenQuestionIds` (use `$addToSet`).
    - [x] Update `StaffQuizProgress.lastAttemptTimestamp = new Date()`.
    - [x] **RE-EVALUATE/REMOVE:** Implement logic to update `StaffQuizProgress.questionsAnsweredToday` and `lastActivityDateForDailyReset` (handle daily reset). (Implemented, noted for re-evaluation)
    - [x] Check if `StaffQuizProgress.seenQuestionIds.length >= StaffQuizProgress.totalUniqueQuestionsInSource`. If true, set `StaffQuizProgress.isCompletedOverall = true`.
    - [x] Save `StaffQuizProgress`.
  - [x] Return attempt results (score, correct/incorrect). (Implemented)

- [x] **New `getStaffQuizProgressService(staffUserId, quizId)`:**

  - [x] Fetch `StaffQuizProgress` for a user and a specific quiz definition. Used by staff dashboard.

- [x] **New `getRestaurantQuizStaffProgressService(restaurantId, quizId)`:**

  - [x] For a given `quizId`, fetch all `StaffQuizProgress` documents for staff in the `restaurantId`. Used by restaurant owner view.

- [ ] **(Optional) Daily Reset Logic for `questionsAnsweredToday`:**
  - [ ] Implement a mechanism (e.g., on staff login, on first quiz access of the day, or a scheduled job) to check `lastActivityDateForDailyReset` in `StaffQuizProgress` and reset `questionsAnsweredToday` if it's a new day.
  - [ ] **Note:** This section might be significantly simplified or removed if the "one quiz attempt per day" rule is strictly enforced, as the check would be handled by `attemptMadeOnDate`.

### 3.2. `questionBankService.ts` & `questionService.ts`

- [x] Ensure services that provide questions from banks can efficiently return unique, active question IDs or full question objects as needed.

## 4. Backend Controller & Route Updates

### 4.1. `quizController.ts`

- [x] Update `createQuiz` controller to use the refactored service.
- [x] New controller for `startQuizAttempt`.
- [x] Update/New controller for `submitQuizAttempt`.
- [x] New controllers for fetching staff progress (for staff view and restaurant view).

### 4.2. `quizRoutes.ts`

- [x] `POST /api/quizzes` (or similar for quiz definition creation) - points to updated controller.
- [x] `POST /api/quizzes/:quizId/start-attempt` - for staff to start/get questions.
- [x] `POST /api/quizzes/:quizId/submit-attempt` - for staff to submit answers.
- [x] `GET /api/quizzes/:quizId/my-progress` - for staff to see their progress on a specific quiz.
- [x] `GET /api/restaurants/:restaurantId/quizzes/:quizId/staff-progress` - for restaurant owner. (Implemented as GET /api/quizzes/:quizId/all-staff-progress)

## 5. Frontend Changes

### 5.1. Quiz Creation (Restaurant - `client/src/pages/QuizAndBankManagementPage.tsx` & Modals)

- [x] Update "Create Quiz from Banks" modal/form:
  - [x] Input field for `numberOfQuestionsPerAttempt`.
  - [x] Remove UI related to selecting specific questions if any. (Verified no such UI exists for removal)
  - [x] API call to the refactored quiz creation endpoint.

### 5.2. Staff Quiz Taking (`client/src/pages/QuizTakingPage.tsx` & `StaffDashboard.tsx`)

- [x] **Staff Dashboard:**
  - [x] Fetch list of _available_ Quiz Definitions (`isAvailable: true`).
  - [x] For each quiz, potentially display daily progress (`questionsAnsweredToday / numberOfQuestionsPerAttempt`) and overall completion status from `StaffQuizProgress`.
- [x] **Quiz Taking Page:**
  - [x] On "Start Quiz", call `POST /api/quizzes/:quizId/start-attempt`.
  - [x] Receive the dynamically selected questions and render them.
  - [x] On submission, call `POST /api/quizzes/:quizId/submit-attempt`.
  - [x] Display results and updated progress.

### 5.3. Restaurant View of Staff Progress (Enhance `QuizAndBankManagementPage.tsx` or new page)

- [x] When a restaurant user views a specific Quiz they've created:
  - [x] Add a section/tab to see "Staff Progress". (Implemented via "View Progress" button opening a modal)
  - [x] Fetch data from `GET /api/quizzes/:quizId/all-staff-progress`.
  - [x] Display a list of staff members with their `(seenQuestionIds.length / totalUniqueQuestionsInSource) * 100 %` completion and `isCompletedOverall` status for that quiz.

## 6. Considerations & Open Questions

- [ ] **Strategy for `totalUniqueQuestionsInSource` Snapshot:**
  - When is this value calculated and stored in `StaffQuizProgress`? (e.g., on staff's first attempt, or on quiz creation/activation).
  - How are changes to source Question Banks (questions added/removed) handled for existing `StaffQuizProgress` records? Does it affect their percentage or ability to reach 100%?
    - _Suggestion:_ Snapshot on first attempt by a user for a specific quiz. If the bank changes significantly, the restaurant might need to "archive" the old quiz definition and create a new one based on the updated bank to reset progress fairly.
- [ ] **"Empty Pool" UX for Staff:** If a staff member has seen all questions for a quiz (`isCompletedOverall: true`), what should their experience be if they try to take it again?
  - Show "Quiz Completed!" message?
  - Prevent new attempts?
  - Allow re-attempts for practice (these re-attempts wouldn't affect `seenQuestionIds` or overall completion stats, but could be tracked in `QuizAttempt`).
- [ ] **Daily Limit Strictness:** Is the `numberOfQuestionsPerAttempt` a strict daily limit, or can staff take multiple "attempts" in a day if they wish, with each attempt pulling new questions (if available) up to that count?
  - The current brainstorm assumes `numberOfQuestionsPerAttempt` is per session/attempt, and `questionsAnsweredToday` tracks a daily aggregate towards a potential daily goal.
- [ ] **Performance of Question Selection:** For large banks and many seen questions, randomly selecting _new_ questions needs to be efficient.
  - Fetching all bank questions, then filtering out seen ones, then random sampling is one way. Consider database-level optimizations if possible.
- [ ] **Data Migration:** If there's existing quiz/result data, a migration strategy might be needed.

This plan provides a comprehensive overview. Each section can be broken down further into smaller tasks.
