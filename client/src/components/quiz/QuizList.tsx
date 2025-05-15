import React from "react";
import LoadingSpinner from "../common/LoadingSpinner";
import { ClientIQuiz } from "../../services/api";

// --- Component Props ---
interface QuizListProps {
  quizzes: ClientIQuiz[];
  isLoading: boolean;
  onPreview: (quiz: ClientIQuiz) => void;
  onActivate: (quizId: string) => void;
  onDelete: (quiz: ClientIQuiz) => void;
  onViewProgress: (quizId: string) => void;
  isDeletingQuizId: string | null;
  getMenuItemNames: (quiz: ClientIQuiz) => string;
}

// --- Component ---
const QuizList: React.FC<QuizListProps> = ({
  quizzes,
  isLoading,
  onPreview,
  onActivate,
  onDelete,
  onViewProgress,
  isDeletingQuizId,
  getMenuItemNames,
}) => {
  if (isLoading) {
    return <LoadingSpinner message="Loading quizzes..." />;
  }

  if (quizzes.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">
        No quizzes found. Create one to get started!
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-200" aria-labelledby="quiz-list-title">
      {quizzes.map((quiz) => {
        console.log(
          "Rendering quiz in QuizList, ID:",
          quiz._id,
          "Full quiz object:",
          quiz
        );
        return (
          <li key={quiz._id} className="px-4 py-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 mb-3 sm:mb-0">
                <p className="text-lg font-medium text-blue-600 truncate">
                  {quiz.title}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Description: {quiz.description || "N/A"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Questions Per Attempt: {quiz.numberOfQuestionsPerAttempt}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Total Unique Questions in Source:{" "}
                  {quiz.totalUniqueQuestionsInSourceSnapshot ?? "N/A"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Created:{" "}
                  {quiz.createdAt
                    ? new Date(quiz.createdAt).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
              <div className="mt-3 sm:mt-0 flex-shrink-0 w-full sm:w-auto">
                <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap self-start sm:self-center ${
                      quiz.isAvailable
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {quiz.isAvailable ? "Active" : "Draft"}
                  </span>
                  <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                    <button
                      onClick={() => onPreview(quiz)}
                      className="w-full sm:w-auto text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 text-left sm:text-center px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors duration-150"
                      disabled={isDeletingQuizId === quiz._id}
                      aria-label={`Edit quiz ${quiz.title}`}
                    >
                      Edit / Preview
                    </button>
                    {quiz.isAvailable === false && (
                      <button
                        onClick={() => onActivate(quiz._id!)}
                        className="w-full sm:w-auto text-sm font-medium text-green-600 hover:text-green-800 disabled:opacity-50 text-left sm:text-center px-3 py-1.5 rounded-md hover:bg-green-50 transition-colors duration-150"
                        disabled={isDeletingQuizId === quiz._id}
                        aria-label={`Activate quiz ${quiz.title}`}
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => onViewProgress(quiz._id)}
                      className="w-full sm:w-auto text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50 text-left sm:text-center px-3 py-1.5 rounded-md hover:bg-indigo-50 transition-colors duration-150"
                      disabled={isDeletingQuizId === quiz._id}
                      aria-label={`View progress for quiz ${quiz.title}`}
                    >
                      View Progress
                    </button>
                    <button
                      onClick={() => onDelete(quiz)}
                      disabled={isDeletingQuizId === quiz._id}
                      className={`w-full sm:w-auto text-sm font-medium ${
                        isDeletingQuizId === quiz._id
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-red-600 hover:text-red-800 hover:bg-red-50"
                      } disabled:opacity-50 text-left sm:text-center px-3 py-1.5 rounded-md transition-colors duration-150`}
                      aria-label={`Delete quiz ${quiz.title}`}
                    >
                      {isDeletingQuizId === quiz._id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default QuizList;
