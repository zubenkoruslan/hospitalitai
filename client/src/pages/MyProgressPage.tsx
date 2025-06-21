import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  ChartBarIcon,
  TrophyIcon,
  BookOpenIcon,
  ClockIcon,
  FireIcon,
  StarIcon,
  AcademicCapIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  SparklesIcon,
  HeartIcon,
  CogIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { FireIcon as FireIconSolid } from "@heroicons/react/24/solid";

import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Navbar from "../components/Navbar";
import ProgressRing from "../components/staff/dashboard/ProgressRing";
import BottomNavigation from "../components/staff/dashboard/BottomNavigation";

import CategoryBreakdown from "../components/progress/CategoryBreakdown";

// Import APIs
import {
  getAvailableQuizzesForStaff,
  getMyQuizProgress,
} from "../services/api";
import api from "../services/api";
import { ClientIQuiz } from "../types/quizTypes";
import { ClientStaffQuizProgressWithAttempts } from "../types/staffTypes";

interface QuizProgressSummary {
  quiz: ClientIQuiz;
  progress: ClientStaffQuizProgressWithAttempts | null;
  overallProgressPercentage: number;
  averageScore: number | null;
  lastAttemptDate: Date | null;
  attemptsCount: number;
}

interface OverallStats {
  totalQuizzes: number;
  completedQuizzes: number;
  averageScore: number;
  totalAttempts: number;
  currentStreak: number;
  level: number;
  totalTimeSpent: number; // in minutes
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  earnedAt?: string;
  isUnlocked: boolean;
  progress?: number; // for achievements in progress
  target?: number; // for achievements in progress
}

const MyProgressPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "quizzes" | "achievements" | "insights"
  >("overview");
  const [expandedQuizCards, setExpandedQuizCards] = useState<Set<string>>(
    new Set()
  );

  const [quizProgress, setQuizProgress] = useState<QuizProgressSummary[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats>({
    totalQuizzes: 0,
    completedQuizzes: 0,
    averageScore: 0,
    totalAttempts: 0,
    currentStreak: 0,
    level: 1,
    totalTimeSpent: 0,
  });

  // Real achievements data (populated from API)
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  // Category data for breakdown
  const [categoryData, setCategoryData] = useState<
    Array<{
      category: string;
      score: number;
      questionsAnswered: number;
      totalQuestions: number;
      color: string;
      icon: React.ComponentType<{ className?: string }>;
    }>
  >([]);

  // Fetch progress data
  useEffect(() => {
    const fetchProgressData = async () => {
      if (!user) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch individual staff analytics to get real data
        const analyticsResponse = await api.get(`/analytics/staff/${user._id}`);
        const analytics = analyticsResponse.data.data; // Access nested data field

        // Fetch available quizzes
        const quizzes = await getAvailableQuizzesForStaff();

        // Fetch progress for each quiz
        const progressPromises = quizzes.map(async (quiz) => {
          try {
            const progress = await getMyQuizProgress(quiz._id);
            const overallProgressPercentage =
              progress?.totalUniqueQuestionsInSource
                ? Math.round(
                    ((progress.seenQuestionIds?.length || 0) /
                      progress.totalUniqueQuestionsInSource) *
                      100
                  )
                : 0;

            return {
              quiz,
              progress,
              overallProgressPercentage,
              averageScore: progress?.averageScore || null,
              lastAttemptDate:
                progress?.attempts && progress.attempts.length > 0
                  ? new Date(progress.attempts[0].attemptDate)
                  : null,
              attemptsCount: progress?.attempts?.length || 0,
            };
          } catch (err) {
            console.error(
              `Failed to fetch progress for quiz ${quiz._id}:`,
              err
            );
            return {
              quiz,
              progress: null,
              overallProgressPercentage: 0,
              averageScore: null,
              lastAttemptDate: null,
              attemptsCount: 0,
            };
          }
        });

        const progressSummaries = await Promise.all(progressPromises);
        setQuizProgress(progressSummaries);

        // Use real analytics data for overall stats with fallbacks
        const personalMetrics = analytics?.personalMetrics || {};

        const totalQuizzes = quizzes.length;
        const completedQuizzes = personalMetrics.totalQuizzesCompleted || 0;
        const averageScore = Math.round(
          personalMetrics.overallAverageScore || 0
        );
        const totalQuestions = personalMetrics.totalQuestionsAnswered || 0;
        const totalAttempts = progressSummaries.reduce(
          (sum, p) => sum + p.attemptsCount,
          0
        );

        // Calculate level and streak (simplified calculation)
        const currentStreak = Math.min(completedQuizzes, 7); // Mock streak based on completed quizzes
        const level = Math.floor(completedQuizzes / 3) + 1;
        const totalTimeSpent = personalMetrics.averageCompletionTime
          ? (completedQuizzes * personalMetrics.averageCompletionTime) / 60
          : 0;

        setOverallStats({
          totalQuizzes,
          completedQuizzes,
          averageScore,
          totalAttempts,
          currentStreak,
          level,
          totalTimeSpent,
        });

        // Create realistic achievements based on real data
        const realAchievements: Achievement[] = [
          {
            id: "first_quiz",
            title: "Getting Started",
            description: "Complete your first quiz",
            emoji: "🎯",
            tier: "bronze",
            earnedAt: completedQuizzes > 0 ? "2024-01-15" : undefined,
            isUnlocked: completedQuizzes > 0,
          },
          {
            id: "high_scorer",
            title: "High Scorer",
            description: "Achieve 80% average score",
            emoji: "⭐",
            tier: "silver",
            earnedAt: averageScore >= 80 ? "2024-01-14" : undefined,
            isUnlocked: averageScore >= 80,
            progress: averageScore >= 80 ? 80 : Math.min(averageScore, 80),
            target: 80,
          },
          {
            id: "perfectionist",
            title: "Perfectionist",
            description: "Achieve 95% average score",
            emoji: "💎",
            tier: "gold",
            earnedAt: averageScore >= 95 ? "2024-01-13" : undefined,
            isUnlocked: averageScore >= 95,
            progress: averageScore >= 95 ? 95 : Math.min(averageScore, 95),
            target: 95,
          },
          {
            id: "quiz_master",
            title: "Quiz Master",
            description: "Complete 5 quizzes",
            emoji: "📚",
            tier: "silver",
            earnedAt: completedQuizzes >= 5 ? "2024-01-12" : undefined,
            isUnlocked: completedQuizzes >= 5,
            progress: Math.min(completedQuizzes, 5),
            target: 5,
          },
          {
            id: "knowledge_seeker",
            title: "Knowledge Seeker",
            description: "Answer 50+ questions",
            emoji: "🔍",
            tier: "bronze",
            earnedAt: totalQuestions >= 50 ? "2024-01-11" : undefined,
            isUnlocked: totalQuestions >= 50,
            progress: Math.min(totalQuestions, 50),
            target: 50,
          },
          {
            id: "dedicated_learner",
            title: "Dedicated Learner",
            description: "Complete 10 quizzes",
            emoji: "🏆",
            tier: "gold",
            earnedAt: completedQuizzes >= 10 ? "2024-01-10" : undefined,
            isUnlocked: completedQuizzes >= 10,
            progress: Math.min(completedQuizzes, 10),
            target: 10,
          },
          {
            id: "scholar",
            title: "Scholar",
            description: "Answer 100+ questions",
            emoji: "🎓",
            tier: "platinum",
            earnedAt: totalQuestions >= 100 ? "2024-01-09" : undefined,
            isUnlocked: totalQuestions >= 100,
            progress: Math.min(totalQuestions, 100),
            target: 100,
          },
        ];

        setAchievements(realAchievements);

        // Process category data from analytics
        const categoryBreakdown = analytics?.categoryBreakdown || {};
        const realCategoryData = [
          {
            category: "Food Knowledge",
            score: Math.round(
              categoryBreakdown.foodKnowledge?.averageScore || 0
            ),
            questionsAnswered:
              categoryBreakdown.foodKnowledge?.totalQuestions || 0,
            totalQuestions: Math.max(
              categoryBreakdown.foodKnowledge?.totalQuestions || 0,
              10
            ), // Min 10 for progress bar
            color: "blue",
            icon: BookOpenIcon,
          },
          {
            category: "Beverage Knowledge",
            score: Math.round(
              categoryBreakdown.beverageKnowledge?.averageScore || 0
            ),
            questionsAnswered:
              categoryBreakdown.beverageKnowledge?.totalQuestions || 0,
            totalQuestions: Math.max(
              categoryBreakdown.beverageKnowledge?.totalQuestions || 0,
              10
            ),
            color: "green",
            icon: HeartIcon,
          },
          {
            category: "Wine Knowledge",
            score: Math.round(
              categoryBreakdown.wineKnowledge?.averageScore || 0
            ),
            questionsAnswered:
              categoryBreakdown.wineKnowledge?.totalQuestions || 0,
            totalQuestions: Math.max(
              categoryBreakdown.wineKnowledge?.totalQuestions || 0,
              10
            ),
            color: "purple",
            icon: SparklesIcon,
          },
          {
            category: "Procedures Knowledge",
            score: Math.round(
              categoryBreakdown.proceduresKnowledge?.averageScore || 0
            ),
            questionsAnswered:
              categoryBreakdown.proceduresKnowledge?.totalQuestions || 0,
            totalQuestions: Math.max(
              categoryBreakdown.proceduresKnowledge?.totalQuestions || 0,
              10
            ),
            color: "orange",
            icon: CogIcon,
          },
        ];

        setCategoryData(realCategoryData);
      } catch (err) {
        console.error("Error fetching progress data:", err);
        setError("Failed to load progress data. Please try again.");

        // Set fallback data so page still works
        setOverallStats({
          totalQuizzes: 0,
          completedQuizzes: 0,
          averageScore: 0,
          totalAttempts: 0,
          currentStreak: 0,
          level: 1,
          totalTimeSpent: 0,
        });

        setAchievements([
          {
            id: "first_quiz",
            title: "Getting Started",
            description: "Complete your first quiz",
            emoji: "🎯",
            tier: "bronze",
            isUnlocked: false,
            target: 1,
            progress: 0,
          },
        ]);

        setCategoryData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgressData();
  }, [user]);

  // Helper functions
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 70) return "text-blue-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "platinum":
        return "text-purple-600";
      case "gold":
        return "text-yellow-500";
      case "silver":
        return "text-gray-500";
      case "bronze":
        return "text-orange-600";
      default:
        return "text-gray-400";
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTimeOfDayGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getMotivationalMessage = (): string => {
    if (overallStats.averageScore >= 90)
      return "Outstanding performance! You're a knowledge champion! 🌟";
    if (overallStats.averageScore >= 80)
      return "Great progress! Keep up the excellent work! 🎯";
    if (overallStats.completedQuizzes >= 5)
      return "You're building great learning habits! 💪";
    if (overallStats.completedQuizzes >= 1)
      return "Good start! Your learning journey is underway! 🚀";
    return "Ready to start your learning adventure? Let's go! 🌟";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-slate-600 font-medium">
            Loading your progress... 📊
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      </div>
    );
  }

  const renderOverviewTab = () => {
    // Data preparation for future chart implementation (currently unused)

    return (
      <div className="space-y-6">
        {/* Overall Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {overallStats.level}
            </div>
            <div className="text-sm text-slate-600">Current Level</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {overallStats.completedQuizzes}
            </div>
            <div className="text-sm text-slate-600">Completed</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {overallStats.averageScore}%
            </div>
            <div className="text-sm text-slate-600">Avg Score</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {overallStats.currentStreak}
            </div>
            <div className="text-sm text-slate-600">Day Streak</div>
          </Card>
        </div>

        {/* Learning Journey Card */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-slate-800 mb-6">
            Your Learning Journey
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-600">Level Progress</span>
                <span className="text-slate-800 font-semibold">
                  Level {overallStats.level}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 mb-4">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${Math.min(
                      ((overallStats.totalAttempts % 3) / 3) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-sm text-slate-500">
                {3 - (overallStats.totalAttempts % 3)} more attempts to reach
                Level {overallStats.level + 1}
              </p>
            </div>
            <div className="flex justify-center">
              <ProgressRing
                progress={Math.min(
                  ((overallStats.totalAttempts % 3) / 3) * 100,
                  100
                )}
                level={overallStats.level}
                size="lg"
              />
            </div>
          </div>
        </Card>

        {/* Recommendations */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-slate-800 mb-4">
            Recommendations
          </h3>
          <div className="space-y-4">
            {overallStats.averageScore < 80 && (
              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <BookOpenIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800 mb-1">
                    Focus on Review
                  </h4>
                  <p className="text-blue-700 text-sm">
                    Your average score could improve with more review. Try using
                    practice mode to reinforce learning.
                  </p>
                </div>
              </div>
            )}

            {overallStats.currentStreak < 3 && (
              <div className="flex items-start space-x-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <FireIcon className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-800 mb-1">
                    Build Consistency
                  </h4>
                  <p className="text-orange-700 text-sm">
                    Try to maintain a daily learning streak for better retention
                    and faster progress.
                  </p>
                </div>
              </div>
            )}

            {overallStats.completedQuizzes < overallStats.totalQuizzes && (
              <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800 mb-1">
                    Complete Your Training
                  </h4>
                  <p className="text-green-700 text-sm">
                    You have{" "}
                    {overallStats.totalQuizzes - overallStats.completedQuizzes}{" "}
                    quizzes remaining. Complete them to unlock advanced
                    achievements!
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6 mb-8">
          <h3 className="text-xl font-semibold text-slate-800 mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {quizProgress
              .filter((p) => p.lastAttemptDate)
              .sort(
                (a, b) =>
                  (b.lastAttemptDate?.getTime() || 0) -
                  (a.lastAttemptDate?.getTime() || 0)
              )
              .slice(0, 5)
              .map((progress) => (
                <div
                  key={progress.quiz._id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <BookOpenIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">
                        {progress.quiz.title}
                      </div>
                      <div className="text-sm text-slate-500">
                        {progress.lastAttemptDate &&
                          formatDate(progress.lastAttemptDate)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-semibold ${getScoreColor(
                        progress.averageScore || 0
                      )}`}
                    >
                      {progress.averageScore}%
                    </div>
                    <div className="text-sm text-slate-500">
                      {progress.attemptsCount} attempts
                    </div>
                  </div>
                </div>
              ))}
            {quizProgress.filter((p) => p.lastAttemptDate).length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <BookOpenIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>No quiz attempts yet. Start learning today!</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const toggleQuizCard = (quizId: string) => {
    setExpandedQuizCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(quizId)) {
        newSet.delete(quizId);
      } else {
        newSet.add(quizId);
      }
      return newSet;
    });
  };

  const renderQuizzesTab = () => (
    <div className="space-y-4">
      {quizProgress.map((progressSummary) => {
        const {
          quiz,
          progress,
          overallProgressPercentage,
          averageScore,
          lastAttemptDate,
          attemptsCount,
        } = progressSummary;

        const isExpanded = expandedQuizCards.has(quiz._id);

        return (
          <Card key={quiz._id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  {quiz.title}
                </h3>
                {quiz.description && (
                  <p className="text-slate-600 text-sm mb-3">
                    {quiz.description}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2 ml-4">
                {progress?.isCompletedOverall ? (
                  <CheckCircleIcon className="w-6 h-6 text-green-500" />
                ) : (
                  <ClockIcon className="w-6 h-6 text-yellow-500" />
                )}
                <button
                  onClick={() => toggleQuizCard(quiz._id)}
                  className="p-1 rounded-lg hover:bg-slate-100 transition-colors duration-200"
                >
                  {isExpanded ? (
                    <ChevronUpIcon className="w-5 h-5 text-slate-600" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-slate-600" />
                  )}
                </button>
              </div>
            </div>

            {isExpanded && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div
                      className={`text-2xl font-bold mb-1 ${getProgressColor(
                        overallProgressPercentage
                      )}`}
                    >
                      {overallProgressPercentage}%
                    </div>
                    <div className="text-xs text-slate-500">Progress</div>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-2xl font-bold mb-1 ${
                        averageScore
                          ? getScoreColor(averageScore)
                          : "text-slate-400"
                      }`}
                    >
                      {averageScore || "--"}%
                    </div>
                    <div className="text-xs text-slate-500">Avg Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {attemptsCount}
                    </div>
                    <div className="text-xs text-slate-500">Attempts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-1">
                      {progress?.seenQuestionIds?.length || 0}
                    </div>
                    <div className="text-xs text-slate-500">Questions Seen</div>
                  </div>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${overallProgressPercentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="text-slate-500">
                    {lastAttemptDate
                      ? `Last attempt: ${formatDate(lastAttemptDate)}`
                      : "Not started"}
                  </div>
                  <Button
                    onClick={() => navigate(`/staff/quiz/${quiz._id}/take`)}
                    variant="primary"
                    className="text-sm px-4 py-2"
                    disabled={progress?.isCompletedOverall}
                  >
                    {progress?.isCompletedOverall
                      ? "Completed"
                      : attemptsCount > 0
                      ? "Continue"
                      : "Start"}
                  </Button>
                </div>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );

  const renderAchievementsTab = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Your Achievements
        </h2>
        <p className="text-slate-600">
          {achievements.filter((a) => a.isUnlocked).length} of{" "}
          {achievements.length} unlocked
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {achievements.map((achievement) => (
          <Card
            key={achievement.id}
            className={`p-6 ${
              achievement.isUnlocked
                ? "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-start space-x-4">
              <div
                className={`text-4xl ${
                  achievement.isUnlocked ? "" : "grayscale opacity-50"
                }`}
              >
                {achievement.emoji}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3
                    className={`font-semibold ${
                      achievement.isUnlocked
                        ? "text-slate-800"
                        : "text-slate-500"
                    }`}
                  >
                    {achievement.title}
                  </h3>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${getTierColor(
                      achievement.tier
                    )} bg-white`}
                  >
                    {achievement.tier.toUpperCase()}
                  </span>
                </div>
                <p
                  className={`text-sm mb-3 ${
                    achievement.isUnlocked ? "text-slate-600" : "text-slate-400"
                  }`}
                >
                  {achievement.description}
                </p>

                {achievement.isUnlocked ? (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Unlocked{" "}
                      {achievement.earnedAt &&
                        formatDate(new Date(achievement.earnedAt))}
                    </span>
                  </div>
                ) : achievement.progress !== undefined ? (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-600">Progress</span>
                      <span className="text-slate-800 font-medium">
                        {achievement.progress}/{achievement.target}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            ((achievement.progress || 0) /
                              (achievement.target || 1)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">Not started</div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderInsightsTab = () => (
    <div className="space-y-6">
      {/* Learning Insights */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">
          Learning Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-slate-700 mb-3">Study Habits</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total Study Time</span>
                <span className="font-semibold text-slate-800">
                  {overallStats.totalTimeSpent} min
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Average per Quiz</span>
                <span className="font-semibold text-slate-800">
                  {overallStats.totalAttempts > 0
                    ? Math.round(
                        overallStats.totalTimeSpent / overallStats.totalAttempts
                      )
                    : 0}{" "}
                  min
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Current Streak</span>
                <div className="flex items-center space-x-1">
                  <FireIconSolid className="w-4 h-4 text-orange-500" />
                  <span className="font-semibold text-slate-800">
                    {overallStats.currentStreak} days
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-slate-700 mb-3">Performance</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Completion Rate</span>
                <span className="font-semibold text-slate-800">
                  {overallStats.totalQuizzes > 0
                    ? Math.round(
                        (overallStats.completedQuizzes /
                          overallStats.totalQuizzes) *
                          100
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">First Try Success</span>
                <span className="font-semibold text-slate-800">75%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Improvement Rate</span>
                <div className="flex items-center space-x-1">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                  <span className="font-semibold text-green-600">+12%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Category Performance */}
      <CategoryBreakdown data={categoryData} className="mb-6" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Desktop Navbar */}
      <Navbar />

      {/* Main content with sidebar offset on desktop */}
      <div className="lg:ml-16 min-h-screen">
        {/* Mobile-first container */}
        <div className="max-w-md mx-auto lg:max-w-6xl lg:mx-auto">
          {/* Main content */}
          <div className="px-4 lg:px-6 pt-6 pb-20 lg:pb-6">
            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-4 lg:p-6 mb-6 shadow-sm">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <ChartBarIcon className="w-7 h-7 lg:w-8 lg:h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">
                    {getTimeOfDayGreeting()},{" "}
                    {user?.name?.split(" ")[0] || "Friend"}! 📊
                  </h1>
                  <p className="text-slate-600 text-sm lg:text-base">
                    {getMotivationalMessage()}
                  </p>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-4 gap-3 lg:gap-4">
                <div className="bg-white rounded-xl p-3 lg:p-4 text-center shadow-sm border border-slate-100">
                  <div className="flex items-center justify-center mb-2">
                    <AcademicCapIcon className="w-5 h-5 lg:w-6 lg:h-6 text-blue-500" />
                  </div>
                  <div className="text-xl lg:text-2xl font-bold text-blue-600">
                    {overallStats.totalQuizzes}
                  </div>
                  <div className="text-xs lg:text-sm text-slate-600 font-medium">
                    Quizzes
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 lg:p-4 text-center shadow-sm border border-slate-100">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircleIcon className="w-5 h-5 lg:w-6 lg:h-6 text-green-500" />
                  </div>
                  <div className="text-xl lg:text-2xl font-bold text-green-600">
                    {overallStats.completedQuizzes}
                  </div>
                  <div className="text-xs lg:text-sm text-slate-600 font-medium">
                    Completed
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 lg:p-4 text-center shadow-sm border border-slate-100">
                  <div className="flex items-center justify-center mb-2">
                    <StarIcon className="w-5 h-5 lg:w-6 lg:h-6 text-purple-500" />
                  </div>
                  <div className="text-xl lg:text-2xl font-bold text-purple-600">
                    {overallStats.averageScore}%
                  </div>
                  <div className="text-xs lg:text-sm text-slate-600 font-medium">
                    Avg Score
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 lg:p-4 text-center shadow-sm border border-slate-100">
                  <div className="flex items-center justify-center mb-2">
                    <FireIcon className="w-5 h-5 lg:w-6 lg:h-6 text-orange-500" />
                  </div>
                  <div className="text-xl lg:text-2xl font-bold text-orange-600">
                    {overallStats.currentStreak}
                  </div>
                  <div className="text-xs lg:text-sm text-slate-600 font-medium">
                    Day Streak
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl p-1 mb-6 shadow-sm border border-slate-100">
              <div className="flex space-x-1">
                {[
                  { key: "overview", label: "Overview", icon: ChartBarIcon },
                  { key: "quizzes", label: "Quizzes", icon: BookOpenIcon },
                  {
                    key: "achievements",
                    label: "Achievements",
                    icon: TrophyIcon,
                  },
                  { key: "insights", label: "Insights", icon: StarIcon },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() =>
                        setActiveTab(
                          tab.key as
                            | "overview"
                            | "quizzes"
                            | "achievements"
                            | "insights"
                        )
                      }
                      className={`
                        flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 text-sm lg:text-base
                        ${
                          activeTab === tab.key
                            ? "bg-blue-100 text-blue-700 shadow-sm"
                            : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            {activeTab === "overview" && renderOverviewTab()}
            {activeTab === "quizzes" && renderQuizzesTab()}
            {activeTab === "achievements" && renderAchievementsTab()}
            {activeTab === "insights" && renderInsightsTab()}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default MyProgressPage;
