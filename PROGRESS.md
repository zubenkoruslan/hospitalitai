# HospitalityAI Project Status

## Overview

This document outlines the current status of the HospitalityAI project. It's a web application built using the MERN stack (MongoDB, Express.js, React, Node.js) with TypeScript, designed to facilitate restaurant staff training through quizzes and provide management dashboards.

## Technology Stack

- **Frontend:**
  - Framework/Library: React (using functional components and hooks)
  - Language: TypeScript
  - Build Tool: Vite
  - Styling: Tailwind CSS
  - State Management: React Context API (implied via `useAuth`), local component state (`useState`)
  - Testing: Jest, React Testing Library
- **Backend:**
  - Framework: Node.js, Express.js
  - Language: TypeScript
  - Database: MongoDB (with Mongoose ODM)
  - Authentication: JWT (implied by `authMiddleware.ts` rule, `auth.test.ts`)
  - Testing: Vitest
- **Shared:**
  - Strict TypeScript type safety enforced across frontend and backend.

## Project Structure

The project follows a standard monorepo structure with separate `client` and `server` directories:

- **`client/`**: Contains the React frontend application.
  - `src/components/`: Reusable UI components (common elements, items, quiz, staff).
  - `src/pages/`: Top-level components corresponding to application routes (Dashboard, Menu Items, Staff Management, etc.).
  - `src/hooks/`: Custom React hooks encapsulating reusable logic (data fetching, state management).
  - `src/types/`: Shared TypeScript interfaces and types for frontend data structures.
  - `src/services/`: Modules for interacting with the backend API (e.g., `api.ts`).
  - `src/context/`: React Context providers (e.g., `AuthContext`).
- **`server/`**: Contains the Node.js/Express backend API.
  - `src/models/`: Mongoose schemas and models (`User`, `Quiz`, `QuizResult`, etc.).
  - `src/routes/`: API endpoint definitions (`auth`, `quiz`, `staff`, `menu`, etc.).
  - `src/controllers/`: Logic handling requests for specific routes.
  - `src/services/`: Core business logic layer (`authService`, `quizService`, `quizResultService`, etc.).
  - `src/middleware/`: Express middleware (authentication, error handling).
  - `src/utils/`: Utility functions (e.g., `errorHandler`).

## Current Functionality (Based on Recent Activity & Structure)

- **Authentication:** User signup and login for different roles (restaurant owner, staff). JWT-based session management.
- **Restaurant Dashboard:** Displays summary information for restaurant owners, likely including:
  - Staff summary (`useStaffSummary`).
  - Total quiz count (`useQuizCount`).
  - List of available menus (`useMenus`).
- **Menu Management (Owner):**
  - Viewing list of menus (`useMenus`).
  - Viewing menu items within a specific menu (`MenuItemsPage`, `MenuItemList`).
  - Adding, editing, and deleting menu items via modals (`AddEditMenuItemModal`, `DeleteMenuItemModal`).
  - Data fetching and state managed by `useMenuData`.
- **Staff Management (Owner):**
  - Viewing a summary list of staff members with quiz statistics (`RestaurantStaffResultsPage`, `useStaffSummary`).
  - Viewing detailed information and full quiz results for a specific staff member (`StaffDetails`, `useStaffDetails`).
- **Quiz Management (Owner):**
  - Creating quizzes (likely via `QuizCreation` page and modals).
  - Viewing quiz count (`useQuizCount`).
- **Quiz Taking & Results (Staff/Owner):**
  - Staff can likely take assigned quizzes (functionality implied by results).
  - Staff can view their own past quiz results (`getMyResults` service method).
  - Owners/Staff can view detailed results for a specific quiz attempt, including incorrect answers (`getResultDetails` service method, `ViewIncorrectAnswersModal`).
  - Backend services handle quiz submission, scoring, and result storage (`quizResultService`).

## Recent Progress & Current State

- **Testing Focus:** Significant effort has been put into increasing test coverage.
  - **Frontend:** Added comprehensive Jest/RTL tests for components (`DeleteMenuItemModal`, `AddEditMenuItemModal`, `MenuItemList`) and custom hooks (`useMenuData`, `useStaffDetails`, `useStaffSummary`, `useQuizCount`, `useMenus`).
  - **Backend:** Addressed multiple failures in `quizResultService.test.ts`, ensuring all server-side tests (`Vitest`) are now passing. Reviewed test logs for other services (`quizService`, `auth`).
- **Refactoring:**
  - Improved code organization by moving shared TypeScript types from hooks (`useStaffDetails`, `useMenus`) into dedicated type files (`client/src/types/staffTypes.ts`, `client/src/types/menuItemTypes.ts`).
  - Refactored frontend components (e.g., `MenuItemsPage`) to utilize custom hooks for better separation of concerns and state management.
- **Stability:** Addressed and fixed various bugs and type errors identified during testing and refactoring on both client and server. The main backend test suite is currently stable.

## Potential Next Steps

- Continue increasing frontend test coverage for pages (`RestaurantDashboard`, `StaffDetails`, `QuizCreation`) and remaining components/hooks.
- Address any remaining `// TODO` comments in the codebase.
- Run frontend tests (`npm test` in `client/`) to ensure new tests pass and check coverage.
- Implement any missing UI elements or features identified.
- Review logged errors during backend tests (even if tests pass) for potential silent issues or areas for improvement in error handling/mocking.
