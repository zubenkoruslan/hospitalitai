import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api"; // Assuming api.ts is configured
import Navbar from "../components/Navbar"; // Import Navbar
import QuizAssignment from "../components/QuizAssignment"; // Import the QuizAssignment component

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
  isAssigned?: boolean; // Flag to indicate if the quiz has been assigned
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
  <div
    className="flex justify-center items-center p-4"
    data-testid="loading-spinner"
  >
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
  const { user } = useAuth();

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

  // Add state for editing mode
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [quizToAssign, setQuizToAssign] = useState<QuizData | null>(null);

  // Add state for new question modal
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] =
    useState<boolean>(false);
  const [newQuestion, setNewQuestion] = useState<Question>({
    text: "New Question",
    choices: ["Option 1", "Option 2", "Option 3", "Option 4"],
    correctAnswer: 0,
    menuItemId: "",
  });

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

  const openPreviewModal = (
    quiz: QuizData,
    startInEditMode: boolean = false
  ) => {
    setQuizForPreview(quiz);
    setCurrentQuestionIndex(0);
    setUserAnswers(new Array(quiz.questions.length).fill(undefined));
    setQuizResults(null);
    setIsPreviewModalOpen(true);
    setIsResultsModalOpen(false);
    setIsCreateModalOpen(false);

    // Don't allow edit mode for assigned quizzes
    if (quiz.isAssigned) {
      setIsEditMode(false);
      setSuccessMessage(
        "This quiz has been assigned to staff and cannot be edited."
      );
    } else if (startInEditMode) {
      setIsEditMode(true);
    }
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
    if (
      window.confirm(
        `Are you sure you want to delete the quiz "${quiz.title}"?\n\nWARNING: This will permanently delete the quiz and ALL associated staff quiz results.`
      )
    ) {
      deleteQuiz(quiz);
    }
  };

  // Function to delete a quiz without relying on state
  const deleteQuiz = async (quiz: QuizData) => {
    if (!quiz || !quiz._id) return; // Need _id to delete

    setQuizToDelete(quiz); // For UI feedback
    setIsDeleting(true);
    setError(null);

    try {
      await api.delete(`/quiz/${quiz._id}`);
      setSuccessMessage(
        `Quiz "${quiz.title}" and all associated results deleted.`
      );
      setQuizzes((prev) => prev.filter((q) => q._id !== quiz._id)); // Optimistic UI update
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete quiz.");
    } finally {
      setIsDeleting(false);
      setQuizToDelete(null);
    }
  };

  // Add function to open assignment modal
  const openAssignModal = (quiz: QuizData) => {
    setQuizToAssign(quiz);
    setIsAssignModalOpen(true);
  };

  // Add function to close assignment modal
  const closeAssignModal = () => {
    setIsAssignModalOpen(false);
    setQuizToAssign(null);
  };

  // Add function to handle assignment success
  const handleAssignmentSuccess = () => {
    setSuccessMessage(
      `Quiz "${quizToAssign?.title}" successfully assigned to staff.`
    );
    setIsAssignModalOpen(false);
    setQuizToAssign(null);
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
  const handleAnswerSelect = (questionIndex: number, choiceIndex: number) => {
    setUserAnswers((prev) => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = choiceIndex;
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
    // Decide which quiz data to save based on context (preview or edit)
    let quizToSave: QuizData;

    if (isEditMode && quizForPreview) {
      // We're in edit mode with the preview modal
      quizToSave = { ...quizForPreview };

      // Basic validation for edit mode
      if (!quizToSave.title.trim()) {
        setError("Quiz title cannot be empty");
        return;
      }

      if (quizToSave.questions.length === 0) {
        setError("Quiz must have at least one question");
        return;
      }

      for (const q of quizToSave.questions) {
        if (!q.text.trim()) {
          setError("Question text cannot be empty");
          return;
        }

        if (q.choices.some((c) => !c.trim())) {
          setError("Answer choices cannot be empty");
          return;
        }
      }
    } else if (quizResults && quizResults.quizData) {
      // We're in the results modal
      quizToSave = { ...quizResults.quizData };
    } else {
      setError("No quiz data available to save.");
      return;
    }

    // Make sure menuItemIds is in the correct format (array of strings)
    if (
      Array.isArray(quizToSave.menuItemIds) &&
      quizToSave.menuItemIds.length > 0 &&
      typeof quizToSave.menuItemIds[0] === "object"
    ) {
      quizToSave = {
        ...quizToSave,
        menuItemIds: (quizToSave.menuItemIds as { _id: string }[]).map(
          (item) => item._id
        ),
      };
    }

    setIsSaving(true);
    setError(null);

    try {
      // Determine if this is an update or create operation
      const isUpdate = !!quizToSave._id;
      const message = isUpdate
        ? "Save changes to this quiz?"
        : "Save this quiz?";

      if (window.confirm(message)) {
        // If quiz has an ID, use PUT to update it, otherwise create new with POST
        const apiCall = isUpdate
          ? api.put<{ quiz: QuizData }>(`/quiz/${quizToSave._id}`, quizToSave)
          : api.post<{ quiz: QuizData }>("/quiz", quizToSave);

        const response = await apiCall;
        setSuccessMessage(
          `Quiz "${response.data.quiz.title}" ${
            isUpdate ? "updated" : "saved"
          } successfully!`
        );
        fetchQuizzes(); // Refresh the list of quizzes

        // Close the appropriate modal
        if (isResultsModalOpen) {
          closeResultsModal();
        } else if (isPreviewModalOpen) {
          closePreviewModal();
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save quiz.");
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Render Functions ---
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

  // Modify the renderQuestion function to pass the question index to handleAnswerSelect
  const renderQuestion = (
    question: Question,
    index: number,
    isEditing: boolean = false
  ) => {
    const currentAnswer = userAnswers[index];
    return (
      <div
        key={`q-${index}`}
        className="bg-white p-4 rounded-lg shadow-sm mb-4"
      >
        {isEditing ? (
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Text
            </label>
            <input
              type="text"
              value={question.text}
              onChange={(e) => {
                const updatedQuestions = [...quizForPreview!.questions];
                updatedQuestions[index] = {
                  ...updatedQuestions[index],
                  text: e.target.value,
                };
                setQuizForPreview({
                  ...quizForPreview!,
                  questions: updatedQuestions,
                });
              }}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
        ) : (
          <p className="text-lg font-medium text-gray-900 mb-4">
            {index + 1}. {question.text}
          </p>
        )}

        <div className="space-y-3">
          {question.choices.map((choice, choiceIndex) => (
            <div key={choiceIndex} className="flex items-center">
              {isEditing ? (
                <>
                  <input
                    type="radio"
                    name={`correct-answer-${index}`}
                    checked={question.correctAnswer === choiceIndex}
                    onChange={() => {
                      const updatedQuestions = [...quizForPreview!.questions];
                      updatedQuestions[index] = {
                        ...updatedQuestions[index],
                        correctAnswer: choiceIndex,
                      };
                      setQuizForPreview({
                        ...quizForPreview!,
                        questions: updatedQuestions,
                      });
                    }}
                    className="h-4 w-4 text-blue-600 border-gray-300 mr-2"
                  />
                  <input
                    type="text"
                    value={choice}
                    onChange={(e) => {
                      const updatedQuestions = [...quizForPreview!.questions];
                      updatedQuestions[index].choices[choiceIndex] =
                        e.target.value;
                      setQuizForPreview({
                        ...quizForPreview!,
                        questions: updatedQuestions,
                      });
                    }}
                    className="flex-1 p-2 border border-gray-300 rounded-md"
                  />
                </>
              ) : (
                <label
                  className={`flex items-center w-full p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors duration-150 ease-in-out ${
                    currentAnswer === choiceIndex
                      ? "bg-blue-50 border-blue-300 ring-1 ring-blue-300"
                      : "border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${index}`}
                    value={choiceIndex}
                    checked={currentAnswer === choiceIndex}
                    onChange={() => handleAnswerSelect(index, choiceIndex)}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm text-gray-700">{choice}</span>
                  {isEditing && question.correctAnswer === choiceIndex && (
                    <span className="ml-2 text-sm text-green-600">
                      (Correct Answer)
                    </span>
                  )}
                </label>
              )}
            </div>
          ))}
        </div>

        {isEditing && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                const updatedQuestions = [...quizForPreview!.questions];
                updatedQuestions.splice(index, 1);
                setQuizForPreview({
                  ...quizForPreview!,
                  questions: updatedQuestions,
                });
              }}
              className="px-3 py-1 bg-red-600 text-white rounded-md text-sm"
            >
              Delete Question
            </button>
          </div>
        )}
      </div>
    );
  };

  // Update function to show modal instead of immediately adding question
  const addNewQuestion = () => {
    if (!quizForPreview) return;

    console.log("Opening add question modal");

    // Get a valid menuItemId - either from existing questions or from menuItemIds
    let menuItemId = "";

    // Try to get from first question
    if (quizForPreview.questions && quizForPreview.questions.length > 0) {
      menuItemId = quizForPreview.questions[0].menuItemId;
    }
    // If not available, try to get from menuItemIds
    else if (
      quizForPreview.menuItemIds &&
      quizForPreview.menuItemIds.length > 0
    ) {
      // Check if menuItemIds is an array of strings or objects
      const firstItem = quizForPreview.menuItemIds[0];
      if (typeof firstItem === "string") {
        menuItemId = firstItem;
      } else if (
        firstItem &&
        typeof firstItem === "object" &&
        "_id" in firstItem
      ) {
        menuItemId = firstItem._id;
      }
    }

    console.log("Using menuItemId:", menuItemId);

    // Set up the new question with the menuItemId
    setNewQuestion({
      text: "New Question",
      choices: ["Option 1", "Option 2", "Option 3", "Option 4"],
      correctAnswer: 0,
      menuItemId: menuItemId,
    });

    // Open the modal
    setIsAddQuestionModalOpen(true);
  };

  // Function to handle adding the edited question to the quiz
  const handleAddQuestionSubmit = () => {
    if (!quizForPreview) return;

    // Add the new question to the quiz
    setQuizForPreview({
      ...quizForPreview,
      questions: [...quizForPreview.questions, newQuestion],
    });

    // Close the modal
    setIsAddQuestionModalOpen(false);

    // Add console log to confirm question was added
    console.log(
      "Question added, new count:",
      quizForPreview.questions.length + 1
    );
  };

  // --- Return JSX ---
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      {/* Main content wrapper */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">
              Quiz Management
            </h1>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out text-sm font-medium"
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
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <h2 className="sr-only" id="quiz-list-title">
              Available Quizzes
            </h2>
            {isLoadingQuizzes ? (
              <LoadingSpinner />
            ) : quizzes.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No quizzes found. Create one to get started!
              </p>
            ) : (
              <ul
                className="divide-y divide-gray-200"
                aria-labelledby="quiz-list-title"
              >
                {quizzes.map((quiz) => (
                  <li key={quiz._id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="truncate">
                        <p className="text-lg font-medium text-blue-600 truncate">
                          {quiz.title}
                          {quiz.isAssigned && (
                            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Assigned
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Covers: {getMenuItemNames(quiz)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Created:{" "}
                          {quiz.createdAt
                            ? new Date(quiz.createdAt).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0 flex space-x-2">
                        <button
                          onClick={() => openPreviewModal(quiz, false)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                        >
                          Preview
                        </button>
                        {!quiz.isAssigned && (
                          <>
                            <button
                              onClick={() => openPreviewModal(quiz, true)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => openAssignModal(quiz)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              Assign
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openDeleteConfirm(quiz)}
                          disabled={
                            isDeleting && quizToDelete?._id === quiz._id
                          }
                          className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white ${
                            isDeleting && quizToDelete?._id === quiz._id
                              ? "bg-gray-400"
                              : "bg-red-600 hover:bg-red-700"
                          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50`}
                        >
                          {isDeleting && quizToDelete?._id === quiz._id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* --- Modals --- */}

          {/* Create/Generate Quiz Modal */}
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-75 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 my-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
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
                    onChange={(e) => {
                      setQuizTitle(e.target.value);
                      if (createError && e.target.value.trim()) {
                        setCreateError(null);
                      }
                    }}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="E.g., Appetizers Knowledge Check"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Menus to Generate Questions From{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  {isLoadingMenus ? (
                    <LoadingSpinner />
                  ) : menus.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-2">
                      {menus.map((menu) => (
                        <div key={menu._id} className="flex items-center">
                          <input
                            id={`menu-${menu._id}`}
                            name="menus"
                            type="checkbox"
                            value={menu._id}
                            checked={selectedMenuIds.includes(menu._id)}
                            onChange={() => handleMenuSelection(menu._id)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label
                            htmlFor={`menu-${menu._id}`}
                            className="ml-3 text-sm text-gray-700"
                          >
                            {menu.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No menus found. Please create menus first.
                    </p>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateQuiz}
                    disabled={
                      isGenerating ||
                      selectedMenuIds.length === 0 ||
                      !quizTitle.trim()
                    }
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? "Generating..." : "Generate Quiz"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Preview Quiz Modal */}
          {isPreviewModalOpen && quizForPreview && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
              <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-800">
                    {isEditMode ? "Edit Quiz: " : "Preview Quiz: "}{" "}
                    {quizForPreview.title}
                  </h2>
                  <div className="flex space-x-3">
                    {!quizForPreview.isAssigned ? (
                      <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                          isEditMode
                            ? "bg-blue-100 text-blue-600"
                            : "bg-blue-600 text-white"
                        }`}
                      >
                        {isEditMode ? "Exit Edit Mode" : "Edit Questions"}
                      </button>
                    ) : (
                      <div className="text-yellow-700 text-sm bg-yellow-50 px-3 py-2 rounded-md">
                        Quiz has been assigned. Editing disabled.
                      </div>
                    )}
                    {isEditMode && (
                      <button
                        onClick={addNewQuestion}
                        className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium"
                      >
                        Add Question
                      </button>
                    )}
                    <button
                      onClick={closePreviewModal}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {isEditMode ? (
                  // Editing view - all questions visible with edit controls
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-4">
                      Edit Quiz Questions
                    </h3>
                    <div className="space-y-6">
                      {quizForPreview.questions.map((question, idx) =>
                        renderQuestion(question, idx, true)
                      )}
                    </div>

                    <div className="mt-6 flex justify-between">
                      <input
                        type="text"
                        value={quizForPreview.title}
                        onChange={(e) =>
                          setQuizForPreview({
                            ...quizForPreview,
                            title: e.target.value,
                          })
                        }
                        className="px-4 py-2 border border-gray-300 rounded-md"
                        placeholder="Quiz Title"
                      />
                      <button
                        onClick={handleSaveQuiz}
                        disabled={isSaving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium"
                      >
                        {isSaving ? "Saving..." : "Save Quiz"}
                      </button>
                    </div>
                  </div>
                ) : (
                  // Preview view - all questions visible with navigation
                  <div className="mb-6">
                    <div className="space-y-8">
                      {quizForPreview.questions.map((question, idx) =>
                        renderQuestion(question, idx, false)
                      )}
                    </div>

                    <div className="mt-8 flex justify-end">
                      <button
                        onClick={handlePreviewSubmit}
                        disabled={userAnswers.some((a) => a === undefined)}
                        className="px-6 py-2 bg-green-600 text-white rounded-md text-sm font-medium disabled:opacity-50"
                      >
                        Finish & View Results
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Modal */}
          {isResultsModalOpen && quizResults && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-75 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl mx-4 my-8">
                <h2 className="text-xl font-semibold mb-2 text-gray-800">
                  Preview Results: {quizResults.quizData.title}
                </h2>
                <p className="text-lg font-medium mb-4 text-gray-700">
                  Score: {quizResults.score} / {quizResults.totalQuestions} (
                  {quizResults.totalQuestions > 0
                    ? (
                        (quizResults.score / quizResults.totalQuestions) *
                        100
                      ).toFixed(0)
                    : 0}
                  %)
                </p>

                <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
                  {quizResults.quizData.questions.map((q, index) => (
                    <div
                      key={`result-${index}`}
                      className="p-4 border rounded-md bg-gray-50"
                    >
                      <p className="font-medium mb-2">
                        {index + 1}. {q.text}
                      </p>
                      <ul className="space-y-1 list-disc list-inside mb-2">
                        {q.choices.map((choice, choiceIndex) => {
                          const isCorrect = choiceIndex === q.correctAnswer;
                          const isSelected =
                            choiceIndex === quizResults.userAnswers[index];
                          let choiceStyle = "text-gray-700";
                          if (isCorrect)
                            choiceStyle = "text-green-600 font-semibold";
                          if (isSelected && !isCorrect)
                            choiceStyle = "text-red-600";

                          return (
                            <li key={choiceIndex} className={`${choiceStyle}`}>
                              {choice}
                              {isSelected && !isCorrect && (
                                <span className="text-red-500 ml-2">
                                  (Your Answer)
                                </span>
                              )}
                              {isCorrect && !isSelected && (
                                <span className="text-green-500 ml-2">
                                  (Correct Answer)
                                </span>
                              )}
                              {isCorrect && isSelected && (
                                <span className="text-green-500 ml-2">
                                  (Correct)
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeResultsModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Close Preview
                  </button>
                  {/* Show Save button for all quizzes */}
                  <button
                    type="button"
                    onClick={handleSaveQuiz}
                    disabled={isSaving}
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Quiz"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Assignment Modal */}
          {isAssignModalOpen && quizToAssign && (
            <QuizAssignment
              quizId={quizToAssign._id || ""}
              quizTitle={quizToAssign.title}
              onClose={closeAssignModal}
              onSuccess={handleAssignmentSuccess}
            />
          )}

          {/* Add Question Modal */}
          {isAddQuestionModalOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-75 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 my-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                  Add New Question
                </h2>

                <div className="mb-4">
                  <label
                    htmlFor="questionText"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Question Text
                  </label>
                  <input
                    type="text"
                    id="questionText"
                    value={newQuestion.text}
                    onChange={(e) =>
                      setNewQuestion({ ...newQuestion, text: e.target.value })
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter question text"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Answer Choices
                  </label>
                  {newQuestion.choices.map((choice, index) => (
                    <div key={index} className="flex items-center mb-2">
                      <input
                        type="radio"
                        id={`correct-${index}`}
                        name="correctAnswer"
                        checked={newQuestion.correctAnswer === index}
                        onChange={() =>
                          setNewQuestion({
                            ...newQuestion,
                            correctAnswer: index,
                          })
                        }
                        className="h-4 w-4 text-blue-600 border-gray-300 mr-2"
                      />
                      <input
                        type="text"
                        value={choice}
                        onChange={(e) => {
                          const newChoices = [...newQuestion.choices];
                          newChoices[index] = e.target.value;
                          setNewQuestion({
                            ...newQuestion,
                            choices: newChoices,
                          });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder={`Option ${index + 1}`}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 mt-1">
                    Select the radio button next to the correct answer
                  </p>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsAddQuestionModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddQuestionSubmit}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Add Question
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default QuizCreation;
