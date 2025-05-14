import React, { useState, useEffect } from "react";
import {
  IQuestionBank,
  IQuestion,
  NewQuestionClientData,
} from "../../types/questionBankTypes"; // Corrected path
import Modal from "../common/Modal"; // Corrected path
import Button from "../common/Button"; // Corrected path
import LoadingSpinner from "../common/LoadingSpinner"; // Corrected path
import ErrorMessage from "../common/ErrorMessage"; // Corrected path
import AddManualQuestionForm from "./AddManualQuestionForm"; // <-- Import AddManualQuestionForm
import { addQuestionToBank, removeQuestionFromBank } from "../../services/api"; // Correctly import removeQuestionFromBank
import GenerateAiQuestionsForm from "./GenerateAiQuestionsForm"; // Uncommented and corrected path
import EditQuestionForm from "./EditQuestionForm"; // <-- Import EditQuestionForm
import ConfirmationModalContent from "../common/ConfirmationModalContent"; // Uncommented & For remove confirmation

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
  const [isLoading, setIsLoading] = useState(false);
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

  useEffect(() => {
    if (bank && Array.isArray(bank.questions)) {
      setQuestions(bank.questions as IQuestion[]);
    } else {
      setQuestions([]);
    }
  }, [bank]);

  const handleOpenAddManualForm = () => {
    setError(null); // Clear previous errors before opening form
    setIsAddManualModalOpen(true);
  };

  // This handler is called after AddManualQuestionForm successfully creates a question
  const handleQuestionCreatedByForm = async (
    newlyCreatedQuestion: IQuestion
  ) => {
    if (!bank) return;
    setIsProcessingBankUpdate(true);
    setError(null);
    try {
      // The form has already created the question (newlyCreatedQuestion has an _id)
      // Now, add this existing question to the current bank
      const updatedBank = await addQuestionToBank(
        bank._id,
        newlyCreatedQuestion._id
      );
      onBankQuestionsUpdated(updatedBank); // Notify parent page to update bank state
      setIsAddManualModalOpen(false); // Close the AddManualQuestionForm modal
      // Success message can be set here or in parent based on onBankQuestionsUpdated
    } catch (err: any) {
      console.error("Error adding created question to bank:", err);
      setError(
        err.response?.data?.message ||
          "Failed to add question to bank. The question was created but could not be added to this bank."
      );
    } finally {
      setIsProcessingBankUpdate(false);
    }
  };

  const handleGenerateAiQuestions = () => {
    setError(null); // Clear previous errors
    setIsGenerateAiModalOpen(true);
  };

  const handleAiQuestionsGenerated = (generatedQuestions: IQuestion[]) => {
    // The backend service already added these questions to the bank.
    // We just need to notify the parent to refresh the bank details.
    if (bank) {
      // We can pass the current bank or an identifier; the parent will refetch.
      // Let's pass the bank to be consistent with onBankQuestionsUpdated signature,
      // expecting the parent to refetch for freshness.
      onBankQuestionsUpdated(bank); // Parent will use bank._id to refetch the latest bank data
    }
    setIsGenerateAiModalOpen(false);
    // Optionally, set a success message here or let parent handle it.
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
      // Replace with actual API call: await api.removeQuestionFromBank(bank._id, questionToRemove._id);
      const updatedBank = await removeQuestionFromBank(
        bank._id,
        questionToRemove._id
      );
      onBankQuestionsUpdated(updatedBank);

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

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Manage Questions: ${bank.name}`}
    >
      <div className="space-y-6 p-1">
        {error && (
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        )}
        {successMessage && (
          <div className="p-3 mb-3 text-sm text-green-700 bg-green-100 rounded-md">
            {successMessage}
          </div>
        )}

        <div className="flex justify-end space-x-3 mb-4">
          <Button
            variant="primary"
            onClick={handleOpenAddManualForm}
            disabled={isProcessingBankUpdate}
          >
            Add Manual Question
          </Button>
          <Button variant="secondary" onClick={handleGenerateAiQuestions}>
            Generate AI Questions
          </Button>
        </div>

        {isLoading && <LoadingSpinner />}
        {isProcessingBankUpdate && (
          <LoadingSpinner message="Adding question to bank..." />
        )}

        {!isLoading && questions.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            This question bank currently has no questions.
          </p>
        )}

        {!isLoading && questions.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {questions.map((q, index) => (
              <div
                key={q._id || index}
                className="p-3 border rounded-md shadow-sm bg-white"
              >
                <p className="font-medium text-gray-800">
                  {index + 1}. {q.questionText}
                </p>
                {/* TODO: Display more question details like type, options if needed */}
                <div className="mt-2 flex justify-end space-x-2">
                  <Button
                    variant="secondary"
                    /*size="sm"*/ onClick={() => handleEditQuestion(q)}
                  >
                    {" "}
                    {/* Size prop removed as it does not exist */}
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    /*size="sm"*/ onClick={() => handleRemoveQuestion(q)}
                  >
                    {" "}
                    {/* Size prop removed */}
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isAddManualModalOpen && bank && (
          <AddManualQuestionForm
            initialBankCategories={bank.categories} // Corrected prop name
            onQuestionAdded={handleQuestionCreatedByForm} // Corrected handler and prop name
            onClose={() => {
              setIsAddManualModalOpen(false);
              setError(null); // Clear any errors from this modal if form is simply closed
            }}
            // AddManualQuestionForm has its own internalIsLoading, does not take isLoading prop
          />
        )}

        {isGenerateAiModalOpen && bank && (
          <GenerateAiQuestionsForm
            bankId={bank._id}
            bankCategories={bank.categories || []}
            onAiQuestionsGenerated={handleAiQuestionsGenerated}
            onClose={() => {
              setIsGenerateAiModalOpen(false);
              setError(null); // Clear any errors if form is simply closed
            }}
          />
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
      </div>
    </Modal>
  );
};

export default ManageQuestionsModal;
