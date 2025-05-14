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

- [ ] Modify `Quiz` schema:
  - [ ] Keep `title: string`
  - [ ] Keep `description?: string`
  - [ ] Keep `restaurantId: Types.ObjectId` (ref: 'User')
  - [ ] Keep `sourceQuestionBankIds: Types.ObjectId[]` (ref: 'QuestionBank')
  - [ ] Rename `numberOfQuestions` to `numberOfQuestionsPerAttempt: number`
  - [ ] Keep `isAvailable: boolean`
  - [ ] Keep `isAssigned: boolean` (for admin lifecycle, if still desired)
  - [ ] **REMOVE** `questions: MainIQuestion[]` (array of populated questions)
  - [ ] **REMOVE** `menuItemIds?: Types.ObjectId[]` (if fully deprecated in favor of banks)
  - [ ] Consider adding `totalUniqueQuestionsInSourceSnapshot: number` (optional, see discussion below).

### 2.2. `StaffQuizProgress` Model (New File: `server/src/models/StaffQuizProgress.ts`)

- [ ] Create `StaffQuizProgressSchema`:
  - [ ] `staffUserId: Types.ObjectId` (ref: 'User', indexed)
  - [ ] `quizId: Types.ObjectId` (ref: 'Quiz', indexed) - Links to the Quiz _definition_
  - [ ] `restaurantId: Types.ObjectId` (ref: 'User', indexed)
  - [ ] `seenQuestionIds: Types.ObjectId[]` (ref: 'Question', default: [])
  - [ ] `totalUniqueQuestionsInSource: number` (snapshot of unique questions from source bank(s) for this quiz)
  - [ ] `isCompletedOverall: boolean` (default: `false`)
  - [ ] `lastAttemptDate?: Date`
  - [ ] `questionsAnsweredToday: number` (default: 0)
  - [ ] `lastActivityDateForDailyReset: Date` (to manage daily reset of `questionsAnsweredToday`)
  - [ ] Add compound index on `staffUserId` and `quizId`.
- [ ] Create `StaffQuizProgressModel`.

### 2.3. `QuizAttempt` Model (New or Refactor `server/src/models/QuizResult.ts`)

- [ ] Decide if enhancing `QuizResult` or creating new `QuizAttempt`.
- [ ] Define schema:
  - [ ] `staffUserId: Types.ObjectId` (ref: 'User')
  - [ ] `quizId: Types.ObjectId` (ref: 'Quiz') - The Quiz _definition_
  - [ ] `restaurantId: Types.ObjectId` (ref: 'User')
  - [ ] `questionsPresented: [{ questionId: Types.ObjectId, answerGiven?: any, isCorrect?: boolean, sortOrder?: number }]` (Store actual questions and answers for this specific attempt)
  - [ ] `score: number`
  - [ ] `attemptDate: Date` (default: `Date.now`)
  - [ ] `duration?: number` (time taken, optional)

## 3. Backend Service Logic Refactor & Implementation

### 3.1. `quizService.ts` (`server/src/services/quizService.ts`)

- [ ] **Refactor `generateQuizFromBanksService` (or new `createQuizDefinitionService`):**

  - [ ] Adapt to save the new `Quiz` model structure (no fixed questions array, `numberOfQuestionsPerAttempt`).
  - [ ] (Optional) When a quiz is created/activated, calculate and store `totalUniqueQuestionsInSourceSnapshot` on the `Quiz` model by fetching unique, active questions from linked banks. This is a design choice regarding when this count is fixed.

- [ ] **New `startQuizAttemptService(staffUserId, quizId)`:**

  - [ ] Input: `staffUserId`, `quizId` (of the Quiz definition).
  - [ ] Find or create `StaffQuizProgress` for this `staffUserId` and `quizId`.
    - If new, calculate `totalUniqueQuestionsInSource` by fetching unique active question IDs from `quiz.sourceQuestionBankIds` and store it in `StaffQuizProgress`.
  - [ ] Fetch all active question IDs from the `Quiz` definition's `sourceQuestionBankIds`.
  - [ ] Filter out question IDs already present in `StaffQuizProgress.seenQuestionIds`. This is the `availablePool`.
  - [ ] If `availablePool` is empty:
    - [ ] Set `StaffQuizProgress.isCompletedOverall = true` and save.
    - [ ] Return a status indicating completion (e.g., no new questions, or a specific "completed" state).
  - [ ] Randomly select `quiz.numberOfQuestionsPerAttempt` questions from the `availablePool`.
  - [ ] Return the _full question objects_ for these selected IDs to the frontend.
  - [ ] **Important:** Do _not_ add these questions to `seenQuestionIds` in `StaffQuizProgress` at this stage.

- [ ] **Refactor/New `submitQuizAttemptService(staffUserId, quizId, attemptData)`:**

  - [ ] Input: `staffUserId`, `quizId`, `attemptData` (containing presented question IDs and their answers).
  - [ ] Grade the attempt.
  - [ ] Create a `QuizAttempt` (or `QuizResult`) document.
  - [ ] Update `StaffQuizProgress` for `staffUserId` and `quizId`:
    - [ ] Add all `questionId`s from the _current submitted attempt_ to `StaffQuizProgress.seenQuestionIds` (use `$addToSet`).
    - [ ] Update `StaffQuizProgress.lastAttemptDate`.
    - [ ] Implement logic to update `StaffQuizProgress.questionsAnsweredToday` and `lastActivityDateForDailyReset` (handle daily reset).
    - [ ] Check if `StaffQuizProgress.seenQuestionIds.length >= StaffQuizProgress.totalUniqueQuestionsInSource`. If true, set `StaffQuizProgress.isCompletedOverall = true`.
    - [ ] Save `StaffQuizProgress`.
  - [ ] Return attempt results (score, correct/incorrect).

- [ ] **New `getStaffQuizProgressService(staffUserId, quizId)`:**

  - [ ] Fetch `StaffQuizProgress` for a user and a specific quiz definition. Used by staff dashboard.

- [ ] **New `getRestaurantQuizStaffProgressService(restaurantId, quizId)`:**

  - [ ] For a given `quizId`, fetch all `StaffQuizProgress` documents for staff in the `restaurantId`. Used by restaurant owner view.

- [ ] **(Optional) Daily Reset Logic for `questionsAnsweredToday`:**
  - [ ] Implement a mechanism (e.g., on staff login, on first quiz access of the day, or a scheduled job) to check `lastActivityDateForDailyReset` in `StaffQuizProgress` and reset `questionsAnsweredToday` if it's a new day.

### 3.2. `questionBankService.ts` & `questionService.ts`

- [ ] Ensure services that provide questions from banks can efficiently return unique, active question IDs or full question objects as needed.

## 4. Backend Controller & Route Updates

### 4.1. `quizController.ts`

- [ ] Update `createQuiz` controller to use the refactored service.
- [ ] New controller for `startQuizAttempt`.
- [ ] Update/New controller for `submitQuizAttempt`.
- [ ] New controllers for fetching staff progress (for staff view and restaurant view).

### 4.2. `quizRoutes.ts`

- [ ] `POST /api/quizzes` (or similar for quiz definition creation) - points to updated controller.
- [ ] `POST /api/quizzes/:quizId/start-attempt` - for staff to start/get questions.
- [ ] `POST /api/quizzes/:quizId/submit-attempt` - for staff to submit answers.
- [ ] `GET /api/quizzes/:quizId/my-progress` - for staff to see their progress on a specific quiz.
- [ ] `GET /api/restaurants/:restaurantId/quizzes/:quizId/staff-progress` - for restaurant owner.

## 5. Frontend Changes

### 5.1. Quiz Creation (Restaurant - `client/src/pages/QuizAndBankManagementPage.tsx` & Modals)

- [ ] Update "Create Quiz from Banks" modal/form:
  - [ ] Input field for `numberOfQuestionsPerAttempt`.
  - [ ] Remove UI related to selecting specific questions if any.
  - [ ] API call to the refactored quiz creation endpoint.

### 5.2. Staff Quiz Taking (`client/src/pages/QuizTakingPage.tsx` & `StaffDashboard.tsx`)

- [ ] **Staff Dashboard:**
  - [ ] Fetch list of _available_ Quiz Definitions (`isAvailable: true`).
  - [ ] For each quiz, potentially display daily progress (`questionsAnsweredToday / numberOfQuestionsPerAttempt`) and overall completion status from `StaffQuizProgress`.
- [ ] **Quiz Taking Page:**
  - [ ] On "Start Quiz", call `POST /api/quizzes/:quizId/start-attempt`.
  - [ ] Receive the dynamically selected questions and render them.
  - [ ] On submission, call `POST /api/quizzes/:quizId/submit-attempt`.
  - [ ] Display results and updated progress.

### 5.3. Restaurant View of Staff Progress (Enhance `QuizAndBankManagementPage.tsx` or new page)

- [ ] When a restaurant user views a specific Quiz they've created:
  - [ ] Add a section/tab to see "Staff Progress".
  - [ ] Fetch data from `GET /api/restaurants/:restaurantId/quizzes/:quizId/staff-progress`.
  - [ ] Display a list of staff members with their `(seenQuestionIds.length / totalUniqueQuestionsInSource) * 100 %` completion and `isCompletedOverall` status for that quiz.

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
