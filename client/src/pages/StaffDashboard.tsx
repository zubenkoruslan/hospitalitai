import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, {
  getAvailableQuizzesForStaff,
  getMyQuizProgress,
} from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import { ClientStaffQuizProgressWithAttempts } from "../types/staffTypes";
import { ClientIQuiz } from "../types/quizTypes";

// New components
import WelcomeHeader from "../components/staff/dashboard/WelcomeHeader";
import QuizActions from "../components/staff/dashboard/QuizActions";
import ProgressRing from "../components/staff/dashboard/ProgressRing";
import AchievementsBanner from "../components/staff/dashboard/AchievementsBanner";
import BottomNavigation from "../components/staff/dashboard/BottomNavigation";
import PracticeModeModal from "../components/quiz/PracticeModeModal";

// Mock achievement data (to be replaced with real API calls)
const mockAchievements = [
  {
    id: "1",
    title: "Getting Started",
    description: "Complete your first quiz",
    emoji: "🎯",
    tier: "bronze" as const,
    earnedAt: "2024-01-15",
    isNew: true,
  },
  {
    id: "2",
    title: "Quick Learner",
    description: "Score 90% or higher",
    emoji: "⚡",
    tier: "silver" as const,
    earnedAt: "2024-01-14",
  },
  {
    id: "3",
    title: "Perfectionist",
    description: "Get 100% on a quiz",
    emoji: "⭐",
    tier: "gold" as const,
    earnedAt: "2024-01-13",
  },
];

interface StaffQuizDisplayItem extends ClientIQuiz {
  progress?: ClientStaffQuizProgressWithAttempts | null;
}

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

  // Calculate level based on completed quizzes (simplified)
  const calculateLevel = (completed: number): number => {
    return Math.floor(completed / 5) + 1;
  };

  // Calculate progress within current level
  const calculateLevelProgress = (completed: number): number => {
    const progressInLevel = completed % 5;
    return (progressInLevel / 5) * 100;
  };

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const quizzesData = await getAvailableQuizzesForStaff();
      setAvailableQuizzes(quizzesData);

      // For now, using mock data for progress stats
      // In real implementation, these would come from a dedicated progress endpoint
      const mockCompleted = 3;
      const mockAverageScore = 85;

      setTotalCompleted(mockCompleted);
      setAverageScore(mockAverageScore);
      setCurrentLevel(calculateLevel(mockCompleted));
      setProgressPercentage(calculateLevelProgress(mockCompleted));
      setCurrentStreak(Math.min(mockCompleted, 7));
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
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
                    {5 - (totalCompleted % 5)} more to reach Level{" "}
                    {currentLevel + 1}
                  </p>
                </div>
                <div className="flex justify-center">
                  <ProgressRing
                    progress={progressPercentage}
                    level={currentLevel}
                    size="lg"
                  />
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

          {/* Achievements */}
          <AchievementsBanner
            recentAchievements={mockAchievements}
            totalAchievements={mockAchievements.length}
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
