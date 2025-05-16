import React, { useState, useEffect, useCallback } from "react";
import {
  IQuestionBank,
  IQuestion,
  NewQuestionClientData,
} from "../../types/questionBankTypes"; // Corrected path
import Modal from "../common/Modal"; // Generic Modal
import Button from "../common/Button"; // Corrected path
import LoadingSpinner from "../common/LoadingSpinner"; // Corrected path
import ErrorMessage from "../common/ErrorMessage"; // Corrected path
import AddManualQuestionForm from "./AddManualQuestionForm"; // <-- Import AddManualQuestionForm
import {
  addQuestionToBank,
  removeQuestionFromBank,
  getQuestionBankById,
  getQuestionById,
} from "../../services/api"; // Correctly import removeQuestionFromBank
import GenerateAiQuestionsForm from "./GenerateAiQuestionsForm"; // Uncommented and corrected path
import EditQuestionForm from "./EditQuestionForm"; // <-- Import EditQuestionForm
import ConfirmationModalContent from "../common/ConfirmationModalContent"; // Uncommented & For remove confirmation
import { useValidation } from "../../context/ValidationContext";
import {
  PlusCircleIcon,
  SparklesIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import QuestionListItem from "./QuestionListItem"; // Uncommented

interface ManageQuestionsModalProps {
  bank: IQuestionBank;
  onClose: () => void;
  onBankQuestionsUpdated: (updatedBank: IQuestionBank) => void; // <-- New prop
  // TODO: Add more props as needed, e.g., handlers for adding/editing/removing questions
}

const ManageQuestionsModal: React.FC<ManageQuestionsModalProps> = ({
  bank,
  onClose,
  onBankQuestionsUpdated, // <-- Destructure new prop
}) => {
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingBankUpdate, setIsProcessingBankUpdate] = useState(false); // For addQuestionToBank operation

  const [isAddManualModalOpen, setIsAddManualModalOpen] = useState(false);
  const [isGenerateAiModalOpen, setIsGenerateAiModalOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<IQuestion | null>(null);
  const [isEditQuestionModalOpen, setIsEditQuestionModalOpen] = useState(false);
  const [questionToRemove, setQuestionToRemove] = useState<IQuestion | null>(
    null
  ); // <-- New state for question to remove
  const [isRemoveConfirmModalOpen, setIsRemoveConfirmModalOpen] =
    useState(false); // <-- New state for confirm modal
  const [isProcessingRemove, setIsProcessingRemove] = useState(false); // <-- New state for loading during removal
  const { formatErrorMessage } = useValidation();

  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const currentBankDetails = await getQuestionBankById(bank._id);
      if (
        currentBankDetails.questions &&
        currentBankDetails.questions.length > 0
      ) {
        if (typeof currentBankDetails.questions[0] === "string") {
          // If backend sends only IDs, fetch them individually
          const questionDetails = await Promise.all(
            (currentBankDetails.questions as string[]).map((id) =>
              getQuestionById(id)
            )
          );
          setQuestions(
            questionDetails.filter((q) => q !== null) as IQuestion[]
          ); // Filter out nulls if getQuestionById can return null
        } else {
          // Questions are already populated objects
          setQuestions(currentBankDetails.questions as IQuestion[]);
        }
      } else {
        setQuestions([]); // No questions or empty array
      }
    } catch (err) {
      console.error("Error loading questions:", err);
      setError(formatErrorMessage(err));
      setQuestions([]); // Clear questions on error
    } finally {
      setIsLoading(false);
    }
  }, [bank._id, formatErrorMessage]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleQuestionCreatedByForm = (newQuestion: IQuestion) => {
    // Add to local state and update parent, then close form's modal
    setQuestions((prev) =>
      [newQuestion, ...prev].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
    );
    onBankQuestionsUpdated({
      ...bank,
      questionCount: (bank.questionCount || 0) + 1,
    });
    setIsAddManualModalOpen(false);
    setError(null);
  };

  const handleAiQuestionsGenerated = (newQuestions: IQuestion[]) => {
    setQuestions((prev) =>
      [...newQuestions, ...prev].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
    );
    onBankQuestionsUpdated({
      ...bank,
      questionCount: (bank.questionCount || 0) + newQuestions.length,
    });
    setIsGenerateAiModalOpen(false);
    setError(null);
  };

  const handleEditQuestion = (question: IQuestion) => {
    setError(null); // Clear previous errors
    setQuestionToEdit(question);
    setIsEditQuestionModalOpen(true);
  };

  const handleQuestionUpdatedByForm = (updatedQuestion: IQuestion) => {
    if (bank) {
      // The EditQuestionForm already called the API and returned the updated question.
      // We need to reflect this update in the parent component's state.
      // Create an updated version of the bank with the modified question.
      const updatedQuestionsArray = (bank.questions as IQuestion[]).map((q) =>
        q._id === updatedQuestion._id ? updatedQuestion : q
      );
      const updatedBank = { ...bank, questions: updatedQuestionsArray };
      onBankQuestionsUpdated(updatedBank);
    }
    setIsEditQuestionModalOpen(false);
    setQuestionToEdit(null);
    // Optionally, set a success message if needed, or rely on parent page's general success messages
  };

  const handleRemoveQuestion = (question: IQuestion) => {
    setError(null); // Clear previous errors
    setQuestionToRemove(question);
    setIsRemoveConfirmModalOpen(true);
  };

  const confirmRemoveQuestionFromBank = async () => {
    if (!questionToRemove || !bank) return;

    setIsProcessingRemove(true);
    setError(null);
    try {
      const updatedBank = await removeQuestionFromBank(
        bank._id,
        questionToRemove._id
      );
      onBankQuestionsUpdated(updatedBank);
      if (updatedBank.questions) {
        if (
          updatedBank.questions.length > 0 &&
          typeof updatedBank.questions[0] === "string"
        ) {
          const questionDetails = await Promise.all(
            (updatedBank.questions as string[]).map((id) => getQuestionById(id))
          );
          setQuestions(
            questionDetails.filter((q) => q !== null) as IQuestion[]
          );
        } else {
          setQuestions(updatedBank.questions as IQuestion[]);
        }
      } else {
        setQuestions([]);
      }

      setSuccessMessage(
        `Question "${questionToRemove.questionText.substring(
          0,
          30
        )}..." removed from bank.`
      );
    } catch (err: any) {
      console.error("Error removing question from bank:", err);
      setError(
        err.response?.data?.message || "Failed to remove question from bank."
      );
    } finally {
      setIsProcessingRemove(false);
      setIsRemoveConfirmModalOpen(false);
      setQuestionToRemove(null);
    }
  };

  // Helper for timed success message
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  if (isLoading && questions.length === 0) {
    return (
      <Modal
        isOpen={true}
        onClose={onClose}
        title={`Manage Questions: ${bank.name}`}
        size="2xl" // Changed from 3xl
      >
        <div className="p-6 text-center">
          <LoadingSpinner />
          <p className="mt-2 text-gray-500">Loading questions...</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Manage Questions: ${bank.name} (${
        isLoading ? "..." : questions.length
      })`}
      size="2xl"
    >
      <div className="space-y-6 p-1">
        {error && (
          <div
            className="p-3 mb-3 text-sm text-red-700 bg-red-100 rounded-md"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 bg-slate-50 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-slate-700 self-center sm:self-auto">
            Modify Questions for:{" "}
            <span className="text-blue-600">{bank.name}</span>
          </h3>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              variant="secondary"
              onClick={() => setIsAddManualModalOpen(true)}
              className="w-full sm:w-auto"
            >
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Add Manual Question
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsGenerateAiModalOpen(true)}
              className="w-full sm:w-auto"
            >
              <SparklesIcon className="h-5 w-5 mr-2" />
              Generate AI Questions
            </Button>
          </div>
        </div>

        {successMessage && (
          <div className="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded-md shadow">
            {successMessage}
          </div>
        )}

        {isLoading && questions.length === 0 ? (
          <div className="text-center p-6">
            <LoadingSpinner />
            <p className="mt-2 text-slate-500">Loading questions...</p>
          </div>
        ) : !isLoading && questions.length === 0 ? (
          <div className="text-center p-6 bg-white rounded-lg shadow">
            <p className="text-slate-500 text-lg">
              No questions found in this bank.
            </p>
            <p className="text-slate-400 mt-1">
              Add questions manually or generate them using AI.
            </p>
          </div>
        ) : (
          <ul className="space-y-4 max-h-[calc(100vh-350px)] overflow-y-auto pr-2 custom-scrollbar">
            {questions.map((q, index) => (
              <QuestionListItem
                key={q._id}
                question={q}
                index={index}
                onEdit={() => handleEditQuestion(q)}
                onDelete={() => handleRemoveQuestion(q)}
              />
            ))}
          </ul>
        )}
      </div>

      {isAddManualModalOpen && bank && (
        <Modal
          isOpen={isAddManualModalOpen}
          onClose={() => {
            setIsAddManualModalOpen(false);
            setError(null);
          }}
          title="Add New Question Manually"
          size="2xl"
        >
          <AddManualQuestionForm
            initialBankCategories={bank.categories}
            onQuestionAdded={handleQuestionCreatedByForm}
            onCloseRequest={() => {
              setIsAddManualModalOpen(false);
              setError(null);
            }}
          />
        </Modal>
      )}

      {isGenerateAiModalOpen && bank && (
        <Modal
          isOpen={isGenerateAiModalOpen}
          onClose={() => {
            setIsGenerateAiModalOpen(false);
            setError(null);
          }}
          title="Generate Questions with AI"
          size="xl"
        >
          <GenerateAiQuestionsForm
            bankId={bank._id}
            bankCategories={bank.categories}
            onAiQuestionsGenerated={handleAiQuestionsGenerated}
            onCloseRequest={() => {
              setIsGenerateAiModalOpen(false);
              setError(null);
            }}
          />
        </Modal>
      )}

      {isEditQuestionModalOpen && questionToEdit && (
        <EditQuestionForm
          questionToEdit={questionToEdit}
          onQuestionUpdated={handleQuestionUpdatedByForm}
          onClose={() => {
            setIsEditQuestionModalOpen(false);
            setQuestionToEdit(null);
            setError(null);
          }}
        />
      )}

      {isRemoveConfirmModalOpen && questionToRemove && bank && (
        <Modal
          isOpen={isRemoveConfirmModalOpen}
          onClose={() => {
            setIsRemoveConfirmModalOpen(false);
            setQuestionToRemove(null);
          }}
          title="Confirm Removal"
        >
          <ConfirmationModalContent
            message={`Are you sure you want to remove the question "${questionToRemove.questionText}" from the bank "${bank.name}"? This action cannot be undone.`}
            onConfirm={confirmRemoveQuestionFromBank}
            onCancel={() => {
              setIsRemoveConfirmModalOpen(false);
              setQuestionToRemove(null);
            }}
            confirmText="Remove Question"
            confirmButtonVariant="destructive"
            isLoadingConfirm={isProcessingRemove}
          />
        </Modal>
      )}
    </Modal>
  );
};

export default ManageQuestionsModal;
