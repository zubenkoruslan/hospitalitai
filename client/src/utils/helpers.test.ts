import { formatDate, isCompletedQuiz } from "./helpers";
import { ResultSummary } from "../types/staffTypes";

describe("formatDate", () => {
  it('should return "N/A" for undefined dateString', () => {
    expect(formatDate(undefined)).toBe("N/A");
  });

  it("should format an ISO string to a readable date (Month Day, Year)", () => {
    const isoDate = "2023-10-26T10:00:00.000Z";
    // Expected format can vary slightly based on timezone of the test runner if not careful
    // For UTC input, toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) is consistent
    // Let's assume the test environment is consistent or use a specific mock if it becomes an issue.
    // For now, 'Oct 26, 2023' is typical for 'en-US'.
    expect(formatDate(isoDate)).toBe("Oct 26, 2023");
  });

  it("should format an ISO string to a readable date and time when includeTime is true", () => {
    const isoDate = "2023-10-26T14:35:00.000Z";
    // Example: 'Oct 26, 2023, 2:35 PM' (will depend on local timezone of test runner if not UTC)
    // To make it robust, we might need to mock the Date object's timezone or check parts.
    // For simplicity, we'll check for components that are less timezone-sensitive for now.
    const formatted = formatDate(isoDate, true);
    expect(formatted).toContain("Oct 26, 2023");
    // Time can be tricky due to timezone differences in test environments.
    // If the exact time string is critical, consider mocking Date or using a library to handle timezones.
    // For this example, we'll assume a common format or just check presence of AM/PM.
    expect(formatted).toMatch(/\d{1,2}:\d{2}\s(AM|PM)/);
  });

  it('should return "Invalid Date" for an invalid dateString', () => {
    expect(formatDate("not-a-date")).toBe("Invalid Date");
  });

  it("should handle valid but non-ISO date strings that Date constructor can parse", () => {
    // Note: This relies on Date constructor's parsing, which can be inconsistent.
    // Prefer ISO strings.
    expect(formatDate("10/26/2023")).toBe("Oct 26, 2023");
  });

  it("should format a date at the beginning of a month", () => {
    expect(formatDate("2023-12-01T00:00:00.000Z")).toBe("Dec 1, 2023");
  });

  it("should format a date at the end of a year", () => {
    expect(formatDate("2023-12-31T23:59:59.000Z")).toBe("Dec 31, 2023");
  });

  it("should include time correctly for a date in the morning", () => {
    const formatted = formatDate("2023-01-01T09:05:00.000Z", true);
    expect(formatted).toContain("Jan 1, 2023");
    expect(formatted).toMatch(/9:05\sAM/);
  });

  it("should include time correctly for a date in the afternoon", () => {
    const formatted = formatDate("2023-01-01T17:45:00.000Z", true);
    expect(formatted).toContain("Jan 1, 2023");
    expect(formatted).toMatch(/5:45\sPM/);
  });
});

describe("isCompletedQuiz", () => {
  it('should return true if result status is "completed" (lowercase)', () => {
    const result: ResultSummary = {
      _id: "res1",
      quizId: "q1",
      quizTitle: "Test Quiz",
      score: 100,
      totalQuestions: 10,
      status: "completed",
    };
    expect(isCompletedQuiz(result)).toBe(true);
  });

  it('should return true if result status is "Completed" (mixed case)', () => {
    const result: ResultSummary = {
      _id: "res1",
      quizId: "q1",
      quizTitle: "Test Quiz",
      score: 100,
      totalQuestions: 10,
      status: "Completed",
    };
    expect(isCompletedQuiz(result)).toBe(true);
  });

  it('should return false if result status is not "completed"', () => {
    const result: ResultSummary = {
      _id: "res1",
      quizId: "q1",
      quizTitle: "Test Quiz",
      score: 50,
      totalQuestions: 10,
      status: "in progress",
    };
    expect(isCompletedQuiz(result)).toBe(false);
  });

  it("should return false if result status is undefined", () => {
    const result: Partial<ResultSummary> = {
      _id: "res1",
      quizId: "q1",
      quizTitle: "Test Quiz",
      score: 50,
      totalQuestions: 10,
    }; // status is undefined
    expect(isCompletedQuiz(result as ResultSummary)).toBe(false);
  });

  it("should return false if result itself is null or undefined", () => {
    expect(isCompletedQuiz(null as unknown as ResultSummary)).toBe(false);
    expect(isCompletedQuiz(undefined as unknown as ResultSummary)).toBe(false);
  });
});
