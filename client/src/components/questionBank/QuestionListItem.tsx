import React from "react";
import { IQuestion, KnowledgeCategory } from "../../types/questionBankTypes";
import Button from "../common/Button";
import {
  PencilIcon,
  TrashIcon,
  CakeIcon,
  BoltIcon,
  GiftIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

interface QuestionListItemProps {
  question: IQuestion;
  onEdit: () => void;
  onDelete: () => void;
  index?: number; // Optional index for display (e.g., numbering)
}

// Knowledge category display configuration
const KNOWLEDGE_CATEGORY_CONFIG = {
  [KnowledgeCategory.FOOD_KNOWLEDGE]: {
    icon: CakeIcon,
    label: "Food",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
    iconColor: "text-green-600",
  },
  [KnowledgeCategory.BEVERAGE_KNOWLEDGE]: {
    icon: BoltIcon,
    label: "Beverage",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
    iconColor: "text-blue-600",
  },
  [KnowledgeCategory.WINE_KNOWLEDGE]: {
    icon: GiftIcon,
    label: "Wine",
    bgColor: "bg-purple-100",
    textColor: "text-purple-700",
    iconColor: "text-purple-600",
  },
  [KnowledgeCategory.PROCEDURES_KNOWLEDGE]: {
    icon: ClipboardDocumentListIcon,
    label: "Procedures",
    bgColor: "bg-orange-100",
    textColor: "text-orange-700",
    iconColor: "text-orange-600",
  },
};

const QuestionListItem: React.FC<QuestionListItemProps> = ({
  question,
  onEdit,
  onDelete,
  index,
}) => {
  const knowledgeConfig = question.knowledgeCategory
    ? KNOWLEDGE_CATEGORY_CONFIG[question.knowledgeCategory]
    : null;
  const KnowledgeIcon = knowledgeConfig?.icon;

  return (
    <li className="p-4 border rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow duration-150 ease-in-out">
      <div className="flex justify-between items-start">
        <div className="flex-grow mr-4">
          {/* Question Header with Knowledge Category Badge */}
          <div className="flex items-start gap-3 mb-2">
            <div className="flex-grow">
              <p className="text-sm font-semibold text-slate-800 mb-1">
                {index !== undefined ? `${index + 1}. ` : ""}
                {question.questionText}
              </p>
            </div>

            {/* Knowledge Category Badge */}
            {knowledgeConfig && KnowledgeIcon && (
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${knowledgeConfig.bgColor} ${knowledgeConfig.textColor}`}
                title={`Knowledge Category: ${knowledgeConfig.label}`}
              >
                <KnowledgeIcon
                  className={`h-3 w-3 ${knowledgeConfig.iconColor}`}
                />
                <span>{knowledgeConfig.label}</span>
              </div>
            )}
          </div>

          {/* Question Details */}
          <div className="text-xs text-slate-500 space-x-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="flex items-center">
              Type:{" "}
              <span className="font-medium text-slate-600 ml-1">
                {question.questionType
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </span>
            </span>

            <span className="text-slate-300">•</span>

            <span className="flex items-center">
              Categories:{" "}
              <span className="font-medium text-slate-600 ml-1">
                {question.categories.length > 0
                  ? question.categories.join(", ")
                  : "N/A"}
              </span>
            </span>

            {/* Assignment Method Indicator */}
            {question.knowledgeCategoryAssignedBy && (
              <>
                <span className="text-slate-300">•</span>
                <span className="flex items-center">
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      question.knowledgeCategoryAssignedBy === "ai"
                        ? "bg-blue-50 text-blue-600"
                        : question.knowledgeCategoryAssignedBy === "manual"
                        ? "bg-green-50 text-green-600"
                        : "bg-purple-50 text-purple-600"
                    }`}
                  >
                    {question.knowledgeCategoryAssignedBy === "ai"
                      ? "🤖 AI"
                      : question.knowledgeCategoryAssignedBy === "manual"
                      ? "👤 Manual"
                      : "✏️ Edited"}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex space-x-2 shrink-0">
          <Button
            variant="secondary"
            onClick={onEdit}
            aria-label="Edit question"
            className="p-2"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            aria-label="Delete question"
            className="p-2"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </li>
  );
};

export default QuestionListItem;
