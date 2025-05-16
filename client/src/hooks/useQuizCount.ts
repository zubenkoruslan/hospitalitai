import { useState, useEffect, useCallback } from "react";
// import api from "../services/api"; // To be replaced
import { getQuizCount } from "../services/api"; // Import service function
import { useAuth } from "../context/AuthContext";

interface UseQuizCountReturn {
  quizCount: number;
  loading: boolean;
  error: string | null;
  fetchQuizCount: () => void;
}

export function useQuizCount(): UseQuizCountReturn {
  const [quizCount, setQuizCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchQuizCount = useCallback(async () => {
    // Assuming only restaurant owners need the total count for their restaurant
    if (!(user && user.role === "restaurant")) {
      // setError('Quiz count is only available for restaurant owners.'); // Or just return 0?
      setQuizCount(0); // Default to 0 if not applicable
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // const response = await api.get<{ count: number }>("/quizzes/count");
      // setQuizCount(response.data.count || 0);
      const count = await getQuizCount(); // Use service function
      setQuizCount(count || 0); // Set data from service
    } catch (err: any) {
      console.error("Error fetching quiz count:", err);
      setError(err.response?.data?.message || "Failed to fetch quiz count.");
      setQuizCount(0); // Default to 0 on error
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchQuizCount();
  }, [fetchQuizCount]);

  return { quizCount, loading, error, fetchQuizCount };
}
