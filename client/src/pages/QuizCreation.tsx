import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api"; // Assuming api.ts is configured
import Navbar from "../components/Navbar"; // Import Navbar
// Remove QuizAssignment import
// import QuizAssignment from "../components/QuizAssignment";
// Import common components
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import SuccessNotification from "../components/common/SuccessNotification";
import Button from "../components/common/Button"; // Import Button
// Import quiz components
import QuizList from "../components/quiz/QuizList"; // Import the new QuizList component
import CreateQuizModal from "../components/quiz/CreateQuizModal"; // Import the new CreateQuizModal
import QuizEditorModal from "../components/quiz/QuizEditorModal"; // Import the new editor modal
import QuizResultsModal from "../components/quiz/QuizResultsModal"; // Import the results modal
import Card from "../components/common/Card"; // Import Card

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
  isAvailable: boolean; // Add isAvailable field
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
// // Simple Loading Spinner
// const LoadingSpinner: React.FC = () => (
//   <div
//     className="flex justify-center items-center p-4"
//     data-testid="loading-spinner"
//   >
//     <svg
//       className="animate-spin h-8 w-8 text-blue-600"
//       xmlns="http://www.w3.org/2000/svg"
//       fill="none"
//       viewBox="0 0 24 24"
//     >
//       <circle
//         className="opacity-25"
//         cx="12"
//         cy="12"
//         r="10"
//         stroke="currentColor"
//         strokeWidth="4"
//       ></circle>
//       <path
//         className="opacity-75"
//         fill="currentColor"
//         d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//       ></path>
//     </svg>
//   </div>
// );
//
// // Simple Error Message
// const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
//   <div
//     className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4"
//     role="alert"
//   >
//     <strong className="font-bold">Error: </strong>
//     <span className="block sm:inline">{message}</span>
//   </div>
// );
//
// // Simple Success Notification
// const SuccessNotification: React.FC<{
//   message: string;
//   onDismiss: () => void;
// }> = ({ message, onDismiss }) => {
//   useEffect(() => {
//     const timer = setTimeout(onDismiss, 3000);
//     return () => clearTimeout(timer);
//   }, [onDismiss]);
//   return (
//     <div
//       className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative my-4"
//       role="alert"
//     >
//       <span className="block sm:inline">{message}</span>
//       <button
//         onClick={onDismiss}
//         className="absolute top-0 bottom-0 right-0 px-4 py-3"
//         aria-label="Dismiss notification"
//       >
//         <span className="text-xl font-bold">&times;</span>
//       </button>
//     </div>
//   );
// };

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
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Editor Modal State
  const [quizForEditOrPreview, setQuizForEditOrPreview] =
    useState<QuizData | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false); // Moved saving state here

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
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  // Rename to reflect it always opens editor
  const openEditor = (quiz: QuizData) => {
    setQuizForEditOrPreview(quiz);
    // Remove startEditorInEditMode setting
    // Remove results modal reset
  };

  const closeEditor = () => {
    setQuizForEditOrPreview(null);
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

  // --- Create/Generate Quiz Logic ---
  const handleGenerateQuiz = async (title: string, menuIds: string[]) => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await api.post<{ quiz: QuizData }>("/quiz/auto", {
        title: title,
        menuIds: menuIds,
      });
      setSuccessMessage("Quiz generated successfully! Ready for edit."); // Updated message
      setIsCreateModalOpen(false); // Close create modal on success
      // Explicitly open the editor in edit mode for newly generated quiz
      openEditor(response.data.quiz);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to generate quiz.");
      // Keep create modal open on error
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Activate Quiz Logic ---
  const handleActivateQuiz = async (quizId: string) => {
    setError(null);
    setSuccessMessage(null);
    // Optionally set a specific loading state for activation?

    try {
      // Optimistic UI update?
      // setQuizzes(prev => prev.map(q => q._id === quizId ? { ...q, isAvailable: true } : q));

      // Use PATCH instead of PUT
      const response = await api.patch<{ quiz: QuizData }>(`/quiz/${quizId}`, {
        isAvailable: true,
      });

      // Update local state with the exact data from backend
      setQuizzes((prev) =>
        prev.map((q) => (q._id === quizId ? { ...response.data.quiz } : q))
      );
      setSuccessMessage(
        `Quiz "${response.data.quiz.title}" activated and assigned to all staff.`
      );
    } catch (err: any) {
      console.error("Activation error:", err);
      setError(err.response?.data?.message || "Failed to activate quiz.");
      // Revert optimistic update if implemented
      // fetchQuizzes(); // Or refetch on error?
    } finally {
      // Clear specific loading state if used
    }
  };

  // --- Save Quiz Logic ---
  const handleSaveQuiz = async (quizToSave: QuizData) => {
    // Make sure menuItemIds is in the correct format (array of strings)
    // This check might be better inside the editor modal before calling onSave
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
        : "Save this new quiz?"; // Updated message for clarity

      // Confirmation might be better inside the editor modal? Or keep here?
      // Let's keep it here for now.
      if (window.confirm(message)) {
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
        closeEditor(); // Close the editor modal on successful save
      } else {
        // If user cancels confirm, stop the saving process
        setIsSaving(false);
        return; // Exit early
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save quiz.");
      console.error("Save error:", err);
      // Keep the editor modal open on error
    } finally {
      // Only set isSaving to false if the process wasn't stopped early by cancel
      // This is tricky, maybe handle confirm inside editor?
      // For now, just set it false always. Parent controls spinner.
      setIsSaving(false);
    }
  };

  // --- Render Functions ---
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

  // --- Delete Logic ---
  // We need a handler to pass to QuizList that triggers the confirmation
  const handleDeleteRequest = (quiz: QuizData) => {
    if (
      window.confirm(
        `Are you sure you want to delete the quiz "${quiz.title}"?\n\nWARNING: This will permanently delete the quiz and ALL associated staff quiz results.`
      )
    ) {
      deleteQuiz(quiz);
    }
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
            <Button variant="primary" onClick={openCreateModal}>
              Create New Quiz
            </Button>
          </div>

          {/* Notifications */}
          {error && <ErrorMessage message={error} />}
          {successMessage && (
            <SuccessNotification
              message={successMessage}
              onDismiss={() => setSuccessMessage(null)}
            />
          )}

          {/* Quiz List Section */}
          <Card className="p-0 overflow-hidden sm:rounded-lg">
            <h2 className="sr-only" id="quiz-list-title">
              Available Quizzes
            </h2>
            {/* Use the new QuizList component */}
            <QuizList
              quizzes={quizzes}
              isLoading={isLoadingQuizzes}
              onPreview={openEditor}
              onActivate={handleActivateQuiz}
              onDelete={handleDeleteRequest}
              isDeletingQuizId={isDeleting ? quizToDelete?._id || null : null}
              getMenuItemNames={getMenuItemNames} // Pass the utility function
            />
          </Card>

          {/* --- Modals --- */}
          {/* (Keep all modal rendering logic here for now) */}

          {/* Create/Generate Quiz Modal - Use the new component */}
          <CreateQuizModal
            isOpen={isCreateModalOpen}
            onClose={closeCreateModal}
            onGenerate={handleGenerateQuiz} // Pass the generation handler
            menus={menus}
            isLoadingMenus={isLoadingMenus}
            isGenerating={isGenerating} // Pass generation state
          />

          {/* Editor/Preview Modal - Use the new component */}
          <QuizEditorModal
            isOpen={quizForEditOrPreview !== null}
            onClose={closeEditor}
            initialQuizData={quizForEditOrPreview}
            onSave={handleSaveQuiz}
            isSaving={isSaving}
          />
        </div>
      </main>
    </div>
  );
};

export default QuizCreation;
