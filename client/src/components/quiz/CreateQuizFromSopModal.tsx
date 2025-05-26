import React, { useState, useEffect } from "react";
import { generateQuizFromQuestionBanks, getRoles } from "../../services/api";
import {
  GenerateQuizFromBanksClientData,
  ClientIQuiz,
} from "../../types/quizTypes";
import Button from "../common/Button";
import LoadingSpinner from "../common/LoadingSpinner";
import Modal from "../common/Modal";
import ErrorMessage from "../common/ErrorMessage";
import { IRole } from "../../types/roleTypes";
import { useAuth } from "../../context/AuthContext";

interface CreateQuizFromSopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizGenerated: (newQuiz: ClientIQuiz) => void;
  sopDocumentId: string;
  sopTitle: string;
}

const CreateQuizFromSopModal: React.FC<CreateQuizFromSopModalProps> = ({
  isOpen,
  onClose,
  onQuizGenerated,
  sopDocumentId,
  sopTitle,
}) => {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [numberOfQuestionsPerAttempt, setNumberOfQuestionsPerAttempt] =
    useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [availableRoles, setAvailableRoles] = useState<IRole[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState<boolean>(false);
  const [fetchRolesError, setFetchRolesError] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      // Pre-fill title based on SOP title
      setTitle(sopTitle ? `Quiz for SOP: ${sopTitle}` : "");

      if (user?.restaurantId) {
        setIsLoadingRoles(true);
        setFetchRolesError(null);
        getRoles(user.restaurantId)
          .then((roles) => setAvailableRoles(roles || []))
          .catch((err) => {
            console.error("Failed to fetch roles:", err);
            setFetchRolesError("Failed to load roles for selection.");
            setAvailableRoles([]);
          })
          .finally(() => setIsLoadingRoles(false));
      }
    } else {
      // Reset form when modal is closed
      setTitle("");
      setDescription("");
      setNumberOfQuestionsPerAttempt(10);
      setSelectedRoleIds([]);
      setError(null);
      setFetchRolesError(null);
      setIsLoading(false);
      setIsLoadingRoles(false);
    }
  }, [isOpen, user?.restaurantId, sopTitle]);

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
    if (numberOfQuestionsPerAttempt <= 0) {
      setError("Number of questions per attempt must be greater than zero.");
      return;
    }

    setIsLoading(true);
    const quizData: GenerateQuizFromBanksClientData = {
      title: title.trim(),
      sourceSopDocumentId: sopDocumentId, // Key change: use SOP ID
      numberOfQuestionsPerAttempt,
      targetRoles: selectedRoleIds,
    };

    if (description.trim()) {
      quizData.description = description.trim();
    }

    try {
      const newQuiz: ClientIQuiz = await generateQuizFromQuestionBanks(
        quizData
      );
      onQuizGenerated(newQuiz);
      onClose();
    } catch (err: any) {
      console.error("Failed to generate quiz from SOP:", err);
      setError(
        err.response?.data?.message ||
          "Failed to generate quiz. Please try again."
      );
    }
    setIsLoading(false);
  };

  const formId = "create-quiz-from-sop-form";

  const footerContent = (
    <>
      <Button
        variant="secondary"
        onClick={onClose}
        disabled={isLoading || isLoadingRoles}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form={formId}
        variant="primary"
        disabled={
          isLoading ||
          isLoadingRoles ||
          !title.trim() ||
          numberOfQuestionsPerAttempt <= 0
        }
        className="ml-3"
      >
        {isLoading ? <LoadingSpinner message="" /> : "Create Quiz"}
      </Button>
    </>
  );

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Create Quiz from SOP: ${sopTitle}`}
      size="lg"
      footerContent={footerContent}
    >
      <form onSubmit={handleSubmit} id={formId} className="space-y-6">
        {error && <ErrorMessage message={error} />}

        <p className="text-sm text-slate-600">
          This quiz will be generated using the question bank associated with
          the SOP: <strong>{sopTitle}</strong>.
        </p>

        <div>
          <label
            htmlFor="modal-quiz-sop-title"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Quiz Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="modal-quiz-sop-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out"
            required
            disabled={isLoading || isLoadingRoles}
          />
        </div>

        <div>
          <label
            htmlFor="modal-quiz-sop-description"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Description{" "}
            <span className="text-xs text-slate-500">(Optional)</span>
          </label>
          <textarea
            id="modal-quiz-sop-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out"
            disabled={isLoading || isLoadingRoles}
          />
        </div>

        <div>
          <label
            htmlFor="modal-quiz-sop-numQuestions"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Number of Questions Per Attempt{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="modal-quiz-sop-numQuestions"
            value={numberOfQuestionsPerAttempt}
            onChange={(e) =>
              setNumberOfQuestionsPerAttempt(Number(e.target.value))
            }
            min="1"
            className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out"
            required
            disabled={isLoading || isLoadingRoles}
          />
        </div>

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
                No roles available to assign.
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
                    id={`modal-sop-role-${role._id}`}
                    checked={selectedRoleIds.includes(role._id)}
                    onChange={() => handleRoleSelectionChange(role._id)}
                    className="h-4 w-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500 focus:ring-offset-1 mt-1 cursor-pointer"
                    disabled={isLoading || isLoadingRoles}
                  />
                  <label
                    htmlFor={`modal-sop-role-${role._id}`}
                    className="ml-3 flex-1 cursor-pointer"
                  >
                    <span className="block text-sm font-medium text-slate-800">
                      {role.name}
                    </span>
                    {role.description && (
                      <p className="text-xs mt-0.5 text-slate-500">
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
    </Modal>
  );
};

export default CreateQuizFromSopModal;
