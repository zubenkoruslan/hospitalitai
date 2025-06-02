import { useState, useEffect, useCallback } from "react";
import { getCategoriesAnalytics, CategoryAnalytics } from "../services/api";
import { useAuth } from "../context/AuthContext";

interface UseCategoriesAnalyticsReturn {
  categoriesData: CategoryAnalytics[];
  loading: boolean;
  error: string | null;
  fetchCategoriesData: () => void;
}

export function useCategoriesAnalytics(): UseCategoriesAnalyticsReturn {
  const [categoriesData, setCategoriesData] = useState<CategoryAnalytics[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCategoriesData = useCallback(async () => {
    // Only fetch if user is a restaurant owner
    if (!(user && user.role === "restaurant")) {
      setError(
        "Access denied. Only restaurant owners can view analytics data."
      );
      setLoading(false);
      setCategoriesData([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fetchedData = await getCategoriesAnalytics();
      setCategoriesData(fetchedData || []);
    } catch (err: any) {
      console.error("Error fetching categories analytics data:", err);
      setError(
        err.response?.data?.message ||
          "Failed to fetch categories analytics data."
      );
      setCategoriesData([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch on mount and when user changes
  useEffect(() => {
    fetchCategoriesData();
  }, [fetchCategoriesData]);

  return { categoriesData, loading, error, fetchCategoriesData };
}
