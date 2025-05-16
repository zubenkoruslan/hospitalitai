import React, { useState, useEffect } from "react";
import { getQuestionBanks, updateQuizDetails } from "../../services/api";
import { IQuestionBank } from "../../types/questionBankTypes";
import { ClientIQuiz } from "../../types/quizTypes";
import Button from "../common/Button";
import LoadingSpinner from "../common/LoadingSpinner";
import Modal from "../common/Modal"; // Using the generic Modal
import ErrorMessage from "../common/ErrorMessage"; // Import ErrorMessage

interface EditQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizUpdated: (updatedQuiz: ClientIQuiz) => void;
  initialQuizData: ClientIQuiz | null;
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

  const formId = "edit-quiz-form";

  const footerContent = (
    <>
      <Button variant="secondary" onClick={onClose} disabled={isLoading}>
        Cancel
      </Button>
      <Button
        type="submit"
        form={formId} // Link to form
        variant="primary"
        disabled={
          isLoading ||
          !title.trim() ||
          selectedBankIds.length === 0 ||
          numberOfQuestionsPerAttempt <= 0
        }
        className="ml-3"
      >
        {isLoading ? <LoadingSpinner message="" /> : "Save Changes"}
      </Button>
    </>
  );

  // Using the generic Modal component
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Quiz"
      size="xl" // Consider lg or xl depending on content
      footerContent={footerContent}
    >
      {fetchBanksError && <ErrorMessage message={fetchBanksError} />}
      {/* General submission error shown near footer by Modal if passed via a prop, or handle here */}

      {isLoadingBanks ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner message="Loading question banks..." />
        </div>
      ) : (
        <form onSubmit={handleSubmit} id={formId} className="space-y-6">
          {/* Display submission error here, above form fields or below title */}
          {error && <ErrorMessage message={error} />}
          <div>
            <label
              htmlFor="edit-quiz-title"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="edit-quiz-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label
              htmlFor="edit-quiz-description"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Description{" "}
              <span className="text-xs text-slate-500">(Optional)</span>
            </label>
            <textarea
              id="edit-quiz-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              disabled={isLoading}
            />
          </div>

          <div>
            <label
              htmlFor="edit-quiz-questions-per-attempt"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Number of Questions Per Attempt{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="edit-quiz-questions-per-attempt"
              value={numberOfQuestionsPerAttempt}
              onChange={
                (e) =>
                  setNumberOfQuestionsPerAttempt(
                    parseInt(e.target.value, 10) || 0
                  ) // Ensure it's a number, default to 0 if parse fails
              }
              min="1"
              className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              required
              disabled={isLoading}
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="block text-sm font-medium text-slate-700">
              Select Question Banks <span className="text-red-500">*</span>
            </legend>

            {availableBanks.length === 0 && !fetchBanksError && (
              <p className="text-slate-500 text-sm py-3">
                No question banks available. You can create them in the
                &apos;Question Banks&apos; section.
              </p>
            )}
            {availableBanks.length > 0 && (
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                {availableBanks.map((bank) => (
                  <div
                    key={bank._id}
                    className="flex items-start p-3 bg-white rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors duration-150 ease-in-out"
                  >
                    <input
                      type="checkbox"
                      id={`edit-modal-bank-${bank._id}`}
                      checked={selectedBankIds.includes(bank._id)}
                      onChange={() => handleBankSelectionChange(bank._id)}
                      className="h-4 w-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500 focus:ring-offset-1 mt-1 cursor-pointer disabled:opacity-50"
                      disabled={isLoading}
                    />
                    <label
                      htmlFor={`edit-modal-bank-${bank._id}`}
                      className="ml-3 flex-1 cursor-pointer"
                    >
                      <span
                        className={`block text-sm font-medium ${
                          isLoading ? "text-slate-400" : "text-slate-800"
                        }`}
                      >
                        {bank.name} ({bank.questionCount || 0} questions)
                      </span>
                      {bank.description && (
                        <p
                          className={`text-xs mt-0.5 ${
                            isLoading ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          {bank.description}
                        </p>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </fieldset>
          {/* General submission error already placed above form fields */}
        </form>
      )}
    </Modal>
  );
};

export default EditQuizModal;
