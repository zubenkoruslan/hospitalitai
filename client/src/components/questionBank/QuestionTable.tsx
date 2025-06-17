import React, { useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  ClockIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { IQuestion, KnowledgeCategory } from "../../types/questionBankTypes";

interface QuestionTableProps {
  questions: IQuestion[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSort: (field: string) => void;
  sortField: string;
  sortDirection: "asc" | "desc";
  onEdit: (question: IQuestion) => void;
  onDelete: (questionId: string) => void;
  activeTab: "active" | "preview";
}

type SortField = "questionText" | "knowledgeCategory" | "createdAt";

const QuestionTable: React.FC<QuestionTableProps> = ({
  questions,
  selectedIds,
  onToggleSelect,
  onSort,
  sortField,
  sortDirection,
  onEdit,
  onDelete,
  activeTab,
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (questionId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedRows(newExpanded);
  };

  const formatKnowledgeCategory = (category: KnowledgeCategory) => {
    return category.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const getKnowledgeCategoryColor = (category: KnowledgeCategory) => {
    const colors = {
      "food-knowledge": "bg-emerald-100 text-emerald-800 border-emerald-200",
      "beverage-knowledge": "bg-blue-100 text-blue-800 border-blue-200",
      "wine-knowledge": "bg-purple-100 text-purple-800 border-purple-200",
      "procedures-knowledge": "bg-orange-100 text-orange-800 border-orange-200",
    };
    return colors[category] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getCategoryColor = (category: string) => {
    // Color palette for menu categories
    const colors = [
      "bg-rose-100 text-rose-800 border-rose-200",
      "bg-amber-100 text-amber-800 border-amber-200",
      "bg-lime-100 text-lime-800 border-lime-200",
      "bg-cyan-100 text-cyan-800 border-cyan-200",
      "bg-violet-100 text-violet-800 border-violet-200",
      "bg-pink-100 text-pink-800 border-pink-200",
      "bg-teal-100 text-teal-800 border-teal-200",
      "bg-indigo-100 text-indigo-800 border-indigo-200",
      "bg-yellow-100 text-yellow-800 border-yellow-200",
      "bg-green-100 text-green-800 border-green-200",
    ];

    // Use a simple hash function to consistently assign colors to categories
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  };

  const tableHeaders: {
    label: string;
    field: SortField | null;
    sortable: boolean;
  }[] = [
    { label: "Question", field: "questionText", sortable: true },
    { label: "Knowledge Type", field: "knowledgeCategory", sortable: true },
    { label: "Category", field: null, sortable: false },
    { label: "Created", field: "createdAt", sortable: true },
    { label: "Actions", field: null, sortable: false },
  ];

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="text-gray-500">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No {activeTab} questions found
          </h3>
          <p className="text-gray-600">
            {activeTab === "active"
              ? "Try adjusting your search or filter criteria, or add some questions to get started."
              : "No preview questions found. Generate AI questions to see them here."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="w-12 px-6 py-3">
                <span className="sr-only">Select</span>
              </th>
              <th scope="col" className="w-8 px-2 py-3">
                <span className="sr-only">Expand</span>
              </th>
              {tableHeaders.map((header) => (
                <th
                  key={header.label}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    header.sortable
                      ? "cursor-pointer hover:bg-gray-100 transition-colors"
                      : ""
                  }`}
                  onClick={() => header.field && onSort(header.field)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{header.label}</span>
                    {header.sortable && sortField === header.field && (
                      <ChevronDownIcon
                        className={`h-4 w-4 transform transition-transform ${
                          sortDirection === "asc" ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {questions.map((question, index) => {
              const isExpanded = expandedRows.has(question._id);
              const isSelected = selectedIds.includes(question._id);

              return (
                <React.Fragment key={question._id}>
                  {/* Main Row */}
                  <tr
                    className={`hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                    }`}
                  >
                    {/* Select Checkbox */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(question._id)}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                    </td>

                    {/* Expand Button */}
                    <td className="px-2 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleRowExpansion(question._id)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        <ChevronRightIcon
                          className={`h-4 w-4 transition-transform ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </button>
                    </td>

                    {/* Question Text */}
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            {question.status === "pending_review" && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                <ClockIcon className="h-3 w-3 mr-1" />
                                Preview
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900 line-clamp-2">
                            {question.questionText}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Created by {question.createdBy}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Knowledge Category */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getKnowledgeCategoryColor(
                          question.knowledgeCategory
                        )}`}
                      >
                        {formatKnowledgeCategory(question.knowledgeCategory)}
                      </span>
                    </td>

                    {/* Categories */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {question.categories &&
                        question.categories.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {question.categories
                              .slice(0, 2)
                              .map((category, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center px-2 py-1 rounded text-xs border ${getCategoryColor(
                                    category
                                  )}`}
                                >
                                  {category}
                                </span>
                              ))}
                            {question.categories.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{question.categories.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            No categories
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(question.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onEdit(question)}
                          className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit Question"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(question._id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Question"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row */}
                  {isExpanded && (
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="space-y-4">
                          {/* Full Question Text */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              Full Question:
                            </h4>
                            <p className="text-sm text-gray-900 leading-relaxed">
                              {question.questionText}
                            </p>
                          </div>

                          {/* Answer Options */}
                          {question.options && question.options.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                Answer Options:
                              </h4>
                              <div className="space-y-2">
                                {question.options.map((option, index) => (
                                  <div
                                    key={option._id || index}
                                    className={`p-3 rounded-lg border ${
                                      option.isCorrect
                                        ? "bg-green-50 border-green-200"
                                        : "bg-white border-gray-200"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                                          {String.fromCharCode(65 + index)}
                                        </span>
                                        <span className="text-sm text-gray-900">
                                          {option.text}
                                        </span>
                                      </div>
                                      {option.isCorrect && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          <CheckIcon className="h-3 w-3 mr-1" />
                                          Correct
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Explanation */}
                          {question.explanation && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                Explanation:
                              </h4>
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-start space-x-3">
                                  <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <p className="text-sm text-gray-900 leading-relaxed">
                                    {question.explanation}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* All Categories */}
                          {question.categories &&
                            question.categories.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">
                                  All Categories:
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {question.categories.map(
                                    (category, index) => (
                                      <span
                                        key={index}
                                        className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border ${getCategoryColor(
                                          category
                                        )}`}
                                      >
                                        {category}
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuestionTable;
