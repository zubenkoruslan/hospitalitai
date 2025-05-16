import { useState, useEffect, useCallback } from "react";
// import api from "../services/api"; // To be replaced by specific service import
import { getStaffList } from "../services/api"; // Import the specific service function
import { StaffMemberWithData } from "../types/staffTypes";
import { useAuth } from "../context/AuthContext";

interface UseStaffSummaryReturn {
  staffData: StaffMemberWithData[];
  loading: boolean;
  error: string | null;
  fetchStaffData: () => void; // Function to manually trigger a refresh
}

export function useStaffSummary(): UseStaffSummaryReturn {
  const [staffData, setStaffData] = useState<StaffMemberWithData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth(); // Access user to ensure role/auth

  const fetchStaffData = useCallback(async () => {
    // Only fetch if user is a restaurant owner
    if (!(user && user.role === "restaurant")) {
      setError("Access denied. Only restaurant owners can view staff data.");
      setLoading(false);
      setStaffData([]); // Clear data on access denial
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // const response = await api.get<{ staff: StaffMemberWithData[] }>(
      //   "/staff"
      // );
      // setStaffData(response.data.staff || []);
      const fetchedStaff = await getStaffList(); // Use the service function
      setStaffData(fetchedStaff || []); // Set data from service function response
    } catch (err: any) {
      console.error("Error fetching staff summary data:", err);
      setError(err.response?.data?.message || "Failed to fetch staff data.");
      setStaffData([]); // Clear data on error
    } finally {
      setLoading(false);
    }
  }, [user]); // Dependency is user, ensures fetch runs on login/logout

  // Initial fetch on mount and when user changes
  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  return { staffData, loading, error, fetchStaffData };
}
