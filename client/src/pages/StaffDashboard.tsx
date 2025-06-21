import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { getAvailableQuizzesForStaff } from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import { ClientStaffQuizProgressWithAttempts } from "../types/staffTypes";
import { ClientIQuiz } from "../types/quizTypes";

// New components
import Navbar from "../components/Navbar";
import WelcomeHeader from "../components/staff/dashboard/WelcomeHeader";
import QuizActions from "../components/staff/dashboard/QuizActions";
import ProgressRing from "../components/staff/dashboard/ProgressRing";
import AchievementsBanner from "../components/staff/dashboard/AchievementsBanner";
import BottomNavigation from "../components/staff/dashboard/BottomNavigation";
import PracticeModeModal from "../components/quiz/PracticeModeModal";

interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  earnedAt: string;
  isNew?: boolean;
}

interface StaffQuizDisplayItem extends ClientIQuiz {
  progress?: ClientStaffQuizProgressWithAttempts | null;
}

// Real Achievement Calculator
const calculateRealAchievements = (
  completedQuizzes: number,
  averageScore: number,
  totalQuestions: number,
  currentLevel: number
): Achievement[] => {
  const achievements: Achievement[] = [];
  const now = new Date();

  // Achievement 1: Getting Started (Complete first quiz)
  if (completedQuizzes >= 1) {
    achievements.push({
      id: "getting_started",
      title: "Getting Started",
      description: "Complete your first quiz",
      emoji: "🎯",
      tier: "bronze",
      earnedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      isNew: completedQuizzes === 1, // New if just completed first quiz
    });
  }

  // Achievement 2: Quiz Enthusiast (Complete 3 quizzes)
  if (completedQuizzes >= 3) {
    achievements.push({
      id: "quiz_enthusiast",
      title: "Quiz Enthusiast",
      description: "Complete 3 quizzes",
      emoji: "📚",
      tier: "bronze",
      earnedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      isNew: completedQuizzes === 3,
    });
  }

  // Achievement 3: Dedicated Learner (Complete 5 quizzes)
  if (completedQuizzes >= 5) {
    achievements.push({
      id: "dedicated_learner",
      title: "Dedicated Learner",
      description: "Complete 5 quizzes",
      emoji: "🏆",
      tier: "silver",
      earnedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      isNew: completedQuizzes === 5,
    });
  }

  // Achievement 4: Quiz Master (Complete 10 quizzes)
  if (completedQuizzes >= 10) {
    achievements.push({
      id: "quiz_master",
      title: "Quiz Master",
      description: "Complete 10 quizzes",
      emoji: "👑",
      tier: "gold",
      earnedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      isNew: completedQuizzes === 10,
    });
  }

  // Achievement 5: Knowledge Champion (Complete 20 quizzes)
  if (completedQuizzes >= 20) {
    achievements.push({
      id: "knowledge_champion",
      title: "Knowledge Champion",
      description: "Complete 20 quizzes",
      emoji: "🌟",
      tier: "platinum",
      earnedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      isNew: completedQuizzes === 20,
    });
  }

  // Achievement 6: Good Score (70%+ average)
  if (averageScore >= 70 && completedQuizzes >= 2) {
    achievements.push({
      id: "good_score",
      title: "Good Performer",
      description: "Achieve 70%+ average score",
      emoji: "👍",
      tier: "bronze",
      earnedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      isNew: averageScore >= 70 && averageScore < 80,
    });
  }

  // Achievement 7: High Scorer (80%+ average)
  if (averageScore >= 80 && completedQuizzes >= 3) {
    achievements.push({
      id: "high_scorer",
      title: "High Scorer",
      description: "Achieve 80%+ average score",
      emoji: "⭐",
      tier: "silver",
      earnedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      isNew: averageScore >= 80 && averageScore < 90,
    });
  }

  // Achievement 8: Excellent Student (90%+ average)
  if (averageScore >= 90 && completedQuizzes >= 3) {
    achievements.push({
      id: "excellent_student",
      title: "Excellent Student",
      description: "Achieve 90%+ average score",
      emoji: "🌟",
      tier: "gold",
      earnedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      isNew: averageScore >= 90 && averageScore < 95,
    });
  }

  // Achievement 9: Perfectionist (95%+ average)
  if (averageScore >= 95 && completedQuizzes >= 3) {
    achievements.push({
      id: "perfectionist",
      title: "Perfectionist",
      description: "Achieve 95%+ average score",
      emoji: "💎",
      tier: "platinum",
      earnedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      isNew: averageScore >= 95,
    });
  }

  // Achievement 10: Question Explorer (50+ questions answered)
  if (totalQuestions >= 50) {
    achievements.push({
      id: "question_explorer",
      title: "Question Explorer",
      description: "Answer 50+ questions",
      emoji: "🔍",
      tier: "bronze",
      earnedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      isNew: totalQuestions >= 50 && totalQuestions < 100,
    });
  }

  // Achievement 11: Knowledge Seeker (100+ questions answered)
  if (totalQuestions >= 100) {
    achievements.push({
      id: "knowledge_seeker",
      title: "Knowledge Seeker",
      description: "Answer 100+ questions",
      emoji: "🎓",
      tier: "silver",
      earnedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      isNew: totalQuestions >= 100 && totalQuestions < 200,
    });
  }

  // Achievement 12: Scholar (200+ questions answered)
  if (totalQuestions >= 200) {
    achievements.push({
      id: "scholar",
      title: "Scholar",
      description: "Answer 200+ questions",
      emoji: "📖",
      tier: "gold",
      earnedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      isNew: totalQuestions >= 200,
    });
  }

  // Achievement 13: Level Achiever (Reach Level 3+)
  if (currentLevel >= 3) {
    achievements.push({
      id: "level_achiever",
      title: "Level Achiever",
      description: `Reach Level ${currentLevel}`,
      emoji: "🚀",
      tier: currentLevel >= 5 ? "gold" : "silver",
      earnedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      isNew: currentLevel >= 3 && currentLevel <= 4,
    });
  }

  // Achievement 14: Consistency King (Special - reach level 5+)
  if (currentLevel >= 5) {
    achievements.push({
      id: "consistency_king",
      title: "Consistency King",
      description: "Reach Level 5+ through consistent learning",
      emoji: "👑",
      tier: "platinum",
      earnedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      isNew: currentLevel === 5,
    });
  }

  // Sort achievements by tier importance and earned date
  const tierOrder = { platinum: 4, gold: 3, silver: 2, bronze: 1 };
  return achievements.sort((a, b) => {
    // First, prioritize "new" achievements
    if (a.isNew && !b.isNew) return -1;
    if (!a.isNew && b.isNew) return 1;

    // Then by tier (higher tier first)
    const tierDiff = tierOrder[b.tier] - tierOrder[a.tier];
    if (tierDiff !== 0) return tierDiff;

    // Finally by earned date (most recent first)
    return new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime();
  });
};

const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State management
  const [availableQuizzes, setAvailableQuizzes] = useState<
    StaffQuizDisplayItem[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPracticeModeModalOpen, setIsPracticeModeModalOpen] = useState(false);

  // Progress stats
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [progressPercentage, setProgressPercentage] = useState(0);

  // Real achievements state
  const [realAchievements, setRealAchievements] = useState<Achievement[]>([]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch real analytics data - SAME AS MyProgressPage
      const analyticsResponse = await api.get(`/analytics/staff/${user._id}`);
      const analytics = analyticsResponse.data.data; // Access nested data field

      // Fetch available quizzes
      const quizzesData = await getAvailableQuizzesForStaff();
      setAvailableQuizzes(quizzesData);

      // Use real analytics data for overall stats with fallbacks - SAME AS MyProgressPage
      const personalMetrics = analytics?.personalMetrics || {};

      const completedQuizzes = personalMetrics.totalQuizzesCompleted || 0;
      const realAverageScore = Math.round(
        personalMetrics.overallAverageScore || 0
      );
      const totalQuestionsAnswered =
        personalMetrics.totalQuestionsAnswered || 0;

      // Calculate level and streak - SAME AS MyProgressPage
      const currentStreak = Math.min(completedQuizzes, 7); // Mock streak based on completed quizzes
      const level = Math.floor(completedQuizzes / 3) + 1; // FIXED: Match MyProgressPage calculation
      const progressPercentage = ((completedQuizzes % 3) / 3) * 100; // FIXED: Match MyProgressPage calculation

      setTotalCompleted(completedQuizzes);
      setAverageScore(realAverageScore);
      setCurrentLevel(level);
      setProgressPercentage(progressPercentage);
      setCurrentStreak(currentStreak);

      // Calculate real achievements based on actual progress
      const achievements = calculateRealAchievements(
        completedQuizzes,
        realAverageScore,
        totalQuestionsAnswered,
        level
      );
      setRealAchievements(achievements);

      console.log("StaffDashboard Analytics Data:", {
        completedQuizzes,
        realAverageScore,
        level,
        progressPercentage,
        totalQuestionsAnswered,
        achievements: achievements.length,
        personalMetrics,
      });
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Navigation handlers
  const handleStartQuiz = () => {
    const availableQuiz = availableQuizzes.find(
      (quiz) =>
        !quiz.progress?.isCompletedOverall &&
        (!quiz.nextAvailableAt || new Date() >= new Date(quiz.nextAvailableAt))
    );

    if (availableQuiz) {
      navigate(`/staff/quiz/${availableQuiz._id}/take`);
    } else {
      navigate("/staff/quizzes");
    }
  };

  const handlePracticeMode = () => {
    setIsPracticeModeModalOpen(true);
  };

  const handleViewProgress = () => {
    navigate("/staff/progress");
  };

  const handleViewAllAchievements = () => {
    navigate("/staff/achievements");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <LoadingSpinner />
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Authentication Required
          </h2>
          <p className="text-slate-600">
            Please log in to access your dashboard.
          </p>
        </div>
      </div>
    );
  }

  const availableQuizCount = availableQuizzes.filter(
    (quiz) =>
      !quiz.progress?.isCompletedOverall &&
      (!quiz.nextAvailableAt || new Date() >= new Date(quiz.nextAvailableAt))
  ).length;

  const hasIncompleteQuizzes = availableQuizzes.some(
    (quiz) => quiz.progress && !quiz.progress.isCompletedOverall
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
            <WelcomeHeader
              staffMember={{
                firstName: user.name?.split(" ")[0] || "Friend",
                lastName: user.name?.split(" ").slice(1).join(" ") || "",
              }}
              currentStreak={currentStreak}
              totalCompleted={totalCompleted}
              averageScore={averageScore}
            />

            {/* Progress Overview */}
            <div className="mb-6">
              <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div className="text-center lg:text-left">
                    <h3 className="text-lg lg:text-xl font-semibold text-slate-800 mb-2">
                      Your Learning Journey
                    </h3>
                    <p className="text-slate-600 mb-4">
                      Level {currentLevel} • {totalCompleted} quizzes completed
                    </p>
                    <div className="w-full bg-slate-200 rounded-full h-3 mb-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    <p className="text-sm text-slate-500">
                      {3 - (totalCompleted % 3)} more to reach Level{" "}
                      {currentLevel + 1}
                    </p>
                  </div>
                  <div className="flex justify-center lg:justify-end">
                    <div className="w-44 h-44 flex items-center justify-center">
                      <ProgressRing
                        progress={progressPercentage}
                        level={currentLevel}
                        size="lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quiz Actions */}
            <QuizActions
              availableQuizzes={availableQuizCount}
              hasIncompleteQuizzes={hasIncompleteQuizzes}
              onStartQuiz={handleStartQuiz}
              onPracticeMode={handlePracticeMode}
              onViewProgress={handleViewProgress}
            />

            {/* Real Achievements */}
            <AchievementsBanner
              recentAchievements={realAchievements}
              totalAchievements={realAchievements.length}
              onViewAll={handleViewAllAchievements}
            />

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {availableQuizCount}
                </div>
                <div className="text-sm text-slate-600">Available</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {totalCompleted}
                </div>
                <div className="text-sm text-slate-600">Completed</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {averageScore}%
                </div>
                <div className="text-sm text-slate-600">Avg Score</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                <div className="text-2xl font-bold text-orange-600 mb-1">
                  {currentStreak}
                </div>
                <div className="text-sm text-slate-600">Day Streak</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Practice Mode Modal */}
      <PracticeModeModal
        isOpen={isPracticeModeModalOpen}
        onClose={() => setIsPracticeModeModalOpen(false)}
      />
    </div>
  );
};

export default StaffDashboard;
