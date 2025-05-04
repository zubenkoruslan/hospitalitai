import React, { useEffect, useState } from "react";
import api from "../services/api";

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
  retakeCount: number;
  questions: QuizQuestion[];
}

// Loading spinner component
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-4">
    <svg
      className="animate-spin h-8 w-8 text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  </div>
);

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
          const response = await api.get(`/results/${resultId}/detail`);
          setResult(response.data.result);
        } catch (err: any) {
          console.error("Failed to fetch quiz result details:", err);
          setError(
            err.response?.data?.message || "Failed to load quiz result details."
          );
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
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block w-full max-w-4xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="text-gray-400 bg-white rounded-md hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={onClose}
              aria-label="Close"
            >
              <span className="sr-only">Close</span>
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="mt-3 sm:mt-0">
            {/* Modal header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Quiz Result Details
              </h3>
            </div>

            {/* Modal content */}
            <div className="mt-4 max-h-[70vh] overflow-y-auto">
              {isLoading && <LoadingSpinner />}

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                  <strong className="font-bold">Error: </strong>
                  <span className="block sm:inline">{error}</span>
                </div>
              )}

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
                                (result.score / result.totalQuestions) * 100 >=
                                70
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

            {/* Modal footer */}
            <div className="mt-5 sm:mt-6">
              <button
                type="button"
                className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizResultDetailModal;
