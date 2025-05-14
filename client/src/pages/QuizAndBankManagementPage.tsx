import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api, {
  ClientIQuiz,
  GenerateQuizFromBanksClientData,
  getQuestionBanks,
  createQuestionBank,
  updateQuestionBank,
  deleteQuestionBank,
  getQuizzes,
  generateQuizFromQuestionBanks,
  getQuestionBankById,
} from "../services/api";

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
import EditQuestionBankForm from "../components/questionBank/EditQuestionBankForm";
// import ManageQuestionsModal from "../components/questionBank/ManageQuestionsModal"; // Removed ManageQuestionsModal import
// We'll need a way to display the list of question banks
// import QuestionBankList from '../components/questionBank/QuestionBankList'; // Assuming this exists or will be created

// Quiz Components (Modals/Forms)
import GenerateQuizFromBanksModal from "../components/quiz/GenerateQuizFromBanksModal";
import QuizList from "../components/quiz/QuizList"; // Re-use existing QuizList

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
  const [isNavigatingToBankEdit, setIsNavigatingToBankEdit] = useState<
    string | null
  >(null);

  // Modal States - Quizzes
  const [isGenerateQuizModalOpen, setIsGenerateQuizModalOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<ClientIQuiz | null>(null);
  const [isDeletingQuizId, setIsDeletingQuizId] = useState<string | null>(null);

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
  };

  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(dismissMessages, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  // --- Handlers for Question Banks ---
  const handleCreateBankSuccess = () => {
    setSuccessMessage("Question bank created successfully!");
    setIsCreateBankModalOpen(false);
    fetchBanks();
  };

  const handleEditBankSuccess = (updatedBank: IQuestionBank) => {
    setQuestionBanks((prev) =>
      prev.map((b) => (b._id === updatedBank._id ? updatedBank : b))
    );
    setSuccessMessage(
      `Question bank "${updatedBank.name}" updated successfully!`
    );
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

  // --- Handlers for Quizzes ---
  const handleQuizGenerated = (newQuiz: ClientIQuiz) => {
    setQuizzes((prevQuizzes) => [newQuiz, ...prevQuizzes]);
    setSuccessMessage(`Quiz "${newQuiz.title}" generated successfully!`);
    setIsGenerateQuizModalOpen(false);
  };

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    setIsDeletingQuizId(quizToDelete._id);
    try {
      await api.delete(`/quizzes/${quizToDelete._id}`);
      setQuizzes((prev) => prev.filter((q) => q._id !== quizToDelete._id));
      setSuccessMessage(`Quiz "${quizToDelete.title}" deleted.`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete quiz.");
    } finally {
      setQuizToDelete(null);
      setIsDeletingQuizId(null);
    }
  };

  const handleNavigateToManageQuestions = (bankId: string) => {
    setIsNavigatingToBankEdit(bankId);
    navigate(`/question-banks/${bankId}/edit`);
  };

  // Helper to render Question Bank List (Simplified for now)
  const renderQuestionBankList = () => {
    if (isLoadingBanks && !questionBanks.length) return <LoadingSpinner />;
    if (!questionBanks.length && !error && !isLoadingBanks)
      return (
        <Card>
          <p>No question banks found. Create one to get started!</p>
        </Card>
      );
    return (
      <div className="space-y-4">
        {isLoadingBanks && questionBanks.length > 0 && (
          <div className="my-4">
            <LoadingSpinner />
          </div>
        )}
        {questionBanks.map((bank) => (
          <Card key={bank._id} className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold">{bank.name}</h3>
              <p className="text-sm text-gray-600">{bank.description}</p>
              <p className="text-xs text-gray-500">
                Categories: {bank.categories.join(", ") || "N/A"}
              </p>
              <p className="text-xs text-gray-500">
                Questions:{" "}
                {Array.isArray(bank.questions)
                  ? bank.questions.length
                  : bank.questionCount || 0}
              </p>
            </div>
            <div className="space-x-2 flex items-center">
              <Button
                variant="secondary"
                onClick={() => handleNavigateToManageQuestions(bank._id)}
                isLoading={isNavigatingToBankEdit === bank._id}
                disabled={
                  !!isNavigatingToBankEdit &&
                  isNavigatingToBankEdit !== bank._id
                } // Disable if another bank is loading
              >
                Manage Questions
              </Button>
              <Button
                variant="destructive"
                onClick={() => setBankToDelete(bank)}
                disabled={!!isNavigatingToBankEdit} // Disable if any bank navigation is in progress
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        {error && <ErrorMessage message={error} onDismiss={dismissMessages} />}
        {successMessage && (
          <SuccessNotification
            message={successMessage}
            onDismiss={dismissMessages}
          />
        )}

        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Question Banks</h2>
            <Button
              variant="primary"
              onClick={() => setIsCreateBankModalOpen(true)}
              disabled={!restaurantId || !!isNavigatingToBankEdit}
            >
              Create New Question Bank
            </Button>
          </div>
          {renderQuestionBankList()}
        </section>

        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Quizzes</h2>
            <Button
              variant="primary"
              onClick={() => setIsGenerateQuizModalOpen(true)}
              disabled={!!isNavigatingToBankEdit}
            >
              Create Quiz from Banks
            </Button>
          </div>
          {isLoadingQuizzes && quizzes.length === 0 && <LoadingSpinner />}
          {!isLoadingQuizzes && quizzes.length === 0 && !error && (
            <Card>
              <p>No quizzes found. Create one from your question banks!</p>
            </Card>
          )}
          {!isLoadingQuizzes && quizzes.length > 0 && (
            <QuizList
              quizzes={quizzes}
              isLoading={isLoadingQuizzes}
              onPreview={(quiz) => alert(`Preview quiz: ${quiz.title}`)}
              onDelete={(quiz) => setQuizToDelete(quiz)}
              onActivate={(quizId) => alert(`Activate quiz: ${quizId}`)}
              getMenuItemNames={(quiz) =>
                quiz.sourceQuestionBankIds?.join(", ") || "Banks"
              }
              isDeletingQuizId={isDeletingQuizId}
            />
          )}
          {isLoadingQuizzes && quizzes.length > 0 && (
            <div className="my-4">
              <LoadingSpinner />
            </div>
          )}
        </section>

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
      </main>
    </div>
  );
};

export default QuizAndBankManagementPage;
