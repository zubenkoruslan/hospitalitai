import { useState, useEffect, useCallback } from "react";
import { getCategoriesAnalytics, CategoryAnalytics } from "../services/api";
import { useAuth } from "../context/AuthContext";

interface UseCategoriesAnalyticsReturn {
  categoriesData: CategoryAnalytics[];
  loading: boolean;
  error: string | null;
  fetchCategoriesData: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;
}

export const useCategoriesAnalytics = (): UseCategoriesAnalyticsReturn => {
  const [categoriesData, setCategoriesData] = useState<CategoryAnalytics[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCategoriesData = useCallback(async () => {
    if (!user?.restaurantId) {
      setError("No restaurant ID available");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log("[Categories Analytics] Fetching analytics data...");

      const data = await getCategoriesAnalytics();
      setCategoriesData(data);

      console.log(
        "[Categories Analytics] Successfully fetched analytics data:",
        data
      );
    } catch (err) {
      console.error("[Categories Analytics] Error fetching analytics:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch analytics"
      );
      setCategoriesData([]);
    } finally {
      setLoading(false);
    }
  }, [user?.restaurantId]);

  // Alias for refreshAnalytics to maintain backward compatibility
  const refreshAnalytics = useCallback(async () => {
    console.log("[Categories Analytics] Manually refreshing analytics data...");
    await fetchCategoriesData();
  }, [fetchCategoriesData]);

  useEffect(() => {
    fetchCategoriesData();
  }, [fetchCategoriesData]);

  // Listen for analytics refresh events
  useEffect(() => {
    const handleAnalyticsRefresh = () => {
      console.log(
        "[Categories Analytics] Received analytics refresh event, refetching data..."
      );
      fetchCategoriesData();
    };

    window.addEventListener("analytics-refresh", handleAnalyticsRefresh);

    return () => {
      window.removeEventListener("analytics-refresh", handleAnalyticsRefresh);
    };
  }, [fetchCategoriesData]);

  return {
    categoriesData,
    loading,
    error,
    fetchCategoriesData,
    refreshAnalytics,
  };
};
