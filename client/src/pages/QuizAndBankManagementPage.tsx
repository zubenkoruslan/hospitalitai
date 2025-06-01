import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
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

import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import SuccessNotification from "../components/common/SuccessNotification";
import ConfirmationModalContent from "../components/common/ConfirmationModalContent";
import Modal from "../components/common/Modal";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  AcademicCapIcon,
  BookOpenIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

// Question Bank Components
import CreateQuestionBankForm from "../components/questionBank/CreateQuestionBankForm";

// Quiz Components
import GenerateQuizFromBanksModal from "../components/quiz/GenerateQuizFromBanksModal";
import QuizList from "../components/quiz/QuizList";
import StaffQuizProgressModal from "../components/quiz/StaffQuizProgressModal";
import EditQuizModal from "../components/quiz/EditQuizModal";

// Define SourceType for filter
type QuestionBankSourceFilterType = "ALL" | "SOP" | "MENU" | "MANUAL";

const QuizAndBankManagementPage: React.FC = () => {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;
  const navigate = useNavigate();

  const [questionBanks, setQuestionBanks] = useState<IQuestionBank[]>([]);
  const [quizzes, setQuizzes] = useState<ClientIQuiz[]>([]);

  // Question Bank filter state
  const [questionBankSourceFilter, setQuestionBankSourceFilter] =
    useState<QuestionBankSourceFilterType>("ALL");
  const [isQuestionBankListVisible, setIsQuestionBankListVisible] =
    useState<boolean>(true);

  const [isLoadingBanks, setIsLoadingBanks] = useState<boolean>(false);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Expansion states
  const [isQuestionBanksExpanded, setIsQuestionBanksExpanded] =
    useState<boolean>(true);

  // Modal States - Question Banks
  const [isCreateBankModalOpen, setIsCreateBankModalOpen] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<IQuestionBank | null>(null);

  // Modal States - Quizzes
  const [isGenerateQuizModalOpen, setIsGenerateQuizModalOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<ClientIQuiz | null>(null);
  const [isDeletingQuizId, setIsDeletingQuizId] = useState<string | null>(null);

  // Edit Quiz Modal states
  const [isEditQuizModalOpen, setIsEditQuizModalOpen] = useState(false);
  const [quizToEdit, setQuizToEdit] = useState<ClientIQuiz | null>(null);

  // Deactivation Confirmation Modal states
  const [isConfirmDeactivateModalOpen, setIsConfirmDeactivateModalOpen] =
    useState(false);
  const [quizToDeactivateTarget, setQuizToDeactivateTarget] =
    useState<ClientIQuiz | null>(null);

  // Staff Quiz Progress Modal states
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
    setStaffProgressError(null);
  };

  useEffect(() => {
    if (error || successMessage || staffProgressError) {
      const timer = setTimeout(dismissMessages, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage, staffProgressError]);

  // Question Bank Handlers
  const handleCreateBankSuccess = (details: {
    bankId: string;
    sourceType: string;
    generationMethod?: string;
  }) => {
    setSuccessMessage("Question bank created successfully!");
    setIsCreateBankModalOpen(false);
    fetchBanks();
    if (
      details.sourceType === "sop" &&
      details.generationMethod === "manual" &&
      details.bankId
    ) {
      navigate(`/question-banks/${details.bankId}`);
    }
  };

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

  // Quiz Handlers
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
    setIsEditQuizModalOpen(false);
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
    const quiz = quizzes.find((q) => q._id === quizId);
    if (!quiz) {
      console.error(`Quiz with id ${quizId} not found for progress view.`);
      return;
    }

    setSelectedQuizForProgress(quiz);
    setIsStaffProgressModalOpen(true);
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
    const quizToActivate = quizzes.find((q) => q._id === quizId);
    if (!quizToActivate) {
      setError("Quiz not found for activation.");
      return;
    }

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

  const confirmDeactivateQuiz = async () => {
    if (!quizToDeactivateTarget) return;

    setError(null);
    setSuccessMessage(null);

    try {
      const updatedQuiz = await updateQuizDetails(quizToDeactivateTarget._id, {
        isAvailable: false,
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

  const handleOpenEditQuizModal = (quiz: ClientIQuiz) => {
    setQuizToEdit(quiz);
    setIsEditQuizModalOpen(true);
  };

  const handleQuestionBankFilterChange = (
    type: QuestionBankSourceFilterType
  ) => {
    setIsQuestionBankListVisible(false);
    setTimeout(() => {
      setQuestionBankSourceFilter(type);
      setIsQuestionBankListVisible(true);
    }, 300);
  };

  // Render Question Bank List
  const renderQuestionBankList = () => {
    if (isLoadingBanks) {
      return <LoadingSpinner message="Loading question banks..." />;
    }

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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-8">
              {/* Header Section */}
              <div className="bg-blue-50 rounded-2xl p-8 border border-blue-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                      <AcademicCapIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900">
                        Quiz & Question Bank Management
                      </h1>
                      <p className="text-slate-600 mt-2">
                        Create quizzes, manage question banks, and track
                        training materials.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="secondary"
                      onClick={() => setIsCreateBankModalOpen(true)}
                    >
                      <BookOpenIcon className="h-5 w-5 mr-2" />
                      New Question Bank
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => setIsGenerateQuizModalOpen(true)}
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Generate Quiz
                    </Button>
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
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
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
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Quiz Management
                  </h2>
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
                      onPreview={handleOpenEditQuizModal}
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

            {/* Modals */}
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default QuizAndBankManagementPage;
