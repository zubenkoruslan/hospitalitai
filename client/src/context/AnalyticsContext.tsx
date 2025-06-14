import React, { createContext, useContext, useCallback } from "react";
import { useCategoriesAnalytics } from "../hooks/useCategoriesAnalytics";

interface AnalyticsContextType {
  refreshAllAnalytics: () => Promise<void>;
  categoriesData: any[];
  loading: boolean;
  error: string | null;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(
  undefined
);

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { categoriesData, loading, error, refreshAnalytics } =
    useCategoriesAnalytics();

  const refreshAllAnalytics = useCallback(async () => {
    console.log("[Analytics Context] Refreshing all analytics data...");
    await refreshAnalytics();

    // Add a small delay to ensure backend cache has been invalidated
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Trigger a page refresh for other analytics data
    // This ensures all analytics on the page are refreshed
    window.dispatchEvent(new CustomEvent("analytics-refresh"));
  }, [refreshAnalytics]);

  return (
    <AnalyticsContext.Provider
      value={{
        refreshAllAnalytics,
        categoriesData,
        loading,
        error,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = (): AnalyticsContextType => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return context;
};
