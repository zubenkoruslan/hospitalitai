import React from "react";
import {
  TrophyIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import {
  TrophyIcon as TrophyIconSolid,
  StarIcon as StarIconSolid,
} from "@heroicons/react/24/solid";
import Button from "../common/Button";
import Card from "../common/Card";

interface QuizResultsDisplayProps {
  score: number;
  totalQuestions: number;
  quizTitle: string;
  completionTime?: number;
  incorrectAnswers?: Array<{
    questionText: string;
    selectedAnswer?: string;
    correctAnswer: string;
    explanation?: string;
  }>;
  onViewIncorrectAnswers?: () => void;
  onRetakeQuiz?: () => void;
  onBackToDashboard: () => void;
  isPracticeMode?: boolean;
}

const QuizResultsDisplay: React.FC<QuizResultsDisplayProps> = ({
  score,
  totalQuestions,
  completionTime,
  incorrectAnswers = [],
  onViewIncorrectAnswers,
  onRetakeQuiz,
  onBackToDashboard,
  isPracticeMode = false,
}) => {
  const percentage = Math.round((score / totalQuestions) * 100);

  const getPerformanceLevel = (percent: number) => {
    if (percent >= 90)
      return { level: "excellent", color: "emerald", emoji: "🌟" };
    if (percent >= 80) return { level: "great", color: "blue", emoji: "🎯" };
    if (percent >= 70) return { level: "good", color: "purple", emoji: "👍" };
    if (percent >= 60) return { level: "okay", color: "yellow", emoji: "💪" };
    return { level: "needs-work", color: "orange", emoji: "📚" };
  };

  const getEncouragementMessage = (percent: number, isPractice: boolean) => {
    if (isPractice) {
      if (percent >= 90)
        return "Excellent practice! You've got this material down! 🎯";
      if (percent >= 80)
        return "Great practice session! Keep honing those skills! 🚀";
      if (percent >= 70)
        return "Good practice! Try again to perfect your knowledge! 💪";
      if (percent >= 60)
        return "Nice practice run! Each attempt makes you stronger! 🎯";
      return "Perfect for practice! Try different approaches and learn! 📚";
    } else {
      if (percent >= 90)
        return "Outstanding work! You've mastered this topic! 🎉";
      if (percent >= 80)
        return "Excellent job! You're really getting the hang of this! 🚀";
      if (percent >= 70) return "Good work! You're on the right track! 💪";
      if (percent >= 60)
        return "Nice effort! A bit more practice and you'll ace it! 🎯";
      return "Great start! Learning takes time - keep practicing! 📚";
    }
  };

  const performance = getPerformanceLevel(percentage);
  const encouragementMessage = getEncouragementMessage(
    percentage,
    isPracticeMode
  );

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
        <div className="max-w-2xl mx-auto">
          {/* Main Results Card */}
          <Card className="mb-6 border-0 shadow-xl overflow-hidden">
            {/* Header with celebration */}
            <div
              className={`bg-gradient-to-r from-${performance.color}-500 to-${performance.color}-600 px-6 py-8 text-white text-center`}
            >
              <div className="mb-4">
                {percentage >= 90 ? (
                  <TrophyIconSolid className="w-16 h-16 mx-auto text-yellow-300" />
                ) : percentage >= 80 ? (
                  <StarIconSolid className="w-16 h-16 mx-auto text-yellow-300" />
                ) : (
                  <CheckCircleIcon className="w-16 h-16 mx-auto text-white" />
                )}
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">
                {isPracticeMode ? "Practice " : ""}Quiz Completed!{" "}
                {performance.emoji}
              </h1>
              {isPracticeMode && (
                <div className="mt-2 mb-4">
                  <div className="inline-block px-4 py-2 bg-green-500 text-white rounded-full text-sm font-medium">
                    🎯 Practice Mode - Results don't count towards analytics
                  </div>
                </div>
              )}
              <p className="text-xl lg:text-2xl font-semibold opacity-90">
                {score} out of {totalQuestions} correct
              </p>
              <div className="mt-4">
                <div
                  className={`inline-block px-6 py-2 rounded-full bg-white/20 text-white font-bold text-xl`}
                >
                  {percentage}%
                </div>
              </div>
            </div>

            {/* Encouragement Message */}
            <div className="px-6 py-6 bg-white">
              <div className="text-center mb-6">
                <p className="text-lg text-slate-700 font-medium">
                  {encouragementMessage}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <div className="text-2xl font-bold text-slate-800">
                    {score}
                  </div>
                  <div className="text-sm text-slate-600">Correct Answers</div>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <div className="text-2xl font-bold text-slate-800">
                    {totalQuestions - score}
                  </div>
                  <div className="text-sm text-slate-600">To Review</div>
                </div>
                {completionTime && (
                  <>
                    <div className="text-center p-4 bg-slate-50 rounded-xl">
                      <div className="text-2xl font-bold text-slate-800">
                        {formatTime(completionTime)}
                      </div>
                      <div className="text-sm text-slate-600">Time Taken</div>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-xl">
                      <div className="text-2xl font-bold text-slate-800">
                        {Math.round(completionTime / totalQuestions)}s
                      </div>
                      <div className="text-sm text-slate-600">Per Question</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Learning Opportunities */}
          {incorrectAnswers.length > 0 && (
            <Card className="mb-6 border-2 border-blue-200 bg-blue-50">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <InformationCircleIcon className="w-6 h-6 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-blue-800">
                    Learning Opportunities
                  </h3>
                </div>
                <p className="text-blue-700 mb-4">
                  You have {incorrectAnswers.length} questions to review.
                  Learning from mistakes is how we grow! 🌱
                </p>
                {onViewIncorrectAnswers && (
                  <Button
                    onClick={onViewIncorrectAnswers}
                    variant="white"
                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <InformationCircleIcon className="w-5 h-5 mr-2" />
                    Review Incorrect Answers
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            <Button
              onClick={onBackToDashboard}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              Back to Dashboard
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </Button>

            {isPracticeMode && onRetakeQuiz && (
              <Button
                onClick={onRetakeQuiz}
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
              >
                🎯 Practice Again - No Cooldown!
              </Button>
            )}
          </div>

          {/* Achievement Hint */}
          {!isPracticeMode && percentage >= 90 && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center px-4 py-2 bg-yellow-100 border border-yellow-300 rounded-full">
                <TrophyIcon className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="text-yellow-800 font-medium">
                  Achievement unlocked! Check your progress page! 🏆
                </span>
              </div>
            </div>
          )}

          {isPracticeMode && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center px-4 py-2 bg-green-100 border border-green-300 rounded-full">
                <span className="text-green-800 font-medium">
                  🎯 Practice Mode: Results help you learn but don't affect your
                  official scores
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizResultsDisplay;
