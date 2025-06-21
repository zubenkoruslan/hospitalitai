import React from "react";
import LoadingSpinner from "../common/LoadingSpinner";
import { ClientIQuiz } from "../../types/quizTypes";
import {
  PencilIcon,
  PlayIcon,
  PauseIcon,
  ChartBarIcon,
  TrashIcon,
  CalendarIcon,
  QuestionMarkCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

// --- Component Props ---
interface QuizListProps {
  quizzes: ClientIQuiz[];
  isLoading: boolean;
  onPreview: (quiz: ClientIQuiz) => void;
  onActivate: (quizId: string) => void;
  onDeactivate: (quizId: string) => void;
  onDelete: (quiz: ClientIQuiz) => void;
  onViewProgress: (quizId: string) => void;
  isDeletingQuizId: string | null;
}

// --- Component ---
const QuizList: React.FC<QuizListProps> = ({
  quizzes,
  isLoading,
  onPreview,
  onActivate,
  onDeactivate,
  onDelete,
  onViewProgress,
  isDeletingQuizId,
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
    <div className="space-y-4">
      {quizzes.map((quiz) => {
        console.log(
          "Rendering quiz in QuizList, ID:",
          quiz._id,
          "Full quiz object:",
          quiz
        );
        return (
          <div
            key={quiz._id}
            className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300 overflow-hidden"
          >
            {/* Header Section with Status */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {quiz.isAvailable ? (
                      <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl border-2 border-green-200">
                        <PlayIcon className="h-6 w-6 text-green-600" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl border-2 border-gray-200">
                        <PauseIcon className="h-6 w-6 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-gray-900 truncate">
                      {quiz.title}
                    </h3>
                    <div className="flex items-center space-x-6 mt-2">
                      <span className="text-sm text-gray-500 flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1.5" />
                        {quiz.createdAt
                          ? new Date(quiz.createdAt).toLocaleDateString()
                          : "N/A"}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center">
                        <QuestionMarkCircleIcon className="h-4 w-4 mr-1.5" />
                        {quiz.numberOfQuestionsPerAttempt} questions per attempt
                      </span>
                      <span className="text-sm text-gray-500 flex items-center">
                        <UserGroupIcon className="h-4 w-4 mr-1.5" />
                        {quiz.targetRoles && quiz.targetRoles.length > 0
                          ? quiz.targetRoles.map((role) => role.name).join(", ")
                          : "All Roles"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-600">
                      Total Questions
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {quiz.totalUniqueQuestionsInSourceSnapshot ?? "N/A"}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {quiz.isAvailable ? (
                      <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-200">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                        <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                        Draft
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="px-6 py-5">
              {quiz.description && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {quiz.description}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => onPreview(quiz)}
                  className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isDeletingQuizId === quiz._id}
                  aria-label={`Edit quiz ${quiz.title}`}
                >
                  <PencilIcon className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                  Edit / Preview
                </button>

                {quiz.isAvailable === true ? (
                  <button
                    onClick={() => onDeactivate(quiz._id!)}
                    className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isDeletingQuizId === quiz._id}
                    aria-label={`Deactivate quiz ${quiz.title}`}
                  >
                    <PauseIcon className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => onActivate(quiz._id!)}
                    className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isDeletingQuizId === quiz._id}
                    aria-label={`Activate quiz ${quiz.title}`}
                  >
                    <PlayIcon className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                    Activate
                  </button>
                )}

                <button
                  onClick={() => onViewProgress(quiz._id)}
                  className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isDeletingQuizId === quiz._id}
                  aria-label={`View progress for quiz ${quiz.title}`}
                >
                  <ChartBarIcon className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                  View Progress
                </button>

                <button
                  onClick={() => onDelete(quiz)}
                  disabled={isDeletingQuizId === quiz._id}
                  className={`inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all duration-200 group ${
                    isDeletingQuizId === quiz._id
                      ? "text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed"
                      : "text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 focus:ring-red-500"
                  }`}
                  aria-label={`Delete quiz ${quiz.title}`}
                >
                  <TrashIcon
                    className={`h-4 w-4 mr-2 transition-transform duration-200 ${
                      isDeletingQuizId !== quiz._id
                        ? "group-hover:scale-110"
                        : ""
                    }`}
                  />
                  {isDeletingQuizId === quiz._id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QuizList;
