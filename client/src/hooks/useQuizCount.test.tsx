import { renderHook, waitFor, act } from "@testing-library/react";
import { useQuizCount } from "./useQuizCount";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { AxiosResponse } from "axios";

// Mock dependencies
jest.mock("../services/api");
jest.mock("../context/AuthContext");

// Type assertions for mocks
const mockedApi = api as jest.Mocked<typeof api>;
const mockedUseAuth = useAuth as jest.Mock;

const mockCount = 15;

// User roles for testing
const mockAuthorizedUser = { role: "restaurant" };
const mockUnauthorizedUser = { role: "staff" };

describe("useQuizCount Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for successful API call
    mockedApi.get.mockResolvedValue({
      data: { count: mockCount },
    } as AxiosResponse<{ count: number }>);
    // Default mock for authorized user
    mockedUseAuth.mockReturnValue({ user: mockAuthorizedUser });
  });

  it("should initialize with loading state and zero count", () => {
    const { result } = renderHook(() => useQuizCount());
    expect(result.current.loading).toBe(true);
    expect(result.current.quizCount).toBe(0); // Initial state defined in hook
    expect(result.current.error).toBeNull();
  });

  it("should fetch quiz count successfully for authorized user", async () => {
    const { result } = renderHook(() => useQuizCount());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    // Wait for the fetch to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(mockedApi.get).toHaveBeenCalledWith("/quizzes/count");
    expect(result.current.quizCount).toBe(mockCount);
    expect(result.current.error).toBeNull();
  });

  it("should handle fetch error for authorized user", async () => {
    const errorMessage = "Failed to fetch count";
    mockedApi.get.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useQuizCount());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    // Wait for the fetch to complete and error to be set
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(result.current.quizCount).toBe(0); // Defaults to 0 on error
    expect(result.current.error).toBe("Failed to fetch quiz count.");
  });

  it("should return 0 for unauthorized user role and not call API", async () => {
    mockedUseAuth.mockReturnValue({ user: mockUnauthorizedUser }); // Override auth mock

    const { result } = renderHook(() => useQuizCount());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApi.get).not.toHaveBeenCalled();
    expect(result.current.quizCount).toBe(0);
    expect(result.current.error).toBeNull(); // No error set for unauthorized in this hook
  });

  it("should return 0 if user is null and not call API", async () => {
    mockedUseAuth.mockReturnValue({ user: null }); // Override auth mock

    const { result } = renderHook(() => useQuizCount());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApi.get).not.toHaveBeenCalled();
    expect(result.current.quizCount).toBe(0);
    expect(result.current.error).toBeNull(); // No error set for null user
  });

  it("should refetch quiz count", async () => {
    const { result } = renderHook(() => useQuizCount());

    // Initial fetch will happen, let it resolve first
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Reset mocks for the refetch call, or ensure the previous call is accounted for if checking times
    mockedApi.get.mockClear();
    // If mockResolvedValue was for specific count for this test, re-apply or adjust
    mockedApi.get.mockResolvedValue({ data: { count: 5 } } as AxiosResponse<{
      count: number;
    }>);

    await act(async () => {
      result.current.fetchQuizCount(); // MODIFIED: Changed from refetchQuizCount
    });

    expect(mockedApi.get).toHaveBeenCalledWith("/quizzes/count");
    expect(result.current.quizCount).toBe(5);
    expect(result.current.loading).toBe(false); // MODIFIED: Changed from isLoading
  });
});
