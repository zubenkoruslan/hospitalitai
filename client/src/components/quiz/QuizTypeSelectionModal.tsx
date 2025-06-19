import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  XMarkIcon,
  PlayIcon,
  AcademicCapIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { PlayIcon as PlayIconSolid } from "@heroicons/react/24/solid";
import Modal from "../common/Modal";
import Button from "../common/Button";
import LoadingSpinner from "../common/LoadingSpinner";
import PracticeModeModal from "./PracticeModeModal";
import { getAvailableQuizzesForStaff } from "../../services/api";
import { ClientIQuiz } from "../../types/quizTypes";

interface QuizTypeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QuizTypeSelectionModal: React.FC<QuizTypeSelectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [isPracticeModeOpen, setIsPracticeModeOpen] = useState(false);
  const [availableQuizzes, setAvailableQuizzes] = useState<ClientIQuiz[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
  const [showGradedQuizSelection, setShowGradedQuizSelection] = useState(false);

  // Fetch available quizzes when graded quiz selection is shown
  useEffect(() => {
    if (
      showGradedQuizSelection &&
      !isLoadingQuizzes &&
      availableQuizzes.length === 0
    ) {
      fetchAvailableQuizzes();
    }
  }, [showGradedQuizSelection]);

  const fetchAvailableQuizzes = async () => {
    setIsLoadingQuizzes(true);
    try {
      const quizzes = await getAvailableQuizzesForStaff();
      setAvailableQuizzes(quizzes);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
    } finally {
      setIsLoadingQuizzes(false);
    }
  };

  const handleGradedQuizClick = () => {
    setShowGradedQuizSelection(true);
  };

  const handleQuizSelect = (quizId: string) => {
    onClose();
    navigate(`/staff/quiz/${quizId}/take`);
  };

  const handlePracticeQuizClick = () => {
    onClose();
    setIsPracticeModeOpen(true);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false}>
        <div className="w-full max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              {showGradedQuizSelection && (
                <button
                  onClick={() => setShowGradedQuizSelection(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors mr-2"
                >
                  <ArrowLeftIcon className="w-4 h-4 text-slate-500" />
                </button>
              )}
              <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-red-900 rounded-full flex items-center justify-center">
                <PlayIconSolid className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800">
                {showGradedQuizSelection
                  ? "Select Graded Quiz"
                  : "Choose Quiz Mode"}
              </h2>
            </div>
          </div>

          {/* Description */}
          <p className="text-slate-600 text-sm mb-6">
            {showGradedQuizSelection
              ? "Choose a quiz to take as a graded assessment. This will count towards your performance analytics."
              : "Select how you'd like to take your quiz. Practice mode is for learning, while graded quizzes count towards your performance."}
          </p>

          {/* Content */}
          {showGradedQuizSelection ? (
            // Graded Quiz Selection
            <div className="space-y-3">
              {isLoadingQuizzes ? (
                <div className="text-center py-8">
                  <LoadingSpinner />
                  <p className="text-slate-600 text-sm mt-3">
                    Loading available quizzes...
                  </p>
                </div>
              ) : availableQuizzes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AcademicCapIcon className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-800 mb-2">
                    No Quizzes Available
                  </h3>
                  <p className="text-slate-600 text-sm">
                    There are no quizzes available for you to take right now.
                  </p>
                </div>
              ) : (
                availableQuizzes.map((quiz) => (
                  <button
                    key={quiz._id}
                    onClick={() => handleQuizSelect(quiz._id)}
                    className="w-full p-4 border-2 border-slate-200 hover:border-red-300 rounded-xl transition-all duration-200 hover:bg-red-50 group text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800 mb-1">
                          {quiz.title}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {quiz.numberOfQuestionsPerAttempt} questions •
                          Official assessment
                        </p>
                      </div>
                      <div className="w-8 h-8 bg-red-100 group-hover:bg-red-200 rounded-lg flex items-center justify-center transition-colors">
                        <PlayIcon className="w-4 h-4 text-red-600" />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            // Quiz Type Options
            <div className="space-y-4">
              {/* Practice Quiz Option */}
              <button
                onClick={handlePracticeQuizClick}
                className="w-full p-4 border-2 border-slate-200 hover:border-blue-300 rounded-xl transition-all duration-200 hover:bg-blue-50 group text-left"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center transition-colors">
                    <PlayIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 mb-1">
                      Practice Quiz
                    </h3>
                    <p className="text-sm text-slate-600 mb-2">
                      Learn without pressure - results don't affect your score
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="w-3 h-3" />
                        <span>No time limit</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ChartBarIcon className="w-3 h-3" />
                        <span>No analytics impact</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>

              {/* Graded Quiz Option */}
              <button
                onClick={handleGradedQuizClick}
                className="w-full p-4 border-2 border-slate-200 hover:border-red-300 rounded-xl transition-all duration-200 hover:bg-red-50 group text-left"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-red-100 group-hover:bg-red-200 rounded-xl flex items-center justify-center transition-colors">
                    <AcademicCapIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 mb-1">
                      Graded Quiz
                    </h3>
                    <p className="text-sm text-slate-600 mb-2">
                      Official assessment - counts towards your performance
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="w-3 h-3" />
                        <span>Timed assessment</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ChartBarIcon className="w-3 h-3" />
                        <span>Affects analytics</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={onClose} className="w-full">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Practice Mode Modal */}
      <PracticeModeModal
        isOpen={isPracticeModeOpen}
        onClose={() => setIsPracticeModeOpen(false)}
      />
    </>
  );
};

export default QuizTypeSelectionModal;
