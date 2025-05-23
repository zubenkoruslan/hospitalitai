import axios, {
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  AxiosHeaders,
} from "axios";

// Determine the base URL for the API using Vite's env variable handling
// Ensure you have VITE_API_BASE_URL defined in your .env file at the client root
// Note: Your server might be running on 5001 based on previous scripts.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

// Create an Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add the auth token to headers
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Get token from local storage
    const token = localStorage.getItem("authToken");

    // Ensure headers object exists (Axios usually provides one, but good practice)
    if (!config.headers) {
      config.headers = new AxiosHeaders();
    }

    if (token) {
      // Add token to the Authorization header
      config.headers.set("Authorization", `Bearer ${token}`);
    } else {
      // Optionally remove Authorization header if no token exists
      // config.headers.delete('Authorization');
    }

    return config;
  },
  (error: AxiosError): Promise<AxiosError> => {
    // Handle request errors (e.g., network issues before request is sent)
    console.error("Axios request error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle global responses/errors
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    // Any status code within the range of 2xx cause this function to trigger
    // Do something with response data (e.g., logging)
    return response;
  },
  (error: AxiosError): Promise<AxiosError> => {
    // Any status codes outside the range of 2xx cause this function to trigger
    // Handle specific error statuses globally
    if (error.response) {
      const { status, data } = error.response;
      console.error("Axios response error:", status, data);

      if (status === 401) {
        // Unauthorized: Token might be invalid or expired
        console.error("Unauthorized access - 401. Logging out.");
        // Clear token and user data from localStorage
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        // Redirect to login page
        // Use window.location to redirect outside of React component lifecycle
        if (window.location.pathname !== "/login") {
          // Avoid redirect loop
          window.location.href = "/login";
        }
        // Optionally, could dispatch a logout action if using a state manager like Redux/Zustand
      } else if (status === 403) {
        // Forbidden: User does not have permission
        console.error("Forbidden access - 403.");
        // Maybe show a notification to the user
      }
      // Handle other errors (e.g., 404 Not Found, 500 Server Error)
    } else if (error.request) {
      // The request was made but no response was received
      console.error("Axios no response error:", error.request);
      // Handle network errors, server down, etc.
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Axios setup error:", error.message);
    }

    // Return a rejected promise to maintain the error flow
    return Promise.reject(error);
  }
);

// Import question bank types
import {
  IQuestionBank,
  CreateQuestionBankData,
  UpdateQuestionBankData,
  IQuestion,
  NewQuestionClientData,
  AiGenerationClientParams,
  CreateQuestionBankFromMenuClientData,
  UpdateQuestionClientData,
  NewAiQuestionGenerationParams,
} from "../types/questionBankTypes";

// Import menu types
import { IMenuClient, IMenuWithItemsClient } from "../types/menuTypes"; // Added import for menu types

// Import from staffTypes
import {
  ClientStaffQuizProgress,
  ClientStaffQuizProgressWithAttempts,
  StaffMemberWithData,
  StaffDetailsData,
  Filters as StaffFilters, // Added alias if Filters is too generic
  ClientStaffMemberQuizProgressDetails, // ADDED IMPORT
} from "../types/staffTypes";

// Import User types (assuming a simple one for now)
import { ClientUserMinimal } from "../types/user"; // UserRole Removed

// Import from quizTypes
import {
  ClientIQuiz,
  GenerateQuizFromBanksClientData,
  ClientQuizAttemptDetails,
  ClientQuizAttemptSubmitData,
  ClientSubmitAttemptResponse,
  IncorrectQuestionDetail,
  UpdateQuizClientData,
} from "../types/quizTypes";

import { ClientQuestionForAttempt } from "../types/questionTypes";

// Corrected MenuItem types import
import { MenuItem, MenuItemFormData } from "../types/menuItemTypes"; // ItemType Removed

// Import Auth types
import {
  AuthResponse,
  LoginCredentials,
  SignupDataClient,
} from "../types/authTypes";

// TEMPORARY: Directly import types from server for settings MVP. Refactor to shared types later.
import {
  UserProfileUpdateData,
  UserAPIResponse,
  PasswordChangeData as ServerPasswordChangeData,
} from "../../../server/src/types/authTypes";
// Corrected temporary imports for Restaurant types
import { RestaurantProfileUpdateData as ServerRestaurantProfileUpdateData } from "../../../server/src/services/RestaurantService";
import { IRestaurant as ServerIRestaurant } from "../../../server/src/models/Restaurant";

// Import Role types
import { IRole } from "../types/roleTypes";

// Auth Types (to be moved to ../types/authTypes.ts eventually)
// For now, keeping them here to break down the change, will move next.

// Import SOP types
import {
  ISopDocument,
  SopDocumentUploadData,
  SopDocumentListResponse,
  SopDocumentDetailResponse,
  SopDocumentStatusResponse,
} from "../types/sopManagement"; // Import SOP types

// Question Bank Endpoints

/**
 * Fetches all question banks for the current restaurant.
 */
export const getQuestionBanks = async (): Promise<IQuestionBank[]> => {
  const response = await api.get<{ data: IQuestionBank[] }>("/question-banks");
  return response.data.data; // Assuming backend wraps in a 'data' object
};

/**
 * Creates a new question bank.
 * @param data - The data for the new question bank.
 */
export const createQuestionBank = async (
  data: CreateQuestionBankData
): Promise<IQuestionBank> => {
  const response = await api.post<{ data: IQuestionBank }>(
    "/question-banks",
    data
  );
  return response.data.data; // Assuming backend wraps in a 'data' object
};

/**
 * Fetches a single question bank by its ID.
 * @param bankId - The ID of the question bank.
 */
export const getQuestionBankById = async (
  bankId: string
): Promise<IQuestionBank> => {
  const response = await api.get<{ data: IQuestionBank }>(
    `/question-banks/${bankId}`
  );
  return response.data.data;
};

/**
 * Updates an existing question bank.
 * @param bankId - The ID of the question bank to update.
 * @param data - The data to update the question bank with.
 */
export const updateQuestionBank = async (
  bankId: string,
  data: UpdateQuestionBankData
): Promise<IQuestionBank> => {
  const response = await api.patch<{ data: IQuestionBank }>(
    `/question-banks/${bankId}`,
    data
  );
  return response.data.data;
};

/**
 * Deletes a question bank by its ID.
 * @param bankId - The ID of the question bank to delete.
 */
export const deleteQuestionBank = async (bankId: string): Promise<void> => {
  await api.delete(`/question-banks/${bankId}`);
};

// Functions for managing questions within a bank

/**
 * Adds a question to a specific question bank.
 * @param bankId The ID of the question bank.
 * @param questionId The ID of the question to add.
 */
export const addQuestionToBank = async (
  bankId: string,
  questionId: string
): Promise<IQuestionBank> => {
  const response = await api.post<{ data: IQuestionBank }>(
    `/question-banks/${bankId}/questions`,
    { questionId } // Backend expects an object with questionId
  );
  return response.data.data;
};

/**
 * Removes a question from a specific question bank.
 * @param bankId The ID of the question bank.
 * @param questionId The ID of the question to remove.
 */
export const removeQuestionFromBank = async (
  bankId: string,
  questionId: string
): Promise<IQuestionBank> => {
  const response = await api.delete(
    `/question-banks/${bankId}/questions/${questionId}`
  );
  return response.data.data; // Assuming backend returns { success: true, data: updatedBank }
};

// Question Endpoints (Individual Question CRUD)

/**
 * Creates a new question.
 * @param data - The data for the new question.
 */
export const createQuestion = async (
  data: NewQuestionClientData
): Promise<IQuestion> => {
  // The backend /api/questions route handles setting restaurantId and createdBy: 'manual'
  const response = await api.post<{ data: IQuestion }>("/questions", data);
  return response.data.data; // Assuming backend wraps in a 'data' object and returns the full IQuestion
};

/**
 * Generates questions using AI.
 * @param params - Parameters for AI question generation.
 */
export const generateAiQuestions = async (
  params: AiGenerationClientParams
): Promise<IQuestion[]> => {
  const response = await api.post<{ data: IQuestion[] }>(
    "/questions/generate",
    params
  );
  return response.data.data;
};

// Create a new question bank from a menu
export const createQuestionBankFromMenu = async (
  data: CreateQuestionBankFromMenuClientData
): Promise<IQuestionBank> => {
  const response = await api.post<{
    message: string;
    data: IQuestionBank;
  }>("/question-banks/from-menu", data);
  return response.data.data;
};

// Menu Endpoints

/**
 * Fetches all menus for a specific restaurant.
 * @param restaurantId - The ID of the restaurant.
 */
export const getMenusByRestaurant = async (
  restaurantId: string,
  status?: "all" | "active" | "inactive"
): Promise<IMenuClient[]> => {
  let url = `/menus/restaurant/${restaurantId}`;
  if (status) {
    url += `?status=${status}`;
  }
  const response = await api.get<{
    success: boolean;
    count: number;
    data: IMenuClient[];
  }>(url);
  return response.data.data; // data is the array of IMenuClient
};

/**
 * Fetches a single menu by its ID, including its items.
 * @param menuId - The ID of the menu.
 */
export const getMenuWithItems = async (
  menuId: string
): Promise<IMenuWithItemsClient> => {
  const response = await api.get<{
    success: boolean;
    data: IMenuWithItemsClient;
  }>(`/menus/${menuId}`);
  return response.data.data; // data is the IMenuWithItemsClient object
};

// ADDED: Get a single question by ID
/**
 * Fetches a single question by its ID.
 * @param questionId - The ID of the question.
 */
export const getQuestionById = async (
  questionId: string
): Promise<IQuestion> => {
  const response = await api.get<{ data: IQuestion }>(
    `/questions/${questionId}`
  );
  return response.data.data;
};

// ADDED: Update an existing question
/**
 * Updates an existing question.
 * @param questionId - The ID of the question to update.
 * @param data - The data to update the question with.
 */
export const updateQuestion = async (
  questionId: string,
  data: UpdateQuestionClientData
): Promise<IQuestion> => {
  const response = await api.patch<{ data: IQuestion }>(
    `/questions/${questionId}`,
    data
  );
  return response.data.data;
};

// Quiz Endpoints

/**
 * Generates a new quiz definition from selected question banks.
 * @param data - The data for the new quiz definition.
 */
export const generateQuizFromQuestionBanks = async (
  data: GenerateQuizFromBanksClientData
): Promise<ClientIQuiz> => {
  // The POST request to generate a quiz from question banks
  // Server-side route is POST /api/quizzes/from-banks
  // MODIFIED: Updated expected response type and return value
  const response = await api.post<{
    status: string;
    message: string;
    data: ClientIQuiz; // The actual quiz is in the 'data' property of the response's data
  }>("/quizzes/from-banks", data);
  return response.data.data; // Extract the quiz object from the nested data property
};

// ADDED: Function to get the total number of quizzes for the restaurant
/**
 * Fetches the total number of active quizzes for the current restaurant.
 */
export const getQuizCount = async (): Promise<number> => {
  const response = await api.get<{ count: number }>("/quizzes/count"); // Endpoint is /api/quizzes/count
  return response.data.count;
};

// ADDED: Function to get all quizzes for the restaurant
/**
 * Fetches all quizzes for the current restaurant.
 */
export const getQuizzes = async (): Promise<ClientIQuiz[]> => {
  const response = await api.get<{ quizzes: ClientIQuiz[] }>("/quizzes"); // Corrected: Server sends { quizzes: [...] }
  return response.data.quizzes;
};

// ADDED: Function to update quiz details
/**
 * Updates specific details of a quiz.
 * @param quizId - The ID of the quiz to update.
 * @param quizData - The partial data to update the quiz with.
 */
export const updateQuizDetails = async (
  quizId: string,
  quizData: UpdateQuizClientData
): Promise<ClientIQuiz> => {
  const response = await api.put<{ data: ClientIQuiz }>(
    `/quizzes/${quizId}`,
    quizData
  );
  return response.data.data;
};

/**
 * Resets all staff progress and attempts for a specific quiz.
 * @param quizId The ID of the quiz to reset progress for.
 */
export const resetQuizProgress = async (
  quizId: string
): Promise<{
  message: string;
  data: { resetProgressCount: number; resetAttemptsCount: number };
}> => {
  const response = await api.post<{
    message: string;
    data: { resetProgressCount: number; resetAttemptsCount: number };
  }>(`/quizzes/${quizId}/reset-progress`);
  return response.data;
};

// New types and services for staff dashboard

/**
 * Fetches available quizzes for the current staff member's restaurant.
 */
export const getAvailableQuizzesForStaff = async (): Promise<ClientIQuiz[]> => {
  // Updated to use the new dedicated endpoint for staff
  const response = await api.get<{ quizzes: ClientIQuiz[] }>(
    "/quizzes/available-for-staff"
  );
  return response.data.quizzes;
};

/**
 * Fetches detailed information for a specific quiz attempt, including incorrect answers.
 * @param attemptId - The ID of the quiz attempt.
 */
export const getQuizAttemptDetails = async (
  attemptId: string
): Promise<ClientQuizAttemptDetails> => {
  // Define a type for the actual backend response structure
  type BackendQuizAttemptDetails = {
    _id: string;
    quizId: string;
    quizTitle: string;
    staffUserId: string; // staffUserId from backend
    score: number;
    totalQuestions: number;
    attemptDate: Date; // attemptDate is a Date from backend
    incorrectQuestions: IncorrectQuestionDetail[]; // Assuming IncorrectQuestionDetail is compatible
  };

  const response = await api.get<{ data: BackendQuizAttemptDetails }>(
    `/quizzes/attempts/${attemptId}`
  );

  // Transform the backend data to match ClientQuizAttemptDetails
  const backendData = response.data.data;
  const clientData: ClientQuizAttemptDetails = {
    _id: backendData._id,
    quizId: backendData.quizId,
    quizTitle: backendData.quizTitle,
    userId: backendData.staffUserId, // Map staffUserId to userId
    score: backendData.score,
    totalQuestions: backendData.totalQuestions,
    attemptDate: new Date(backendData.attemptDate).toISOString(), // Convert Date to ISO string
    incorrectQuestions: backendData.incorrectQuestions,
  };
  return clientData;
};

/**
 * Fetches the progress for the current staff member on a specific quiz, including all attempt summaries.
 * MODIFIED to reflect new backend response structure.
 */
export const getMyQuizProgress = async (
  quizId: string
): Promise<ClientStaffQuizProgressWithAttempts | null> => {
  const response = await api.get<{
    data: ClientStaffQuizProgressWithAttempts | null;
  }>(`/quizzes/${quizId}/my-progress`);
  return response.data.data;
};

// Type for staff progress as returned for a restaurant owner viewing all staff for a quiz.
// ClientStaffQuizProgress can be reused if staffUserId is populated with name details.
// If not, a new type might be needed that includes IUser partial for staff details.
// For now, assuming ClientStaffQuizProgress is sufficient and backend populates staff name.

/**
 * Fetches all staff progress for a specific quiz (for restaurant owner).
 * @param quizId - The ID of the quiz.
 */
export const getRestaurantQuizStaffProgress = async (
  quizId: string
): Promise<ClientStaffQuizProgress[]> => {
  const response = await api.get<{
    data: ClientStaffMemberQuizProgressDetails[];
  }>(`/quizzes/${quizId}/restaurant-progress`);
  // Backend returns IStaffMemberQuizProgressDetails[], map to ClientStaffQuizProgress[]
  const backendData: ClientStaffMemberQuizProgressDetails[] =
    response.data.data;

  if (!backendData) {
    return []; // Handle null or undefined gracefully
  }

  return backendData.map((item) => {
    // The _id for ClientStaffQuizProgress should be unique for the list key.
    // Using staffMember._id as it's guaranteed to be unique per staff entry.
    // If StaffQuizProgress document _id is needed for other operations, backend should provide it.
    const staffProgressEntry: ClientStaffQuizProgress = {
      _id: item.staffMember._id, // Use staff member's ID as the unique key for this mapped object
      staffUserId: item.staffMember, // This is ClientUserMinimal, includes name, email
      quizId: quizId, // Add quizId to each item for context if needed by modal logic
      restaurantId: item.staffMember.restaurantId || "", // Get restaurantId from staffMember if available
      seenQuestionIds: item.progress?.seenQuestionIds || [],
      totalUniqueQuestionsInSource:
        item.progress?.totalUniqueQuestionsInSource || 0,
      isCompletedOverall: item.progress?.isCompletedOverall || false,
      lastAttemptTimestamp: item.progress?.lastAttemptTimestamp,
      averageScore: item.averageScoreForQuiz,
      // numberOfAttempts: item.numberOfAttempts, // Add if modal needs it
      // attempts: item.attempts, // Add if modal needs it
    };
    return staffProgressEntry;
  });
};

/**
 * Deletes a quiz by its ID.
 * @param quizId - The ID of the quiz to delete.
 */
export const deleteQuiz = async (quizId: string): Promise<void> => {
  await api.delete(`/quizzes/${quizId}`);
};

// Types and services for Quiz Taking Page

// Quiz Taking Page services

/**
 * Starts a quiz attempt and fetches questions.
 * @param quizId - The ID of the quiz.
 */
export const startQuizAttempt = async (
  quizId: string
): Promise<ClientQuestionForAttempt[]> => {
  const response = await api.post<{
    data: ClientQuestionForAttempt[];
  }>(`/quizzes/${quizId}/start-attempt`);
  return response.data.data; // Backend now expected to return { data: questions[] }
};

/**
 * Submits a quiz attempt.
 * @param quizId - The ID of the quiz.
 * @param attemptData - The submission data.
 */
export const submitQuizAttempt = async (
  quizId: string,
  attemptData: ClientQuizAttemptSubmitData
): Promise<ClientSubmitAttemptResponse> => {
  const response = await api.post<{ data: ClientSubmitAttemptResponse }>(
    `/quizzes/${quizId}/submit-attempt`,
    attemptData
  );
  return response.data.data; // Backend returns { data: { score, totalQuestionsAttempted, ... } }
};

// Auth Endpoints (using imported types)
export const login = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/login", credentials);
  // TODO: Persist token and user data upon successful login
  // localStorage.setItem("authToken", response.data.token);
  // localStorage.setItem("authUser", JSON.stringify(response.data.user));
  return response.data;
};

export const signup = async (
  signupData: SignupDataClient
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/signup", signupData);
  // TODO: Persist token and user data upon successful signup
  // localStorage.setItem("authToken", response.data.token);
  // localStorage.setItem("authUser", JSON.stringify(response.data.user));
  return response.data;
};

export const getCurrentUser = async (): Promise<{
  user: ClientUserMinimal;
}> => {
  const response = await api.get<{ user: ClientUserMinimal }>("/auth/me");
  return response.data;
};

// ADDED: Function to process reviewed AI questions for a question bank
export const processReviewedAiQuestions = async (
  bankId: string,
  data: {
    acceptedQuestions: Partial<IQuestion>[];
    updatedQuestions: Partial<IQuestion & { _id: string }>[];
    deletedQuestionIds: string[];
  }
): Promise<IQuestionBank> => {
  const response = await api.post<{
    status: string;
    message: string;
    data: IQuestionBank;
  }>(`/question-banks/${bankId}/process-reviewed-questions`, data);
  return response.data.data;
};

// Staff Endpoints

export const getStaffList = async (
  filters?: StaffFilters
): Promise<StaffMemberWithData[]> => {
  const response = await api.get<{ staff: StaffMemberWithData[] }>("/staff", {
    params: filters,
  });
  return response.data.staff;
};

export const getStaffDetails = async (
  staffId: string
): Promise<StaffDetailsData> => {
  const response = await api.get<{ staff: StaffDetailsData }>(
    `/staff/${staffId}`
  );
  return response.data.staff;
};

export const updateStaffRole = async (
  staffId: string,
  professionalRole: string
): Promise<{ message: string; staff: StaffMemberWithData }> => {
  const response = await api.patch<{
    message: string;
    staff: StaffMemberWithData;
  }>(`/staff/${staffId}`, { professionalRole });
  return response.data;
};

/**
 * Updates the assigned role for a specific staff member.
 * @param staffId - The ID of the staff member.
 * @param assignedRoleId - The ID of the role to assign, or null to unassign.
 * @returns A promise resolving to the success message and updated staff member data.
 */
export const updateStaffAssignedRole = async (
  staffId: string,
  assignedRoleId: string | null
): Promise<{ message: string; staff: StaffMemberWithData }> => {
  const response = await api.patch<{
    message: string;
    staff: StaffMemberWithData; // Assuming backend returns a compatible staff object
  }>(`/staff/${staffId}/assigned-role`, { assignedRoleId });
  return response.data;
};

export const deleteStaffMember = async (
  staffId: string
): Promise<{ message: string }> => {
  const response = await api.delete<{ message: string }>(`/staff/${staffId}`);
  return response.data;
};

// Menu Item Endpoints

const transformMenuItemFormData = (
  formData: Partial<MenuItemFormData>
): any => {
  const backendData: any = { ...formData };

  if (formData.price !== undefined) {
    const priceAsNumber = parseFloat(formData.price);
    backendData.price = isNaN(priceAsNumber) ? undefined : priceAsNumber;
  }

  if (formData.ingredients !== undefined) {
    backendData.ingredients = formData.ingredients
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "");
  }

  // Remove properties that are purely for form state if any (e.g. empty string for itemType)
  if (backendData.itemType === "") {
    delete backendData.itemType; // Or handle as per backend validation if empty string is disallowed
  }

  return backendData;
};

export const createMenuItem = async (
  data: MenuItemFormData
): Promise<MenuItem> => {
  const backendData = transformMenuItemFormData(data);
  // Ensure all required fields for creation are present if not optional in MenuItem model
  // For example, if menuId is required but not in MenuItemFormData, it needs to be added.
  // Assuming menuId is added elsewhere or part of a different flow for now.
  const response = await api.post<{ item: MenuItem }>("/items", backendData);
  return response.data.item;
};

export const getMenuItems = async (menuId?: string): Promise<MenuItem[]> => {
  const params = menuId ? { menuId } : {};
  const response = await api.get<{ items: MenuItem[] }>("/items", { params });
  return response.data.items;
};

export const updateMenuItem = async (
  itemId: string,
  data: Partial<MenuItemFormData>
): Promise<MenuItem> => {
  const backendData = transformMenuItemFormData(data);
  const response = await api.put<{ item: MenuItem }>(
    `/items/${itemId}`,
    backendData
  );
  return response.data.item;
};

export const deleteMenuItem = async (
  itemId: string
): Promise<{ message: string }> => {
  const response = await api.delete<{ message: string }>(`/items/${itemId}`);
  return response.data;
};

// Menu specific actions

export const createMenu = async (menuData: {
  name: string;
  description?: string;
}): Promise<IMenuClient> => {
  const response = await api.post<{ data: IMenuClient }>("/menus", menuData);
  return response.data.data;
};

export const updateMenu = async (
  menuId: string,
  menuData: { name?: string; description?: string }
): Promise<IMenuClient> => {
  const response = await api.put<{ data: IMenuClient }>(
    `/menus/${menuId}`,
    menuData
  );
  return response.data.data;
};

export const deleteMenu = async (
  menuId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string }>(
    `/menus/${menuId}`
  );
  return response.data;
};

export const deleteMenuCategory = async (
  menuId: string,
  categoryName: string
): Promise<any> => {
  const response = await api.delete(
    `/menus/${menuId}/categories/${encodeURIComponent(categoryName)}`
  );
  return response.data;
};

// PDF Upload for Menu

export const processPdfMenuUpload = async (
  restaurantId: string,
  formData: FormData
): Promise<IMenuWithItemsClient> => {
  const response = await api.post<{
    message: string;
    data: IMenuWithItemsClient;
  }>(`/menus/upload/pdf/${restaurantId}`, formData, {
    headers: {
      // Axios handles Content-Type for FormData automatically
    },
  });
  return response.data.data;
};

// Role Endpoints
/**
 * Fetches all roles for the current restaurant.
 * @param restaurantId - The ID of the restaurant to fetch roles for.
 */
export const getRoles = async (restaurantId: string): Promise<IRole[]> => {
  try {
    const response = await api.get<{
      status?: string;
      results?: number;
      data: { roles: IRole[] }; // Corrected: roles array is nested under 'roles' key
    }>(`/roles?restaurantId=${restaurantId}`);

    // Updated access path to response.data.data.roles
    if (
      response &&
      response.data &&
      response.data.data &&
      Array.isArray(response.data.data.roles)
    ) {
      return response.data.data.roles;
    } else {
      console.error(
        "getRoles API call: response.data.data.roles was not an array or path is invalid. Response:",
        response
      );
      return [];
    }
  } catch (error) {
    console.error("Error in getRoles API call execution:", error);
    return [];
  }
};

/**
 * Creates a new role.
 * @param roleData - The data for the new role.
 */
export const createRole = async (roleData: {
  name: string;
  description?: string;
  restaurantId: string; // Ensure restaurantId is part of the payload if needed by backend
}): Promise<IRole> => {
  const response = await api.post<{ data: IRole }>(`/roles`, roleData);
  return response.data.data;
};

/**
 * Updates an existing role.
 * @param roleId - The ID of the role to update.
 * @param roleData - The data to update the role with.
 */
export const updateRole = async (
  roleId: string,
  roleData: { name?: string; description?: string }
): Promise<IRole> => {
  const response = await api.put<{ data: IRole }>(`/roles/${roleId}`, roleData);
  return response.data.data;
};

/**
 * Deletes a role by its ID.
 * @param roleId - The ID of the role to delete.
 */
export const deleteRole = async (roleId: string): Promise<void> => {
  await api.delete(`/roles/${roleId}`);
};

// New function to trigger AI Question Generation via the /api/ai/generate-questions endpoint
export const triggerAiQuestionGenerationProcess = async (
  params: NewAiQuestionGenerationParams // This will now refer to the imported type
): Promise<IQuestion[]> => {
  // Assuming the backend returns the array of pending IQuestion objects
  const response = await api.post<{ data: IQuestion[] }>(
    `/ai/generate-questions`,
    params
  );
  return response.data.data; // Adjust based on actual backend response structure
};

// Function to fetch questions pending review
export const getPendingReviewQuestions = async (): Promise<IQuestion[]> => {
  // Backend route GET /api/questions/pending-review uses authenticated user's restaurantId
  const response = await api.get<{ data: IQuestion[] }>(
    "/questions/pending-review"
  );
  return response.data.data; // Assuming backend wraps in a 'data' object like other question endpoints
};

export const updateMenuActivationStatus = async (
  menuId: string,
  isActive: boolean
): Promise<IMenuClient> => {
  const response = await api.patch<{ success: boolean; data: IMenuClient }>(
    `/menus/${menuId}/status`,
    { isActive }
  );
  return response.data.data;
};

// User Profile Endpoints
export interface UpdateUserProfileResponse {
  user: UserAPIResponse;
  message: string;
}

export const updateUserProfile = async (
  profileData: UserProfileUpdateData
): Promise<UpdateUserProfileResponse> => {
  const response = await api.put<UpdateUserProfileResponse>(
    "/auth/me",
    profileData
  );
  return response.data;
};

// Client specific type for password change form
export interface PasswordChangeDataClient {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string; // Used for client-side validation
}

export interface ChangePasswordResponse {
  message: string;
}

export const changePassword = async (
  passwordData: Pick<
    ServerPasswordChangeData,
    "currentPassword" | "newPassword"
  >
): Promise<ChangePasswordResponse> => {
  const response = await api.post<ChangePasswordResponse>(
    "/auth/change-password",
    passwordData
  );
  return response.data;
};

// Restaurant Profile Endpoints
// Client-side representation of restaurant data
export interface ClientRestaurant {
  _id: string;
  name?: string;
  owner?: string; // ObjectId as string
  contactEmail?: string;
  // Add other fields that are relevant to the client, ensure types are client-friendly (e.g. string for ObjectId)
}

export interface UpdateRestaurantProfileResponse {
  restaurant: ServerIRestaurant; // Expecting full server type in raw response
  message: string;
}

// Mapped response type
export interface MappedUpdateRestaurantProfileResponse {
  restaurant: ClientRestaurant;
  message: string;
}

export const updateRestaurantProfile = async (
  restaurantId: string,
  profileData: ServerRestaurantProfileUpdateData
): Promise<MappedUpdateRestaurantProfileResponse> => {
  const response = await api.put<UpdateRestaurantProfileResponse>(
    `/restaurants/${restaurantId}`,
    profileData
  );
  // Manually map _id and other ObjectId fields to string for the client model
  const serverRestaurant = response.data.restaurant;
  const clientRestaurant: ClientRestaurant = {
    ...serverRestaurant,
    _id: serverRestaurant._id.toString(),
    owner: serverRestaurant.owner.toString(), // Assuming owner is always present and is ObjectId
    // Ensure any other ObjectId fields are converted to string here
  };
  return {
    restaurant: clientRestaurant,
    message: response.data.message,
  };
};

// Staff Invitation
export interface InviteStaffData {
  email: string;
  // Potentially name, professionalRole if creating user immediately
}

export interface InviteStaffResponse {
  message: string;
}

export const inviteStaff = async (
  restaurantId: string,
  inviteData: InviteStaffData
): Promise<InviteStaffResponse> => {
  const response = await api.post<InviteStaffResponse>(
    `/restaurants/${restaurantId}/staff/invite`,
    inviteData
  );
  return response.data;
};

// Account Deletion
export interface DeleteAccountResponse {
  message: string;
}

// User self-deletes their account
export const deleteUserAccount = async (): Promise<DeleteAccountResponse> => {
  const response = await api.delete<DeleteAccountResponse>("/auth/me");
  return response.data;
};

// Restaurant owner deletes their restaurant
export const deleteRestaurantAccount = async (
  restaurantId: string
): Promise<DeleteAccountResponse> => {
  const response = await api.delete<DeleteAccountResponse>(
    `/restaurants/${restaurantId}`
  );
  return response.data;
};

// === SOP Document Management API ===

/**
 * Uploads a new SOP document.
 * @param data - The title and file for the SOP document.
 * @returns The initial SOP document data from the backend.
 */
export const uploadSopDocument = async (
  data: SopDocumentUploadData
): Promise<{
  message: string;
  documentId: string;
  title: string;
  status: string;
}> => {
  const formData = new FormData();
  formData.append("title", data.title);
  formData.append("sopDocument", data.sopDocument);

  // The response from backend for upload is: { message, documentId, title, status }
  const response = await api.post("/sop-documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

/**
 * Lists all SOP documents for the current user's restaurant.
 * @returns A promise resolving to the list of SOP documents.
 */
export const listSopDocuments = async (): Promise<SopDocumentListResponse> => {
  const response = await api.get("/sop-documents");
  return response.data;
};

/**
 * Fetches the details of a specific SOP document.
 * @param documentId - The ID of the SOP document.
 * @returns A promise resolving to the SOP document details.
 */
export const getSopDocumentDetails = async (
  documentId: string
): Promise<SopDocumentDetailResponse> => {
  const response = await api.get(`/sop-documents/${documentId}`);
  return response.data;
};

/**
 * Deletes a specific SOP document.
 * @param documentId - The ID of the SOP document to delete.
 * @returns A promise resolving when the deletion is complete.
 */
export const deleteSopDocument = async (documentId: string): Promise<void> => {
  await api.delete(`/sop-documents/${documentId}`);
  // DELETE typically returns 204 No Content, so no response.data to return here.
};

/**
 * Fetches the processing status of a specific SOP document.
 * @param documentId - The ID of the SOP document.
 * @returns A promise resolving to the SOP document's status information.
 */
export const getSopDocumentStatus = async (
  documentId: string
): Promise<SopDocumentStatusResponse> => {
  const response = await api.get(`/sop-documents/${documentId}/status`);
  return response.data;
};

// === End SOP Document Management API ===

// Default export
export default api;
