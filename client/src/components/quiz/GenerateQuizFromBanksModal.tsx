import React, { useState, useEffect } from "react";
import {
  getQuestionBanks,
  generateQuizFromQuestionBanks,
  getRoles,
} from "../../services/api"; // Adjusted path
import { IQuestionBank } from "../../types/questionBankTypes";
import {
  GenerateQuizFromBanksClientData,
  ClientIQuiz,
} from "../../types/quizTypes"; // CORRECTED IMPORT PATH
import Button from "../common/Button"; // For consistent button styling
import LoadingSpinner from "../common/LoadingSpinner"; // For loading states
import Modal from "../common/Modal"; // Import generic Modal
import ErrorMessage from "../common/ErrorMessage"; // Import ErrorMessage
import { IRole } from "../../types/roleTypes"; // Import IRole
import { useAuth } from "../../context/AuthContext"; // Import useAuth to get restaurantId

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
  const [numberOfQuestionsPerAttempt, setNumberOfQuestionsPerAttempt] =
    useState<number>(10);
  const [availableBanks, setAvailableBanks] = useState<IQuestionBank[]>([]);
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false); // For form submission
  const [isLoadingBanks, setIsLoadingBanks] = useState<boolean>(false); // For fetching banks
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null); // For errors fetching banks

  // State for roles
  const [availableRoles, setAvailableRoles] = useState<IRole[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState<boolean>(false);
  const [fetchRolesError, setFetchRolesError] = useState<string | null>(null);

  const { user } = useAuth(); // Get user from AuthContext

  useEffect(() => {
    if (isOpen) {
      const fetchInitialData = async () => {
        setIsLoadingBanks(true);
        setFetchError(null);
        setError(null); // Clear form error too

        try {
          const banks = await getQuestionBanks();
          setAvailableBanks(banks || []); // Ensure banks is not undefined
        } catch (err) {
          console.error("Failed to fetch question banks:", err);
          setFetchError(
            "Failed to load question banks. Please try again later."
          );
          setAvailableBanks([]); // Ensure it's an empty array on error
        }
        setIsLoadingBanks(false);

        if (user?.restaurantId) {
          setIsLoadingRoles(true);
          setFetchRolesError(null);
          try {
            const roles = await getRoles(user.restaurantId);
            setAvailableRoles(roles || []);
          } catch (err) {
            console.error("Failed to fetch roles:", err);
            setFetchRolesError(
              "Failed to load roles for selection. Please try again later."
            );
            setAvailableRoles([]);
          }
          setIsLoadingRoles(false);
        }
      };
      fetchInitialData();
    } else {
      // Reset form when modal is closed or becomes non-visible
      setTitle("");
      setDescription("");
      setNumberOfQuestionsPerAttempt(10);
      setSelectedBankIds([]);
      setSelectedRoleIds([]); // Reset selected roles
      setError(null);
      setFetchError(null);
      setFetchRolesError(null); // Reset fetch roles error
      setIsLoading(false);
      setIsLoadingBanks(false);
      setIsLoadingRoles(false); // Reset loading roles
    }
  }, [isOpen, user?.restaurantId]);

  const handleBankSelectionChange = (bankId: string) => {
    setSelectedBankIds((prevSelected) =>
      prevSelected.includes(bankId)
        ? prevSelected.filter((id) => id !== bankId)
        : [...prevSelected, bankId]
    );
  };

  const handleRoleSelectionChange = (roleId: string) => {
    setSelectedRoleIds((prevSelected) =>
      prevSelected.includes(roleId)
        ? prevSelected.filter((id) => id !== roleId)
        : [...prevSelected, roleId]
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
    if (numberOfQuestionsPerAttempt <= 0) {
      setError("Number of questions per attempt must be greater than zero.");
      return;
    }

    setIsLoading(true);
    const quizData: GenerateQuizFromBanksClientData = {
      title,
      questionBankIds: selectedBankIds,
      numberOfQuestionsPerAttempt,
      targetRoles: selectedRoleIds, // Add selected role IDs
    };

    if (description.trim()) {
      quizData.description = description.trim();
    }

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

  const formId = "generate-quiz-form";

  const footerContent = (
    <>
      <Button
        variant="secondary"
        onClick={onClose}
        disabled={isLoading || isLoadingBanks}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form={formId}
        variant="primary"
        disabled={
          isLoading ||
          isLoadingBanks ||
          isLoadingRoles || // Disable if roles are loading
          !title.trim() ||
          selectedBankIds.length === 0 ||
          numberOfQuestionsPerAttempt <= 0
        }
        className="ml-3"
      >
        {isLoading ? <LoadingSpinner message="" /> : "Generate Quiz"}
      </Button>
    </>
  );

  if (!isOpen) return null; // Handled by generic Modal too, but good practice here.

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Quiz from Question Banks"
      size="xl" // Or "lg", adjust as needed
      footerContent={footerContent}
    >
      {fetchError && <ErrorMessage message={fetchError} />}

      {isLoadingBanks ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner message="Loading question banks..." />
        </div>
      ) : (
        <form onSubmit={handleSubmit} id={formId} className="space-y-6">
          {error && <ErrorMessage message={error} />}
          <div>
            <label
              htmlFor="modal-quiz-title"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Quiz Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="modal-quiz-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              required
              disabled={isLoadingBanks || isLoading || isLoadingRoles}
            />
          </div>

          <div>
            <label
              htmlFor="modal-quiz-description"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Description{" "}
              <span className="text-xs text-slate-500">(Optional)</span>
            </label>
            <textarea
              id="modal-quiz-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              disabled={isLoadingBanks || isLoading || isLoadingRoles}
            />
          </div>

          <div>
            <label
              htmlFor="modal-quiz-numberOfQuestionsPerAttempt"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Number of Questions Per Attempt{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="modal-quiz-numberOfQuestionsPerAttempt"
              value={numberOfQuestionsPerAttempt}
              onChange={(e) =>
                setNumberOfQuestionsPerAttempt(Number(e.target.value))
              }
              min="1"
              className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              required
              disabled={isLoadingBanks || isLoading || isLoadingRoles}
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="block text-sm font-medium text-slate-700">
              Select Question Banks <span className="text-red-500">*</span>
            </legend>

            {!isLoadingBanks && availableBanks.length === 0 && !fetchError && (
              <p className="text-slate-500 text-sm py-3">
                No question banks available. You can create them in the
                &apos;Question Banks&apos; section.
              </p>
            )}
            {!isLoadingBanks && availableBanks.length > 0 && (
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                {availableBanks.map((bank) => (
                  <div
                    key={bank._id}
                    className="flex items-start p-3 bg-white rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors duration-150 ease-in-out"
                  >
                    <input
                      type="checkbox"
                      id={`modal-bank-${bank._id}`}
                      checked={selectedBankIds.includes(bank._id)}
                      onChange={() => handleBankSelectionChange(bank._id)}
                      className="h-4 w-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500 focus:ring-offset-1 mt-1 cursor-pointer disabled:opacity-50"
                      disabled={isLoading || isLoadingBanks || isLoadingRoles} // Disable if either is loading
                    />
                    <label
                      htmlFor={`modal-bank-${bank._id}`}
                      className="ml-3 flex-1 cursor-pointer"
                    >
                      <div className="flex items-center">
                        <span
                          className={`block text-sm font-medium ${
                            isLoading || isLoadingBanks || isLoadingRoles
                              ? "text-slate-400"
                              : "text-slate-800"
                          }`}
                        >
                          {bank.name}
                        </span>
                        {bank.sourceType === "SOP" && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            SOP Based
                          </span>
                        )}
                      </div>
                      <span
                        className={`block text-xs ${
                          isLoading || isLoadingBanks || isLoadingRoles
                            ? "text-slate-400"
                            : "text-slate-600"
                        }`}
                      >
                        ({bank.questions?.length || bank.questionCount || 0}{" "}
                        questions)
                      </span>
                      {bank.sourceType === "SOP" &&
                        bank.sourceSopDocumentTitle && (
                          <p
                            className={`text-xs mt-0.5 ${
                              isLoading || isLoadingBanks || isLoadingRoles
                                ? "text-slate-400"
                                : "text-slate-500"
                            }`}
                          >
                            SOP: {bank.sourceSopDocumentTitle}
                          </p>
                        )}
                      {bank.description && (
                        <p
                          className={`text-xs mt-0.5 ${
                            isLoading || isLoadingBanks || isLoadingRoles
                              ? "text-slate-400"
                              : "text-slate-500"
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

          {/* Target Roles Selection */}
          <fieldset className="space-y-3">
            <legend className="block text-sm font-medium text-slate-700">
              Target Roles (Optional)
            </legend>
            <p className="text-xs text-slate-500">
              Select roles this quiz is for. Leave blank if it's for all roles.
            </p>
            {isLoadingRoles && (
              <div className="py-3">
                <LoadingSpinner message="Loading roles..." />
              </div>
            )}
            {fetchRolesError && !isLoadingRoles && (
              <ErrorMessage message={fetchRolesError} />
            )}
            {!isLoadingRoles &&
              !fetchRolesError &&
              availableRoles.length === 0 && (
                <p className="text-slate-500 text-sm py-3">
                  No roles available to assign. You can create roles in Staff
                  Management.
                </p>
              )}
            {!isLoadingRoles && availableRoles.length > 0 && (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                {availableRoles.map((role) => (
                  <div
                    key={role._id}
                    className="flex items-start p-3 bg-white rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors duration-150 ease-in-out"
                  >
                    <input
                      type="checkbox"
                      id={`modal-role-${role._id}`}
                      checked={selectedRoleIds.includes(role._id)}
                      onChange={() => handleRoleSelectionChange(role._id)}
                      className="h-4 w-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500 focus:ring-offset-1 mt-1 cursor-pointer disabled:opacity-50"
                      disabled={isLoading || isLoadingBanks || isLoadingRoles}
                    />
                    <label
                      htmlFor={`modal-role-${role._id}`}
                      className="ml-3 flex-1 cursor-pointer"
                    >
                      <span
                        className={`block text-sm font-medium ${
                          isLoading || isLoadingBanks || isLoadingRoles
                            ? "text-slate-400"
                            : "text-slate-800"
                        }`}
                      >
                        {role.name}
                      </span>
                      {role.description && (
                        <p
                          className={`text-xs mt-0.5 ${
                            isLoading || isLoadingBanks || isLoadingRoles
                              ? "text-slate-400"
                              : "text-slate-500"
                          }`}
                        >
                          {role.description}
                        </p>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </fieldset>
        </form>
      )}
    </Modal>
  );
};

export default GenerateQuizFromBanksModal;
