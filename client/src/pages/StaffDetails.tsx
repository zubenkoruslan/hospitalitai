import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getQuizAttemptDetails,
  getAllIncorrectAnswersForStaff,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import ViewIncorrectAnswersModal from "../components/quiz/ViewIncorrectAnswersModal";

import { formatDate } from "../utils/helpers";
import { useStaffDetails } from "../hooks/useStaffDetails";
import { ClientQuizAttemptDetails } from "../types/quizTypes";
import Button from "../components/common/Button";
import Card from "../components/common/Card";

import {
  UserIcon,
  TrophyIcon,
  ClockIcon,
  AcademicCapIcon,
  ChartBarIcon,
  BoltIcon,
  CakeIcon,
  GiftIcon,
  ClipboardDocumentListIcon,
  ArrowLeftIcon,
  CalendarIcon,
  ChevronRightIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

// Import Chart.js components for radial chart
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, Title);

// Types for enhanced staff analytics
interface PersonalMetrics {
  totalQuizzesCompleted: number;
  overallAverageScore: number;
  averageCompletionTime: number;
  fastestQuizTime: number | null;
  totalQuestionsAnswered: number;
}

interface CategoryBreakdown {
  foodKnowledge: {
    averageScore: number;
    totalQuestions: number;
    averageCompletionTime: number;
  };
  beverageKnowledge: {
    averageScore: number;
    totalQuestions: number;
    averageCompletionTime: number;
  };
  wineKnowledge: {
    averageScore: number;
    totalQuestions: number;
    averageCompletionTime: number;
  };
  proceduresKnowledge: {
    averageScore: number;
    totalQuestions: number;
    averageCompletionTime: number;
  };
}

interface RecentQuiz {
  quizId: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  averageScore: string;
  completionTime: number;
  completedAt: string;
  attemptId: string; // Added to support viewing details of specific attempts
}

interface RestaurantComparison {
  averageScore: number;
  averageCompletionTime: number;
}

interface QuizPerformanceData {
  quizId: string;
  quizTitle: string;
  averageScore: number;
  totalAttempts: number;
  attempts: Array<{
    attemptId: string;
    score: number;
    totalQuestions: number;
    completedAt: string;
    hasIncorrectAnswers: boolean;
  }>;
}

interface EnhancedStaffData {
  staffInfo: {
    id: string;
    name: string;
    email: string;
    assignedRoleName?: string;
    dateJoined?: string | Date;
  };
  personalMetrics: PersonalMetrics;
  categoryBreakdown: CategoryBreakdown;
  recentQuizzes: RecentQuiz[];
  restaurantComparison: RestaurantComparison;
}

// Enhanced hook for staff analytics
const useEnhancedStaffAnalytics = (staffId: string | undefined) => {
  const [enhancedData, setEnhancedData] = useState<EnhancedStaffData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEnhancedData = async () => {
      if (!staffId) {
        console.log("Enhanced analytics: No staffId provided");
        return;
      }

      console.log("Enhanced analytics: Fetching data for staffId:", staffId);

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/analytics/staff/${staffId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            "Content-Type": "application/json",
          },
        });

        console.log("Enhanced analytics: Response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.log("Enhanced analytics: Error response:", errorText);
          throw new Error(
            `Failed to fetch enhanced staff analytics: ${response.status}`
          );
        }

        const data = await response.json();
        console.log("Enhanced analytics: Data received:", data);
        setEnhancedData(data.data);
      } catch (err) {
        console.log("Enhanced analytics: Error:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchEnhancedData();
  }, [staffId]);

  return { enhancedData, loading, error };
};

// Category configuration for visual consistency
const CATEGORY_CONFIG = {
  foodKnowledge: {
    icon: CakeIcon,
    label: "Food Knowledge",
    color: "#10B981", // Green
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200",
  },
  beverageKnowledge: {
    icon: BoltIcon,
    label: "Beverage Knowledge",
    color: "#3B82F6", // Blue
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
  },
  wineKnowledge: {
    icon: GiftIcon,
    label: "Wine Knowledge",
    color: "#8B5CF6", // Purple
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
    borderColor: "border-purple-200",
  },
  proceduresKnowledge: {
    icon: ClipboardDocumentListIcon,
    label: "Procedures Knowledge",
    color: "#F59E0B", // Orange
    bgColor: "bg-orange-50",
    textColor: "text-orange-700",
    borderColor: "border-orange-200",
  },
};

// Helper function to format completion time
const formatCompletionTime = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

// Helper function to get category config from quiz title
const getCategoryFromQuizTitle = (quizTitle: string) => {
  const title = quizTitle.toLowerCase();
  if (title.includes("food")) return CATEGORY_CONFIG.foodKnowledge;
  if (title.includes("wine")) return CATEGORY_CONFIG.wineKnowledge;
  if (
    title.includes("beverage") ||
    title.includes("cocktail") ||
    title.includes("spirit")
  )
    return CATEGORY_CONFIG.beverageKnowledge;
  if (
    title.includes("sop") ||
    title.includes("procedure") ||
    title.includes("standard")
  )
    return CATEGORY_CONFIG.proceduresKnowledge;

  // Default fallback
  return {
    icon: ClipboardDocumentListIcon,
    label: "General Knowledge",
    color: "#6B7280", // Gray
    bgColor: "bg-gray-50",
    textColor: "text-gray-700",
    borderColor: "border-gray-200",
  };
};

// Performance Score Component
const PerformanceScore: React.FC<{ score: number; comparison: number }> = ({
  score,
  comparison,
}) => {
  const isAboveAverage = score >= comparison;
  const difference = Math.abs(score - comparison);

  return (
    <div className="text-center">
      <div className="text-4xl font-bold mb-2 text-slate-700">
        {score.toFixed(1)}%
      </div>
      <div className="flex items-center justify-center gap-2 text-sm">
        {isAboveAverage ? (
          <ArrowTrendingUpIcon className="h-4 w-4 text-slate-600" />
        ) : (
          <ArrowTrendingDownIcon className="h-4 w-4 text-slate-600" />
        )}
        <span className="text-slate-600">
          {difference.toFixed(1)}% {isAboveAverage ? "above" : "below"} average
        </span>
      </div>
    </div>
  );
};

// Interface for staffDetails prop
interface StaffDetailsData {
  _id?: string;
  id?: string;
  name?: string;
  aggregatedQuizPerformance?: Array<{
    quizId: string;
    quizTitle: string;
    attempts: Array<{
      _id: string;
      score?: number;
      totalQuestions?: number;
      attemptDate?: string;
      completedAt?: string;
    }>;
  }>;
}

// Consolidated Quiz Performance Component
const QuizPerformanceSection: React.FC<{
  enhancedData: EnhancedStaffData | null;
  staffDetails: StaffDetailsData | null;
  onViewDetails: (attemptId: string) => void;
}> = ({ enhancedData, staffDetails, onViewDetails }) => {
  const [expandedQuizzes, setExpandedQuizzes] = useState<Set<string>>(
    new Set()
  );
  const [exportingQuiz, setExportingQuiz] = useState<string | null>(null);

  // Transform enhanced data into quiz performance format
  const quizPerformanceData: QuizPerformanceData[] = useMemo(() => {
    // Combine data from both enhanced data and staff details to ensure we get all quizzes
    const allQuizSources = [];

    // Add from enhanced data (recent quizzes)
    if (enhancedData?.recentQuizzes) {
      allQuizSources.push(...enhancedData.recentQuizzes);
    }

    // Add from staff details aggregated performance if available
    if (staffDetails?.aggregatedQuizPerformance) {
      staffDetails.aggregatedQuizPerformance.forEach((aggQuiz) => {
        if (aggQuiz.attempts && aggQuiz.attempts.length > 0) {
          // Transform aggregated attempts to match the expected format
          aggQuiz.attempts.forEach((attempt) => {
            allQuizSources.push({
              quizId: aggQuiz.quizId,
              quizTitle: aggQuiz.quizTitle,
              score: attempt.score || 0,
              totalQuestions: attempt.totalQuestions || 0,
              completedAt: attempt.attemptDate || attempt.completedAt,
              attemptId: attempt._id,
            });
          });
        }
      });
    }

    if (allQuizSources.length === 0) return [];

    // Debug logging to understand what data we have
    console.log("[QuizPerformanceSection] All quiz sources:", allQuizSources);
    console.log(
      "[QuizPerformanceSection] Enhanced data recent quizzes:",
      enhancedData?.recentQuizzes
    );
    console.log(
      "[QuizPerformanceSection] Staff details aggregated performance:",
      staffDetails?.aggregatedQuizPerformance
    );

    // Group attempts by quiz
    const quizMap = new Map<string, QuizPerformanceData>();

    allQuizSources.forEach((quiz) => {
      if (!quizMap.has(quiz.quizId)) {
        quizMap.set(quiz.quizId, {
          quizId: quiz.quizId,
          quizTitle: quiz.quizTitle,
          averageScore: 0,
          totalAttempts: 0,
          attempts: [],
        });
      }

      const quizData = quizMap.get(quiz.quizId)!;

      // Check if this attempt is already added (to avoid duplicates)
      const existingAttempt = quizData.attempts.find(
        (a) => a.attemptId === quiz.attemptId
      );
      if (!existingAttempt) {
        quizData.attempts.push({
          attemptId: quiz.attemptId,
          score: quiz.score,
          totalQuestions: quiz.totalQuestions,
          completedAt: quiz.completedAt,
          hasIncorrectAnswers: quiz.score < quiz.totalQuestions,
        });
        quizData.totalAttempts++;
      }
    });

    // Calculate average scores and sort attempts by date
    return Array.from(quizMap.values()).map((quiz) => {
      const totalScore = quiz.attempts.reduce(
        (sum, attempt) => sum + (attempt.score / attempt.totalQuestions) * 100,
        0
      );
      quiz.averageScore = totalScore / quiz.attempts.length;

      // Sort attempts by date (newest first)
      quiz.attempts.sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );

      return quiz;
    });
  }, [enhancedData?.recentQuizzes, staffDetails?.aggregatedQuizPerformance]);

  const toggleQuizExpansion = (quizId: string) => {
    const newExpanded = new Set(expandedQuizzes);
    if (newExpanded.has(quizId)) {
      newExpanded.delete(quizId);
    } else {
      newExpanded.add(quizId);
    }
    setExpandedQuizzes(newExpanded);
  };

  const handleExportQuizIncorrect = async (
    quizId: string,
    quizTitle: string
  ) => {
    const staffId = staffDetails?._id || staffDetails?.id;
    console.log("[Export Debug] Starting quiz export:", {
      quizId,
      quizTitle,
      staffId,
      staffDetails,
    });

    if (!staffId) {
      console.error("[Export Debug] No staff ID available");
      alert("Staff ID not available. Please refresh the page.");
      return;
    }

    setExportingQuiz(quizId);
    try {
      console.log("[Export Debug] Calling API with:", staffId, quizId);
      const data = await getAllIncorrectAnswersForStaff(staffId, quizId);

      console.log("[Export Debug] API response:", data);

      if (
        data &&
        data.incorrectQuestions &&
        data.incorrectQuestions.length > 0
      ) {
        console.log(
          "[Export Debug] Processing",
          data.incorrectQuestions.length,
          "incorrect questions"
        );

        // Generate CSV content
        const csvHeaders = [
          "Question",
          "Your Answer",
          "Correct Answer",
          "Explanation",
          "Attempt Date",
          "Times Incorrect",
        ];

        // Interface for incorrect question data
        interface IncorrectQuestion {
          questionText: string;
          userAnswer: string;
          correctAnswer: string;
          explanation?: string;
          quizTitle: string;
          attemptDate: Date;
          attemptId: string;
          timesIncorrect: number;
        }

        const csvRows = data.incorrectQuestions.map((q: IncorrectQuestion) => [
          `"${q.questionText.replace(/"/g, '""')}"`,
          `"${q.userAnswer.replace(/"/g, '""')}"`,
          `"${q.correctAnswer.replace(/"/g, '""')}"`,
          `"${(q.explanation || "N/A").replace(/"/g, '""')}"`,
          new Date(q.attemptDate).toLocaleDateString(),
          q.timesIncorrect.toString(),
        ]);

        const csvContent = [
          csvHeaders.join(","),
          ...csvRows.map((row: string[]) => row.join(",")),
        ].join("\n");

        console.log(
          "[Export Debug] CSV content generated, length:",
          csvContent.length
        );

        // Download CSV
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${
          staffDetails?.name || "staff"
        }_${quizTitle}_incorrect_answers.csv`;
        console.log("[Export Debug] Triggering download:", link.download);
        link.click();
        URL.revokeObjectURL(link.href);
        console.log("[Export Debug] Download triggered successfully");
      } else {
        console.warn("[Export Debug] No incorrect answers found");
        alert("No incorrect answers found for this quiz.");
      }
    } catch (error) {
      console.error(
        "[Export Debug] Error exporting quiz incorrect answers:",
        error
      );
      alert("Failed to export incorrect answers. Please try again.");
    } finally {
      setExportingQuiz(null);
    }
  };

  const handleExportAllIncorrect = async () => {
    const staffId = staffDetails?._id || staffDetails?.id;
    console.log("[Export Debug] Starting all export, staffId:", staffId);

    if (!staffId) {
      console.error("[Export Debug] No staff ID available for all export");
      alert("Staff ID not available. Please refresh the page.");
      return;
    }

    setExportingQuiz("all");
    try {
      console.log("[Export Debug] Calling API for all incorrect answers");
      const data = await getAllIncorrectAnswersForStaff(staffId);

      console.log("[Export Debug] All export API response:", data);

      if (
        data &&
        data.incorrectQuestions &&
        data.incorrectQuestions.length > 0
      ) {
        console.log(
          "[Export Debug] Processing",
          data.incorrectQuestions.length,
          "total incorrect questions"
        );

        // Generate CSV content
        const csvHeaders = [
          "Quiz Title",
          "Question",
          "Your Answer",
          "Correct Answer",
          "Explanation",
          "Attempt Date",
          "Times Incorrect",
        ];

        const csvRows = data.incorrectQuestions.map((q: IncorrectQuestion) => [
          `"${q.quizTitle.replace(/"/g, '""')}"`,
          `"${q.questionText.replace(/"/g, '""')}"`,
          `"${q.userAnswer.replace(/"/g, '""')}"`,
          `"${q.correctAnswer.replace(/"/g, '""')}"`,
          `"${(q.explanation || "N/A").replace(/"/g, '""')}"`,
          new Date(q.attemptDate).toLocaleDateString(),
          q.timesIncorrect.toString(),
        ]);

        const csvContent = [
          csvHeaders.join(","),
          ...csvRows.map((row: string[]) => row.join(",")),
        ].join("\n");

        console.log(
          "[Export Debug] All export CSV content generated, length:",
          csvContent.length
        );

        // Download CSV
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${
          staffDetails?.name || "staff"
        }_all_incorrect_answers.csv`;
        console.log(
          "[Export Debug] All export triggering download:",
          link.download
        );
        link.click();
        URL.revokeObjectURL(link.href);
        console.log(
          "[Export Debug] All export download triggered successfully"
        );
      } else {
        console.warn(
          "[Export Debug] No incorrect answers found for all export"
        );
        alert("No incorrect answers found.");
      }
    } catch (error) {
      console.error(
        "[Export Debug] Error exporting all incorrect answers:",
        error
      );
      alert("Failed to export incorrect answers. Please try again.");
    } finally {
      setExportingQuiz(null);
    }
  };

  if (!enhancedData || quizPerformanceData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrophyIcon className="h-5 w-5 text-yellow-500" />
            Quiz Performance
          </h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No quiz attempts found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <TrophyIcon className="h-5 w-5 text-yellow-500" />
          Quiz Performance
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleExportAllIncorrect}
            disabled={exportingQuiz === "all"}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {exportingQuiz === "all" ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export All Incorrect
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {quizPerformanceData.map((quiz) => {
          const categoryConfig = getCategoryFromQuizTitle(quiz.quizTitle);
          return (
            <div
              key={quiz.quizId}
              className="border rounded-lg overflow-hidden"
            >
              {/* Quiz Header - Clickable */}
              <div
                className={`${categoryConfig.bgColor} p-4 cursor-pointer hover:opacity-90 transition-all duration-200`}
                style={{ borderLeft: `4px solid ${categoryConfig.color}` }}
                onClick={() => toggleQuizExpansion(quiz.quizId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedQuizzes.has(quiz.quizId) ? (
                      <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                    )}
                    <categoryConfig.icon
                      className={`h-5 w-5 ${categoryConfig.textColor}`}
                    />
                    <div>
                      <h4 className={`font-medium ${categoryConfig.textColor}`}>
                        {quiz.quizTitle}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {quiz.totalAttempts} attempt
                        {quiz.totalAttempts !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        {quiz.averageScore.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-500">Average Score</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportQuizIncorrect(quiz.quizId, quiz.quizTitle);
                      }}
                      disabled={exportingQuiz === quiz.quizId}
                      className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {exportingQuiz === quiz.quizId ? (
                        <ArrowPathIcon className="h-3 w-3 animate-spin" />
                      ) : (
                        <ArrowDownTrayIcon className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Attempts List */}
              {expandedQuizzes.has(quiz.quizId) && (
                <div className="border-t bg-white">
                  <div className="p-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">
                      All Attempts ({quiz.totalAttempts})
                    </h5>
                    <div className="space-y-2">
                      {quiz.attempts.map((attempt, index) => (
                        <div
                          key={attempt.attemptId}
                          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-medium text-gray-900">
                              Attempt #{quiz.totalAttempts - index}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(
                                attempt.completedAt
                              ).toLocaleDateString()}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {attempt.score}/{attempt.totalQuestions}
                              </span>
                              <span
                                className={`text-sm font-medium ${
                                  attempt.score / attempt.totalQuestions >= 0.8
                                    ? "text-green-600"
                                    : attempt.score / attempt.totalQuestions >=
                                      0.6
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                }`}
                              >
                                (
                                {(
                                  (attempt.score / attempt.totalQuestions) *
                                  100
                                ).toFixed(1)}
                                %)
                              </span>
                            </div>

                            {attempt.hasIncorrectAnswers && (
                              <button
                                onClick={() => onViewDetails(attempt.attemptId)}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                <EyeIcon className="h-3 w-3 mr-1" />
                                Details
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Simplified Category Chart Component
const CategoryInsightsChart: React.FC<{ categoryData: CategoryBreakdown }> = ({
  categoryData,
}) => {
  const categories = Object.entries(categoryData);
  const hasData = categories.some(([, data]) => data.totalQuestions > 0);

  if (!hasData) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          Knowledge Areas
        </h3>
        <div className="text-center py-12">
          <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            Complete quizzes to see knowledge area breakdown
          </p>
        </div>
      </div>
    );
  }

  const validCategories = categories.filter(
    ([, data]) => data.totalQuestions > 0
  );
  const bestCategory = validCategories.reduce(
    (best, [key, data]) =>
      data.averageScore > best.score ? { key, score: data.averageScore } : best,
    { key: "", score: -1 }
  );
  const worstCategory = validCategories.reduce(
    (worst, [key, data]) =>
      data.averageScore < worst.score
        ? { key, score: data.averageScore }
        : worst,
    { key: "", score: 101 }
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">
        Knowledge Areas
      </h3>

      <div className="space-y-4 mb-6">
        {bestCategory.score > -1 && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TrophyIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-semibold text-emerald-900">
                  Strongest Area
                </h4>
                <p className="text-sm text-emerald-700">
                  {
                    CATEGORY_CONFIG[
                      bestCategory.key as keyof typeof CATEGORY_CONFIG
                    ]?.label
                  }{" "}
                  - {bestCategory.score.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {worstCategory.score < 101 && validCategories.length > 1 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <ArrowTrendingDownIcon className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-semibold text-amber-900">
                  Needs Improvement
                </h4>
                <p className="text-sm text-amber-700">
                  {
                    CATEGORY_CONFIG[
                      worstCategory.key as keyof typeof CATEGORY_CONFIG
                    ]?.label
                  }{" "}
                  - {worstCategory.score.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {validCategories.map(([key, data]) => {
          const config = CATEGORY_CONFIG[key as keyof typeof CATEGORY_CONFIG];
          const IconComponent = config.icon;
          const percentage = data.averageScore;

          return (
            <div
              key={key}
              className={`${config.bgColor} ${config.borderColor} border rounded-xl p-4`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <IconComponent className={`h-5 w-5 ${config.textColor}`} />
                  <h4 className={`font-semibold ${config.textColor}`}>
                    {config.label}
                  </h4>
                </div>
                <span className={`text-lg font-bold ${config.textColor}`}>
                  {percentage.toFixed(1)}%
                </span>
              </div>

              <div className="mb-3">
                <div className="w-full bg-white rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: config.color,
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-xs text-gray-600">
                <span>{data.totalQuestions} questions</span>
                <span>
                  {formatCompletionTime(data.averageCompletionTime)} avg time
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Main Component Enhancement
const StaffDetails: React.FC = () => {
  const { id: staffId } = useParams<{ id: string }>();
  useAuth();
  const navigate = useNavigate();

  // Original hook for basic data
  const {
    staffDetails,
    loading: basicLoading,
    error: basicError,
  } = useStaffDetails(staffId);

  // Enhanced hook for analytics data
  const {
    enhancedData,
    loading: enhancedLoading,
    error: enhancedError,
  } = useEnhancedStaffAnalytics(staffId);

  // Combined loading and error states
  const loading = basicLoading || enhancedLoading;
  const error = basicError || enhancedError;

  // State for modals and notifications
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDataForIncorrectAnswers, setModalDataForIncorrectAnswers] =
    useState<ClientQuizAttemptDetails | null>(null);
  const [, setLoadingModalDetails] = useState(false);
  const [, setModalError] = useState<string | null>(null);
  const [, setSuccessMessage] = useState<string | null>(null);

  // Handlers
  const handleOpenAttemptModal = useCallback(async (attemptId: string) => {
    console.log("Opening attempt modal for attemptId:", attemptId);
    setLoadingModalDetails(true);
    setModalError(null);
    setModalDataForIncorrectAnswers(null);

    try {
      const attemptDetailsData = await getQuizAttemptDetails(attemptId);
      console.log("Received attempt details:", attemptDetailsData);

      if (attemptDetailsData) {
        setModalDataForIncorrectAnswers(attemptDetailsData);
        console.log(
          "Incorrect questions count:",
          attemptDetailsData.incorrectQuestions?.length || 0
        );
      } else {
        setModalError("Could not load attempt details.");
      }
    } catch (err: any) {
      console.error("Error fetching attempt details:", err);
      setModalError(err.message || "Failed to load details for this attempt.");
    } finally {
      setLoadingModalDetails(false);
      setIsModalOpen(true);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setModalDataForIncorrectAnswers(null);
    setModalError(null);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-slate-50 to-slate-100">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header skeleton */}
              <div className="mb-8 bg-gradient-to-r from-primary/5 via-white to-accent/5 rounded-3xl p-8 border border-primary/10 shadow-lg">
                <div className="animate-pulse">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-slate-200/60 rounded-xl"></div>
                    <div className="h-8 bg-slate-200/60 rounded w-80"></div>
                  </div>
                  <div className="h-5 bg-slate-200/60 rounded w-96 mb-4"></div>
                  <div className="h-12 bg-slate-200/60 rounded-xl w-80"></div>
                </div>
              </div>

              {/* Staff info skeleton */}
              <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-8">
                <div className="animate-pulse flex items-center gap-6">
                  <div className="w-20 h-20 bg-slate-200 rounded-xl"></div>
                  <div className="space-y-4 flex-1">
                    <div className="h-8 bg-slate-200 rounded w-64"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-48"></div>
                      <div className="h-4 bg-slate-200 rounded w-40"></div>
                      <div className="h-4 bg-slate-200 rounded w-36"></div>
                    </div>
                  </div>
                  <div className="w-48 h-32 bg-slate-200 rounded-2xl"></div>
                </div>
              </div>

              {/* Metrics skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-slate-200 p-6"
                  >
                    <div className="animate-pulse">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-slate-200 rounded w-24"></div>
                          <div className="h-8 bg-slate-200 rounded w-16"></div>
                        </div>
                      </div>
                      <div className="h-4 bg-slate-200 rounded w-32"></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center py-12">
                <LoadingSpinner message="Loading staff details..." />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-slate-50 to-slate-100">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center">
                <Card
                  variant="outlined"
                  className="max-w-md mx-auto border-red-200"
                >
                  <UserIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
                  <h1 className="text-2xl font-bold text-red-600 mb-4">
                    Error Loading Staff Details
                  </h1>
                  <ErrorMessage message={error} />
                  <Button
                    variant="primary"
                    onClick={() => navigate("/staff")}
                    className="mt-4"
                  >
                    Back to Team Management
                  </Button>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Use enhanced data if available, fallback to basic data
  const displayData = enhancedData || {
    staffInfo: {
      id: staffDetails?._id || "",
      name: staffDetails?.name || "Unknown Staff",
      email: staffDetails?.email || "",
      assignedRoleName: staffDetails?.assignedRoleName || "Staff",
      dateJoined: staffDetails?.createdAt || new Date(),
    },
    personalMetrics: {
      totalQuizzesCompleted: 0,
      overallAverageScore: staffDetails?.averageScore || 0,
      averageCompletionTime: 0,
      fastestQuizTime: null,
      totalQuestionsAnswered: 0,
    },
    categoryBreakdown: {
      foodKnowledge: {
        averageScore: 0,
        totalQuestions: 0,
        averageCompletionTime: 0,
      },
      beverageKnowledge: {
        averageScore: 0,
        totalQuestions: 0,
        averageCompletionTime: 0,
      },
      wineKnowledge: {
        averageScore: 0,
        totalQuestions: 0,
        averageCompletionTime: 0,
      },
      proceduresKnowledge: {
        averageScore: 0,
        totalQuestions: 0,
        averageCompletionTime: 0,
      },
    },
    recentQuizzes: [],
    restaurantComparison: { averageScore: 0, averageCompletionTime: 0 },
  };

  if (!displayData?.staffInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-slate-50 to-slate-100">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center">
                <Card
                  variant="outlined"
                  className="max-w-md mx-auto border-gray-200"
                >
                  <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h1 className="text-2xl font-bold text-gray-700 mb-4">
                    Staff Member Not Found
                  </h1>
                  <p className="text-gray-600 mb-4">
                    The requested staff member could not be found.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => navigate("/staff")}
                    className="mt-4"
                  >
                    Back to Team Management
                  </Button>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-slate-50 to-slate-100">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Enhanced Header with Staff Details */}
            <div className="mb-6 bg-gradient-to-r from-primary/5 via-white to-accent/5 rounded-2xl p-4 lg:p-6 border border-primary/10 shadow-md backdrop-blur-sm">
              <div className="flex flex-col gap-6">
                {/* Header Title and Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-1.5 bg-gradient-to-r from-primary to-accent rounded-lg shadow-md">
                        <UserIcon className="h-5 w-5 text-white" />
                      </div>
                      <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {displayData.staffInfo.name} - Staff Details
                      </h1>
                    </div>
                    <p className="text-muted-gray text-sm">
                      Performance analytics and detailed insights for{" "}
                      {displayData.staffInfo.name}
                    </p>
                  </div>

                  {/* Action Button */}
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => navigate("/staff")}
                      className="group inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg text-sm"
                    >
                      <ArrowLeftIcon className="h-4 w-4 mr-1.5 group-hover:scale-110 transition-transform duration-200" />
                      <span className="hidden sm:inline">
                        Back to Team Management
                      </span>
                      <span className="sm:hidden">Back</span>
                    </button>
                  </div>
                </div>

                {/* Staff Information and Performance */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex-1">
                    <div className="space-y-2 text-slate-600">
                      <p className="flex items-center gap-2">
                        <span className="font-medium">Email:</span>
                        <span className="text-slate-700">
                          {displayData.staffInfo.email}
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="font-medium">Role:</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                          {displayData.staffInfo.assignedRoleName}
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        <span>
                          Joined{" "}
                          {formatDate(
                            displayData.staffInfo.dateJoined?.toString() || ""
                          )}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="lg:text-right">
                    <div className="text-slate-700">
                      <PerformanceScore
                        score={displayData.personalMetrics.overallAverageScore}
                        comparison={
                          displayData.restaurantComparison.averageScore
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Key Metrics with animations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Quizzes Completed */}
              <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-3 lg:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                <div className="relative z-10">
                  <div className="flex items-center space-x-2 lg:space-x-3">
                    <div className="p-2 lg:p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg lg:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                      <AcademicCapIcon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs lg:text-sm font-medium text-slate-500 group-hover:text-slate-600 truncate">
                        Quizzes Completed
                      </p>
                      <p className="text-xl lg:text-3xl font-bold text-slate-900 transition-colors duration-300">
                        {displayData.personalMetrics.totalQuizzesCompleted}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 lg:mt-4 text-xs lg:text-sm text-slate-500">
                    {displayData.personalMetrics.totalQuestionsAnswered}{" "}
                    questions answered
                  </div>
                </div>
              </div>

              {/* Average Time */}
              <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-3 lg:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                <div className="relative z-10">
                  <div className="flex items-center space-x-2 lg:space-x-3">
                    <div className="p-2 lg:p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg lg:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                      <ClockIcon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs lg:text-sm font-medium text-slate-500 group-hover:text-slate-600 truncate">
                        Average Time
                      </p>
                      <p className="text-xl lg:text-3xl font-bold text-slate-900 transition-colors duration-300">
                        {formatCompletionTime(
                          displayData.personalMetrics.averageCompletionTime
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 lg:mt-4 flex items-center text-xs lg:text-sm text-slate-500">
                    <span>
                      Restaurant avg:{" "}
                      {formatCompletionTime(
                        displayData.restaurantComparison.averageCompletionTime
                      )}
                    </span>
                    {displayData.personalMetrics.averageCompletionTime <=
                    displayData.restaurantComparison.averageCompletionTime ? (
                      <ArrowTrendingUpIcon className="ml-1 h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowTrendingDownIcon className="ml-1 h-3 w-3 text-red-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Performance */}
              <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-3 lg:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                <div className="relative z-10">
                  <div className="flex items-center space-x-2 lg:space-x-3">
                    <div className="p-2 lg:p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg lg:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                      <TrophyIcon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs lg:text-sm font-medium text-slate-500 group-hover:text-slate-600 truncate">
                        Performance
                      </p>
                      <p className="text-lg lg:text-2xl font-bold text-slate-900 transition-colors duration-300">
                        {displayData.personalMetrics.overallAverageScore >=
                        displayData.restaurantComparison.averageScore
                          ? "Above Average"
                          : "Below Average"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 lg:mt-4 flex items-center text-xs lg:text-sm text-slate-500">
                    <span>
                      {Math.abs(
                        displayData.personalMetrics.overallAverageScore -
                          displayData.restaurantComparison.averageScore
                      ).toFixed(1)}
                      % difference
                    </span>
                    {displayData.personalMetrics.overallAverageScore >=
                    displayData.restaurantComparison.averageScore ? (
                      <ArrowTrendingUpIcon className="ml-1 h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowTrendingDownIcon className="ml-1 h-3 w-3 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quiz Performance - Takes 2 columns */}
              <div className="lg:col-span-2">
                <QuizPerformanceSection
                  enhancedData={enhancedData}
                  staffDetails={staffDetails}
                  onViewDetails={handleOpenAttemptModal}
                />
              </div>

              {/* Knowledge Areas - Takes 1 column */}
              <div className="lg:col-span-1">
                <CategoryInsightsChart
                  categoryData={displayData.categoryBreakdown}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && modalDataForIncorrectAnswers && (
        <ViewIncorrectAnswersModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          attemptDetails={modalDataForIncorrectAnswers}
        />
      )}
    </div>
  );
};

export default StaffDetails;
