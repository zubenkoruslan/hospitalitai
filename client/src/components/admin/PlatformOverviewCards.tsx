import React from "react";
import {
  UsersIcon,
  BuildingStorefrontIcon,
  AcademicCapIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import MetricCard from "./MetricCard";

interface PlatformMetrics {
  totalUsers: number;
  totalRestaurants: number;
  activeRestaurants: number;
  totalStaffUsers: number;
  quizzesTaken: number;
  recentQuizzesTaken: number;
  averageScore: number;
  monthlyRecurringRevenue: number;
  retentionRate: number;
  growthRate: number;
}

interface PlatformOverviewCardsProps {
  metrics: PlatformMetrics | null;
  loading: boolean;
}

const PlatformOverviewCards: React.FC<PlatformOverviewCardsProps> = ({
  metrics,
  loading,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Users Card */}
      <MetricCard
        title="Total Users"
        value={metrics?.totalUsers || 0}
        trend={metrics?.growthRate || 0}
        icon={<UsersIcon className="h-8 w-8" />}
        color="blue"
        loading={loading}
      />

      {/* Active Restaurants Card */}
      <MetricCard
        title="Active Restaurants"
        value={metrics?.activeRestaurants || 0}
        subtitle={metrics ? `of ${metrics.totalRestaurants} total` : ""}
        icon={<BuildingStorefrontIcon className="h-8 w-8" />}
        color="green"
        loading={loading}
      />

      {/* Quizzes Taken Card */}
      <MetricCard
        title="Quizzes Taken"
        value={metrics?.quizzesTaken || 0}
        subtitle={metrics ? `${metrics.recentQuizzesTaken} this month` : ""}
        icon={<AcademicCapIcon className="h-8 w-8" />}
        color="purple"
        loading={loading}
      />

      {/* Average Score Card */}
      <MetricCard
        title="Platform Avg Score"
        value={metrics ? `${metrics.averageScore}%` : "0%"}
        icon={<ChartBarIcon className="h-8 w-8" />}
        color="orange"
        loading={loading}
      />
    </div>
  );
};

export default PlatformOverviewCards;
