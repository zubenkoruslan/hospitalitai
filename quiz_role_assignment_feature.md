# Feature: Assign Quizzes to Specific Staff Roles

**Goal:** Staff members should only see quizzes relevant to their assigned role(s) or quizzes designated for all roles.

## I. Backend Implementation (Node.js, Express.js, MongoDB, Mongoose, TypeScript)

- [x] **1. Create `Role` Model, Service, Controller, and Routes:**

  - [x] **Model (`server/src/models/RoleModel.ts`):**
    - [x] Schema fields: `name` (String, required, unique per restaurant), `description` (String, optional), `restaurantId` (ObjectId, ref: 'Restaurant', required, indexed), `createdAt`, `updatedAt`.
    - [x] Follow MongoDB best practices for indexing.
  - [x] **Service (`server/src/services/roleService.ts`):**
    - [x] Implement `createRole`, `getRoleById`, `getRolesByRestaurant` (accepts `restaurantId`), `updateRole`, `deleteRole`.
    - [x] Include error handling and use async/await.
  - [x] **Controller (`server/src/controllers/roleController.ts`):**
    - [x] Standard RESTful controller methods mapping to the service layer.
    - [x] Validate request data (e.g., using `express-validator`).
  - [x] **Routes (`server/src/routes/roleRoutes.ts`):**
    - [x] Endpoints: `POST /api/roles`, `GET /api/roles` (query by `restaurantId`), `GET /api/roles/:id`, `PUT /api/roles/:id`, `DELETE /api/roles/:id`.
    - [x] Secure these routes (e.g., accessible by admin users only, implement `authMiddleware` and potentially a role-based authorization middleware).

- [x] **2. Update `User` Model (Staff):**

  - [x] Locate the primary user model (likely `server/src/models/UserModel.ts` or `StaffModel.ts`).
  - [x] Add/Modify the `roles` field: `roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }]`. (Note: Actual implementation is `assignedRoleId: Types.ObjectId`)
  - [x] Update relevant user/staff services (`UserService.ts` or `StaffService.ts`) and controllers/routes to manage this new `roles` field during staff creation and updates. (Note: `AuthService`, `StaffService` updated for `assignedRoleId`)

- [x] **3. Update `Quiz` Model, Service, Controller, and Routes:**
  - [x] **Model (`server/src/models/QuizModel.ts`):**
    - [x] Add `targetRoles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }]`. An empty array means the quiz is for all roles in the restaurant.
  - [x] **Service (`server/src/services/quizService.ts`):**
    - [x] Modify `createQuiz` and `updateQuizById` to handle the `targetRoles` field.
    - [x] Modify methods that retrieve quizzes for staff (e.g., `getAvailableQuizzesForUser`). Filter quizzes such that a staff member sees:
      - [x] Quizzes where `targetRoles` is empty.
      - [x] Quizzes where the staff member's `roles` array has at least one match with the quiz's `targetRoles` array. (Note: Logic updated for single `assignedRoleId` on user)
  - [x] **Controller/Routes (e.g., `quizController.ts`, `quizRoutes.ts`):**
    - [x] Update quiz creation/update endpoints to accept `targetRoles` in the request body. Include validation.
    - [x] Ensure the endpoint used by staff to fetch their list of quizzes utilizes the updated service logic.

## II. Frontend Implementation (React, TypeScript)

- [x] **1. Update Types (`client/src/types/`):**

  - [x] Create `roleTypes.ts` with an `IRole` interface (e.g., `id: string, name: string, description?: string, restaurantId: string`).
  - [x] Update `userTypes.ts` (or `staffTypes.ts`): Modify `IUser`/`IStaff` to include `roles: IRole[]`. (Note: Updated to `assignedRoleId?: string;` on `ClientUserMinimal`)
  - [x] Update `quizTypes.ts`: Modify `IQuiz` to include `targetRoles: IRole[]`.

- [x] **2. Admin - Role Management UI (Update `StaffManagement.tsx`):**

  - [x] Update `client/src/pages/StaffManagement.tsx` to include UI for CRUD operations on roles.
  - [x] UI should allow listing, creating, editing, and deleting roles for the admin's restaurant within the staff management page.
  - [x] Fetch roles using the new `/api/roles` endpoints.

- [x] **3. Admin - Staff Management UI (Update Existing):**

  - [x] In the staff creation/editing form (e.g., in `client/src/components/staff/StaffForm.tsx` or page like `AdminStaffManagementPage.tsx`):
    - [x] Add a multi-select dropdown or checkboxes to assign roles to staff. (Note: Implemented as a single select dropdown in `StaffManagement.tsx`)
    - [x] Fetch available roles from `/api/roles?restaurantId=...` to populate the selector.
    - [x] Update API calls to include the selected `roleIds`. (Note: Updated API calls for single `assignedRoleId`)

- [x] **4. Admin - Quiz Management UI (Update Existing):**

  - [x] In the quiz creation/editing form (e.g., `client/src/components/quiz/QuizForm.tsx` or page like `AdminQuizManagementPage.tsx`):
    - [x] Add a multi-select dropdown or checkboxes for `targetRoles`.
    - [x] Fetch available roles from `/api/roles?restaurantId=...`.
    - [x] An option to leave it blank (for "all roles") should be clear.
    - [x] Update API calls to include `targetRoleIds` (as `targetRoles: string[]`).

- [x] **5. Staff - Quiz Listing UI (Update Existing/Create New):**

  - [x] The page/component where staff view their available quizzes (e.g., new `client/src/pages/MyQuizzesPage.tsx` or `client/src/components/quiz/StaffQuizList.tsx`). (`StaffDashboard.tsx` uses a dedicated `/api/quizzes/available-for-staff` endpoint which calls `QuizService.getAvailableQuizzesForStaff` for role-based filtering).
  - [x] This UI should now automatically display the correctly filtered quizzes based on the API response.

- [x] **6. API Service Calls (`client/src/services/`):**
  - [x] Add new functions for `Role` CRUD operations.
  - [x] Update existing API functions for creating/editing quizzes and staff to include role information. (Note: Quiz part now also done via `UpdateQuizClientData` and updates to modals).

## III. Testing

- [ ] **1. Backend (Mocha/Chai/Supertest):**
  - [x] Write unit tests for new `RoleModel`, `RoleService`. (Completed, all passing)
  - [ ] Update unit tests for `QuizModel`, `UserModel`, `QuizService`, `UserService/StaffService`. (User model tests exist and pass. QuizModel has no dedicated tests yet. QuizService (including related `quizResultService.test.ts`) and StaffService tests are partially converted from Vitest or have commented out sections; need full migration, updates for role features, and validation of all existing tests.)
  - [ ] Write integration tests for new `roleRoutes` and ensure existing `quizRoutes` and `userRoutes/staffRoutes` function correctly with role assignments and quiz filtering. Cover authentication/authorization. (roleRoutes integration tests need verification/completion. quizRoutes (`quiz.fromBanks.test.ts`) passing with JWT secret handled by test script. userRoutes/staffRoutes (`auth.test.ts`) has transaction tests skipped, other auth tests pass. General filtering logic based on roles in routes needs comprehensive testing.)
- [ ] **2. Frontend (Jest/React Testing Library):**
  - [ ] Write component tests for new UI elements related to role selection and the role management page.
  - [ ] Test that API calls are made with the correct role data.
  - [ ] Test that staff users with different mock roles see the appropriately filtered quizzes.

## General Instructions:

- Adhere to the MERN stack and TypeScript best practices outlined in `.cursorrules`.
- Ensure all new backend routes are protected appropriately.
- Validate all incoming data on the backend.
- Use async/await for all asynchronous operations.
- Maintain clear and consistent naming conventions.
- Generate necessary Jest/RTL tests for frontend and Mocha/Chai/Supertest tests for backend.
