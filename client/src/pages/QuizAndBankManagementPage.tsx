import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api, {
  getQuestionBanks,
  createQuestionBank,
  updateQuestionBank,
  deleteQuestionBank,
  getQuizzes,
  generateQuizFromQuestionBanks,
  getRestaurantQuizStaffProgress,
  getQuestionBankById,
  updateQuizDetails,
  resetQuizProgress,
  deleteQuiz,
} from "../services/api";

import {
  ClientIQuiz,
  GenerateQuizFromBanksClientData,
} from "../types/quizTypes";
import { ClientStaffQuizProgress } from "../types/staffTypes";

import {
  IQuestionBank,
  CreateQuestionBankData,
  UpdateQuestionBankData,
  IQuestion,
} from "../types/questionBankTypes";

import Navbar from "../components/Navbar";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import SuccessNotification from "../components/common/SuccessNotification";
import Card from "../components/common/Card";
import ConfirmationModalContent from "../components/common/ConfirmationModalContent"; // For delete confirmations
import Modal from "../components/common/Modal"; // A generic Modal component will be useful

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

const QuizAndBankManagementPage: React.FC = () => {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;
  const navigate = useNavigate();

  const [questionBanks, setQuestionBanks] = useState<IQuestionBank[]>([]);
  const [quizzes, setQuizzes] = useState<ClientIQuiz[]>([]);

  const [isLoadingBanks, setIsLoadingBanks] = useState<boolean>(false);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
  const getBankNamesForQuiz = (quiz: ClientIQuiz): string => {
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
  const handleCreateBankSuccess = () => {
    setSuccessMessage("Question bank created successfully!");
    setIsCreateBankModalOpen(false);
    fetchBanks();
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
    // Instead of navigating to a separate edit page for questions,
    // navigate to the bank detail page, which handles question management.
    navigate(`/question-banks/${bankId}`);
  };

  // Renamed original onPreview to handleOpenEditQuizModal
  const handleOpenEditQuizModal = (quiz: ClientIQuiz) => {
    console.log("Opening edit modal for quiz:", quiz);
    setQuizToEdit(quiz);
    setIsEditQuizModalOpen(true);
  };

  // Helper to render Question Bank List (Simplified for now)
  const renderQuestionBankList = () => {
    if (isLoadingBanks && !questionBanks.length) return <LoadingSpinner />;
    if (!questionBanks.length && !error && !isLoadingBanks)
      return (
        <Card className="p-4 text-center text-gray-500">
          No question banks found. Create one to get started!
        </Card>
      );
    return (
      <div className="space-y-4">
        {isLoadingBanks && questionBanks.length > 0 && (
          <div className="my-4 flex justify-center">
            <LoadingSpinner />
          </div>
        )}
        {questionBanks.map((bank) => (
          <Card
            key={bank._id}
            className="bg-white shadow-lg rounded-xl p-4 md:p-5 hover:shadow-xl transition-shadow duration-300"
          >
            <div className="flex flex-col md:flex-row justify-between md:items-start gap-3 md:gap-4">
              <div className="flex-grow">
                <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-1">
                  {bank.name}
                </h3>
                <p className="text-sm text-gray-600 mb-3 pr-0 md:pr-4">
                  {bank.description || (
                    <span className="italic text-gray-400">
                      No description provided.
                    </span>
                  )}
                </p>

                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-600 mr-1">
                      Categories:
                    </span>
                    <span>
                      {bank.categories.join(", ") || (
                        <span className="italic text-gray-400">N/A</span>
                      )}
                    </span>
                  </div>
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
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Quiz & Question Bank Management
          </h1>
        </div>

        {error && <ErrorMessage message={error} onDismiss={dismissMessages} />}
        {successMessage && (
          <SuccessNotification
            message={successMessage}
            onDismiss={dismissMessages}
          />
        )}

        <div className="bg-white shadow-lg rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              Question Banks
            </h2>
            <Button
              variant="primary"
              onClick={() => setIsCreateBankModalOpen(true)}
              disabled={!restaurantId /* || !!isNavigatingToBankEdit */}
            >
              Create New Question Bank
            </Button>
          </div>
          {renderQuestionBankList()}
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Quizzes</h2>
            <Button
              variant="primary"
              onClick={() => setIsGenerateQuizModalOpen(true)}
            >
              Create Quiz from Banks
            </Button>
          </div>
          {isLoadingQuizzes && quizzes.length === 0 && <LoadingSpinner />}
          {!isLoadingQuizzes && quizzes.length === 0 && !error && (
            <Card className="p-4 text-center text-gray-500">
              No quizzes found. Create one from your question banks!
            </Card>
          )}
          {!isLoadingQuizzes && quizzes.length > 0 && (
            <QuizList
              quizzes={quizzes}
              isLoading={isLoadingQuizzes}
              onPreview={handleOpenEditQuizModal}
              onActivate={handleActivateQuiz}
              onDeactivate={handleDeactivateQuiz}
              onDelete={(quiz) => setQuizToDelete(quiz)}
              onViewProgress={handleViewQuizProgress}
              isDeletingQuizId={isDeletingQuizId}
              getMenuItemNames={getBankNamesForQuiz}
            />
          )}
          {isLoadingQuizzes && quizzes.length > 0 && (
            <div className="my-4">
              <LoadingSpinner />
            </div>
          )}
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
            progressData={staffProgressData}
            isLoading={isLoadingStaffProgress}
            error={staffProgressError}
            // restaurantId={restaurantId} // Pass if needed by modal
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
      </main>
    </div>
  );
};

export default QuizAndBankManagementPage;
