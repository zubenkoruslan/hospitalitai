import { useState, useEffect, useCallback } from "react";
// import api from "../services/api"; // To be replaced
import { getStaffDetails } from "../services/api"; // Import service function
import { useAuth } from "../context/AuthContext";
// Import types from shared file
import {
  StaffDetailsData,
  // QuizResultDetails, // Removed
  // IncorrectQuestionDetail,
} from "../types/staffTypes";

// Define necessary interfaces within the hook for now
// TODO: Move these to a shared types file (e.g., staffTypes.ts or quizTypes.ts)
/* // Removed local definitions
interface IncorrectQuestionDetail {
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
}

export interface QuizResultDetails {
  _id: string; // Use string for frontend consistency
  quizId: string;
  quizTitle: string;
  completedAt?: string;
  score: number;
  totalQuestions: number;
  retakeCount: number;
  incorrectQuestions: IncorrectQuestionDetail[];
}

export interface StaffDetailsData {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  professionalRole?: string;
  quizResults: QuizResultDetails[];
  averageScore: number | null;
  // Add other fields returned by /api/staff/:id if necessary
}
*/

interface UseStaffDetailsReturn {
  staffDetails: StaffDetailsData | null;
  loading: boolean;
  error: string | null;
  fetchStaffDetails: () => void;
}

export function useStaffDetails(
  staffId: string | undefined
): UseStaffDetailsReturn {
  const [staffDetails, setStaffDetails] = useState<StaffDetailsData | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth(); // Needed for role check?

  const fetchStaffDetails = useCallback(async () => {
    if (!staffId) {
      setError("Staff ID is missing.");
      setLoading(false);
      setStaffDetails(null);
      return;
    }

    // Optional: Check if the current user is authorized (e.g., restaurant owner)
    if (!(user && user.role === "restaurant")) {
      // Handle unauthorized access - depends on requirements
      // Option 1: Set error
      setError("Access denied. Only restaurant owners can view staff details.");
      // Option 2: Silently fail or return null data?
      setStaffDetails(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // const response = await api.get<{ staff: StaffDetailsData }>(
      //   `/staff/${staffId}`
      // );
      // setStaffDetails(response.data.staff || null);
      const details = await getStaffDetails(staffId);
      setStaffDetails(details || null);
    } catch (err: unknown) {
      console.error(`Error fetching details for staff ${staffId}:`, err);

      // Type guard for axios error
      const isAxiosError = (
        error: unknown
      ): error is {
        response: { data?: { message?: string } };
      } => {
        return (
          typeof error === "object" && error !== null && "response" in error
        );
      };

      if (isAxiosError(err)) {
        setError(
          err.response.data?.message || "Failed to fetch staff details."
        );
      } else {
        setError("Failed to fetch staff details.");
      }
      setStaffDetails(null);
    } finally {
      setLoading(false);
    }
  }, [staffId, user]); // Dependency on user for auth check

  useEffect(() => {
    fetchStaffDetails();
  }, [fetchStaffDetails]); // Re-fetch if staffId or user changes

  return { staffDetails, loading, error, fetchStaffDetails };
}
