import { renderHook, waitFor } from "@testing-library/react";
import { useStaffDetails } from "./useStaffDetails";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { AxiosResponse } from "axios";
import { StaffDetailsData } from "../types/staffTypes";

// Mock dependencies
jest.mock("../services/api");
jest.mock("../context/AuthContext");

// Type assertions for mocks
const mockedApi = api as jest.Mocked<typeof api>;
const mockedUseAuth = useAuth as jest.Mock;

const mockStaffId = "staff123";

const mockStaffDetails: StaffDetailsData = {
  _id: mockStaffId,
  name: "John Doe",
  email: "john.doe@example.com",
  createdAt: new Date().toISOString(),
  professionalRole: "Chef",
  aggregatedQuizPerformance: [],
  averageScore: 80,
};

// Default authorized user for most tests
const mockAuthorizedUser = { role: "restaurant" };
const mockUnauthorizedUser = { role: "staff" }; // Example unauthorized

describe("useStaffDetails Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for successful API call
    mockedApi.get.mockResolvedValue({
      data: { staff: mockStaffDetails },
    } as AxiosResponse<{ staff: StaffDetailsData }>);
    // Default mock for authorized user
    mockedUseAuth.mockReturnValue({ user: mockAuthorizedUser });
  });

  it("should initialize with loading state", () => {
    const { result } = renderHook(() => useStaffDetails(mockStaffId));
    expect(result.current.loading).toBe(true);
    expect(result.current.staffDetails).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should fetch staff details successfully for authorized user", async () => {
    const { result } = renderHook(() => useStaffDetails(mockStaffId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(mockedApi.get).toHaveBeenCalledWith(`/staff/${mockStaffId}`);
    expect(result.current.staffDetails).toEqual(mockStaffDetails);
    expect(result.current.error).toBeNull();
  });

  it("should handle fetch error for authorized user", async () => {
    const errorMessage = "Failed to fetch";
    mockedApi.get.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useStaffDetails(mockStaffId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(result.current.staffDetails).toBeNull();
    expect(result.current.error).toContain(errorMessage);
  });

  it("should deny access for unauthorized user", async () => {
    mockedUseAuth.mockReturnValue({ user: mockUnauthorizedUser }); // Override auth mock

    const { result } = renderHook(() => useStaffDetails(mockStaffId));

    // Hook might finish loading quickly as it returns early
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApi.get).not.toHaveBeenCalled(); // API call should not be made
    expect(result.current.staffDetails).toBeNull();
    expect(result.current.error).toBe(
      "Access denied. Only restaurant owners can view staff details."
    );
  });

  it("should deny access if user is null", async () => {
    mockedUseAuth.mockReturnValue({ user: null }); // Override auth mock

    const { result } = renderHook(() => useStaffDetails(mockStaffId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApi.get).not.toHaveBeenCalled();
    expect(result.current.staffDetails).toBeNull();
    expect(result.current.error).toBe(
      "Access denied. Only restaurant owners can view staff details."
    );
  });

  it("should handle missing staffId", () => {
    const { result } = renderHook(() => useStaffDetails(undefined));

    expect(result.current.loading).toBe(false); // Should finish loading immediately
    expect(result.current.staffDetails).toBeNull();
    expect(result.current.error).toBe("Staff ID is missing.");
    expect(mockedApi.get).not.toHaveBeenCalled();
  });
});
