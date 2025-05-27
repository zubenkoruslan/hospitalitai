import React from "react";
import { IQuestion } from "../../types/questionBankTypes";
import Button from "../common/Button";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

interface QuestionListItemProps {
  question: IQuestion;
  onEdit: () => void;
  onDelete: () => void;
  index?: number; // Optional index for display (e.g., numbering)
}

const QuestionListItem: React.FC<QuestionListItemProps> = ({
  question,
  onEdit,
  onDelete,
  index,
}) => {
  return (
    <li className="p-4 border rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow duration-150 ease-in-out">
      <div className="flex justify-between items-start">
        <div className="flex-grow mr-4">
          <p className="text-sm font-semibold text-slate-800 mb-1">
            {index !== undefined ? `${index + 1}. ` : ""}
            {question.questionText}
          </p>
          <div className="text-xs text-slate-500 space-x-2">
            <span>
              Type:{" "}
              <span className="font-medium text-slate-600">
                {question.questionType}
              </span>
            </span>
            <span>|</span>
            <span>
              Categories:{" "}
              <span className="font-medium text-slate-600">
                {question.categories.join(", ") || "N/A"}
              </span>
            </span>
          </div>
        </div>
        <div className="flex space-x-2 shrink-0">
          <Button
            variant="secondary"
            onClick={onEdit}
            aria-label="Edit question"
          >
            <PencilIcon className="h-5 w-5" />
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            aria-label="Delete question"
          >
            <TrashIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </li>
  );
};

export default QuestionListItem;
