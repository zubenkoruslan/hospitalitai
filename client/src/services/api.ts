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
  // REMOVED: Default Content-Type header. Axios will set it automatically.
  // headers: {
  //   "Content-Type": "application/json",
  // },
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
  CreateQuestionBankClientData,
  UpdateQuestionBankData,
  IQuestion,
  NewQuestionClientData,
  AiGenerationClientParams,
  UpdateQuestionClientData,
  NewAiQuestionGenerationParams,
  QuestionType,
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
  // IStaff, // Commenting out - not found in staffTypes.ts
  // StaffCreationData, // Commenting out - not found in staffTypes.ts
  // StaffUpdateData, // Commenting out - not found in staffTypes.ts
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

// Import SOP types
import // ISopDocumentListItem, // Assuming this might be from the old sopManagement and not used by new functions
// SopDocumentListResponse, // ^
// SopDocumentDetailResponse, // ^
// SopDocumentStatusResponse, // ^
"../types/sopManagement"; // Commenting out old sopManagement imports if types are now in sopTypes

// Import from sopTypes - consolidated import
import {
  ISopDocument,
  SopDocumentUploadData, // Added SopDocumentUploadData here
} from "../types/sopTypes";
// Remove: import { ISopDocument as ISopDocumentType } from "../types/sopTypes"; // Removed duplicate/aliased import

// Import menu upload types for conflict processing
import {
  ProcessConflictResolutionRequest,
  ProcessConflictResolutionResponse,
  FinalImportRequestBody,
  ImportResult,
} from "../types/menuUploadTypes";

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
  data: CreateQuestionBankClientData
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

/**
 * Generates AI questions from menu for a question bank - Simplified approach
 * @param params - Parameters for menu-based AI question generation
 */
export const generateMenuAiQuestions = async (params: {
  menuId: string;
  bankId: string;
  categoriesToFocus: string[];
  numQuestionsPerItem: number;
}): Promise<IQuestion[]> => {
  const response = await api.post<{ data: IQuestion[] }>(
    "/questions/generate",
    params
  );
  return response.data.data;
};

// Create a new question bank from a menu
export const createQuestionBankFromMenu = async (
  data: CreateQuestionBankClientData
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
  // The backend directly returns an array of IMenuClient, not nested in a 'data' object.
  const response = await api.get<IMenuClient[]>(url);
  return response.data; // Return response.data directly
};

/**
 * Fetches a single menu by its ID, including its items.
 * @param menuId - The ID of the menu.
 */
export const getMenuWithItems = async (
  menuId: string
): Promise<IMenuWithItemsClient> => {
  const response = await api.get<IMenuWithItemsClient>(`/menus/${menuId}`, {
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
  return response.data; // Changed from response.data.data
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
  const response = await api.get<{ data: ClientQuizAttemptDetails }>(
    `/quizzes/attempts/${attemptId}`
  );
  return response.data.data;
};

/**
 * Fetches all incorrect answers across all quiz attempts for a specific staff member.
 * @param staffId - The ID of the staff member.
 * @param quizId - Optional: Filter by specific quiz ID.
 */
export const getAllIncorrectAnswersForStaff = async (
  staffId: string,
  quizId?: string
): Promise<{
  staffInfo: {
    id: string;
    name: string;
    email: string;
  };
  incorrectQuestions: Array<{
    questionText: string;
    userAnswer: string;
    correctAnswer: string;
    explanation?: string;
    quizTitle: string;
    attemptDate: Date;
    attemptId: string;
    timesIncorrect: number;
  }>;
  summary: {
    totalAttempts: number;
    totalIncorrectQuestions: number;
    uniqueIncorrectQuestions: number;
    mostMissedQuestion?: {
      questionText: string;
      timesIncorrect: number;
    };
  };
}> => {
  const params = quizId ? { quizId } : {};
  const response = await api.get<{
    status: string;
    data: {
      staffInfo: {
        id: string;
        name: string;
        email: string;
      };
      incorrectQuestions: Array<{
        questionText: string;
        userAnswer: string;
        correctAnswer: string;
        explanation?: string;
        quizTitle: string;
        attemptDate: Date;
        attemptId: string;
        timesIncorrect: number;
      }>;
      summary: {
        totalAttempts: number;
        totalIncorrectQuestions: number;
        uniqueIncorrectQuestions: number;
        mostMissedQuestion?: {
          questionText: string;
          timesIncorrect: number;
        };
      };
    };
  }>(`/quizzes/staff/${staffId}/all-incorrect-answers`, { params });
  return response.data.data;
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

/**
 * Manually update quiz snapshots when question banks have changed
 */
export const updateQuizSnapshots = async (): Promise<{
  message: string;
  data: {
    updatedCount: number;
    totalQuizzes: number;
    questionBanksProcessed: number;
  };
}> => {
  const response = await api.post<{
    status: string;
    message: string;
    data: {
      updatedCount: number;
      totalQuizzes: number;
      questionBanksProcessed: number;
    };
  }>("/quizzes/update-snapshots");
  return {
    message: response.data.message,
    data: response.data.data,
  };
};

// Types and services for Quiz Taking Page

// Quiz Taking Page services

/**
 * Starts a quiz attempt and fetches questions.
 * @param quizId - The ID of the quiz.
 */
export const startQuizAttempt = async (
  quizId: string
): Promise<{ quizTitle: string; questions: ClientQuestionForAttempt[] }> => {
  const response = await api.post<{
    data: { quizTitle: string; questions: ClientQuestionForAttempt[] };
  }>(`/quizzes/${quizId}/start-attempt`);
  return response.data.data; // Backend now returns { data: { quizTitle, questions } }
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

/**
 * Adds AI-generated questions to a question bank with pending_review status
 * @param bankId The ID of the question bank
 * @param questions The questions to add with pending_review status
 */
export const addQuestionsAsPendingReview = async (
  bankId: string,
  questions: Partial<IQuestion>[]
): Promise<IQuestionBank> => {
  const response = await api.post<{
    status: string;
    message: string;
    data: IQuestionBank;
  }>(`/question-banks/${bankId}/add-pending-questions`, { questions });
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

interface TransformedMenuItemData extends Record<string, unknown> {
  price?: number;
  ingredients?: string[];
  wineStyle?: string;
  wineColor?: string;
  grapeVariety?: string[];
  vintage?: number;
  producer?: string;
  region?: string;
  servingOptions?: Array<{ size: string; price: number }>;
  suggestedPairingsText?: string[];
  itemType?: string;
}

const transformMenuItemFormData = (
  formData: Partial<MenuItemFormData>
): TransformedMenuItemData => {
  const backendData: TransformedMenuItemData = {
    ...formData,
  } as TransformedMenuItemData;

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

  // Handle wine-specific fields if itemType is wine
  if (formData.itemType === "wine") {
    // Handle wine style (required for wine items)
    if (formData.wineStyle !== undefined) {
      backendData.wineStyle = formData.wineStyle.trim() || undefined;
    }

    // Handle wine color
    if (formData.wineColor !== undefined) {
      backendData.wineColor = formData.wineColor.trim() || undefined;
    }

    // Handle grape variety (comma-separated string to array)
    if (formData.grapeVariety !== undefined) {
      backendData.grapeVariety = formData.grapeVariety
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "");
    }

    // Handle vintage (string to number)
    if (formData.vintage !== undefined) {
      const vintageAsNumber = parseInt(formData.vintage);
      backendData.vintage = isNaN(vintageAsNumber)
        ? undefined
        : vintageAsNumber;
    }

    // Handle producer (keep as string, just trim)
    if (formData.producer !== undefined) {
      backendData.producer = formData.producer.trim() || undefined;
    }

    // Handle region (keep as string, just trim)
    if (formData.region !== undefined) {
      backendData.region = formData.region.trim() || undefined;
    }

    // Handle serving options (JSON string to array of objects)
    if (formData.servingOptions !== undefined) {
      try {
        const servingOptionsArray = JSON.parse(formData.servingOptions);
        backendData.servingOptions = Array.isArray(servingOptionsArray)
          ? servingOptionsArray.filter(
              (opt: unknown): opt is { size: string; price: number } =>
                typeof opt === "object" &&
                opt !== null &&
                "size" in opt &&
                "price" in opt &&
                typeof (opt as { size: unknown }).size === "string" &&
                typeof (opt as { price: unknown }).price === "number"
            )
          : [];
      } catch {
        // If JSON parsing fails, try to handle as empty array
        backendData.servingOptions = [];
      }
    }

    // Handle suggested food pairings (comma-separated string to array)
    if (formData.suggestedPairingsText !== undefined) {
      backendData.suggestedPairingsText = formData.suggestedPairingsText
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "");
    }
  } else {
    // For non-wine items, exclude all wine-specific fields from the request
    delete backendData.wineStyle;
    delete backendData.wineColor;
    delete backendData.producer;
    delete backendData.grapeVariety;
    delete backendData.vintage;
    delete backendData.region;
    delete backendData.servingOptions;
    delete backendData.suggestedPairingsText;
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

export const bulkDeleteMenuItems = async (
  itemIds: string[]
): Promise<{
  message: string;
  deletedCount: number;
  failedCount: number;
  errors?: string[];
}> => {
  const response = await api.delete<{
    message: string;
    deletedCount: number;
    failedCount: number;
    errors?: string[];
  }>("/items/bulk", {
    data: { itemIds },
  });
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
): Promise<{ message: string }> => {
  const response = await api.delete<{ message: string }>(
    `/menus/${menuId}/categories/${categoryName}`
  );
  return response.data; // Assuming backend sends back some confirmation or updated menu
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

/**
 * Deletes the currently authenticated user's account.
 * @returns A promise resolving to an object with a message.
 */
export const deleteUserAccount = async (): Promise<{ message: string }> => {
  const response = await api.delete<{ message: string }>("/auth/me");
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

/**
 * Deletes a restaurant account.
 * @param restaurantId - The ID of the restaurant to delete.
 * @returns A promise resolving to an object with a message.
 */
export const deleteRestaurantAccount = async (
  restaurantId: string // Added a comment here
): Promise<{ message: string }> => {
  const response = await api.delete<{ message: string }>(
    `/restaurants/${restaurantId}`
  );
  return response.data;
};

// Staff Invitation
export interface InviteStaffData {
  email: string;
  // Potentially name, professionalRole if creating user immediately
}

export interface InviteStaffResponse {
  message: string;
}

/**
 * Invites a new staff member to the restaurant.
 * @param data - The email of the staff member to invite.
 * @returns A promise resolving to the server response message.
 */
export const inviteStaff = async (
  data: InviteStaffData
): Promise<InviteStaffResponse> => {
  const response = await api.post<InviteStaffResponse>("/staff/invite", data);
  return response.data;
};

// === SOP Document Management API ===

/**
 * Uploads a new SOP document.
 * @param data - The title, file, and optional description for the SOP document.
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
  if (data.description) {
    formData.append("description", data.description);
  }
  // Corrected: Assuming SopDocumentUploadData has a field like 'sopDocument' for the file
  formData.append("sopDocument", data.sopDocument); // Changed from data.sopDocumentFile

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
export const listRestaurantSopDocuments =
  async (): // restaurantId: string // No longer needed as backend uses authenticated user's restaurantId
  Promise<ISopDocument[]> => {
    // Corrected endpoint: GET /api/sop-documents (restaurantId implicitly handled by backend)
    // Backend will use req.user.restaurantId from the auth token.
    const response = await api.get<{ data: ISopDocument[] }>(`/sop-documents`);
    // Adjust response data access based on your actual API structure.
    // Common patterns: response.data.data, response.data.documents, or just response.data if it's the array itself.
    if (
      response.data &&
      Array.isArray((response.data as { data?: ISopDocument[] }).data)
    ) {
      return (response.data as { data: ISopDocument[] }).data;
    }
    if (Array.isArray(response.data)) {
      // Fallback if response.data is the array directly
      return response.data as ISopDocument[];
    }
    return []; // Default to empty array if data is not in expected format
  };

/**
 * Fetches the details of a specific SOP document.
 * @param documentId - The ID of the SOP document.
 * @returns A promise resolving to the SOP document details.
 */
export const getSopDocumentDetails = async (
  documentId: string
): Promise<ISopDocument> => {
  const response = await api.get<{ data: ISopDocument }>(
    `/sop-documents/${documentId}`
  );
  return response.data.data || response.data; // Adjust based on actual API response structure
};

/**
 * Deletes a specific SOP document.
 * @param documentId - The ID of the SOP document to delete.
 * @returns A promise resolving when the deletion is complete.
 */
export const deleteSopDocument = async (documentId: string): Promise<void> => {
  await api.delete(`/sop-documents/${documentId}`);
};

/**
 * Function to list SOP documents for a restaurant, filtered for question bank creation.
 * @param restaurantId The ID of the restaurant.
 * @returns A promise resolving to a list of processed SOP documents.
 */
export const listSopDocumentsFiltered = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _restaurantId: string // Kept for now, might be useful for client-side logic even if not sent to API
): Promise<ISopDocument[]> => {
  const response = await api.get<{
    data?: ISopDocument[];
    documents?: ISopDocument[]; // For flexibility if backend changes wrapper key
    // Or if the backend returns the array directly:
    // ISopDocument[]
  }>("/sop-documents", { params: { status: "processed" } }); // Corrected endpoint and params usage

  // Adjust access to response.data based on your actual API structure.
  // Assuming the backend returns an object with a 'data' or 'documents' key containing the array.
  if (
    response.data &&
    Array.isArray((response.data as { data?: ISopDocument[] }).data)
  ) {
    return (response.data as { data: ISopDocument[] }).data;
  }
  if (
    response.data &&
    Array.isArray((response.data as { documents?: ISopDocument[] }).documents)
  ) {
    return (response.data as { documents: ISopDocument[] }).documents;
  }
  // Fallback if response.data is the array itself (less common for consistent APIs)
  if (Array.isArray(response.data)) {
    return response.data as ISopDocument[];
  }
  return [];
};

/**
 * Triggers AI question generation for a specific SOP document.
 * @param sopDocumentId The ID of the SOP document.
 * @returns The updated SOP document with status PENDING or an error.
 */
export const triggerSopQuestionGeneration = async (
  sopDocumentId: string
): Promise<ISopDocument> => {
  const response = await api.post<{
    message: string;
    sopDocument: ISopDocument;
  }>(`/sop-documents/${sopDocumentId}/generate-questions`);
  return response.data.sopDocument;
};

/**
 * Data for creating a new SOP category.
 */
interface NewSopCategoryData {
  name: string;
  content: string;
  parentCategoryId?: string | null;
}

/**
 * Adds a category to a specific SOP document.
 * @param documentId The ID of the SOP document.
 * @param categoryData The data for the new category (name, content, parentCategoryId).
 * @returns The updated SOP document.
 */
export const addSopCategory = async (
  documentId: string,
  categoryData: NewSopCategoryData
): Promise<ISopDocument> => {
  const response = await api.post<{
    status: string;
    data: ISopDocument;
  }>(`/sop-documents/${documentId}/categories`, categoryData);
  return response.data.data;
};

/**
 * Deletes a category from a specific SOP document.
 * @param documentId The ID of the SOP document.
 * @param categoryId The ID of the category to delete.
 * @returns The updated SOP document.
 */
export const deleteSopCategory = async (
  documentId: string,
  categoryId: string
): Promise<ISopDocument> => {
  const response = await api.delete<{
    status: string;
    data: ISopDocument;
  }>(`/sop-documents/${documentId}/categories/${categoryId}`);
  return response.data.data;
};

/**
 * Data for updating an existing SOP category.
 */
interface UpdateSopCategoryData {
  name?: string;
  content?: string;
  parentCategoryId?: string | null; // Allow moving category
}

/**
 * Updates a category within a specific SOP document.
 * @param documentId The ID of the SOP document.
 * @param categoryId The ID of the category to update.
 * @param categoryData The data to update the category with.
 * @returns The updated SOP document.
 */
export const updateSopCategory = async (
  documentId: string,
  categoryId: string,
  categoryData: UpdateSopCategoryData
): Promise<ISopDocument> => {
  const response = await api.put<{
    status: string;
    data: ISopDocument;
  }>(`/sop-documents/${documentId}/categories/${categoryId}`, categoryData);
  return response.data.data;
};

/**
 * Updates the description of a specific SOP document.
 * @param documentId The ID of the SOP document.
 * @param description The new description.
 * @returns The updated SOP document.
 */
export const updateSopDocumentDescription = async (
  documentId: string,
  description: string
): Promise<ISopDocument> => {
  const response = await api.put<{
    status: string;
    data: ISopDocument;
  }>(`/sop-documents/${documentId}/description`, { description });
  return response.data.data;
};

/**
 * Updates the title of a specific SOP document.
 * @param documentId The ID of the SOP document.
 * @param title The new title.
 * @returns The updated SOP document.
 */
export const updateSopDocumentTitle = async (
  documentId: string,
  title: string
): Promise<ISopDocument> => {
  const response = await api.put<{
    status: string;
    data: ISopDocument;
  }>(`/sop-documents/${documentId}/title`, { title });
  return response.data.data;
};

// ADDED: Function to generate questions from selected SOP categories
export const generateQuestionsFromSopCategories = async (
  documentId: string,
  selectedCategoryIds: string[],
  targetQuestionsPerCategory?: number, // Optional: if you want to specify this from frontend
  forceUpdateBank?: boolean // Optional: if you want to control this from frontend
): Promise<{
  questionBankId: string;
  generatedQuestionCount: number;
  // Potentially return the full ISopDocument or IQuestionBank if needed
  // For now, keeping it minimal based on frontend needs identified so far
  sopDocument?: ISopDocument; // If backend returns updated SOP document
}> => {
  const response = await api.post<{
    questionBankId: string;
    generatedQuestionCount: number;
    sopDocument?: ISopDocument;
  }>(`/sop-documents/${documentId}/generate-questions`, {
    selectedCategoryIds,
    targetQuestionsPerSelectedCategory: targetQuestionsPerCategory || 5, // Default to 5 if not provided
    forceUpdateBank: forceUpdateBank === undefined ? true : forceUpdateBank, // Default to true (overwrite existing bank for the SOP)
  });
  return response.data;
};

// ADDED: Function to generate more AI questions for an SOP-linked Question Bank
export const generateMoreAiQuestionsForSopBank = async (
  bankId: string,
  // sopDocumentId: string, // The backend can get this from the bankId
  params: {
    targetQuestionCount: number;
    questionTypes: QuestionType[]; // Should be restricted to 'true-false' and 'multiple-choice-single'
  }
): Promise<{
  status: string;
  message: string;
  data: {
    questionBankId: string;
    pendingReviewQuestionIds: string[];
  };
}> => {
  const response = await api.post<{
    status: string;
    message: string;
    data: {
      questionBankId: string;
      pendingReviewQuestionIds: string[];
    };
  }>(`/question-banks/${bankId}/generate-sop-questions`, params);
  return response.data;
};

// ADDING NEW FUNCTION HERE
/**
 * Processes menu items to identify conflicts before final import.
 * @param request - The full ProcessConflictResolutionRequest object.
 * @returns The items augmented with conflict resolution information.
 */
export const processMenuItemsForConflicts = async (
  request: ProcessConflictResolutionRequest
): Promise<ProcessConflictResolutionResponse> => {
  const response = await api.post<ProcessConflictResolutionResponse>(
    "/menus/upload/process",
    request
  );
  return response.data;
};

// New function for final import
export const finalizeMenuImportClient = async (
  requestBody: FinalImportRequestBody
): Promise<ImportResult | { jobId: string; message: string }> => {
  const response = await api.post<
    ImportResult | { jobId: string; message: string }
  >("/menus/upload/import", requestBody);
  return response.data;
};

// New function to get import job status
export const getMenuImportJobStatus = async (
  jobId: string
): Promise<ImportResult> => {
  // Assuming the job status endpoint returns full ImportResult when done, or a status object
  // The backend might return a different shape for in-progress jobs vs completed jobs.
  // For simplicity, let's assume it aims to return ImportResult or throws error if not found/pending.
  // Or, a more complex type: Promise<ImportResult | { status: string; progress?: number; message?: string }>
  const response = await api.get<ImportResult>(`/menus/upload/status/${jobId}`);
  return response.data;
};

// Make the Axios instance available as a default export
export default api;

// ===== STAFF INVITATION API METHODS =====

// Invitation Types
export interface InvitationDetails {
  email: string;
  restaurantName: string;
  name?: string;
}

export interface SendInvitationRequest {
  email: string;
  name?: string;
  assignedRoleId?: string;
}

export interface AcceptInvitationRequest {
  password: string;
  name?: string;
}

export interface InvitationResponse {
  message: string;
  invitationId: string;
}

export interface AcceptInvitationResponse {
  message: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface PendingInvitation {
  _id: string;
  email: string;
  name?: string;
  status: "pending" | "completed" | "expired";
  createdAt: string;
  expiresAt: string;
  invitedBy: {
    _id: string;
    name: string;
    email: string;
  };
}

/**
 * Sends a staff invitation email
 * @param invitationData - Email, optional name, and optional role assignment
 * @returns Promise with invitation confirmation
 */
export const sendStaffInvitation = async (
  invitationData: SendInvitationRequest
): Promise<InvitationResponse> => {
  const response = await api.post<InvitationResponse>(
    "/invitations/staff",
    invitationData
  );
  return response.data;
};

// ======================================
// NOTIFICATION API FUNCTIONS
// ======================================

export interface Notification {
  _id: string;
  type: "new_assignment" | "completed_training" | "new_staff" | "new_quiz";
  content: string;
  userId: string;
  restaurantId: string;
  relatedId?: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  status: string;
  notifications: Notification[]; // Changed from 'data' to 'notifications'
}

export interface UnreadCountResponse {
  status: string;
  count: number; // Changed from 'unreadCount' to 'count'
}

/**
 * Get all notifications for the current user
 */
export const getNotifications = async (): Promise<Notification[]> => {
  const response = await api.get<NotificationResponse>("/notifications");
  return response.data.notifications; // Changed from 'data' to 'notifications'
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (): Promise<number> => {
  const response = await api.get<UnreadCountResponse>(
    "/notifications/unread-count"
  );
  return response.data.count; // Changed from 'unreadCount' to 'count'
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (
  notificationId: string
): Promise<void> => {
  await api.put(`/notifications/${notificationId}`);
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (): Promise<void> => {
  await api.put("/notifications/mark-all-read");
};

/**
 * Delete a notification
 */
export const deleteNotification = async (
  notificationId: string
): Promise<void> => {
  await api.delete(`/notifications/${notificationId}`);
};

/**
 * Gets invitation details by token (public endpoint)
 * @param token - The invitation token from the URL
 * @returns Promise with invitation details
 */
export const getInvitationDetails = async (
  token: string
): Promise<InvitationDetails> => {
  const response = await api.get<InvitationDetails>(
    `/invitations/details/${token}`
  );
  return response.data;
};

/**
 * Accepts an invitation and creates user account
 * @param token - The invitation token
 * @param userData - Password and optional name
 * @returns Promise with acceptance confirmation
 */
export const acceptInvitation = async (
  token: string,
  userData: AcceptInvitationRequest
): Promise<AcceptInvitationResponse> => {
  const response = await api.post<AcceptInvitationResponse>(
    `/invitations/accept/${token}`,
    userData
  );
  return response.data;
};

/**
 * Gets all pending invitations for the restaurant
 * @returns Promise with list of pending invitations
 */
export const getRestaurantInvitations = async (): Promise<
  PendingInvitation[]
> => {
  const response = await api.get<{ invitations: PendingInvitation[] }>(
    "/invitations/restaurant"
  );
  return response.data.invitations;
};

/**
 * Cancels a pending invitation
 * @param invitationId - The ID of the invitation to cancel
 * @returns Promise with cancellation confirmation
 */
export const cancelInvitation = async (
  invitationId: string
): Promise<{ message: string }> => {
  const response = await api.delete<{ message: string }>(
    `/invitations/${invitationId}`
  );
  return response.data;
};

// ===== PASSWORD RESET API METHODS =====

// Password Reset Types
export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface VerifyResetTokenResponse {
  valid: boolean;
  email?: string;
  userName?: string;
}

export interface ResetPasswordRequest {
  password: string;
}

export interface ResetPasswordResponse {
  message: string;
}

/**
 * Request password reset email
 * @param email - User's email address
 * @returns Promise with confirmation message
 */
export const requestPasswordReset = async (
  email: string
): Promise<ForgotPasswordResponse> => {
  const response = await api.post<ForgotPasswordResponse>(
    "/auth/forgot-password",
    { email }
  );
  return response.data;
};

/**
 * Verify if password reset token is valid
 * @param token - Reset token from URL
 * @returns Promise with token validity and user info
 */
export const verifyResetToken = async (
  token: string
): Promise<VerifyResetTokenResponse> => {
  const response = await api.get<VerifyResetTokenResponse>(
    `/auth/verify-reset-token/${token}`
  );
  return response.data;
};

/**
 * Reset password using token
 * @param token - Reset token from URL
 * @param password - New password
 * @returns Promise with success confirmation
 */
export const resetPassword = async (
  token: string,
  password: string
): Promise<ResetPasswordResponse> => {
  const response = await api.post<ResetPasswordResponse>(
    `/auth/reset-password/${token}`,
    { password }
  );
  return response.data;
};

// Analytics Endpoints

export interface CategoryAnalytics {
  category: string;
  averageAccuracy: number;
  totalQuestions: number;
  totalStaffParticipating: number;
  last30DaysAccuracy: number;
  accuracyTrend: number;
  staffPerformanceLevels: {
    strong: number;
    average: number;
    needsWork: number;
  };
  questionStats: {
    totalAvailable: number;
    aiGenerated: number;
    manuallyCreated: number;
    averageDifficulty: string;
  };
  trainingRecommendations: string[];
  lastUpdated: string;
}

export const getCategoriesAnalytics = async (): Promise<
  CategoryAnalytics[]
> => {
  const response = await api.get<{ status: string; data: CategoryAnalytics[] }>(
    "/analytics/categories"
  );
  return response.data.data;
};

// ===== TEMPLATE DOWNLOAD API METHODS =====

/**
 * Download Excel template for menu data entry
 */
export const downloadExcelTemplate = async (): Promise<void> => {
  try {
    const response = await api.get("/templates/excel", {
      responseType: "blob",
    });

    // Create download link
    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;

    // Extract filename from headers or use default
    const contentDisposition = response.headers["content-disposition"];
    let filename = "QuizCrunch_Menu_Template.xlsx";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error("Error downloading Excel template:", error);
    throw new Error("Failed to download Excel template");
  }
};

/**
 * Download CSV template for menu data entry
 */
export const downloadCSVTemplate = async (): Promise<void> => {
  try {
    const response = await api.get("/templates/csv", {
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: "text/csv",
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;

    const contentDisposition = response.headers["content-disposition"];
    let filename = "QuizCrunch_Menu_Template.csv";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error("Error downloading CSV template:", error);
    throw new Error("Failed to download CSV template");
  }
};

/**
 * Download Word template for menu data entry
 */
export const downloadWordTemplate = async (): Promise<void> => {
  try {
    const response = await api.get("/templates/word", {
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;

    const contentDisposition = response.headers["content-disposition"];
    let filename = "QuizCrunch_Menu_Template.docx";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error("Error downloading Word template:", error);
    throw new Error("Failed to download Word template");
  }
};

/**
 * Download JSON template for menu data entry
 */
export const downloadJSONTemplate = async (): Promise<void> => {
  try {
    const response = await api.get("/templates/json", {
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: "application/json",
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;

    const contentDisposition = response.headers["content-disposition"];
    let filename = "QuizCrunch_Menu_Template.json";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error("Error downloading JSON template:", error);
    throw new Error("Failed to download JSON template");
  }
};

/**
 * Get template information and available formats
 */
export const getTemplateInfo = async (): Promise<{
  availableFormats: string[];
  description: string;
}> => {
  try {
    const response = await api.get<{
      availableFormats: string[];
      description: string;
    }>("/templates/info");
    return response.data;
  } catch (error) {
    console.error("Error fetching template info:", error);
    throw new Error("Failed to fetch template information");
  }
};

// ===== CLEAN MENU API METHODS =====

export interface CleanMenuItem {
  name: string;
  description?: string;
  price?: number;
  category: string;
  itemType: "food" | "beverage" | "wine";
  // Wine-specific fields
  vintage?: number;
  producer?: string;
  region?: string;
  grapeVariety?: string[];
  wineColor?: string;
  servingOptions?: Array<{ size: string; price: number }>;
  // Food-specific fields
  ingredients?: string[];
  cookingMethods?: string[];
  allergens?: string[];
  isDairyFree?: boolean;
  isSpicy?: boolean;
  cuisineType?: string;
  // Beverage-specific fields
  spiritType?: string;
  beerStyle?: string;
  cocktailIngredients?: string[];
  alcoholContent?: string;
  servingStyle?: string;
  isNonAlcoholic?: boolean;
  temperature?: string;
  // Dietary fields
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  confidence: number;
  originalText: string;
}

export interface CleanMenuParseResult {
  menuName: string;
  items: CleanMenuItem[];
  totalItemsFound: number;
  processingNotes: string[];
}

export interface CleanMenuImportRequest {
  cleanResult: CleanMenuParseResult;
  restaurantId: string;
  targetMenuId?: string;
  menuName?: string;
}

export interface CleanMenuImportResponse {
  success: boolean;
  data: {
    menuId: string;
    menuName: string;
    totalItems: number;
    importedItems: number;
    failedItems: number;
    processingNotes: string[];
  };
  message: string;
}

/**
 * Upload and parse a menu file (supports PDF, CSV, Excel, Word, JSON, TXT)
 */
export const uploadCleanMenu = async (
  file: File
): Promise<CleanMenuParseResult> => {
  const formData = new FormData();
  formData.append("menuFile", file);

  const response = await api.post<{
    success: boolean;
    data: CleanMenuParseResult;
    message: string;
  }>("/upload/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to parse menu");
  }

  return response.data.data;
};

/**
 * Import clean menu results to database
 */
export const importCleanMenu = async (
  importRequest: CleanMenuImportRequest
): Promise<CleanMenuImportResponse> => {
  const response = await api.post<CleanMenuImportResponse>(
    "/upload/import",
    importRequest
  );

  return response.data;
};

export interface ResetAnalyticsOptions {
  resetQuizAttempts?: boolean;
  resetStaffProgress?: boolean;
  resetArchivedAnalytics?: boolean;
}

export interface ResetAnalyticsResult {
  success: boolean;
  message: string;
  data?: {
    analyticsDeleted: number;
    snapshotsDeleted?: number;
    archivedAnalyticsDeleted?: number;
    progressResetCount?: number;
    quizAttemptsDeleted?: number;
    cacheCleared: boolean;
  };
  errors?: string[];
}

export const resetAnalytics = async (
  options: ResetAnalyticsOptions = {}
): Promise<ResetAnalyticsResult> => {
  const response = await api.post("/analytics/reset", options);
  return response.data;
};

// Get analytics for a specific quiz
export const getQuizAnalytics = async (
  quizId: string
): Promise<{
  success: boolean;
  data: {
    quizTitle: string;
    totalAttempts: number;
    uniqueParticipants: number;
    totalStaff: number;
    completionRate: number;
    averageScore: number;
    averageCompletionTime: number;
    topPerformers: Array<{
      name: string;
      score: number;
      completedAt: Date;
    }>;
    recentActivity: Array<{
      staffName: string;
      score: number;
      completedAt: Date;
      totalQuestions: number;
    }>;
  };
}> => {
  const response = await api.get(`/analytics/quiz/${quizId}`);
  return response.data;
};

// ===== MENU EXPORT API METHODS =====

export interface ExportMenuOptions {
  format: "csv" | "excel" | "json" | "word";
  includeImages: boolean;
  includeMetadata: boolean;
  includePricing: boolean;
  includeDescriptions: boolean;
  includeFoodItems: boolean;
  includeBeverageItems: boolean;
  includeWineItems: boolean;
}

/**
 * Export menu in the specified format
 */
export const exportMenu = async (
  menuId: string,
  options: ExportMenuOptions
): Promise<Blob> => {
  const response = await api.post(`/menus/${menuId}/export`, options, {
    responseType: "blob", // Important for file downloads
  });
  return response.data;
};
