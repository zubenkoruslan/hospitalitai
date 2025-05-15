import React, { useState, useEffect, useCallback } from "react";
import {
  getQuestionBanks,
  updateQuizDetails,
  // generateQuizFromQuestionBanks, // Will be replaced by an update function
} from "../../services/api";
import { IQuestionBank } from "../../types/questionBankTypes";
import {
  // GenerateQuizFromBanksClientData, // Will be replaced by an update data type
  ClientIQuiz,
} from "../../services/api";
import Button from "../common/Button";
import LoadingSpinner from "../common/LoadingSpinner";
import Modal from "../common/Modal"; // Using the generic Modal

interface EditQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizUpdated: (updatedQuiz: ClientIQuiz) => void; // Callback for when quiz is successfully updated
  initialQuizData: ClientIQuiz | null; // The quiz data to pre-fill the form
}

const EditQuizModal: React.FC<EditQuizModalProps> = ({
  isOpen,
  onClose,
  onQuizUpdated,
  initialQuizData,
}) => {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [numberOfQuestionsPerAttempt, setNumberOfQuestionsPerAttempt] =
    useState<number>(10);
  const [availableBanks, setAvailableBanks] = useState<IQuestionBank[]>([]);
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false); // For form submission
  const [isLoadingBanks, setIsLoadingBanks] = useState<boolean>(false); // For fetching banks
  const [error, setError] = useState<string | null>(null);
  const [fetchBanksError, setFetchBanksError] = useState<string | null>(null);

  // Effect to populate form when initialQuizData changes (e.g., when modal opens with a quiz)
  useEffect(() => {
    if (initialQuizData) {
      setTitle(initialQuizData.title);
      setDescription(initialQuizData.description || "");
      setNumberOfQuestionsPerAttempt(
        initialQuizData.numberOfQuestionsPerAttempt
      );
      setSelectedBankIds(initialQuizData.sourceQuestionBankIds || []);
    } else {
      // Reset form if no initial data (e.g. modal closed or opened for new - though this modal is for edit)
      setTitle("");
      setDescription("");
      setNumberOfQuestionsPerAttempt(10);
      setSelectedBankIds([]);
    }
  }, [initialQuizData]);

  // Effect to fetch available question banks when the modal is open
  useEffect(() => {
    if (isOpen) {
      const fetchBanks = async () => {
        setIsLoadingBanks(true);
        setFetchBanksError(null);
        try {
          const banks = await getQuestionBanks();
          setAvailableBanks(banks || []);
        } catch (err) {
          console.error("Failed to fetch question banks for edit modal:", err);
          setFetchBanksError(
            "Failed to load question banks. Please try again later."
          );
          setAvailableBanks([]);
        }
        setIsLoadingBanks(false);
      };
      fetchBanks();
    }
  }, [isOpen]);

  const handleBankSelectionChange = (bankId: string) => {
    setSelectedBankIds((prevSelected) =>
      prevSelected.includes(bankId)
        ? prevSelected.filter((id) => id !== bankId)
        : [...prevSelected, bankId]
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!initialQuizData?._id) {
      setError("Cannot update quiz: Quiz ID is missing.");
      return;
    }
    if (!title.trim()) {
      setError("Quiz title is required.");
      return;
    }
    if (selectedBankIds.length === 0) {
      setError("Please select at least one question bank.");
      return;
    }
    if (numberOfQuestionsPerAttempt <= 0) {
      setError("Number of questions per attempt must be greater than zero.");
      return;
    }

    setIsLoading(true);
    const quizUpdateData: Partial<ClientIQuiz> = {
      // Use Partial as we only send changed fields
      title,
      description,
      sourceQuestionBankIds: selectedBankIds,
      numberOfQuestionsPerAttempt,
      // isAvailable: initialQuizData.isAvailable, // Preserve isAvailable status unless explicitly changed
      // If you want to allow editing isAvailable in this modal, add a form field for it.
    };

    // console.log("Submitting quiz update data:", quizUpdateData, "for quiz ID:", initialQuizData._id);
    // REMOVED Placeholder, ADDED actual API call
    try {
      const updatedQuiz = await updateQuizDetails(
        initialQuizData._id,
        quizUpdateData
      );
      onQuizUpdated(updatedQuiz); // Callback to parent with the full updated quiz object
      onClose(); // Close modal
    } catch (err: any) {
      console.error("Failed to update quiz:", err);
      setError(
        err.response?.data?.message ||
          "Failed to update quiz. Please try again."
      );
    }
    setIsLoading(false);

    // Placeholder for now:
    // setTimeout(() => {
    //     setIsLoading(false);
    //     // onQuizUpdated({ ...initialQuizData, ...quizUpdateData } as ClientIQuiz); // Simulate success for UI testing
    //     // onClose();
    //     setError("Submit logic not fully implemented yet. Check console for data.");
    // }, 1000);
  };

  // Using the generic Modal component
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialQuizData ? "Edit Quiz" : "Edit Quiz Details"}
    >
      {fetchBanksError && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{fetchBanksError}</span>
        </div>
      )}

      {isLoadingBanks ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner message="Loading question banks..." />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="edit-quiz-title"
              className="block text-sm font-medium text-gray-700"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="edit-quiz-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label
              htmlFor="edit-quiz-description"
              className="block text-sm font-medium text-gray-700"
            >
              Description (Optional)
            </label>
            <textarea
              id="edit-quiz-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={isLoading}
            />
          </div>

          <div>
            <label
              htmlFor="edit-quiz-questions-per-attempt"
              className="block text-sm font-medium text-gray-700"
            >
              Number of Questions Per Attempt{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="edit-quiz-questions-per-attempt"
              value={numberOfQuestionsPerAttempt}
              onChange={(e) =>
                setNumberOfQuestionsPerAttempt(parseInt(e.target.value, 10))
              }
              min="1"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
              disabled={isLoading}
            />
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Select Question Banks <span className="text-red-500">*</span>
            </h3>
            {availableBanks.length === 0 && !fetchBanksError && (
              <p className="text-gray-500 text-sm">
                No question banks available, or failed to load.
              </p>
            )}
            {availableBanks.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
                {availableBanks.map((bank) => (
                  <div
                    key={bank._id}
                    className="flex items-center p-2 bg-white rounded-md border border-gray-300 hover:bg-gray-100 transition duration-150"
                  >
                    <input
                      type="checkbox"
                      id={`edit-modal-bank-${bank._id}`}
                      checked={selectedBankIds.includes(bank._id)}
                      onChange={() => handleBankSelectionChange(bank._id)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2 cursor-pointer"
                      disabled={isLoading}
                    />
                    <label
                      htmlFor={`edit-modal-bank-${bank._id}`}
                      className="text-sm text-gray-700 cursor-pointer flex-grow"
                    >
                      {bank.name}
                      {/* Optionally show question count from bank.questionCount or bank.questions.length if available */}
                      {/* <span className="text-xs text-gray-500 ml-1">({bank.questionCount || bank.questions?.length || 0}Q)</span> */}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="pt-2 flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isLoading}
              disabled={!!fetchBanksError || isLoadingBanks}
            >
              Save Changes
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default EditQuizModal;
