import React from "react";
import LoadingSpinner from "../common/LoadingSpinner";

// --- Interfaces (Copied from QuizCreation.tsx for now) ---
// Consider moving these to a shared types file (e.g., src/types/quizTypes.ts)

interface Question {
  _id?: string;
  text: string;
  choices: string[];
  correctAnswer: number;
  menuItemId: string;
}

interface QuizData {
  _id?: string;
  title: string;
  menuItemIds: string[] | { _id: string; name: string }[];
  questions: Question[];
  restaurantId: string;
  isAssigned?: boolean;
  createdAt?: string;
  updatedAt?: string;
  isAvailable: boolean;
}

// --- Component Props ---
interface QuizListProps {
  quizzes: QuizData[];
  isLoading: boolean;
  onPreview: (quiz: QuizData) => void;
  onActivate: (quizId: string) => void;
  onDelete: (quiz: QuizData) => void;
  isDeletingQuizId: string | null;
  getMenuItemNames: (quiz: QuizData) => string;
}

// --- Component ---
const QuizList: React.FC<QuizListProps> = ({
  quizzes,
  isLoading,
  onPreview,
  onActivate,
  onDelete,
  isDeletingQuizId,
  getMenuItemNames,
}) => {
  if (isLoading) {
    return <LoadingSpinner />;
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
      {quizzes.map((quiz) => (
        <li key={quiz._id} className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-medium text-blue-600 truncate">
                {quiz.title}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Created:{" "}
                {quiz.createdAt
                  ? new Date(quiz.createdAt).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center space-x-3">
              <span
                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap ${
                  quiz.isAvailable
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {quiz.isAvailable ? "Active" : "Draft"}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onPreview(quiz)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  disabled={isDeletingQuizId === quiz._id}
                  aria-label={`Edit quiz ${quiz.title}`}
                >
                  Edit
                </button>
                {!quiz.isAvailable && (
                  <button
                    onClick={() => onActivate(quiz._id!)}
                    className="text-sm font-medium text-green-600 hover:text-green-800 disabled:opacity-50"
                    disabled={isDeletingQuizId === quiz._id}
                    aria-label={`Activate quiz ${quiz.title}`}
                  >
                    Activate
                  </button>
                )}
                <button
                  onClick={() => onDelete(quiz)}
                  disabled={isDeletingQuizId === quiz._id}
                  className={`text-sm font-medium ${
                    isDeletingQuizId === quiz._id
                      ? "text-gray-500"
                      : "text-red-600 hover:text-red-800"
                  } disabled:opacity-50`}
                  aria-label={`Delete quiz ${quiz.title}`}
                >
                  {isDeletingQuizId === quiz._id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default QuizList;
