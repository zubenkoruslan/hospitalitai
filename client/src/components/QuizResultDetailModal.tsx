import React, { useEffect, useState } from "react";
import api from "../services/api";
import Modal from "../components/common/Modal";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";

// Define interfaces for our data structures
interface QuizQuestion {
  text: string;
  choices: string[];
  userAnswerIndex: number;
  userAnswer: string;
  correctAnswerIndex: number;
  correctAnswer: string;
  isCorrect: boolean;
}

interface QuizResultDetail {
  _id: string;
  quizId: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  completedAt?: string;
  status: string;
  questions: QuizQuestion[];
}

interface QuizResultDetailModalProps {
  resultId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const QuizResultDetailModal: React.FC<QuizResultDetailModalProps> = ({
  resultId,
  isOpen,
  onClose,
}) => {
  const [result, setResult] = useState<QuizResultDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResultDetails = async () => {
      if (resultId && isOpen) {
        setIsLoading(true);
        setError(null);
        try {
          const response = await api.get(`/quiz-results/${resultId}/detail`);
          setResult(response.data.result);
        } catch (err: any) {
          console.error("Failed to fetch quiz result details:", err);
          if (err.response?.status === 404) {
            setError(
              "This quiz result could not be found. It may have been deleted or never properly saved."
            );
          } else {
            setError(
              err.response?.data?.message ||
                "Failed to load quiz result details."
            );
          }
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (resultId && isOpen) {
      fetchResultDetails();
    }
  }, [resultId, isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  const calculatePercentage = (score: number, total: number) => {
    if (total === 0) return "N/A";
    return ((score / total) * 100).toFixed(1) + "%";
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Quiz Result Details"
      footerContent={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="max-h-[60vh] overflow-y-auto">
        {isLoading && <LoadingSpinner message="Loading result details..." />}
        {error && <ErrorMessage message={error} />}
        {!isLoading && !error && result && (
          <div>
            {/* Quiz Result Summary */}
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-blue-700">
                {result.quizTitle}
              </h2>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Score: </span>
                  <span className="font-medium">
                    {/* Apply conditional color based on percentage */}
                    {result.totalQuestions > 0 ? (
                      <span
                        className={`font-semibold ${
                          (result.score / result.totalQuestions) * 100 >= 70
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {result.score} / {result.totalQuestions} (
                        {calculatePercentage(
                          result.score,
                          result.totalQuestions
                        )}
                        )
                      </span>
                    ) : (
                      // Handle case with 0 total questions if possible
                      <span className="text-gray-500">
                        {result.score} / {result.totalQuestions} (N/A)
                      </span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Status: </span>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      result.status === "Completed"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {result.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Completed: </span>
                  <span className="font-medium">
                    {result.completedAt
                      ? new Date(result.completedAt).toLocaleString()
                      : "In Progress"}
                  </span>
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div className="divide-y divide-gray-200">
              {result.questions.map((question, qIndex) => (
                <div key={qIndex} className="px-4 py-4 sm:px-6">
                  <div className="mb-3">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mr-2">
                      {qIndex + 1}
                    </span>
                    <span className="text-gray-900 font-medium">
                      {question.text}
                    </span>
                  </div>

                  <ul className="space-y-2 mt-3">
                    {question.choices.map((choice, cIndex) => (
                      <li
                        key={cIndex}
                        className={`flex items-start p-2 rounded-md ${
                          cIndex === question.correctAnswerIndex
                            ? "bg-green-50 border border-green-200"
                            : cIndex === question.userAnswerIndex &&
                              cIndex !== question.correctAnswerIndex
                            ? "bg-red-50 border border-red-200"
                            : "bg-gray-50 border border-gray-200"
                        }`}
                      >
                        <div className="flex-shrink-0 pt-0.5">
                          {cIndex === question.correctAnswerIndex ? (
                            <svg
                              className="h-5 w-5 text-green-500"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : cIndex === question.userAnswerIndex ? (
                            <svg
                              className="h-5 w-5 text-red-500"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <div className="h-5 w-5 border border-gray-300 rounded-full"></div>
                          )}
                        </div>
                        <div className="ml-3 text-sm">
                          <p
                            className={`${
                              cIndex === question.correctAnswerIndex
                                ? "text-green-800"
                                : cIndex === question.userAnswerIndex &&
                                  cIndex !== question.correctAnswerIndex
                                ? "text-red-800"
                                : "text-gray-700"
                            }`}
                          >
                            {choice}
                          </p>
                          {cIndex === question.userAnswerIndex &&
                            cIndex !== question.correctAnswerIndex && (
                              <p className="text-red-600 text-xs mt-1">
                                Your answer
                              </p>
                            )}
                          {cIndex === question.correctAnswerIndex && (
                            <p className="text-green-600 text-xs mt-1">
                              Correct answer
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default QuizResultDetailModal;
