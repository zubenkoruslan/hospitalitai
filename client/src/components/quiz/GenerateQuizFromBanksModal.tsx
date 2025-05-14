import React, { useState, useEffect } from "react";
import {
  getQuestionBanks,
  generateQuizFromQuestionBanks,
} from "../../services/api"; // Adjusted path
import { IQuestionBank } from "../../types/questionBankTypes";
import {
  GenerateQuizFromBanksClientData,
  ClientIQuiz,
} from "../../services/api"; // Adjusted path
import Button from "../common/Button"; // For consistent button styling
import LoadingSpinner from "../common/LoadingSpinner"; // For loading states

interface GenerateQuizFromBanksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizGenerated: (newQuiz: ClientIQuiz) => void;
}

const GenerateQuizFromBanksModal: React.FC<GenerateQuizFromBanksModalProps> = ({
  isOpen,
  onClose,
  onQuizGenerated,
}) => {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [numberOfQuestions, setNumberOfQuestions] = useState<number>(10);
  const [availableBanks, setAvailableBanks] = useState<IQuestionBank[]>([]);
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false); // For form submission
  const [isLoadingBanks, setIsLoadingBanks] = useState<boolean>(false); // For fetching banks
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null); // For errors fetching banks

  useEffect(() => {
    if (isOpen) {
      const fetchBanks = async () => {
        setIsLoadingBanks(true);
        setFetchError(null);
        setError(null); // Clear form error too
        try {
          const banks = await getQuestionBanks();
          setAvailableBanks(banks);
        } catch (err) {
          console.error("Failed to fetch question banks:", err);
          setFetchError(
            "Failed to load question banks. Please try again later."
          );
        }
        setIsLoadingBanks(false);
      };
      fetchBanks();
    } else {
      // Reset form when modal is closed or becomes non-visible
      setTitle("");
      setDescription("");
      setNumberOfQuestions(10);
      setSelectedBankIds([]);
      setError(null);
      setFetchError(null);
      setIsLoading(false);
      setIsLoadingBanks(false);
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

    if (!title.trim()) {
      setError("Quiz title is required.");
      return;
    }
    if (selectedBankIds.length === 0) {
      setError("Please select at least one question bank.");
      return;
    }
    if (numberOfQuestions <= 0) {
      setError("Number of questions must be greater than zero.");
      return;
    }

    setIsLoading(true);
    const quizData: GenerateQuizFromBanksClientData = {
      title,
      description,
      questionBankIds: selectedBankIds,
      numberOfQuestions,
    };

    try {
      const newQuiz: ClientIQuiz = await generateQuizFromQuestionBanks(
        quizData
      );
      onQuizGenerated(newQuiz); // Callback to parent
      onClose(); // Close modal
    } catch (err: any) {
      console.error("Failed to generate quiz:", err);
      setError(
        err.response?.data?.message ||
          "Failed to generate quiz. Please try again."
      );
    }
    setIsLoading(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            Generate Quiz from Question Banks
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {fetchError && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{fetchError}</span>
          </div>
        )}

        <div className="overflow-y-auto flex-grow pr-2">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="modal-quiz-title"
                className="block text-gray-700 font-semibold mb-1"
              >
                Quiz Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="modal-quiz-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150"
                required
                disabled={isLoadingBanks || isLoading}
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="modal-quiz-description"
                className="block text-gray-700 font-semibold mb-1"
              >
                Description (Optional)
              </label>
              <textarea
                id="modal-quiz-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150"
                disabled={isLoadingBanks || isLoading}
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="modal-quiz-numberOfQuestions"
                className="block text-gray-700 font-semibold mb-1"
              >
                Number of Questions <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="modal-quiz-numberOfQuestions"
                value={numberOfQuestions}
                onChange={(e) =>
                  setNumberOfQuestions(parseInt(e.target.value, 10))
                }
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150"
                required
                disabled={isLoadingBanks || isLoading}
              />
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Select Question Banks <span className="text-red-500">*</span>
              </h3>
              {isLoadingBanks && (
                <div className="flex justify-center items-center h-32">
                  <LoadingSpinner message="Loading question banks..." />
                </div>
              )}
              {!isLoadingBanks && !availableBanks.length && !fetchError && (
                <p className="text-gray-500 text-sm">
                  No question banks available to select.
                </p>
              )}
              {!isLoadingBanks && availableBanks.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
                  {availableBanks.map((bank) => (
                    <div
                      key={bank._id}
                      className="flex items-center p-2 bg-white rounded-md border border-gray-300 hover:bg-gray-100 transition duration-150"
                    >
                      <input
                        type="checkbox"
                        id={`modal-bank-${bank._id}`}
                        checked={selectedBankIds.includes(bank._id)}
                        onChange={() => handleBankSelectionChange(bank._id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2 cursor-pointer"
                        disabled={isLoading}
                      />
                      <label
                        htmlFor={`modal-bank-${bank._id}`}
                        className="text-sm text-gray-700 cursor-pointer flex-grow"
                      >
                        {bank.name}
                        <span className="text-xs text-gray-500 ml-1">
                          ({bank.questions.length}Q)
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative mb-4 text-sm"
                role="alert"
              >
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isLoadingBanks || isLoading}
              >
                {isLoading ? "Generating..." : "Generate Quiz"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GenerateQuizFromBanksModal;
