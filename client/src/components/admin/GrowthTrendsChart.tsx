import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  ArrowTrendingUpIcon,
  UsersIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";

interface GrowthDataPoint {
  date: string;
  restaurants: number;
  staff: number;
  total: number;
  newRestaurants: number;
  newStaff: number;
  newTotal: number;
  growthRate?: number;
}

interface GrowthTrendsChartProps {
  data: GrowthDataPoint[];
  loading: boolean;
}

const GrowthTrendsChart: React.FC<GrowthTrendsChartProps> = ({
  data,
  loading,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-80 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  // Format data for display
  const chartData = data.map((item) => ({
    ...item,
    month: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    }),
  }));

  // Calculate summary stats
  const totalGrowth =
    data.length > 1
      ? (data[data.length - 1]?.total || 0) - (data[0]?.total || 0)
      : 0;

  const avgMonthlyGrowth =
    data.reduce((sum, item) => sum + (item.growthRate || 0), 0) / data.length;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            User Growth Trends
          </h3>
          <p className="text-sm text-gray-600">
            Monthly user growth across restaurants and staff
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="flex items-center gap-2 text-blue-600">
              <ArrowTrendingUpIcon className="h-5 w-5" />
              <span className="text-lg font-semibold">
                {totalGrowth > 0 ? "+" : ""}
                {totalGrowth}
              </span>
            </div>
            <p className="text-xs text-gray-500">Total Growth</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-2 text-green-600">
              <UsersIcon className="h-5 w-5" />
              <span className="text-lg font-semibold">
                {avgMonthlyGrowth.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-gray-500">Avg Monthly</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="space-y-8">
        {/* Cumulative Growth Line Chart */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-4">
            Cumulative User Growth
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" fontSize={12} tick={{ fill: "#6b7280" }} />
              <YAxis fontSize={12} tick={{ fill: "#6b7280" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                name="Total Users"
              />
              <Line
                type="monotone"
                dataKey="restaurants"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", strokeWidth: 2, r: 3 }}
                name="Restaurants"
              />
              <Line
                type="monotone"
                dataKey="staff"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 3 }}
                name="Staff Users"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly New Users Bar Chart */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-4">
            Monthly New User Additions
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" fontSize={12} tick={{ fill: "#6b7280" }} />
              <YAxis fontSize={12} tick={{ fill: "#6b7280" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend />
              <Bar
                dataKey="newRestaurants"
                fill="#10b981"
                name="New Restaurants"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="newStaff"
                fill="#3b82f6"
                name="New Staff"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Growth Rate Indicators */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <BuildingStorefrontIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Restaurants
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {data[data.length - 1]?.restaurants || 0}
            </div>
            <div className="text-xs text-blue-600">
              +{data[data.length - 1]?.newRestaurants || 0} this month
            </div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <UsersIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">
                Staff Users
              </span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {data[data.length - 1]?.staff || 0}
            </div>
            <div className="text-xs text-green-600">
              +{data[data.length - 1]?.newStaff || 0} this month
            </div>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ArrowTrendingUpIcon className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">
                Growth Rate
              </span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {data[data.length - 1]?.growthRate?.toFixed(1) || 0}%
            </div>
            <div className="text-xs text-purple-600">month-over-month</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrowthTrendsChart;
