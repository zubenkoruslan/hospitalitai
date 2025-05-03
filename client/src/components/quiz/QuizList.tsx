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
}

// --- Component Props ---
interface QuizListProps {
  quizzes: QuizData[];
  isLoading: boolean;
  onPreview: (quiz: QuizData, startInEditMode: boolean) => void;
  onAssign: (quiz: QuizData) => void;
  onDelete: (quiz: QuizData) => void; // Renamed from openDeleteConfirm for clarity
  isDeletingQuizId: string | null; // ID of the quiz currently being deleted
  getMenuItemNames: (quiz: QuizData) => string; // Pass utility function
}

// --- Component ---
const QuizList: React.FC<QuizListProps> = ({
  quizzes,
  isLoading,
  onPreview,
  onAssign,
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
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-lg font-medium text-blue-600 truncate">
                {quiz.title}
                {quiz.isAssigned && (
                  <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Assigned
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Covers: {getMenuItemNames(quiz)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Created:{" "}
                {quiz.createdAt
                  ? new Date(quiz.createdAt).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
            <div className="ml-4 flex-shrink-0 flex space-x-2">
              <button
                onClick={() => onPreview(quiz, false)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Preview
              </button>
              {!quiz.isAssigned && (
                <>
                  <button
                    onClick={() => onPreview(quiz, true)} // Call onPreview for edit
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onAssign(quiz)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Assign
                  </button>
                </>
              )}
              <button
                onClick={() => onDelete(quiz)}
                disabled={isDeletingQuizId === quiz._id}
                className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white ${
                  isDeletingQuizId === quiz._id
                    ? "bg-gray-400"
                    : "bg-red-600 hover:bg-red-700"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50`}
              >
                {isDeletingQuizId === quiz._id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default QuizList;
