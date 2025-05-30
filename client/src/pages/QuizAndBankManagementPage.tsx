import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  getQuestionBanks,
  deleteQuestionBank,
  getQuizzes,
  getRestaurantQuizStaffProgress,
  updateQuizDetails,
  deleteQuiz,
} from "../services/api";

import { ClientIQuiz } from "../types/quizTypes";
import { ClientStaffQuizProgress } from "../types/staffTypes";

import { IQuestionBank } from "../types/questionBankTypes";

import DashboardLayout from "../components/layout/DashboardLayout";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import SuccessNotification from "../components/common/SuccessNotification";
import Card from "../components/common/Card";
import ConfirmationModalContent from "../components/common/ConfirmationModalContent"; // For delete confirmations
import Modal from "../components/common/Modal"; // A generic Modal component will be useful
import {
  ChevronDownIcon,
  ChevronUpIcon,
  AcademicCapIcon,
  BookOpenIcon,
  PlusIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline"; // Import chevron icons

// Question Bank Components (Modals/Forms)
import CreateQuestionBankForm from "../components/questionBank/CreateQuestionBankForm";
// import EditQuestionBankForm from "../components/questionBank/EditQuestionBankForm"; // Removed unused import
// import ManageQuestionsModal from "../components/questionBank/ManageQuestionsModal"; // Removed ManageQuestionsModal import
// We'll need a way to display the list of question banks
// import QuestionBankList from '../components/questionBank/QuestionBankList'; // Assuming this exists or will be created

// Quiz Components (Modals/Forms)
import GenerateQuizFromBanksModal from "../components/quiz/GenerateQuizFromBanksModal";
import QuizList from "../components/quiz/QuizList"; // Re-use existing QuizList
import StaffQuizProgressModal from "../components/quiz/StaffQuizProgressModal"; // Added import
import EditQuizModal from "../components/quiz/EditQuizModal"; // ADDED: Import EditQuizModal

// Define SourceType for filter
type QuestionBankSourceFilterType = "ALL" | "SOP" | "MENU" | "MANUAL";

const QuizAndBankManagementPage: React.FC = () => {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;
  const navigate = useNavigate();

  const [questionBanks, setQuestionBanks] = useState<IQuestionBank[]>([]);
  const [quizzes, setQuizzes] = useState<ClientIQuiz[]>([]);

  // Add state for question bank filter
  const [questionBankSourceFilter, setQuestionBankSourceFilter] =
    useState<QuestionBankSourceFilterType>("ALL");

  // State for Question Bank list visibility animation during filtering
  const [isQuestionBankListVisible, setIsQuestionBankListVisible] =
    useState<boolean>(true);

  const [isLoadingBanks, setIsLoadingBanks] = useState<boolean>(false);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // State for Question Banks section expansion
  const [isQuestionBanksExpanded, setIsQuestionBanksExpanded] =
    useState<boolean>(true);

  // Modal States - Question Banks
  const [isCreateBankModalOpen, setIsCreateBankModalOpen] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<IQuestionBank | null>(null);

  // Modal States - Quizzes
  const [isGenerateQuizModalOpen, setIsGenerateQuizModalOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<ClientIQuiz | null>(null);
  const [isDeletingQuizId, setIsDeletingQuizId] = useState<string | null>(null);

  // ADDED: State for EditQuizModal
  const [isEditQuizModalOpen, setIsEditQuizModalOpen] = useState(false);
  const [quizToEdit, setQuizToEdit] = useState<ClientIQuiz | null>(null);

  // ADDED: State for Deactivation Confirmation Modal
  const [isConfirmDeactivateModalOpen, setIsConfirmDeactivateModalOpen] =
    useState(false);
  const [quizToDeactivateTarget, setQuizToDeactivateTarget] =
    useState<ClientIQuiz | null>(null);

  // State for Staff Quiz Progress Modal
  const [isStaffProgressModalOpen, setIsStaffProgressModalOpen] =
    useState(false);
  const [selectedQuizForProgress, setSelectedQuizForProgress] =
    useState<ClientIQuiz | null>(null);
  const [staffProgressData, setStaffProgressData] = useState<
    ClientStaffQuizProgress[] | null
  >(null);
  const [isLoadingStaffProgress, setIsLoadingStaffProgress] =
    useState<boolean>(false);
  const [staffProgressError, setStaffProgressError] = useState<string | null>(
    null
  );

  // Helper function to get question bank names for a quiz
  const _getBankNamesForQuiz = (quiz: ClientIQuiz): string => {
    if (
      !quiz.sourceQuestionBankIds ||
      quiz.sourceQuestionBankIds.length === 0
    ) {
      return "N/A";
    }
    const names = quiz.sourceQuestionBankIds.map((bankId) => {
      const bank = questionBanks.find((b) => b._id === bankId);
      return bank ? bank.name : `ID: ${bankId}`; // Show name if found, else ID with prefix
    });
    return names.join(", ");
  };

  const fetchBanks = useCallback(async () => {
    setIsLoadingBanks(true);
    setError(null);
    try {
      const banks = await getQuestionBanks();
      setQuestionBanks(banks || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to fetch question banks."
      );
      setQuestionBanks([]);
    } finally {
      setIsLoadingBanks(false);
    }
  }, []);

  // Filtered Question Banks based on questionBankSourceFilter
  const filteredQuestionBanks = React.useMemo(() => {
    if (questionBankSourceFilter === "ALL") {
      return questionBanks;
    }
    return questionBanks.filter(
      (bank) => bank.sourceType === questionBankSourceFilter
    );
  }, [questionBanks, questionBankSourceFilter]);

  const fetchQuizzesList = useCallback(async () => {
    setIsLoadingQuizzes(true);
    setError(null);
    try {
      const fetchedQuizzes = await getQuizzes();
      setQuizzes(fetchedQuizzes || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch quizzes.");
      setQuizzes([]);
    } finally {
      setIsLoadingQuizzes(false);
    }
  }, []);

  useEffect(() => {
    fetchBanks();
    fetchQuizzesList();
  }, [fetchBanks, fetchQuizzesList]);

  // Dismiss success/error messages
  const dismissMessages = () => {
    setError(null);
    setSuccessMessage(null);
    setStaffProgressError(null); // Also clear staff progress error
  };

  useEffect(() => {
    if (error || successMessage || staffProgressError) {
      const timer = setTimeout(dismissMessages, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage, staffProgressError]);

  // --- Handlers for Question Banks ---
  const handleCreateBankSuccess = (details: {
    bankId: string;
    sourceType: string;
    generationMethod?: string;
  }) => {
    setSuccessMessage("Question bank created successfully!");
    setIsCreateBankModalOpen(false);
    fetchBanks(); // Refresh the list
    if (
      details.sourceType === "sop" &&
      details.generationMethod === "manual" &&
      details.bankId
    ) {
      // Navigate to manage questions page for this newly created manual SOP bank
      navigate(`/question-banks/${details.bankId}`);
    }
  };

  // const handleEditBankSuccess = (updatedBank: IQuestionBank) => { // Removed unused function
  //   setQuestionBanks((prev) =>
  //     prev.map((b) => (b._id === updatedBank._id ? updatedBank : b))
  //   );
  //   setSuccessMessage(
  //     `Question bank "${updatedBank.name}" updated successfully!`
  //   );
  // };

  const handleDeleteBank = async () => {
    if (!bankToDelete) return;
    setIsLoadingBanks(true);
    try {
      await deleteQuestionBank(bankToDelete._id);
      setQuestionBanks((prev) =>
        prev.filter((b) => b._id !== bankToDelete._id)
      );
      setSuccessMessage(`Question bank "${bankToDelete.name}" deleted.`);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to delete question bank."
      );
    } finally {
      setBankToDelete(null);
      setIsLoadingBanks(false);
    }
  };

  // --- Handlers for Quizzes ---
  const handleQuizGenerated = (newQuiz: ClientIQuiz) => {
    setQuizzes((prevQuizzes) => [newQuiz, ...prevQuizzes]);
    setSuccessMessage(`Quiz "${newQuiz.title}" generated successfully!`);
    setIsGenerateQuizModalOpen(false);
  };

  const handleQuizUpdated = (updatedQuiz: ClientIQuiz) => {
    setQuizzes((prevQuizzes) =>
      prevQuizzes.map((q) => (q._id === updatedQuiz._id ? updatedQuiz : q))
    );
    setSuccessMessage(`Quiz "${updatedQuiz.title}" updated successfully!`);
    setIsEditQuizModalOpen(false); // Close the edit modal
  };

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    setIsDeletingQuizId(quizToDelete._id);
    try {
      await deleteQuiz(quizToDelete._id);
      setQuizzes((prev) => prev.filter((q) => q._id !== quizToDelete._id));
      setSuccessMessage(`Quiz "${quizToDelete.title}" deleted.`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete quiz.");
    } finally {
      setQuizToDelete(null);
      setIsDeletingQuizId(null);
    }
  };

  const handleViewQuizProgress = async (quizId: string) => {
    console.log("handleViewQuizProgress called with quizId:", quizId);
    const quiz = quizzes.find((q) => q._id === quizId);
    if (!quiz) {
      console.error(
        `Quiz with id ${quizId} not found in local state for progress view.`
      );
      // Potentially fetch the quiz by ID here if necessary, or handle error
      return;
    }

    setSelectedQuizForProgress(quiz);
    setIsStaffProgressModalOpen(true);
    console.log("isStaffProgressModalOpen set to true");
    setIsLoadingStaffProgress(true);
    setStaffProgressError(null);
    setStaffProgressData(null);

    try {
      const progress = await getRestaurantQuizStaffProgress(quizId);
      setStaffProgressData(progress);
    } catch (err: any) {
      setStaffProgressError(
        err.response?.data?.message || "Failed to load staff progress."
      );
    } finally {
      setIsLoadingStaffProgress(false);
    }
  };

  const handleActivateQuiz = async (quizId: string) => {
    setError(null);
    setSuccessMessage(null);
    // Find the quiz to get its title for messages, and to update its local state
    const quizToActivate = quizzes.find((q) => q._id === quizId);
    if (!quizToActivate) {
      setError("Quiz not found for activation.");
      return;
    }

    // const wasPreviouslyInactive = quizToActivate.isAvailable === false; // Not currently used, but good for context

    try {
      const updatedQuiz = await updateQuizDetails(quizId, {
        isAvailable: true,
      });
      setQuizzes((prevQuizzes) =>
        prevQuizzes.map((q) => (q._id === updatedQuiz._id ? updatedQuiz : q))
      );
      setSuccessMessage(`Quiz "${updatedQuiz.title}" activated successfully.`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to activate quiz.");
    }
  };

  // MODIFIED: Opens confirmation modal instead of direct deactivation
  const handleDeactivateQuiz = (quizId: string) => {
    setError(null);
    setSuccessMessage(null);
    const quiz = quizzes.find((q) => q._id === quizId);
    if (!quiz) {
      setError("Quiz not found for deactivation.");
      return;
    }
    setQuizToDeactivateTarget(quiz);
    setIsConfirmDeactivateModalOpen(true);
  };

  // ADDED: Actual deactivation logic after confirmation
  const confirmDeactivateQuiz = async () => {
    if (!quizToDeactivateTarget) return;

    setError(null);
    setSuccessMessage(null);

    try {
      const updatedQuiz = await updateQuizDetails(quizToDeactivateTarget._id, {
        isAvailable: false,
        // No need to change isAssigned here, deactivation primarily controls availability
      });
      setQuizzes((prevQuizzes) =>
        prevQuizzes.map((q) => (q._id === updatedQuiz._id ? updatedQuiz : q))
      );
      setSuccessMessage(
        `Quiz "${updatedQuiz.title}" deactivated successfully.`
      );
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to deactivate quiz.");
    } finally {
      setIsConfirmDeactivateModalOpen(false);
      setQuizToDeactivateTarget(null);
    }
  };

  const handleManageBankQuestions = (bankId: string) => {
    navigate(`/question-banks/${bankId}`);
  };

  const _handleOpenEditQuizModal = (quiz: ClientIQuiz) => {
    setQuizToEdit(quiz);
    setIsEditQuizModalOpen(true);
  };

  const handleQuestionBankFilterChange = (
    type: QuestionBankSourceFilterType
  ) => {
    setIsQuestionBankListVisible(false); // Start fade out
    setTimeout(() => {
      setQuestionBankSourceFilter(type); // Change filter
      setIsQuestionBankListVisible(true); // Start fade in with new content
    }, 300); // Match this duration with CSS transition duration
  };

  // Helper to render Question Bank List (Simplified for now)
  const renderQuestionBankList = () => {
    if (isLoadingBanks) {
      return <LoadingSpinner message="Loading question banks..." />;
    }
    // Use filteredQuestionBanks here
    if (filteredQuestionBanks.length === 0) {
      return (
        <p className="text-center text-gray-500 py-4">
          No question banks found{" "}
          {questionBankSourceFilter !== "ALL"
            ? `for filter: ${questionBankSourceFilter}`
            : ""}
          .
        </p>
      );
    }

    return (
      <ul className="divide-y divide-gray-200">
        {filteredQuestionBanks.map((bank) => (
          <li key={bank._id} className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-grow">
                <div className="flex items-center mb-1">
                  <h3 className="text-lg md:text-xl font-semibold text-gray-800">
                    {bank.name}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-3 pr-0 md:pr-4">
                  {bank.description || (
                    <span className="italic text-gray-400">
                      No description provided.
                    </span>
                  )}
                </p>

                {/* Display SOP Title if applicable */}
                {bank.sourceType === "SOP" && bank.sourceSopDocumentTitle && (
                  <p className="text-xs text-gray-500 mb-2">
                    <span className="font-medium">Linked SOP:</span>{" "}
                    {bank.sourceSopDocumentTitle}
                  </p>
                )}
                {/* Display Menu Name if applicable */}
                {bank.sourceType === "MENU" && bank.sourceMenuName && (
                  <p className="text-xs text-gray-500 mb-2">
                    <span className="font-medium">Linked Menu:</span>{" "}
                    {bank.sourceMenuName}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-600 mr-1">
                      Questions:
                    </span>
                    <span>
                      {Array.isArray(bank.questions)
                        ? bank.questions.length
                        : bank.questionCount || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 flex flex-row sm:flex-row md:flex-col gap-2 mt-3 md:mt-0 w-full md:w-auto">
                <Button
                  variant="secondary"
                  onClick={() => handleManageBankQuestions(bank._id)}
                  className="flex-1 md:flex-none w-full md:w-auto text-sm justify-center"
                >
                  Manage Questions
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setBankToDelete(bank)}
                  className="flex-1 md:flex-none w-full md:w-auto text-sm justify-center"
                >
                  Delete
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <DashboardLayout title="Quiz & Question Bank Management">
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <AcademicCapIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Quiz & Question Bank Management
              </h1>
              <p className="text-slate-600 mt-2">
                Create and manage question banks and quizzes for your staff
                training
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <ErrorMessage message={error} onDismiss={dismissMessages} />
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
            <SuccessNotification
              message={successMessage}
              onDismiss={dismissMessages}
            />
          </div>
        )}

        {/* Question Banks Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
            <div className="flex justify-between items-center">
              <div
                className="flex items-center cursor-pointer hover:bg-white/50 p-2 rounded-lg transition-colors duration-150 ease-in-out"
                onClick={() =>
                  setIsQuestionBanksExpanded(!isQuestionBanksExpanded)
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setIsQuestionBanksExpanded(!isQuestionBanksExpanded);
                  }
                }}
                aria-expanded={isQuestionBanksExpanded}
                aria-controls="question-banks-content"
              >
                <BookOpenIcon className="h-6 w-6 text-slate-700 mr-3" />
                <h2 className="text-xl font-semibold text-slate-900 mr-3">
                  Question Banks
                </h2>
                {isQuestionBanksExpanded ? (
                  <ChevronUpIcon className="h-5 w-5 text-slate-600" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-slate-600" />
                )}
              </div>
              <Button
                variant="primary"
                onClick={() => setIsCreateBankModalOpen(true)}
                disabled={!restaurantId}
                className="flex items-center space-x-2"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Create Question Bank</span>
              </Button>
            </div>
          </div>

          {isQuestionBanksExpanded && (
            <div id="question-banks-content" className="p-6">
              {/* Filter UI for Question Banks */}
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-slate-700">
                  Filter by source:
                </span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "ALL",
                      "SOP",
                      "MENU",
                      "MANUAL",
                    ] as QuestionBankSourceFilterType[]
                  ).map((type) => (
                    <Button
                      key={type}
                      variant={
                        questionBankSourceFilter === type
                          ? "primary"
                          : "secondary"
                      }
                      onClick={() => handleQuestionBankFilterChange(type)}
                      className="px-3 py-1.5 text-sm"
                    >
                      {type.charAt(0).toUpperCase() +
                        type.slice(1).toLowerCase()}
                    </Button>
                  ))}
                </div>
              </div>

              <div
                className={`transition-opacity duration-300 ease-in-out ${
                  isQuestionBankListVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                {renderQuestionBankList()}
              </div>
            </div>
          )}
        </div>

        {/* Quizzes Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <AcademicCapIcon className="h-6 w-6 text-slate-700 mr-3" />
                <h2 className="text-xl font-semibold text-slate-900">
                  Quizzes
                </h2>
              </div>
              <Button
                variant="primary"
                onClick={() => setIsGenerateQuizModalOpen(true)}
                className="flex items-center space-x-2"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Create Quiz</span>
              </Button>
            </div>
          </div>

          <div className="p-6">
            {isLoadingQuizzes && quizzes.length === 0 && (
              <div className="text-center py-12">
                <LoadingSpinner />
              </div>
            )}
            {!isLoadingQuizzes && quizzes.length === 0 && !error && (
              <div className="text-center py-12">
                <AcademicCapIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No quizzes found
                </h3>
                <p className="text-slate-500">
                  Create your first quiz from your question banks!
                </p>
              </div>
            )}
            {!isLoadingQuizzes && quizzes.length > 0 && (
              <QuizList
                quizzes={quizzes}
                isLoading={false}
                onPreview={_handleOpenEditQuizModal}
                onActivate={handleActivateQuiz}
                onDeactivate={handleDeactivateQuiz}
                onDelete={(quiz) => setQuizToDelete(quiz)}
                onViewProgress={handleViewQuizProgress}
                isDeletingQuizId={isDeletingQuizId}
              />
            )}
            {isLoadingQuizzes && quizzes.length > 0 && (
              <div className="my-4">
                <LoadingSpinner />
              </div>
            )}
          </div>
        </div>
      </div>

      {isCreateBankModalOpen && restaurantId && (
        <Modal
          isOpen={isCreateBankModalOpen}
          onClose={() => setIsCreateBankModalOpen(false)}
          title="Create New Question Bank"
        >
          <CreateQuestionBankForm
            onBankCreated={handleCreateBankSuccess}
            onCancel={() => setIsCreateBankModalOpen(false)}
          />
        </Modal>
      )}

      {bankToDelete && (
        <Modal
          isOpen={!!bankToDelete}
          onClose={() => setBankToDelete(null)}
          title="Delete Question Bank"
        >
          <ConfirmationModalContent
            message={`Are you sure you want to delete the question bank "${bankToDelete.name}"? This will also remove it from any quizzes it's part of, and delete all questions exclusively belonging to this bank if not used elsewhere.`}
            onConfirm={handleDeleteBank}
            onCancel={() => setBankToDelete(null)}
            confirmText="Delete"
            confirmButtonVariant="destructive"
          />
        </Modal>
      )}

      {isGenerateQuizModalOpen && (
        <GenerateQuizFromBanksModal
          isOpen={isGenerateQuizModalOpen}
          onClose={() => setIsGenerateQuizModalOpen(false)}
          onQuizGenerated={handleQuizGenerated}
        />
      )}

      {quizToDelete && (
        <Modal
          isOpen={!!quizToDelete}
          onClose={() => setQuizToDelete(null)}
          title="Delete Quiz"
        >
          <ConfirmationModalContent
            message={`Are you sure you want to delete the quiz "${quizToDelete.title}"? All associated staff results will also be deleted.`}
            onConfirm={handleDeleteQuiz}
            onCancel={() => setQuizToDelete(null)}
            confirmText="Delete"
            confirmButtonVariant="destructive"
          />
        </Modal>
      )}

      {isStaffProgressModalOpen && selectedQuizForProgress && (
        <StaffQuizProgressModal
          isOpen={isStaffProgressModalOpen}
          onClose={() => {
            setIsStaffProgressModalOpen(false);
            setSelectedQuizForProgress(null);
            setStaffProgressData(null);
            setStaffProgressError(null);
          }}
          quizTitle={selectedQuizForProgress.title}
          quizTargetRoles={selectedQuizForProgress.targetRoles}
          progressData={staffProgressData}
          isLoading={isLoadingStaffProgress}
          error={staffProgressError}
        />
      )}

      {isEditQuizModalOpen && quizToEdit && (
        <EditQuizModal
          isOpen={isEditQuizModalOpen}
          onClose={() => {
            setIsEditQuizModalOpen(false);
            setQuizToEdit(null);
          }}
          initialQuizData={quizToEdit}
          onQuizUpdated={handleQuizUpdated}
        />
      )}

      {isConfirmDeactivateModalOpen && quizToDeactivateTarget && (
        <Modal
          isOpen={isConfirmDeactivateModalOpen}
          onClose={() => {
            setIsConfirmDeactivateModalOpen(false);
            setQuizToDeactivateTarget(null);
          }}
          title={`Deactivate Quiz: ${quizToDeactivateTarget.title}`}
        >
          <ConfirmationModalContent
            message={`Are you sure you want to deactivate the quiz "${quizToDeactivateTarget.title}"? Staff will no longer be able to take new attempts.`}
            onConfirm={confirmDeactivateQuiz}
            onCancel={() => {
              setIsConfirmDeactivateModalOpen(false);
              setQuizToDeactivateTarget(null);
            }}
            confirmText="Deactivate"
            confirmButtonVariant="destructive"
          />
        </Modal>
      )}
    </DashboardLayout>
  );
};

export default QuizAndBankManagementPage;
