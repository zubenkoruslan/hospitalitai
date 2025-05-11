import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { Menu, MenuItem } from "../types/menuItemTypes"; // Import shared types

interface UseMenuDataReturn {
  menuDetails: Menu | null;
  items: MenuItem[];
  loading: boolean;
  error: string | null;
  fetchData: () => void;
}

// Define the expected response structure from the single API call
interface MenuWithItemsResponse {
  success: boolean;
  data: Menu & { items: MenuItem[] }; // Menu details are at the root of 'data', with an 'items' array inside
}

export function useMenuData(menuId: string | undefined): UseMenuDataReturn {
  const [menuDetails, setMenuDetails] = useState<Menu | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!menuId) {
      setError("Menu ID is missing.");
      setLoading(false);
      setMenuDetails(null);
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);
    console.log(`[useMenuData] Fetching data for menuId: ${menuId}`);
    try {
      // Single API call to fetch menu details and its items
      const response = await api.get<MenuWithItemsResponse>(`/menus/${menuId}`);

      if (response.data && response.data.success && response.data.data) {
        const { items: fetchedItems, ...menuData } = response.data.data;
        setMenuDetails(menuData as Menu); // Cast because ...menuData will be of type Menu
        setItems(fetchedItems || []);
      } else {
        // Handle cases where the response structure is not as expected
        // or success is false
        const message =
          response.data?.success === false
            ? "API request was not successful."
            : "Menu data is not in the expected format or is missing.";
        console.error("Error fetching or processing menu data:", response.data);
        setError(message);
        setMenuDetails(null);
        setItems([]);
      }
    } catch (err: any) {
      console.error(`Error fetching data for menu ${menuId}:`, err);
      let errorMessage = "Failed to fetch menu data.";
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setMenuDetails(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [menuId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]); // Re-fetch if menuId changes (fetchData dependency includes menuId)

  return { menuDetails, items, loading, error, fetchData };
}
