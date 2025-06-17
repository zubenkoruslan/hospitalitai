import React from "react";
import {
  BookOpenIcon,
  GlobeAltIcon,
  AcademicCapIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { KnowledgeCategory, IQuestion } from "../../types/questionBankTypes";

interface QuestionStats {
  total: number;
  byCategory: Record<KnowledgeCategory, number>;
  byType: Record<string, number>;
}

interface QuestionStatsCardsProps {
  questions: IQuestion[];
}

const QuestionStatsCards: React.FC<QuestionStatsCardsProps> = ({
  questions,
}) => {
  // Calculate stats from questions
  const stats: QuestionStats = React.useMemo(() => {
    const byCategory: Record<KnowledgeCategory, number> = {
      "food-knowledge": 0,
      "beverage-knowledge": 0,
      "wine-knowledge": 0,
      "procedures-knowledge": 0,
    };

    const byType: Record<string, number> = {};

    questions.forEach((question) => {
      // Count by category
      if (question.knowledgeCategory) {
        byCategory[question.knowledgeCategory] =
          (byCategory[question.knowledgeCategory] || 0) + 1;
      }

      // Count by type
      if (question.questionType) {
        byType[question.questionType] =
          (byType[question.questionType] || 0) + 1;
      }
    });

    return {
      total: questions.length,
      byCategory,
      byType,
    };
  }, [questions]);

  const categoryCards = [
    {
      key: "food-knowledge" as KnowledgeCategory,
      label: "Food Knowledge",
      color: "emerald",
      icon: BookOpenIcon,
      count: stats.byCategory["food-knowledge"],
    },
    {
      key: "beverage-knowledge" as KnowledgeCategory,
      label: "Beverage Knowledge",
      color: "blue",
      icon: GlobeAltIcon,
      count: stats.byCategory["beverage-knowledge"],
    },
    {
      key: "wine-knowledge" as KnowledgeCategory,
      label: "Wine Knowledge",
      color: "purple",
      icon: AcademicCapIcon,
      count: stats.byCategory["wine-knowledge"],
    },
    {
      key: "procedures-knowledge" as KnowledgeCategory,
      label: "Procedures Knowledge",
      color: "orange",
      icon: DocumentTextIcon,
      count: stats.byCategory["procedures-knowledge"],
    },
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      emerald: "from-emerald-50 to-emerald-100 text-emerald-700 bg-emerald-600",
      blue: "from-blue-50 to-blue-100 text-blue-700 bg-blue-600",
      purple: "from-purple-50 to-purple-100 text-purple-700 bg-purple-600",
      orange: "from-orange-50 to-orange-100 text-orange-700 bg-orange-600",
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.emerald;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {categoryCards.map((card) => {
        const Icon = card.icon;
        const colors = getColorClasses(card.color);
        const [bgGradient, textColor, iconBg] = colors.split(" ");

        return (
          <div
            key={card.key}
            className={`bg-gradient-to-r ${bgGradient} rounded-xl p-4`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 ${iconBg} rounded-lg`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className={`text-sm font-medium ${textColor}`}>
                  {card.label}
                </p>
                <p
                  className={`text-2xl font-bold ${textColor.replace(
                    "700",
                    "900"
                  )}`}
                >
                  {card.count}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QuestionStatsCards;
