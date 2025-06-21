import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  TrophyIcon,
  StarIcon,
  FireIcon,
  SparklesIcon,
  CheckCircleIcon,
  LockClosedIcon,
  CalendarIcon,
  UsersIcon,
  GiftIcon,
  AcademicCapIcon,
  ClockIcon,
  UserIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";

import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import Button from "../components/common/Button";
import Navbar from "../components/Navbar";
import BottomNavigation from "../components/staff/dashboard/BottomNavigation";
import api from "../services/api";

interface Achievement {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  emoji: string;
  tier: "bronze" | "silver" | "gold" | "platinum" | "legendary";
  earnedAt?: string;
  isUnlocked: boolean;
  progress?: number;
  target?: number;
  category: "quiz" | "streak" | "score" | "special" | "social" | "speed";
  points: number;
  isRare?: boolean;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  achievementsCount: number;
  avatar?: string;
  isCurrentUser?: boolean;
}

// Interface for performer data from API
interface ApiPerformer {
  rank: number;
  userId: string;
  name: string;
  overallAverageScore: number;
}

const StaffAchievementsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAchievement, setSelectedAchievement] =
    useState<Achievement | null>(null);
  const [isAchievementsExpanded, setIsAchievementsExpanded] = useState(false);

  // Real data from API
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const categories = [
    { id: "all", name: "All", icon: TrophyIcon },
    { id: "quiz", name: "Quiz Master", icon: AcademicCapIcon },
    { id: "score", name: "High Scorer", icon: StarIcon },
    { id: "streak", name: "Consistency", icon: FireIcon },
    { id: "speed", name: "Speed", icon: ClockIcon },
    { id: "special", name: "Special", icon: SparklesIcon },
  ];

  useEffect(() => {
    const loadAchievementsData = async () => {
      if (!user) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch individual staff analytics to get real data
        const analyticsResponse = await api.get(`/analytics/staff/${user._id}`);
        const analytics = analyticsResponse.data.data; // Access nested data field

        // Fetch leaderboard data
        const leaderboardResponse = await api.get(
          "/analytics/leaderboards?timePeriod=all&limit=10"
        );
        const leaderboardData = leaderboardResponse.data;

        // Extract personal metrics
        const personalMetrics = analytics?.personalMetrics || {};
        const completedQuizzes = personalMetrics.totalQuizzesCompleted || 0;
        const averageScore = personalMetrics.overallAverageScore || 0;
        const totalQuestions = personalMetrics.totalQuestionsAnswered || 0;

        // Create realistic achievements based on real data
        const realAchievements: Achievement[] = [
          {
            id: "first_quiz",
            title: "Getting Started",
            description: "Complete your first quiz",
            longDescription:
              "Welcome to the learning journey! This is just the beginning of your knowledge adventure.",
            emoji: "🎯",
            tier: "bronze",
            earnedAt: completedQuizzes > 0 ? "2024-01-15" : undefined,
            isUnlocked: completedQuizzes > 0,
            category: "quiz",
            points: 10,
          },
          {
            id: "quiz_master",
            title: "Quiz Master",
            description: "Complete 5 quizzes",
            longDescription:
              "You've shown true dedication to learning. Keep pushing your boundaries!",
            emoji: "📚",
            tier: "silver",
            earnedAt: completedQuizzes >= 5 ? "2024-01-14" : undefined,
            isUnlocked: completedQuizzes >= 5,
            progress: Math.min(completedQuizzes, 5),
            target: 5,
            category: "quiz",
            points: 50,
          },
          {
            id: "dedicated_learner",
            title: "Dedicated Learner",
            description: "Complete 10 quizzes",
            longDescription:
              "Exceptional commitment to learning! You're building serious expertise.",
            emoji: "🏆",
            tier: "gold",
            earnedAt: completedQuizzes >= 10 ? "2024-01-13" : undefined,
            isUnlocked: completedQuizzes >= 10,
            progress: Math.min(completedQuizzes, 10),
            target: 10,
            category: "quiz",
            points: 100,
          },
          {
            id: "high_scorer",
            title: "High Scorer",
            description: "Achieve 80% average score",
            longDescription:
              "Consistent excellence! Your understanding of the material is impressive.",
            emoji: "⭐",
            tier: "silver",
            earnedAt: averageScore >= 80 ? "2024-01-12" : undefined,
            isUnlocked: averageScore >= 80,
            progress: averageScore >= 80 ? 80 : Math.min(averageScore, 80),
            target: 80,
            category: "score",
            points: 60,
          },
          {
            id: "perfectionist",
            title: "Perfectionist",
            description: "Achieve 95% average score",
            longDescription:
              "Flawless execution! You've demonstrated perfect understanding of the material.",
            emoji: "💎",
            tier: "gold",
            earnedAt: averageScore >= 95 ? "2024-01-11" : undefined,
            isUnlocked: averageScore >= 95,
            progress: averageScore >= 95 ? 95 : Math.min(averageScore, 95),
            target: 95,
            category: "score",
            points: 150,
          },
          {
            id: "knowledge_seeker",
            title: "Knowledge Seeker",
            description: "Answer 50+ questions",
            longDescription:
              "Curiosity and dedication combined! You're truly embracing the learning process.",
            emoji: "🔍",
            tier: "bronze",
            earnedAt: totalQuestions >= 50 ? "2024-01-10" : undefined,
            isUnlocked: totalQuestions >= 50,
            progress: Math.min(totalQuestions, 50),
            target: 50,
            category: "special",
            points: 30,
          },
          {
            id: "scholar",
            title: "Scholar",
            description: "Answer 100+ questions",
            longDescription:
              "Remarkable dedication! You're accumulating serious knowledge and expertise.",
            emoji: "🎓",
            tier: "platinum",
            earnedAt: totalQuestions >= 100 ? "2024-01-09" : undefined,
            isUnlocked: totalQuestions >= 100,
            progress: Math.min(totalQuestions, 100),
            target: 100,
            category: "special",
            points: 200,
          },
        ];

        setAchievements(realAchievements);

        // Process leaderboard data
        if (leaderboardData.data?.topPerformers) {
          const processedLeaderboard: LeaderboardEntry[] =
            leaderboardData.data.topPerformers.map(
              (performer: {
                rank: number;
                userId: string;
                name: string;
                overallAverageScore: number;
              }) => {
                const isCurrentUser = performer.userId === user._id;
                const achievementsCount = realAchievements.filter(
                  (a) => a.isUnlocked
                ).length;
                const points = realAchievements
                  .filter((a) => a.isUnlocked)
                  .reduce((sum, a) => sum + a.points, 0);

                return {
                  rank: performer.rank,
                  name: isCurrentUser ? "You" : performer.name,
                  points: isCurrentUser
                    ? points
                    : Math.floor(performer.overallAverageScore * 10), // Convert score to points
                  achievementsCount: isCurrentUser
                    ? achievementsCount
                    : Math.floor(Math.random() * 12) + 3, // Mock for others
                  isCurrentUser,
                };
              }
            );

          setLeaderboard(processedLeaderboard);
        }
      } catch (err) {
        console.error("Error loading achievements data:", err);
        setError("Failed to load achievements. Please try again.");

        // Set fallback data so page still works
        setAchievements([
          {
            id: "first_quiz",
            title: "Getting Started",
            description: "Complete your first quiz",
            longDescription:
              "Welcome to the learning journey! This is just the beginning of your knowledge adventure.",
            emoji: "🎯",
            tier: "bronze",
            isUnlocked: false,
            category: "quiz",
            points: 10,
            target: 1,
            progress: 0,
          },
        ]);

        setLeaderboard([
          {
            rank: 1,
            name: "You",
            points: 0,
            achievementsCount: 0,
            isCurrentUser: true,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAchievementsData();
  }, [user]);

  // Helper functions
  const getTierColor = (tier: string) => {
    switch (tier) {
      case "legendary":
        return "from-purple-500 to-pink-500";
      case "platinum":
        return "from-gray-400 to-gray-600";
      case "gold":
        return "from-yellow-400 to-yellow-600";
      case "silver":
        return "from-gray-300 to-gray-500";
      case "bronze":
        return "from-orange-400 to-orange-600";
      default:
        return "from-gray-200 to-gray-400";
    }
  };

  const getTierTextColor = (tier: string) => {
    switch (tier) {
      case "legendary":
        return "text-purple-600";
      case "platinum":
        return "text-gray-600";
      case "gold":
        return "text-yellow-600";
      case "silver":
        return "text-gray-600";
      case "bronze":
        return "text-orange-600";
      default:
        return "text-gray-500";
    }
  };

  const getTierBorderColor = (tier: string) => {
    switch (tier) {
      case "legendary":
        return "border-purple-300";
      case "platinum":
        return "border-gray-300";
      case "gold":
        return "border-yellow-300";
      case "silver":
        return "border-gray-300";
      case "bronze":
        return "border-orange-300";
      default:
        return "border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const currentUserStats = {
    totalPoints: leaderboard.find((entry) => entry.isCurrentUser)?.points || 0,
    unlockedCount: achievements.filter((a) => a.isUnlocked).length,
    totalCount: achievements.length,
    rank: leaderboard.find((entry) => entry.isCurrentUser)?.rank || 0,
  };

  const filteredAchievements =
    selectedCategory === "all"
      ? achievements
      : achievements.filter((a) => a.category === selectedCategory);

  const getTimeOfDayGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getMotivationalMessage = (): string => {
    if (currentUserStats.unlockedCount >= 5)
      return "You're crushing it! Achievement master! 🏆";
    if (currentUserStats.unlockedCount >= 3)
      return "Great progress! Keep collecting those achievements! 🌟";
    if (currentUserStats.unlockedCount >= 1)
      return "Awesome start! More achievements await! 🎯";
    return "Ready to start earning achievements? Let's go! 🚀";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-slate-600 font-medium">
            Loading your achievements... 🏆
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
                <div className="w-14 h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                  <TrophyIcon className="w-7 h-7 lg:w-8 lg:h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl lg:text-2xl font-bold text-slate-800 mb-1">
                    {getTimeOfDayGreeting()},{" "}
                    {user?.name?.split(" ")[0] || "Friend"}! 🏆
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
                    <div className="w-5 h-5 lg:w-6 lg:h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">P</span>
                    </div>
                  </div>
                  <div className="text-xl lg:text-2xl font-bold text-purple-600">
                    {currentUserStats.totalPoints}
                  </div>
                  <div className="text-xs lg:text-sm text-slate-600 font-medium">
                    Points
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 lg:p-4 text-center shadow-sm border border-slate-100">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircleIcon className="w-5 h-5 lg:w-6 lg:h-6 text-green-500" />
                  </div>
                  <div className="text-xl lg:text-2xl font-bold text-green-600">
                    {currentUserStats.unlockedCount}
                  </div>
                  <div className="text-xs lg:text-sm text-slate-600 font-medium">
                    Unlocked
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 lg:p-4 text-center shadow-sm border border-slate-100">
                  <div className="flex items-center justify-center mb-2">
                    <UsersIcon className="w-5 h-5 lg:w-6 lg:h-6 text-blue-500" />
                  </div>
                  <div className="text-xl lg:text-2xl font-bold text-blue-600">
                    #{currentUserStats.rank}
                  </div>
                  <div className="text-xs lg:text-sm text-slate-600 font-medium">
                    Rank
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 lg:p-4 text-center shadow-sm border border-slate-100">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-5 h-5 lg:w-6 lg:h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">%</span>
                    </div>
                  </div>
                  <div className="text-xl lg:text-2xl font-bold text-orange-600">
                    {Math.round(
                      (currentUserStats.unlockedCount /
                        currentUserStats.totalCount) *
                        100
                    )}
                    %
                  </div>
                  <div className="text-xs lg:text-sm text-slate-600 font-medium">
                    Progress
                  </div>
                </div>
              </div>
            </div>

            {/* Achievement Leaderboard */}
            <div className="mb-6">
              <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100">
                <h3 className="text-lg lg:text-xl font-semibold text-slate-800 mb-4">
                  Achievement Leaderboard
                </h3>
                <div className="space-y-3">
                  {leaderboard.slice(0, 5).map((entry) => (
                    <div
                      key={entry.rank}
                      className={`
                      flex items-center justify-between p-3 rounded-lg transition-all duration-200
                      ${
                        entry.isCurrentUser
                          ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200"
                          : "bg-slate-50"
                      }
                    `}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
                        ${
                          entry.rank <= 3
                            ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900"
                            : "bg-gradient-to-br from-slate-400 to-slate-600"
                        }
                      `}
                        >
                          {entry.rank === 1
                            ? "🥇"
                            : entry.rank === 2
                            ? "🥈"
                            : entry.rank === 3
                            ? "🥉"
                            : `#${entry.rank}`}
                        </div>
                        <div>
                          <h4
                            className={`font-semibold text-sm ${
                              entry.isCurrentUser
                                ? "text-blue-800"
                                : "text-slate-800"
                            }`}
                          >
                            {entry.name}
                            {entry.isCurrentUser && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                You
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-slate-600">
                            {entry.achievementsCount} achievements
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-sm font-bold ${
                            entry.isCurrentUser
                              ? "text-blue-700"
                              : "text-slate-700"
                          }`}
                        >
                          {entry.points.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">points</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Category Filter */}
            <div className="mb-6">
              <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100">
                <h3 className="text-lg lg:text-xl font-semibold text-slate-800 mb-4">
                  Achievement Categories
                </h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const Icon = category.icon;
                    const count =
                      category.id === "all"
                        ? achievements.length
                        : achievements.filter((a) => a.category === category.id)
                            .length;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`
                        flex items-center space-x-2 px-3 py-2 rounded-xl font-medium transition-all duration-200 text-sm lg:text-base
                        ${
                          selectedCategory === category.id
                            ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                            : "bg-slate-50 text-slate-600 border-2 border-slate-200 hover:border-slate-300"
                        }
                      `}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{category.name}</span>
                        <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Achievements Grid */}
            <div className="mb-6">
              <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg lg:text-xl font-semibold text-slate-800">
                    {selectedCategory === "all"
                      ? "All Achievements"
                      : categories.find((c) => c.id === selectedCategory)?.name}
                  </h3>
                  <button
                    onClick={() =>
                      setIsAchievementsExpanded(!isAchievementsExpanded)
                    }
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors duration-200 text-sm font-medium text-slate-700"
                  >
                    <span>
                      {isAchievementsExpanded ? "Collapse" : "Expand"}
                    </span>
                    {isAchievementsExpanded ? (
                      <ChevronUpIcon className="w-4 h-4" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {isAchievementsExpanded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAchievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className={`
                      bg-slate-50 rounded-xl p-4 border-2 cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-1
                      ${
                        achievement.isUnlocked
                          ? `${getTierBorderColor(achievement.tier)}`
                          : "border-slate-200"
                      }
                      ${
                        achievement.isRare
                          ? "ring-2 ring-purple-300 ring-opacity-50"
                          : ""
                      }
                    `}
                        onClick={() => setSelectedAchievement(achievement)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`
                            w-10 h-10 rounded-full flex items-center justify-center text-xl
                            ${
                              achievement.isUnlocked
                                ? `bg-gradient-to-br ${getTierColor(
                                    achievement.tier
                                  )} shadow-lg`
                                : "bg-slate-200 grayscale"
                            }
                          `}
                            >
                              {achievement.isUnlocked
                                ? achievement.emoji
                                : "🔒"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4
                                className={`font-semibold text-sm ${
                                  achievement.isUnlocked
                                    ? "text-slate-800"
                                    : "text-slate-500"
                                } truncate`}
                              >
                                {achievement.title}
                              </h4>
                              <span
                                className={`text-xs font-medium px-2 py-1 rounded-full ${getTierTextColor(
                                  achievement.tier
                                )} bg-white`}
                              >
                                {achievement.tier.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <div
                              className={`text-right ${
                                achievement.isUnlocked
                                  ? "text-slate-600"
                                  : "text-slate-400"
                              }`}
                            >
                              <div className="text-sm font-bold">
                                {achievement.points}
                              </div>
                              <div className="text-xs">pts</div>
                            </div>
                            {achievement.isUnlocked ? (
                              <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                            ) : (
                              <LockClosedIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                            )}
                          </div>
                        </div>

                        <p
                          className={`text-xs mb-3 ${
                            achievement.isUnlocked
                              ? "text-slate-600"
                              : "text-slate-400"
                          } line-clamp-2`}
                        >
                          {achievement.description}
                        </p>

                        {achievement.isUnlocked ? (
                          <div className="flex items-center space-x-2 text-green-600">
                            <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                            <span className="text-xs font-medium">
                              Unlocked {formatDate(achievement.earnedAt!)}
                            </span>
                          </div>
                        ) : achievement.progress !== undefined ? (
                          <div>
                            <div className="flex items-center justify-between text-xs mb-2">
                              <span className="text-slate-600">Progress</span>
                              <span className="text-slate-800 font-medium">
                                {achievement.progress}/{achievement.target}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className={`bg-gradient-to-r ${getTierColor(
                                  achievement.tier
                                )} h-2 rounded-full transition-all duration-500`}
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
                          <div className="text-xs text-slate-400 italic">
                            Not started
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Coming Soon - Rewards */}
            <div className="mb-6">
              <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 text-center">
                <GiftIcon className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  Rewards Coming Soon!
                </h3>
                <p className="text-slate-600 text-sm mb-4">
                  Redeem your achievement points for amazing rewards and perks.
                </p>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="text-sm text-purple-700">
                    Gift cards • Professional development • Team events •
                    Recognition certificates
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Button
                onClick={() => navigate("/staff/dashboard")}
                className="flex items-center justify-center h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
              >
                <UserIcon className="w-5 h-5 mr-2" />
                Dashboard
              </Button>
              <Button
                onClick={() => navigate("/staff/progress")}
                variant="white"
                className="flex items-center justify-center h-12 border-2 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <StarIcon className="w-5 h-5 mr-2" />
                My Progress
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div
                    className={`
                      w-16 h-16 rounded-full flex items-center justify-center text-3xl
                      ${
                        selectedAchievement.isUnlocked
                          ? `bg-gradient-to-br ${getTierColor(
                              selectedAchievement.tier
                            )} shadow-lg`
                          : "bg-slate-200 grayscale"
                      }
                    `}
                  >
                    {selectedAchievement.isUnlocked
                      ? selectedAchievement.emoji
                      : "🔒"}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-1">
                      {selectedAchievement.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-sm font-medium px-3 py-1 rounded-full ${getTierTextColor(
                          selectedAchievement.tier
                        )} bg-slate-100`}
                      >
                        {selectedAchievement.tier.toUpperCase()}
                      </span>
                      {selectedAchievement.isRare && (
                        <span className="text-sm font-medium px-3 py-1 rounded-full text-purple-600 bg-purple-100">
                          RARE
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAchievement(null)}
                  className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2">
                    Description
                  </h4>
                  <p className="text-slate-600">
                    {selectedAchievement.longDescription ||
                      selectedAchievement.description}
                  </p>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-slate-200">
                  <span className="text-slate-600">Points Reward</span>
                  <span className="font-bold text-purple-600">
                    {selectedAchievement.points} pts
                  </span>
                </div>

                {selectedAchievement.isUnlocked ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-green-700">
                      <CheckCircleIcon className="w-5 h-5" />
                      <span className="font-medium">Achievement Unlocked!</span>
                    </div>
                    <p className="text-green-600 text-sm mt-1">
                      Earned on {formatDate(selectedAchievement.earnedAt!)}
                    </p>
                  </div>
                ) : selectedAchievement.progress !== undefined ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-blue-800">
                        Progress
                      </span>
                      <span className="text-blue-700">
                        {selectedAchievement.progress}/
                        {selectedAchievement.target}
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-3">
                      <div
                        className={`bg-gradient-to-r ${getTierColor(
                          selectedAchievement.tier
                        )} h-3 rounded-full transition-all duration-500`}
                        style={{
                          width: `${
                            ((selectedAchievement.progress || 0) /
                              (selectedAchievement.target || 1)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                    <p className="text-blue-600 text-sm mt-2">
                      {(selectedAchievement.target || 0) -
                        (selectedAchievement.progress || 0)}{" "}
                      more to unlock!
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-slate-600">
                      <LockClosedIcon className="w-5 h-5" />
                      <span className="font-medium">Not Started</span>
                    </div>
                    <p className="text-slate-500 text-sm mt-1">
                      Start learning to unlock this achievement!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default StaffAchievementsPage;
