import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  XMarkIcon,
  BookOpenIcon,
  AcademicCapIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import { ClientIQuiz } from "../../types/quizTypes";
import { getAvailableQuizzesForStaff } from "../../services/api";
import Button from "../common/Button";
import Card from "../common/Card";
import LoadingSpinner from "../common/LoadingSpinner";
import ErrorMessage from "../common/ErrorMessage";

interface PracticeModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PracticeModeModal: React.FC<PracticeModeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<ClientIQuiz[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableQuizzes();
    }
  }, [isOpen]);

  const fetchAvailableQuizzes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAvailableQuizzesForStaff();
      setQuizzes(result);
    } catch (err: any) {
      console.error("Error fetching quizzes:", err);
      setError("Failed to load available quizzes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartPractice = (quizId: string) => {
    navigate(`/staff/quiz/${quizId}/practice`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>

          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <BookOpenIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Practice Mode 📚</h2>
              <p className="text-green-100 mt-1">
                Review and learn without pressure - results don't count!
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
              <p className="ml-3 text-slate-600">
                Loading available quizzes...
              </p>
            </div>
          ) : error ? (
            <div className="py-8">
              <ErrorMessage message={error} />
              <Button
                onClick={fetchAvailableQuizzes}
                className="mt-4 w-full"
                variant="white"
              >
                Try Again
              </Button>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-12">
              <AcademicCapIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                No Quizzes Available
              </h3>
              <p className="text-slate-600">
                There are no quizzes available for practice at the moment.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  Choose a Quiz to Practice
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-600 text-sm font-bold">
                        ✓
                      </span>
                    </div>
                    <div className="text-sm text-green-700">
                      <p className="font-medium mb-1">
                        Practice Mode Benefits:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-green-600">
                        <li>
                          Results don't affect your scores or team analytics
                        </li>
                        <li>No cooldown periods - retake immediately</li>
                        <li>Perfect for reviewing and reinforcing knowledge</li>
                        <li>See explanations for all answers</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                {quizzes.map((quiz) => (
                  <Card
                    key={quiz._id}
                    className="border-2 border-slate-200 hover:border-green-300 transition-all duration-200 hover:shadow-md"
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-slate-800 mb-2">
                            {quiz.title}
                          </h4>
                          {quiz.description && (
                            <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                              {quiz.description}
                            </p>
                          )}

                          <div className="flex items-center space-x-4 text-sm text-slate-500">
                            <div className="flex items-center space-x-1">
                              <AcademicCapIcon className="w-4 h-4" />
                              <span>
                                {quiz.numberOfQuestionsPerAttempt} questions
                              </span>
                            </div>
                            {quiz.totalUniqueQuestionsInSourceSnapshot && (
                              <div className="flex items-center space-x-1">
                                <BookOpenIcon className="w-4 h-4" />
                                <span>
                                  {quiz.totalUniqueQuestionsInSourceSnapshot}{" "}
                                  total available
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="ml-4">
                          <Button
                            onClick={() => handleStartPractice(quiz._id)}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 h-11 px-6 rounded-xl font-semibold whitespace-nowrap"
                          >
                            <PlayIcon className="w-5 h-5 mr-2" />
                            Practice
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PracticeModeModal;
