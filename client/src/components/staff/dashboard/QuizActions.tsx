import React from "react";
import { useNavigate } from "react-router-dom";
import {
  RocketLaunchIcon,
  BookOpenIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import Button from "../../common/Button";
import Card from "../../common/Card";

interface QuizActionsProps {
  availableQuizzes: number;
  hasIncompleteQuizzes: boolean;
  onStartQuiz: () => void;
  onPracticeMode: () => void;
  onViewProgress: () => void;
}

const QuizActions: React.FC<QuizActionsProps> = ({
  availableQuizzes,
  hasIncompleteQuizzes,
  onStartQuiz,
  onPracticeMode,
  onViewProgress,
}) => {
  return (
    <div className="space-y-4 mb-6">
      <h2 className="text-xl lg:text-2xl font-semibold text-slate-800 px-1">
        Ready to Learn?
      </h2>

      {/* Primary Action - Start Quiz */}
      <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl">
        <div className="p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <RocketLaunchIcon className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg lg:text-xl font-semibold mb-1">
                  {hasIncompleteQuizzes
                    ? "Continue Learning"
                    : "Start Your Next Quiz"}{" "}
                  🚀
                </h3>
                <p className="text-blue-100 text-sm lg:text-base">
                  {availableQuizzes > 0
                    ? `${availableQuizzes} quiz${
                        availableQuizzes > 1 ? "es" : ""
                      } available`
                    : "Continue your learning journey"}
                </p>
              </div>
            </div>
            <Button
              className="bg-white text-blue-600 hover:bg-blue-50 h-11 lg:h-12 px-4 lg:px-6 rounded-xl font-semibold text-sm lg:text-base shadow-sm hover:shadow-md transition-all duration-200 whitespace-nowrap"
              onClick={onStartQuiz}
            >
              Let's Go!
            </Button>
          </div>
        </div>
      </Card>

      {/* Secondary Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Practice Mode */}
        <Card className="border-2 border-dashed border-green-300 hover:border-green-400 transition-colors duration-200 hover:shadow-md">
          <div className="p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <BookOpenIcon className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-1">
                    Practice Mode 📚
                  </h3>
                  <p className="text-slate-600 text-sm">
                    Review previous topics
                  </p>
                </div>
              </div>
              <Button
                variant="white"
                className="border-green-500 text-green-600 hover:bg-green-50 h-10 lg:h-11 px-3 lg:px-4 rounded-xl text-sm lg:text-base"
                onClick={onPracticeMode}
              >
                Practice
              </Button>
            </div>
          </div>
        </Card>

        {/* View Progress */}
        <Card className="border-2 border-dashed border-purple-300 hover:border-purple-400 transition-colors duration-200 hover:shadow-md">
          <div className="p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <AcademicCapIcon className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-1">
                    My Progress 📊
                  </h3>
                  <p className="text-slate-600 text-sm">See how you're doing</p>
                </div>
              </div>
              <Button
                variant="white"
                className="border-purple-500 text-purple-600 hover:bg-purple-50 h-10 lg:h-11 px-3 lg:px-4 rounded-xl text-sm lg:text-base"
                onClick={onViewProgress}
              >
                View
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default QuizActions;
