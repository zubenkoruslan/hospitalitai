import { ResultSummary } from "../types/staffTypes"; // Import necessary type

/**
 * Formats an ISO date string into a more readable format.
 * @param dateString - The ISO date string.
 * @param includeTime - Whether to include the time.
 * @returns Formatted date string or 'N/A' or 'Invalid Date'.
 */
export const formatDate = (
  dateString?: string,
  includeTime: boolean = false
): string => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    if (includeTime) {
      options.hour = "numeric";
      options.minute = "2-digit";
      options.hour12 = true; // Use AM/PM
    }
    return date.toLocaleString("en-US", options);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
};

/**
 * Checks if a quiz result status is considered completed.
 * @param result - The quiz result summary.
 * @returns True if the status is 'completed' (case-insensitive).
 */
export const isCompletedQuiz = (result: ResultSummary): boolean => {
  if (!result || !result.status) return false;
  const status = result.status.toLowerCase();
  return status === "completed";
};
