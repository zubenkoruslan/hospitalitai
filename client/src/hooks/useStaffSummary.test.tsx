import { renderHook, waitFor } from "@testing-library/react";
import { useStaffSummary } from "./useStaffSummary";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { StaffMemberWithData } from "../types/staffTypes";
import { AxiosResponse } from "axios";

// Mock dependencies
jest.mock("../services/api");
jest.mock("../context/AuthContext");

// Type assertions for mocks
const mockedApi = api as jest.Mocked<typeof api>;
const mockedUseAuth = useAuth as jest.Mock;

const mockStaffSummaryData: StaffMemberWithData[] = [
  {
    _id: "staff1",
    name: "Alice",
    email: "alice@example.com",
    professionalRole: "Server",
    createdAt: new Date().toISOString(),
    averageScore: 85,
    quizzesTaken: 5,
    resultsSummary: [
      {
        _id: "result1",
        quizId: "quizA",
        quizTitle: "Safety Intro",
        score: 8,
        totalQuestions: 10,
        completedAt: new Date().toISOString(),
        status: "completed",
        retakeCount: 0,
      },
    ],
  },
  {
    _id: "staff2",
    name: "Bob",
    email: "bob@example.com",
    professionalRole: "Chef",
    createdAt: new Date().toISOString(),
    averageScore: 92,
    quizzesTaken: 8,
    resultsSummary: [
      {
        _id: "result2",
        quizId: "quizB",
        quizTitle: "Advanced Techniques",
        score: 9,
        totalQuestions: 10,
        completedAt: new Date().toISOString(),
        status: "completed",
        retakeCount: 1,
      },
      {
        _id: "result3",
        quizId: "quizA",
        quizTitle: "Safety Intro",
        score: 10,
        totalQuestions: 10,
        completedAt: new Date(Date.now() - 86400000).toISOString(),
        status: "completed",
        retakeCount: 0,
      },
    ],
  },
];

// User roles for testing
const mockAuthorizedUser = { role: "restaurant" };
const mockUnauthorizedUser = { role: "staff" };

describe("useStaffSummary Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for successful API call
    mockedApi.get.mockResolvedValue({
      data: { staff: mockStaffSummaryData },
    } as AxiosResponse<{ staff: StaffMemberWithData[] }>);
    // Default mock for authorized user
    mockedUseAuth.mockReturnValue({ user: mockAuthorizedUser });
  });

  it("should initialize with loading state", () => {
    const { result } = renderHook(() => useStaffSummary());
    expect(result.current.loading).toBe(true);
    expect(result.current.staffData).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("should fetch staff summary successfully for authorized user", async () => {
    const { result } = renderHook(() => useStaffSummary());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(mockedApi.get).toHaveBeenCalledWith("/staff");
    expect(result.current.staffData).toEqual(mockStaffSummaryData);
    expect(result.current.error).toBeNull();
  });

  it("should handle fetch error for authorized user", async () => {
    const errorMessage = "Failed to fetch staff data";
    mockedApi.get.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useStaffSummary());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(result.current.staffData).toEqual([]); // Data cleared on error
    expect(result.current.error).toContain(errorMessage);
  });

  it("should deny access for unauthorized user role", async () => {
    mockedUseAuth.mockReturnValue({ user: mockUnauthorizedUser }); // Override auth mock

    const { result } = renderHook(() => useStaffSummary());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApi.get).not.toHaveBeenCalled();
    expect(result.current.staffData).toEqual([]); // Data cleared
    expect(result.current.error).toBe(
      "Access denied. Only restaurant owners can view staff data."
    );
  });

  it("should deny access if user is null", async () => {
    mockedUseAuth.mockReturnValue({ user: null }); // Override auth mock

    const { result } = renderHook(() => useStaffSummary());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApi.get).not.toHaveBeenCalled();
    expect(result.current.staffData).toEqual([]); // Data cleared
    expect(result.current.error).toBe(
      "Access denied. Only restaurant owners can view staff data."
    );
  });
});
