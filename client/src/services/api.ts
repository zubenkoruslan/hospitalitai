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
} from "../types/questionBankTypes";

// Import menu types
import { IMenuClient, IMenuWithItemsClient } from "../types/menuTypes"; // Added import for menu types

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
  // The backend /api/questions/generate route handles setting restaurantId and createdBy: 'ai' for each question
  const response = await api.post<{ data: IQuestion[] }>(
    "/questions/generate",
    params
  );
  return response.data.data; // Assuming backend wraps in a 'data' object and returns an array of IQuestion
};

// Create a new question bank from a menu
export const createQuestionBankFromMenu = async (
  data: CreateQuestionBankFromMenuClientData
): Promise<IQuestionBank> => {
  const response = await api.post<{
    message: string;
    data: IQuestionBank;
  }>(`${API_BASE_URL}/question-banks/from-menu`, data);
  return response.data.data;
};

// Menu Endpoints

/**
 * Fetches all menus for a specific restaurant.
 * @param restaurantId - The ID of the restaurant.
 */
export const getRestaurantMenus = async (
  restaurantId: string
): Promise<IMenuClient[]> => {
  const response = await api.get<{
    success: boolean;
    count: number;
    data: IMenuClient[];
  }>(`/menus/restaurant/${restaurantId}`);
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

// Define a basic IQuiz for the client-side if not already defined elsewhere
// TODO: Consolidate with a shared IQuiz type if available in client/src/types/quizTypes.ts
export interface ClientIQuiz {
  _id: string;
  title: string;
  description?: string;
  restaurantId: string;
  sourceQuestionBankIds: string[];
  questions: any[]; // Define more specific question type if needed
  numberOfQuestions: number;
  isAvailable?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GenerateQuizFromBanksClientData {
  title: string;
  description?: string;
  questionBankIds: string[];
  numberOfQuestions: number;
}

/**
 * Generates a new quiz from selected question banks.
 * @param data - The data for generating the quiz.
 */
export const generateQuizFromQuestionBanks = async (
  data: GenerateQuizFromBanksClientData
): Promise<ClientIQuiz> => {
  const response = await api.post<{
    status: string;
    message: string;
    data: ClientIQuiz; // The backend returns the quiz under the 'data' key
  }>("/quiz/from-banks", data);
  return response.data.data;
};

// ADDED: Function to get all quizzes for the restaurant
/**
 * Fetches all quizzes for the current restaurant.
 */
export const getQuizzes = async (): Promise<ClientIQuiz[]> => {
  // Assuming the backend returns { success: boolean, count: number, data: ClientIQuiz[] }
  // or simply { data: ClientIQuiz[] } or even ClientIQuiz[] directly.
  // Adjust based on actual backend response structure.
  // For now, let's assume it's similar to getRestaurantMenus or question bank fetches.
  const response = await api.get<{ data: ClientIQuiz[] }>("/quiz"); // Endpoint might be /quizzes
  return response.data.data; // Assuming quizzes are in response.data.data
  // If backend returns { quizzes: ClientIQuiz[] }, then it would be response.data.quizzes
  // If backend returns ClientIQuiz[] directly, then it would be response.data
};

// Default export
export default api;
