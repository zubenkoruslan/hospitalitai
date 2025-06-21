import { renderHook, waitFor } from "@testing-library/react";
import { useMenuData } from "./useMenuData";
import api from "../services/api"; // Corrected import
import { MenuItem, FOOD_CATEGORIES } from "../types/menuItemTypes";
import { IMenuClient } from "../types/menuTypes"; // Added IMenuClient import
import { AxiosResponse } from "axios";

// Mock the api module
jest.mock("../services/api");

// Type assertion for the mocked module
const mockedApi = api as jest.Mocked<typeof api>;

const mockMenuId = "menu456";

// Added mock Menu details
const mockMenuDetails: IMenuClient = {
  _id: mockMenuId,
  name: "Main Menu",
  description: "Our finest selection",
  restaurantId: "rest123", // Added restaurantId to satisfy IMenuClient
  createdAt: new Date().toISOString(), // Added createdAt to satisfy IMenuClient
  updatedAt: new Date().toISOString(), // Added updatedAt to satisfy IMenuClient
};

const mockMenuItems: MenuItem[] = [
  {
    _id: "item1",
    restaurantId: "rest123", // Keep for MenuItem type consistency
    menuId: mockMenuId,
    name: "Burger",
    itemType: "food",
    category: FOOD_CATEGORIES[0],
    price: 10,
    isGlutenFree: false,
    isDairyFree: false,
    isVegetarian: false,
    isVegan: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "item2",
    restaurantId: "rest123", // Keep for MenuItem type consistency
    menuId: mockMenuId,
    name: "Fries",
    itemType: "food",
    category: FOOD_CATEGORIES[1],
    price: 5,
    isGlutenFree: true,
    isDairyFree: true,
    isVegetarian: true,
    isVegan: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Mock items removed as they were unused in current test scenarios

describe("useMenuData Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the two GET requests the hook makes
    mockedApi.get.mockImplementation((url, config) => {
      if (url === `/menus/${mockMenuId}`) {
        return Promise.resolve({
          data: { menu: mockMenuDetails },
        } as AxiosResponse<{ menu: IMenuClient }>);
      } else if (url === "/items" && config?.params?.menuId === mockMenuId) {
        return Promise.resolve({
          data: { items: mockMenuItems },
        } as AxiosResponse<{ items: MenuItem[] }>);
      } else {
        return Promise.reject(new Error(`Unexpected API call to ${url}`));
      }
    });
    // Removed mocks for post, put, delete
  });

  it("should initialize with loading state and fetch items and details", async () => {
    const { result } = renderHook(() => useMenuData(mockMenuId));

    expect(result.current.loading).toBe(true);
    expect(result.current.items).toEqual([]);
    expect(result.current.menuDetails).toBeNull(); // Check initial menuDetails
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check API calls
    expect(mockedApi.get).toHaveBeenCalledTimes(2); // Makes two calls now
    expect(mockedApi.get).toHaveBeenCalledWith(`/menus/${mockMenuId}`);
    expect(mockedApi.get).toHaveBeenCalledWith("/items", {
      params: { menuId: mockMenuId },
    });

    // Check final state
    expect(result.current.items).toEqual(mockMenuItems);
    expect(result.current.menuDetails).toEqual(mockMenuDetails); // Check final menuDetails
    expect(result.current.error).toBeNull();
  });

  it("should handle fetch error for menu details", async () => {
    const errorMessage = "Failed to fetch menu details";
    // Make the first call (menu details) fail
    mockedApi.get.mockImplementation((url) => {
      if (url === `/menus/${mockMenuId}`) {
        return Promise.reject(new Error(errorMessage));
      } else {
        // Let the items call succeed (or fail, doesn't matter much once first failed)
        return Promise.resolve({
          data: { items: mockMenuItems },
        } as AxiosResponse<{ items: MenuItem[] }>);
      }
    });

    // Pass only menuId
    const { result } = renderHook(() => useMenuData(mockMenuId));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApi.get).toHaveBeenCalledTimes(2); // Both calls are attempted by Promise.all
    expect(result.current.items).toEqual([]); // State is reset on error
    expect(result.current.menuDetails).toBeNull(); // State is reset on error
    expect(result.current.error).toContain(errorMessage);
  });

  it("should handle fetch error for menu items", async () => {
    const errorMessage = "Failed to fetch menu items";
    // Make the second call (menu items) fail
    mockedApi.get.mockImplementation((url, config) => {
      if (url === `/menus/${mockMenuId}`) {
        return Promise.resolve({
          data: { menu: mockMenuDetails },
        } as AxiosResponse<{ menu: IMenuClient }>);
      } else if (url === "/items" && config?.params?.menuId === mockMenuId) {
        return Promise.reject(new Error(errorMessage));
      } else {
        return Promise.reject(new Error(`Unexpected API call to ${url}`));
      }
    });

    // Pass only menuId
    const { result } = renderHook(() => useMenuData(mockMenuId));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApi.get).toHaveBeenCalledTimes(2);
    expect(result.current.items).toEqual([]); // State is reset on error
    expect(result.current.menuDetails).toBeNull(); // State is reset on error
    expect(result.current.error).toContain(errorMessage);
  });

  it("should handle missing menuId", () => {
    const { result } = renderHook(() => useMenuData(undefined));

    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual([]);
    expect(result.current.menuDetails).toBeNull();
    expect(result.current.error).toBe("Menu ID is missing.");
    expect(mockedApi.get).not.toHaveBeenCalled();
  });

  // Removed mutation tests section
});
