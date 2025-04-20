import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api"; // Assuming api.ts is configured

// --- Interfaces (matching backend models) ---

// Add Menu interface
interface Menu {
  _id: string;
  name: string;
  // Add other fields if needed (e.g., description)
}

// Simplified MenuItem for selection/display (Might not be needed for selection anymore)
interface SelectableMenuItem {
  _id: string;
  name: string;
}

interface Question {
  _id?: string; // May not have _id if just generated
  text: string;
  choices: string[];
  correctAnswer: number; // Index
  menuItemId: string;
}

// Represents the structure returned by /quiz/auto or fetched for existing quizzes
interface QuizData {
  _id?: string;
  title: string;
  menuItemIds: string[] | { _id: string; name: string }[]; // Keep this as backend returns menuItemIds
  questions: Question[];
  restaurantId: string;
  createdAt?: string;
  updatedAt?: string;
}

// Structure for quiz results (after preview/submission)
interface QuizResultDisplay {
  score: number;
  totalQuestions: number;
  correctAnswers: (number | undefined)[];
  userAnswers: (number | undefined)[];
  quizData: QuizData;
}

// --- Helper Components --- (Assume LoadingSpinner, ErrorMessage, SuccessNotification exist)
// Simple Loading Spinner
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-4">
    <svg
      className="animate-spin h-8 w-8 text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  </div>
);

// Simple Error Message
const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div
    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4"
    role="alert"
  >
    <strong className="font-bold">Error: </strong>
    <span className="block sm:inline">{message}</span>
  </div>
);

// Simple Success Notification
const SuccessNotification: React.FC<{
  message: string;
  onDismiss: () => void;
}> = ({ message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);
  return (
    <div
      className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative my-4"
      role="alert"
    >
      <span className="block sm:inline">{message}</span>
      <button
        onClick={onDismiss}
        className="absolute top-0 bottom-0 right-0 px-4 py-3"
        aria-label="Dismiss notification"
      >
        <span className="text-xl font-bold">&times;</span>
      </button>
    </div>
  );
};

// --- Main Component ---
const QuizCreation: React.FC = () => {
  const { user, logout } = useAuth();

  // --- State ---
  const [quizzes, setQuizzes] = useState<QuizData[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]); // State for menus
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState<boolean>(true);
  const [isLoadingMenus, setIsLoadingMenus] = useState<boolean>(true); // Loading state for menus
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Create/Generate Quiz Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [quizTitle, setQuizTitle] = useState<string>("");
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]); // Changed state name
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Preview Quiz State
  const [quizForPreview, setQuizForPreview] = useState<QuizData | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<(number | undefined)[]>([]);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false); // For internal preview logic

  // Results State
  const [quizResults, setQuizResults] = useState<QuizResultDisplay | null>(
    null
  );
  const [isResultsModalOpen, setIsResultsModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false); // Saving after preview

  // Delete Confirmation
  const [quizToDelete, setQuizToDelete] = useState<QuizData | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // --- Data Fetching ---
  const fetchQuizzes = useCallback(async () => {
    setIsLoadingQuizzes(true);
    setError(null);
    try {
      const response = await api.get<{ quizzes: QuizData[] }>("/quiz");
      setQuizzes(response.data.quizzes || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch quizzes.");
    } finally {
      setIsLoadingQuizzes(false);
    }
  }, []);

  const fetchMenus = useCallback(async () => {
    setIsLoadingMenus(true);
    setError(null); // Might reset general error, consider separate menuError state if needed
    try {
      // Fetch all menus for the restaurant
      const response = await api.get<{ menus: Menu[] }>("/menus"); // Assumes GET /menus returns { menus: [...] }
      setMenus(response.data.menus || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch menus.");
    } finally {
      setIsLoadingMenus(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
    fetchMenus(); // Fetch menus instead of menu items
  }, [fetchQuizzes, fetchMenus]);

  // --- Modal Control Handlers ---
  const openCreateModal = () => {
    setQuizTitle("");
    setSelectedMenuIds([]); // Reset selected menus
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setQuizForPreview(null);
  };

  const openPreviewModal = (quiz: QuizData) => {
    setQuizForPreview(quiz);
    setCurrentQuestionIndex(0);
    setUserAnswers(new Array(quiz.questions.length).fill(undefined));
    setQuizResults(null);
    setIsPreviewModalOpen(true);
    setIsResultsModalOpen(false);
    setIsCreateModalOpen(false);
  };

  const closePreviewModal = () => {
    setIsPreviewModalOpen(false);
    setQuizForPreview(null);
    setUserAnswers([]);
    setCurrentQuestionIndex(0);
  };

  const openResultsModal = (results: QuizResultDisplay) => {
    setQuizResults(results);
    setIsResultsModalOpen(true);
    setIsPreviewModalOpen(false);
  };

  const closeResultsModal = () => {
    setIsResultsModalOpen(false);
    setQuizResults(null);
    setQuizForPreview(null);
  };

  const openDeleteConfirm = (quiz: QuizData) => {
    setQuizToDelete(quiz);
    if (
      window.confirm(
        `Are you sure you want to delete the quiz "${quiz.title}"?`
      )
    ) {
      handleDeleteQuiz();
    } else {
      setQuizToDelete(null);
    }
  };

  // --- Create/Generate Quiz Logic ---
  const handleMenuSelection = (menuId: string) => {
    setSelectedMenuIds((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId]
    );
  };

  const handleGenerateQuiz = async () => {
    if (!quizTitle.trim()) {
      setCreateError("Please enter a quiz title.");
      return;
    }
    if (selectedMenuIds.length === 0) {
      // Check selected menus
      setCreateError("Please select at least one menu."); // Update message
      return;
    }

    setIsGenerating(true);
    setCreateError(null);
    setError(null);

    try {
      // Send selectedMenuIds to the backend
      const response = await api.post<{ quiz: QuizData }>("/quiz/auto", {
        title: quizTitle.trim(),
        menuIds: selectedMenuIds, // Send menuIds
      });
      setQuizForPreview(response.data.quiz);
      setSuccessMessage("Quiz generated successfully! Ready for preview.");
      openPreviewModal(response.data.quiz);
    } catch (err: any) {
      setCreateError(err.response?.data?.message || "Failed to generate quiz.");
      setQuizForPreview(null);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Preview Quiz Logic ---
  const handleAnswerSelect = (choiceIndex: number) => {
    setUserAnswers((prev) => {
      const newAnswers = [...prev];
      newAnswers[currentQuestionIndex] = choiceIndex;
      return newAnswers;
    });
  };

  const goToNextQuestion = () => {
    if (
      quizForPreview &&
      currentQuestionIndex < quizForPreview.questions.length - 1
    ) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Submit Preview Answers (Local Calculation)
  const handlePreviewSubmit = () => {
    if (!quizForPreview) return;

    const results: QuizResultDisplay = {
      score: 0,
      totalQuestions: quizForPreview.questions.length,
      correctAnswers: [],
      userAnswers: userAnswers,
      quizData: quizForPreview,
    };

    quizForPreview.questions.forEach((q, index) => {
      results.correctAnswers.push(q.correctAnswer);
      if (userAnswers[index] === q.correctAnswer) {
        results.score++;
      }
    });

    openResultsModal(results);
  };

  // --- Save Quiz Logic ---
  const handleSaveQuiz = async () => {
    if (!quizResults || !quizResults.quizData) {
      setError("No quiz data available to save.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Send the quiz data that was generated and previewed
      const response = await api.post<{ quiz: QuizData }>(
        "/quiz",
        quizResults.quizData
      );
      setSuccessMessage(
        `Quiz "${response.data.quiz.title}" saved successfully!`
      );
      fetchQuizzes(); // Refresh the list of quizzes
      closeResultsModal(); // Close results modal after saving
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save quiz.");
      // Keep results modal open on error?
    } finally {
      setIsSaving(false);
    }
  };

  // --- Delete Quiz Logic ---
  const handleDeleteQuiz = async () => {
    if (!quizToDelete || !quizToDelete._id) return; // Need _id to delete

    setIsDeleting(true); // Maybe add loading state to the row/card?
    setError(null);

    try {
      await api.delete(`/quiz/${quizToDelete._id}`);
      setSuccessMessage(`Quiz "${quizToDelete.title}" deleted.`);
      setQuizzes((prev) => prev.filter((q) => q._id !== quizToDelete._id)); // Optimistic UI update
      setQuizToDelete(null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete quiz.");
      setQuizToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Render Logic ---
  const renderMenusList = () => (
    <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-1">
      {isLoadingMenus ? (
        <LoadingSpinner />
      ) : menus.length === 0 ? (
        <p className="text-sm text-gray-500">
          No menus found. Create menus first.
        </p>
      ) : (
        menus.map((menu) => (
          <div key={menu._id} className="flex items-center">
            <input
              type="checkbox"
              id={`menu-${menu._id}`}
              checked={selectedMenuIds.includes(menu._id)}
              onChange={() => handleMenuSelection(menu._id)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor={`menu-${menu._id}`}
              className="ml-2 block text-sm text-gray-700"
            >
              {menu.name}
            </label>
          </div>
        ))
      )}
    </div>
  );

  // Helper to get menu item names for display
  const getMenuItemNames = (quiz: QuizData): string => {
    if (!quiz.menuItemIds) return "N/A";
    // If populated (from GET /quiz)
    if (
      quiz.menuItemIds.length > 0 &&
      typeof quiz.menuItemIds[0] === "object"
    ) {
      return (
        (quiz.menuItemIds as { _id: string; name: string }[])
          .map((item) => item.name)
          .slice(0, 3)
          .join(", ") + (quiz.menuItemIds.length > 3 ? "..." : "")
      );
    }
    // If just IDs (e.g., from generation before saving)
    return `${quiz.menuItemIds.length} items`;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                to="/dashboard"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                &larr; Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center">
              <button
                onClick={logout}
                className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
            Quiz Management
          </h1>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow-md hover:shadow-lg transition duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create New Quiz
          </button>
        </div>

        {/* Notifications */}
        {error && <ErrorMessage message={error} />}
        {successMessage && (
          <SuccessNotification
            message={successMessage}
            onDismiss={() => setSuccessMessage(null)}
          />
        )}

        {/* Quiz List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {isLoadingQuizzes ? (
            <LoadingSpinner />
          ) : quizzes.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No quizzes found. Create one to get started!
            </p>
          ) : (
            <div className="overflow-x-auto">
              {/* Table View */}
              <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Title
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Menu Items
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Questions
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Created
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quizzes.map((quiz) => (
                    <tr key={quiz._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {quiz.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getMenuItemNames(quiz)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {quiz.questions.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {quiz.createdAt
                          ? new Date(quiz.createdAt).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        {/* Preview button might be less relevant if quizzes can't be retaken by owner? */}
                        {/* <button onClick={() => openPreviewModal(quiz)} className="text-green-600 hover:text-green-900" aria-label={`Preview ${quiz.title}`}>Preview</button> */}
                        {/* Add View Results button later? */}
                        {/* <button onClick={() => { }} className="text-blue-600 hover:text-blue-900" aria-label={`Edit ${quiz.title}`}>Edit</button> */}
                        <button
                          onClick={() => openDeleteConfirm(quiz)}
                          className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded"
                          aria-label={`Delete ${quiz.title}`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Card View */}
              <div className="divide-y divide-gray-200 md:hidden">
                {quizzes.map((quiz) => (
                  <div key={quiz._id} className="px-4 py-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {quiz.title}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex space-x-2">
                        {/* <button onClick={() => { }} className="text-blue-600 hover:text-blue-900 text-xs" aria-label={`Edit ${quiz.title}`}>Edit</button> */}
                        <button
                          onClick={() => openDeleteConfirm(quiz)}
                          className="text-red-600 hover:text-red-900 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 rounded p-0.5"
                          aria-label={`Delete ${quiz.title}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Items: {getMenuItemNames(quiz)}</p>
                      <p>Questions: {quiz.questions.length}</p>
                      <p>
                        Created:{" "}
                        {quiz.createdAt
                          ? new Date(quiz.createdAt).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- Modals --- */}

      {/* Create Quiz Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-gray-800 bg-opacity-75"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-quiz-title"
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto overflow-hidden">
            <div className="px-6 py-4">
              <h2
                id="create-quiz-title"
                className="text-xl font-semibold text-gray-800 mb-4"
              >
                Create New Quiz
              </h2>
              {createError && <ErrorMessage message={createError} />}
              <div className="mb-4">
                <label
                  htmlFor="quizTitle"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Quiz Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="quizTitle"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Menus <span className="text-red-500">*</span>
                </label>
                {renderMenusList()}
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={isGenerating}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateQuiz}
                disabled={
                  isGenerating || isLoadingMenus || selectedMenuIds.length === 0
                }
                className="px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center"
              >
                {isGenerating ? <LoadingSpinner /> : "Generate & Preview Quiz"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Quiz Modal */}
      {isPreviewModalOpen && quizForPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-800 bg-opacity-75"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-quiz-title"
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-auto overflow-hidden flex flex-col"
            style={{ maxHeight: "90vh" }}
          >
            <div className="px-6 py-4 border-b">
              <h2
                id="preview-quiz-title"
                className="text-xl font-semibold text-gray-800"
              >
                Preview: {quizForPreview.title}
              </h2>
              <p className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of{" "}
                {quizForPreview.questions.length}
              </p>
            </div>
            <div className="px-6 py-4 flex-1 overflow-y-auto">
              {/* Display current question */}
              {quizForPreview.questions.length > 0 && (
                <div>
                  <p className="text-lg font-medium text-gray-900 mb-4">
                    {quizForPreview.questions[currentQuestionIndex].text}
                  </p>
                  <div className="space-y-3">
                    {quizForPreview.questions[currentQuestionIndex].choices.map(
                      (choice, index) => (
                        <label
                          key={index}
                          className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={`question-${currentQuestionIndex}`}
                            value={index}
                            checked={
                              userAnswers[currentQuestionIndex] === index
                            }
                            onChange={() => handleAnswerSelect(index)}
                            className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="ml-3 text-sm text-gray-700">
                            {choice}
                          </span>
                        </label>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-6 py-3 flex justify-between items-center">
              <div>
                <button
                  type="button"
                  onClick={goToPreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={goToNextQuestion}
                  disabled={
                    !quizForPreview ||
                    currentQuestionIndex >= quizForPreview.questions.length - 1
                  }
                  className="ml-3 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div>
                <button
                  type="button"
                  onClick={closePreviewModal}
                  className="mr-3 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel Preview
                </button>
                {/* Enable submit only if all questions answered? */}
                {userAnswers.every((ans) => ans !== undefined) && (
                  <button
                    type="button"
                    onClick={handlePreviewSubmit}
                    className="px-4 py-2 bg-green-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Submit Answers
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {isResultsModalOpen && quizResults && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-800 bg-opacity-75"
          role="dialog"
          aria-modal="true"
          aria-labelledby="results-quiz-title"
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-auto overflow-hidden flex flex-col"
            style={{ maxHeight: "90vh" }}
          >
            <div className="px-6 py-4 border-b">
              <h2
                id="results-quiz-title"
                className="text-xl font-semibold text-gray-800"
              >
                Results: {quizResults.quizData.title}
              </h2>
              <p className="text-lg font-medium text-gray-700">
                Score: {quizResults.score} / {quizResults.totalQuestions} (
                {(
                  (quizResults.score / quizResults.totalQuestions) *
                  100
                ).toFixed(0)}
                %)
              </p>
            </div>
            <div className="px-6 py-4 flex-1 overflow-y-auto space-y-4">
              {quizResults.quizData.questions.map((q, index) => {
                const userAnswerIndex = quizResults.userAnswers[index];
                const correctAnswerIndex = quizResults.correctAnswers[index];
                const isCorrect = userAnswerIndex === correctAnswerIndex;
                return (
                  <div
                    key={index}
                    className={`p-4 border rounded-md ${
                      isCorrect
                        ? "border-green-300 bg-green-50"
                        : "border-red-300 bg-red-50"
                    }`}
                  >
                    <p className="font-medium text-gray-800 mb-2">
                      {index + 1}. {q.text}
                    </p>
                    <div className="space-y-1 text-sm">
                      {q.choices.map((choice, choiceIndex) => (
                        <p
                          key={choiceIndex}
                          className={`${
                            choiceIndex === correctAnswerIndex
                              ? "text-green-700 font-semibold"
                              : ""
                          }
                            ${
                              choiceIndex === userAnswerIndex && !isCorrect
                                ? "text-red-700 line-through"
                                : ""
                            }
                            ${
                              choiceIndex !== userAnswerIndex &&
                              choiceIndex !== correctAnswerIndex
                                ? "text-gray-600"
                                : ""
                            }`}
                        >
                          {choiceIndex === userAnswerIndex ? "➔" : ""}{" "}
                          {String.fromCharCode(65 + choiceIndex)}. {choice}
                          {choiceIndex === correctAnswerIndex
                            ? " (Correct)"
                            : ""}
                          {choiceIndex === userAnswerIndex && !isCorrect
                            ? " (Your Answer)"
                            : ""}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeResultsModal}
                disabled={isSaving}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Close
              </button>
              {!quizResults.quizData._id && (
                <button
                  type="button"
                  onClick={handleSaveQuiz}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center"
                >
                  {isSaving ? <LoadingSpinner /> : "Save Quiz for Staff"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizCreation;
