import React from "react";
import Card from "../common/Card";
import {
  BookOpenIcon,
  UserGroupIcon,
  CogIcon,
  HeartIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

interface CategoryData {
  category: string;
  score: number;
  questionsAnswered: number;
  totalQuestions: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface CategoryBreakdownProps {
  data: CategoryData[];
  className?: string;
}

const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  data,
  className = "",
}) => {
  // Default categories with icons if no data provided
  const defaultCategories: CategoryData[] = [
    {
      category: "Menu Knowledge",
      score: 0,
      questionsAnswered: 0,
      totalQuestions: 0,
      color: "blue",
      icon: BookOpenIcon,
    },
    {
      category: "Customer Service",
      score: 0,
      questionsAnswered: 0,
      totalQuestions: 0,
      color: "green",
      icon: UserGroupIcon,
    },
    {
      category: "Food Safety",
      score: 0,
      questionsAnswered: 0,
      totalQuestions: 0,
      color: "red",
      icon: ShieldCheckIcon,
    },
    {
      category: "Operations",
      score: 0,
      questionsAnswered: 0,
      totalQuestions: 0,
      color: "purple",
      icon: CogIcon,
    },
    {
      category: "Health & Safety",
      score: 0,
      questionsAnswered: 0,
      totalQuestions: 0,
      color: "orange",
      icon: HeartIcon,
    },
    {
      category: "Special Procedures",
      score: 0,
      questionsAnswered: 0,
      totalQuestions: 0,
      color: "indigo",
      icon: SparklesIcon,
    },
  ];

  const categories = data.length > 0 ? data : defaultCategories;

  const getColorClasses = (
    color: string,
    variant: "bg" | "text" | "border"
  ) => {
    const colorMap = {
      blue: {
        bg: "bg-blue-100",
        text: "text-blue-600",
        border: "border-blue-200",
      },
      green: {
        bg: "bg-green-100",
        text: "text-green-600",
        border: "border-green-200",
      },
      red: {
        bg: "bg-red-100",
        text: "text-red-600",
        border: "border-red-200",
      },
      purple: {
        bg: "bg-purple-100",
        text: "text-purple-600",
        border: "border-purple-200",
      },
      orange: {
        bg: "bg-orange-100",
        text: "text-orange-600",
        border: "border-orange-200",
      },
      indigo: {
        bg: "bg-indigo-100",
        text: "text-indigo-600",
        border: "border-indigo-200",
      },
    };

    return (
      colorMap[color as keyof typeof colorMap]?.[variant] ||
      colorMap.blue[variant]
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 90) return "from-green-500 to-green-600";
    if (score >= 80) return "from-blue-500 to-blue-600";
    if (score >= 70) return "from-yellow-500 to-yellow-600";
    return "from-red-500 to-red-600";
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">
          Knowledge Categories
        </h3>
        <div className="text-sm text-slate-500">
          {categories.filter((c) => c.questionsAnswered > 0).length} of{" "}
          {categories.length} started
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((category, index) => {
          const Icon = category.icon;
          const progressPercentage =
            category.totalQuestions > 0
              ? (category.questionsAnswered / category.totalQuestions) * 100
              : 0;

          return (
            <div key={index} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-lg ${getColorClasses(
                      category.color,
                      "bg"
                    )} flex items-center justify-center`}
                  >
                    <Icon
                      className={`w-5 h-5 ${getColorClasses(
                        category.color,
                        "text"
                      )}`}
                    />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800">
                      {category.category}
                    </h4>
                    <div className="text-sm text-slate-500">
                      {category.questionsAnswered} of {category.totalQuestions}{" "}
                      questions
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-lg font-bold ${
                      category.questionsAnswered > 0
                        ? getScoreColor(category.score)
                        : "text-slate-400"
                    }`}
                  >
                    {category.questionsAnswered > 0
                      ? `${category.score}%`
                      : "--"}
                  </div>
                  {category.questionsAnswered > 0 && (
                    <div className="text-sm text-slate-500">
                      {progressPercentage.toFixed(0)}% complete
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex space-x-2 mb-2">
                {/* Knowledge Progress */}
                <div className="flex-1">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-slate-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Score Progress */}
                {category.questionsAnswered > 0 && (
                  <div className="flex-1">
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`bg-gradient-to-r ${getProgressBarColor(
                          category.score
                        )} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${category.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Status Message */}
              <div className="text-xs text-slate-500 ml-13">
                {category.questionsAnswered === 0 ? (
                  "Not started yet"
                ) : category.questionsAnswered === category.totalQuestions ? (
                  <span className="text-green-600 font-medium">
                    ✓ Category completed
                  </span>
                ) : (
                  `${
                    category.totalQuestions - category.questionsAnswered
                  } questions remaining`
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {categories.some((c) => c.questionsAnswered > 0) && (
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-slate-800">
                {Math.round(
                  categories
                    .filter((c) => c.questionsAnswered > 0)
                    .reduce((sum, c) => sum + c.score, 0) /
                    categories.filter((c) => c.questionsAnswered > 0).length ||
                    1
                )}
                %
              </div>
              <div className="text-sm text-slate-500">Average Score</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-800">
                {categories.reduce((sum, c) => sum + c.questionsAnswered, 0)}
              </div>
              <div className="text-sm text-slate-500">Total Answered</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CategoryBreakdown;
