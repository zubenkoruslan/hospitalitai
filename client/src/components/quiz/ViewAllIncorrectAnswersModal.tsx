import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import LoadingSpinner from "../common/LoadingSpinner";
import ErrorMessage from "../common/ErrorMessage";
import { getAllIncorrectAnswersForStaff } from "../../services/api";
import { formatDate } from "../../utils/helpers";
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  CalendarIcon,
  StarIcon,
  FireIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

interface ViewAllIncorrectAnswersModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffId: string;
  staffName: string;
  quizId?: string; // Optional: Filter by specific quiz
}

type IncorrectQuestion = {
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  explanation?: string;
  quizTitle: string;
  attemptDate: Date;
  attemptId: string;
  timesIncorrect: number;
};

type AllIncorrectData = {
  staffInfo: {
    id: string;
    name: string;
    email: string;
  };
  incorrectQuestions: IncorrectQuestion[];
  summary: {
    totalAttempts: number;
    totalIncorrectQuestions: number;
    uniqueIncorrectQuestions: number;
    mostMissedQuestion?: {
      questionText: string;
      timesIncorrect: number;
    };
  };
};

const ViewAllIncorrectAnswersModal: React.FC<
  ViewAllIncorrectAnswersModalProps
> = ({ isOpen, onClose, staffId, staffName, quizId }) => {
  const [data, setData] = useState<AllIncorrectData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<"quiz" | "question" | "chronological">(
    "quiz"
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && staffId) {
      fetchAllIncorrectAnswers();
    }
  }, [isOpen, staffId, quizId]);

  const fetchAllIncorrectAnswers = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getAllIncorrectAnswersForStaff(staffId, quizId);
      setData(result);
    } catch (err: any) {
      console.error("Error fetching all incorrect answers:", err);
      setError(err.message || "Failed to load incorrect answers");
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  // Group questions by different criteria
  const groupedQuestions = React.useMemo(() => {
    if (!data) return {};

    switch (groupBy) {
      case "quiz":
        return data.incorrectQuestions.reduce((acc, question) => {
          if (!acc[question.quizTitle]) {
            acc[question.quizTitle] = [];
          }
          acc[question.quizTitle].push(question);
          return acc;
        }, {} as Record<string, IncorrectQuestion[]>);

      case "question":
        return data.incorrectQuestions.reduce((acc, question) => {
          const questionKey = question.questionText.substring(0, 100) + "...";
          if (!acc[questionKey]) {
            acc[questionKey] = [];
          }
          acc[questionKey].push(question);
          return acc;
        }, {} as Record<string, IncorrectQuestion[]>);

      case "chronological":
        const sorted = [...data.incorrectQuestions].sort(
          (a, b) =>
            new Date(b.attemptDate).getTime() -
            new Date(a.attemptDate).getTime()
        );
        return { "All Questions (Newest First)": sorted };

      default:
        return {};
    }
  }, [data, groupBy]);

  // Effect for closing modal on Escape key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    } else {
      document.removeEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const footer = (
    <div className="flex gap-3">
      <Button
        variant="secondary"
        onClick={() => {
          if (data) {
            const csvContent = generateCSVContent(data);
            downloadCSV(csvContent, `incorrect-answers-${staffName}.csv`);
          }
        }}
        disabled={!data}
      >
        Export CSV
      </Button>
      <Button variant="primary" onClick={onClose}>
        Close
      </Button>
    </div>
  );

  const generateCSVContent = (data: AllIncorrectData): string => {
    const headers = [
      "Quiz Title",
      "Question",
      "Your Answer",
      "Correct Answer",
      "Explanation",
      "Attempt Date",
      "Times Incorrect",
    ];

    const rows = data.incorrectQuestions.map((q) => [
      q.quizTitle,
      q.questionText.replace(/"/g, '""'), // Escape quotes for CSV
      q.userAnswer.replace(/"/g, '""'),
      q.correctAnswer.replace(/"/g, '""'),
      (q.explanation || "").replace(/"/g, '""'),
      formatDate(q.attemptDate.toString()),
      q.timesIncorrect.toString(),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    return csvContent;
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Loading All Incorrect Answers..."
        size="lg"
        footerContent={footer}
      >
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner message="Fetching all incorrect answers..." />
        </div>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Error"
        size="lg"
        footerContent={footer}
      >
        <div className="p-4">
          <ErrorMessage message={error} />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`All Incorrect Answers - ${staffName}`}
      size="xl"
      footerContent={footer}
    >
      <div className="space-y-6">
        {/* Summary Section */}
        {data && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <ChartBarIcon className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-semibold text-red-900">Summary</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {data.summary.totalAttempts}
                </div>
                <div className="text-sm text-red-700">Total Attempts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {data.summary.totalIncorrectQuestions}
                </div>
                <div className="text-sm text-orange-700">Incorrect Answers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {data.summary.uniqueIncorrectQuestions}
                </div>
                <div className="text-sm text-amber-700">Unique Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {data.summary.totalIncorrectQuestions > 0
                    ? (
                        ((data.summary.totalIncorrectQuestions -
                          data.summary.uniqueIncorrectQuestions) /
                          data.summary.totalIncorrectQuestions) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </div>
                <div className="text-sm text-red-700">Repeat Mistakes</div>
              </div>
            </div>

            {data.summary.mostMissedQuestion && (
              <div className="bg-white/60 border border-red-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FireIcon className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-900">
                    Most Missed Question
                  </span>
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                    {data.summary.mostMissedQuestion.timesIncorrect} times
                  </span>
                </div>
                <p className="text-sm text-red-800">
                  {data.summary.mostMissedQuestion.questionText}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Grouping Controls */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Group by:</span>
          <div className="flex gap-2">
            {[
              { key: "quiz", label: "Quiz", icon: AcademicCapIcon },
              {
                key: "question",
                label: "Question",
                icon: ExclamationTriangleIcon,
              },
              { key: "chronological", label: "Date", icon: CalendarIcon },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setGroupBy(key as typeof groupBy)}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                  groupBy === key
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Questions Display */}
        {data && data.incorrectQuestions.length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedQuestions).map(([groupName, questions]) => (
              <div
                key={groupName}
                className="border border-gray-200 rounded-lg"
              >
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">
                      {groupName}
                    </span>
                    <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                      {questions.length} questions
                    </span>
                  </div>
                  {expandedGroups.has(groupName) ? (
                    <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                  )}
                </button>

                {expandedGroups.has(groupName) && (
                  <div className="p-4 space-y-4">
                    {questions.map((question, index) => (
                      <div
                        key={`${question.attemptId}-${index}`}
                        className="border border-gray-200 rounded-lg p-4 bg-white"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h4 className="font-semibold text-gray-900 flex-1">
                            {question.questionText}
                          </h4>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {question.timesIncorrect > 1 && (
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                                {question.timesIncorrect}x missed
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {formatDate(question.attemptDate.toString())}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex gap-2">
                            <span className="font-medium text-red-600 min-w-0 flex-shrink-0">
                              Your Answer:
                            </span>
                            <span className="text-red-500">
                              {question.userAnswer}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-medium text-green-600 min-w-0 flex-shrink-0">
                              Correct Answer:
                            </span>
                            <span className="text-green-600">
                              {question.correctAnswer}
                            </span>
                          </div>
                          {question.explanation && (
                            <div className="flex gap-2 pt-2 border-t border-gray-200">
                              <InformationCircleIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-600 text-xs">
                                {question.explanation}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <span className="text-xs text-gray-500">
                            From: {question.quizTitle}
                          </span>
                          <span className="text-xs text-gray-400">
                            Attempt ID: {question.attemptId.substring(0, 8)}...
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <StarIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Incorrect Answers Found!
            </h3>
            <p className="text-gray-600">
              {quizId
                ? "This staff member has answered all questions correctly in the selected quiz."
                : "This staff member has answered all questions correctly across all quizzes."}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ViewAllIncorrectAnswersModal;
