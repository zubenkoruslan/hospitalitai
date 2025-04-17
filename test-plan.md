# Hospitality Training Platform - Test Plan

## 1. Introduction

This document outlines the testing strategy for the Hospitality Training Platform. It includes both manual test cases for core user flows and a guide for setting up automated frontend testing using Jest and React Testing Library.

## 2. Testing Setup (Frontend - Jest & React Testing Library)

This guide assumes a React frontend set up with Vite (as previously configured). Vite typically includes Jest support or requires minimal configuration. React Testing Library is the standard for testing React components.

### 2.1. Installation

Open your terminal in the `client` directory and run:

```bash
npm install --save-dev jest @types/jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
```

- `jest`: The testing framework.
- `@types/jest`: TypeScript definitions for Jest.
- `@testing-library/react`: Core React Testing Library utilities.
- `@testing-library/jest-dom`: Custom Jest matchers for DOM state (e.g., `toBeInTheDocument`).
- `@testing-library/user-event`: Utilities for simulating user interactions more realistically.
- `jest-environment-jsdom`: Sets up a browser-like environment (DOM) for tests.

### 2.2. Jest Configuration

Create a `jest.config.js` file in the root of the `client` directory (or modify if it exists):

```javascript
// client/jest.config.js
module.exports = {
  preset: "ts-jest", // Use ts-jest preset if using TypeScript directly with Jest without Babel
  testEnvironment: "jsdom", // Use jsdom environment for browser-like testing
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"], // Path to setup file (see below)
  moduleNameMapper: {
    // Handle CSS Modules (adjust regex if using different naming convention)
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    // Handle static assets
    "\\.(jpg|jpeg|png|gif|webp|svg)$": "<rootDir>/__mocks__/fileMock.js",
    // Example: Map absolute paths if using them (e.g., src/components -> <rootDir>/src/components)
    "^@components/(.*)$": "<rootDir>/src/components/$1",
    "^@context/(.*)$": "<rootDir>/src/context/$1",
    "^@pages/(.*)$": "<rootDir>/src/pages/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
  },
  transform: {
    // Use ts-jest for .ts/.tsx files
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json", // Ensure this points to your client tsconfig
      },
    ],
    // Optional: Transform JS files if needed (e.g., using Babel)
    // '^.+\\.(js|jsx)$': 'babel-jest',
  },
  // Optional: Collect coverage information
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8", // or 'babel'
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}", // Include all TS/TSX files in src
    "!src/**/*.d.ts", // Exclude type definition files
    "!src/main.tsx", // Often exclude main entry point
    "!src/vite-env.d.ts",
    "!src/setupTests.ts", // Exclude test setup file
  ],
};
```

- **Note:** If using Vite's built-in testing which might use Vitest instead of Jest directly, the configuration will differ. This guide assumes a standard Jest setup. You might need `ts-jest` (`npm install --save-dev ts-jest`).

### 2.3. Setup File

Create a `src/setupTests.ts` file in the `client/src` directory:

```typescript
// client/src/setupTests.ts
import "@testing-library/jest-dom"; // Extends Jest expect with DOM matchers

// Optional: Add any other global setup needed for tests
// Example: Mock global fetch or localStorage/sessionStorage if needed
// global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({}) }));

// Mock matchMedia for libraries that might use it (like some UI component libraries)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
```

### 2.4. Mocks

Create necessary mock files (as referenced in `jest.config.js`):

- `client/__mocks__/fileMock.js`:
  ```javascript
  module.exports = "test-file-stub";
  ```

### 2.5. Add Test Script

Add a test script to `client/package.json`:

```json
{
  "scripts": {
    // ... other scripts
    "test": "jest"
  }
  // ... rest of package.json
}
```

### 2.6. Running Tests

You can now run tests using `npm test` or `npm run test` from the `client` directory. Create test files using the convention `*.test.tsx` (e.g., `LoginForm.test.tsx`) inside the component's directory or a `__tests__` subfolder.

## 3. Manual Test Cases

### 3.1. User Authentication

| Test Case ID | Description                             | Steps                                                                                                                                                | Expected Result                                                                                                                                                             | User Role        | Status |
| :----------- | :-------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------- | :----- |
| AUTH-001     | Successful Restaurant Signup            | 1. Navigate to Signup page. 2. Select "Restaurant" role. 3. Fill required fields (Name, Email, Password, Confirm Pass, Restaurant Name). 4. Submit.  | Account created. User is redirected (e.g., to Login page or Dashboard). Confirmation message shown. Restaurant record created in DB. User record created with correct role. | N/A              | To Do  |
| AUTH-002     | Successful Staff Signup                 | 1. Navigate to Signup page. 2. Select "Staff" role. 3. Fill required fields (Name, Email, Password, Confirm Pass, Restaurant ID [valid]). 4. Submit. | Account created. User is redirected. Confirmation message shown. User record created with correct role & restaurantId. User added to Restaurant's staff list in DB.         | N/A              | To Do  |
| AUTH-003     | Signup with Mismatched Passwords        | 1. Navigate to Signup page. 2. Fill fields. 3. Enter different values for Password and Confirm Password. 4. Submit.                                  | Error message "Passwords do not match" displayed. Account not created.                                                                                                      | N/A              | To Do  |
| AUTH-004     | Signup with Existing Email              | 1. Sign up a user. 2. Attempt to sign up again with the same email address.                                                                          | Error message "User with this email already exists" displayed. Account not created.                                                                                         | N/A              | To Do  |
| AUTH-005     | Signup Validation (Missing fields)      | 1. Attempt signup leaving various required fields blank (Name, Email, Password, Role-specific fields).                                               | Appropriate validation error messages displayed for missing fields. Account not created.                                                                                    | N/A              | To Do  |
| AUTH-006     | Staff Signup with Invalid Restaurant ID | 1. Navigate to Signup page. 2. Select "Staff". 3. Enter an invalid/non-existent Restaurant ID. 4. Fill other fields. 5. Submit.                      | Error message "Restaurant not found..." displayed. Account not created.                                                                                                     | N/A              | To Do  |
| AUTH-007     | Successful Login (Restaurant)           | 1. Use credentials from AUTH-001. 2. Navigate to Login page. 3. Enter Email/Password. 4. Submit.                                                     | User logged in successfully. Redirected to Restaurant Dashboard. Valid JWT token received and stored.                                                                       | N/A              | To Do  |
| AUTH-008     | Successful Login (Staff)                | 1. Use credentials from AUTH-002. 2. Navigate to Login page. 3. Enter Email/Password. 4. Submit.                                                     | User logged in successfully. Redirected to Staff Dashboard. Valid JWT token received and stored.                                                                            | N/A              | To Do  |
| AUTH-009     | Login with Incorrect Password           | 1. Use valid email from previous signup. 2. Enter incorrect password. 3. Submit.                                                                     | Error message "Invalid credentials" displayed. User not logged in.                                                                                                          | N/A              | To Do  |
| AUTH-010     | Login with Non-existent Email           | 1. Enter an email address not associated with any account. 2. Enter a password. 3. Submit.                                                           | Error message "Invalid credentials" displayed. User not logged in.                                                                                                          | N/A              | To Do  |
| AUTH-011     | Logout                                  | 1. Log in as any user. 2. Find and click the Logout button/link.                                                                                     | User is logged out. Token/user data cleared from localStorage. User redirected to Login page.                                                                               | Restaurant/Staff | To Do  |
| AUTH-012     | Access Protected Route without Login    | 1. Log out. 2. Attempt to navigate directly to a protected route (e.g., /dashboard, /menus).                                                         | User is redirected to the Login page. Access to the protected route is denied.                                                                                              | N/A              | To Do  |
| AUTH-013     | Access Restaurant Route as Staff        | 1. Log in as a Staff user. 2. Attempt to navigate directly to a Restaurant-only route (e.g., /menus/create, /quizzes/create).                        | Access denied (e.g., redirect to Staff dashboard or show "Forbidden" message).                                                                                              | Staff            | To Do  |

### 3.2. Menu Management (Restaurant Role)

| Test Case ID | Description                  | Steps                                                                                                                                    | Expected Result                                                                                                                | User Role  | Status |
| :----------- | :--------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :--------- | :----- |
| MENU-001     | View Menu Management Page    | 1. Log in as Restaurant user. 2. Navigate to Menu Management.                                                                            | Page loads displaying list of menus (if any) and controls (e.g., "Add Menu" button).                                           | Restaurant | To Do  |
| MENU-002     | Create New Menu (No Items)   | 1. On Menu Mgt page, click "Add Menu". 2. Enter Menu Name & Description. 3. Save.                                                        | Menu created successfully. Appears in the menu list. Correct data saved in DB (Name, Desc, restaurantId, empty items array).   | Restaurant | To Do  |
| MENU-003     | View Menu Details            | 1. On Menu Mgt page, click on an existing menu.                                                                                          | Menu details page loads, showing menu name/desc and list of items (if any). "Add Item" button visible.                         | Restaurant | To Do  |
| MENU-004     | Add Menu Item                | 1. Navigate to Menu Details page. 2. Click "Add Item". 3. Fill item details (Name, Price, Desc, Ingredients, Allergens, Image). 4. Save. | Item added successfully. Appears in the item list for that menu. Correct data saved in DB (embedded within the Menu document). | Restaurant | To Do  |
| MENU-005     | Edit Menu Item               | 1. Navigate to Menu Details page. 2. Click "Edit" on an existing item. 3. Modify details. 4. Save.                                       | Item details updated successfully in the list and in the DB.                                                                   | Restaurant | To Do  |
| MENU-006     | Delete Menu Item             | 1. Navigate to Menu Details page. 2. Click "Delete" on an existing item. 3. Confirm deletion.                                            | Item removed from the list and from the menu's `items` array in the DB.                                                        | Restaurant | To Do  |
| MENU-007     | Edit Menu (Name/Description) | 1. On Menu Mgt page, click "Edit" for a menu. 2. Modify name/description. 3. Save.                                                       | Menu name/description updated in the list and in the DB.                                                                       | Restaurant | To Do  |
| MENU-008     | Delete Menu                  | 1. On Menu Mgt page, click "Delete" for a menu. 2. Confirm deletion.                                                                     | Menu removed from the list and deleted from the DB.                                                                            | Restaurant | To Do  |
| MENU-009     | Menu Item Validation         | 1. Attempt to add/edit menu item with invalid data (e.g., missing name/price, negative price).                                           | Appropriate validation errors displayed. Item not saved/updated.                                                               | Restaurant | To Do  |

### 3.3. Quiz Creation (Restaurant Role)

| Test Case ID | Description                      | Steps                                                                                                                                                                                                           | Expected Result                                                                                                                                                   | User Role  | Status |
| :----------- | :------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------- | :----- |
| QUIZ-001     | View Quiz Management Page        | 1. Log in as Restaurant user. 2. Navigate to Quiz Management.                                                                                                                                                   | Page loads displaying list of quizzes (if any) and "Create Quiz" button.                                                                                          | Restaurant | To Do  |
| QUIZ-002     | Create New Quiz (Basic)          | 1. On Quiz Mgt page, click "Create Quiz". 2. Enter Title & Description. 3. Add one T/F question (Text, Correct Answer 'true'/'false'). 4. Add one MC question (Text, Options, Correct Answer). 5. Save/Publish. | Quiz created successfully. Appears in quiz list. Correct data saved in DB (Title, Desc, RestaurantId, CreatedBy, Questions with types, options, correct answers). | Restaurant | To Do  |
| QUIZ-003     | Add Multiple Choice Question     | 1. While creating/editing quiz, click "Add Question". 2. Select "Multiple Choice". 3. Fill Question Text. 4. Add >= 2 options. 5. Select correct option. 6. Save Question.                                      | Question added to the quiz builder UI. Data structure correct.                                                                                                    | Restaurant | To Do  |
| QUIZ-004     | Add True/False Question          | 1. While creating/editing quiz, click "Add Question". 2. Select "True/False". 3. Fill Question Text. 4. Select correct answer ('true' or 'false'). 6. Save Question.                                            | Question added to the quiz builder UI. Data structure correct.                                                                                                    | Restaurant | To Do  |
| QUIZ-005     | Edit Question                    | 1. While creating/editing quiz, find an existing question. 2. Click "Edit". 3. Modify text, options, or correct answer. 4. Save changes.                                                                        | Question details updated in the UI and correctly structured for saving.                                                                                           | Restaurant | To Do  |
| QUIZ-006     | Delete Question                  | 1. While creating/editing quiz, find an existing question. 2. Click "Delete". 3. Confirm.                                                                                                                       | Question removed from the quiz builder UI.                                                                                                                        | Restaurant | To Do  |
| QUIZ-007     | Associate Menu with Quiz         | 1. While creating/editing quiz, select one or more menus from a dropdown/list. 2. Save/Publish.                                                                                                                 | Quiz saved with correct `associatedMenus` array (containing Menu ObjectIds) in DB.                                                                                | Restaurant | To Do  |
| QUIZ-008     | Quiz Validation (No Questions)   | 1. Attempt to save/publish a quiz with no questions added.                                                                                                                                                      | Error message "Quiz must contain at least one question" displayed. Quiz not saved.                                                                                | Restaurant | To Do  |
| QUIZ-009     | Question Validation (MC < 2 Opt) | 1. Add MC question. 2. Add only 1 option. 3. Attempt to save question/quiz.                                                                                                                                     | Error message "Multiple choice questions must have at least 2 options" displayed.                                                                                 | Restaurant | To Do  |
| QUIZ-010     | Question Validation (No Correct) | 1. Add any question type. 2. Do not specify the correct answer. 3. Attempt to save question/quiz.                                                                                                               | Error message "Correct answer is required" displayed.                                                                                                             | Restaurant | To Do  |
| QUIZ-011     | Edit Existing Quiz               | 1. On Quiz Mgt page, click "Edit" for an existing quiz. 2. Modify title, description, questions, or associated menus. 3. Save.                                                                                  | Quiz updated successfully in the DB. Changes reflected in the quiz list/details.                                                                                  | Restaurant | To Do  |
| QUIZ-012     | Delete Quiz                      | 1. On Quiz Mgt page, click "Delete" for an existing quiz. 2. Confirm.                                                                                                                                           | Quiz removed from list and deleted from DB. (Verify if related results are handled/deleted as per design).                                                        | Restaurant | To Do  |

### 3.4. Quiz Taking & Results Viewing

| Test Case ID | Description                          | Steps                                                                                                                          | Expected Result                                                                                                                                                                                                                             | User Role        | Status |
| :----------- | :----------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :--------------- | :----- |
| RESULT-001   | Staff: View Assigned Quizzes         | 1. Log in as Staff user. 2. View Dashboard.                                                                                    | Assigned quizzes (not yet taken/completed) are listed with a "Start Quiz" button.                                                                                                                                                           | Staff            | To Do  |
| RESULT-002   | Staff: Start Quiz Attempt            | 1. From dashboard, click "Start Quiz" for an assigned quiz.                                                                    | Quiz taking page loads, displaying quiz title and first question. `QuizResult` record created in DB with `status: inProgress`, correct `quizId`, `userId`, `restaurantId`, `totalQuestions`, `startedAt`.                                   | Staff            | To Do  |
| RESULT-003   | Staff: Take & Submit Quiz            | 1. Start quiz (RESULT-002). 2. Answer all questions (mix of correct/incorrect). 3. Click "Submit Quiz". 4. Confirm submission. | Quiz submitted. User sees score/confirmation. `QuizResult` record in DB updated: `status: completed`, `completedAt` set, `answers` array populated correctly (with `questionId`, `answerGiven`, `isCorrect`), `score` calculated correctly. | Staff            | To Do  |
| RESULT-004   | Staff: View Own Results List         | 1. Log in as Staff user who has completed quizzes. 2. Navigate to "My Results".                                                | Page displays a list of completed quizzes with scores and dates.                                                                                                                                                                            | Staff            | To Do  |
| RESULT-005   | Staff: View Single Result Detail     | 1. From "My Results" list, click on a completed quiz.                                                                          | Detail page loads showing overall score and a breakdown of each question, the answer given, and whether it was correct (potentially showing the actual correct answer).                                                                     | Staff            | To Do  |
| RESULT-006   | Restaurant: View Results Page        | 1. Log in as Restaurant user. 2. Navigate to "Results".                                                                        | Page loads, potentially showing overview stats or a list of quizzes to view results for.                                                                                                                                                    | Restaurant       | To Do  |
| RESULT-007   | Restaurant: View Results for Quiz    | 1. From Results page, select a specific quiz.                                                                                  | Page/section loads showing aggregate stats (completion %, avg score) and a list of staff assigned the quiz with their status (Not Started, In Progress, Completed) and score (if completed).                                                | Restaurant       | To Do  |
| RESULT-008   | Restaurant: View Staff Result Detail | 1. From the Quiz Results list (RESULT-007), click on a staff member who completed the quiz.                                    | Modal/page loads showing the specific answers submitted by that staff member for each question and whether they were correct.                                                                                                               | Restaurant       | To Do  |
| RESULT-009   | Prevent Re-taking Quiz (If designed) | 1. Staff user completes a quiz. 2. Attempt to start the same quiz again from the dashboard.                                    | "Start Quiz" button is disabled/hidden OR user receives a message "Quiz already completed". New `QuizResult` is not created. (Depends on application rules).                                                                                | Staff            | To Do  |
| RESULT-010   | View In-Progress Attempt             | 1. Staff starts quiz but does not submit. 2. Restaurant views results for that quiz.                                           | Restaurant user sees the staff member's status as "In Progress" with no score displayed.                                                                                                                                                    | Restaurant/Staff | To Do  |

## 4. Automation Strategy (Future)

- **Frontend:** Utilize Jest and React Testing Library (as set up above) to write unit and integration tests for components, hooks, and context. Focus on testing component rendering, state changes, user interactions, and API call mocking (`msw` - Mock Service Worker is recommended for API mocking).
- **Backend:** Use a testing framework like Jest or Mocha with Supertest for API endpoint testing. Test routes, middleware, and database interactions (potentially using an in-memory MongoDB server like `mongodb-memory-server`). Unit test complex logic within models or services.
- **End-to-End (E2E):** Consider tools like Cypress or Playwright for testing complete user flows across both frontend and backend in a real browser environment.

## 5. Test Environment

- **Backend:** Local Node.js environment, local MongoDB instance or cloud instance (specify which).
- **Frontend:** Modern web browser (Chrome, Firefox recommended).
- **Data:** Prepare test accounts (Restaurant, Staff) and sample data (Menus, Quizzes) as needed. Consider database seeding scripts.
