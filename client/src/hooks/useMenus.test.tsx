import { renderHook, waitFor } from "@testing-library/react";
import { useMenus } from "./useMenus";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { AxiosResponse } from "axios";
import { Menu } from "../types/menuItemTypes";

// Mock dependencies
jest.mock("../services/api");
jest.mock("../context/AuthContext");

// Type assertions for mocks
const mockedApi = api as jest.Mocked<typeof api>;
const mockedUseAuth = useAuth as jest.Mock;

const mockMenusData: Menu[] = [
  { _id: "menu1", name: "Breakfast Menu", description: "Served 7am-11am" },
  { _id: "menu2", name: "Lunch Menu" },
  { _id: "menu3", name: "Dinner Specials", description: "Nightly features" },
];

// User roles for testing
const mockAuthorizedUser = { role: "restaurant" };
const mockUnauthorizedUser = { role: "staff" };

describe("useMenus Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for successful API call
    mockedApi.get.mockResolvedValue({
      data: { menus: mockMenusData },
    } as AxiosResponse<{ menus: Menu[] }>);
    // Default mock for authorized user
    mockedUseAuth.mockReturnValue({ user: mockAuthorizedUser });
  });

  it("should initialize with loading state", () => {
    const { result } = renderHook(() => useMenus());
    expect(result.current.loading).toBe(true);
    expect(result.current.menus).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("should fetch menus successfully for authorized user", async () => {
    const { result } = renderHook(() => useMenus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(mockedApi.get).toHaveBeenCalledWith("/menus");
    expect(result.current.menus).toEqual(mockMenusData);
    expect(result.current.error).toBeNull();
  });

  it("should handle fetch error for authorized user", async () => {
    const errorMessage = "Failed to fetch menus";
    mockedApi.get.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useMenus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(result.current.menus).toEqual([]); // Cleared on error
    expect(result.current.error).toContain(errorMessage);
  });

  it("should deny access for unauthorized user role", async () => {
    mockedUseAuth.mockReturnValue({ user: mockUnauthorizedUser }); // Override auth mock

    const { result } = renderHook(() => useMenus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApi.get).not.toHaveBeenCalled();
    expect(result.current.menus).toEqual([]); // Cleared
    expect(result.current.error).toBe(
      "Access denied. Only restaurant owners can view menus."
    );
  });

  it("should deny access if user is null", async () => {
    mockedUseAuth.mockReturnValue({ user: null }); // Override auth mock

    const { result } = renderHook(() => useMenus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApi.get).not.toHaveBeenCalled();
    expect(result.current.menus).toEqual([]); // Cleared
    expect(result.current.error).toBe(
      "Access denied. Only restaurant owners can view menus."
    );
  });
});
