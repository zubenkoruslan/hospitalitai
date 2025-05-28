import { useState, useEffect, useCallback } from "react";
// import api from "../services/api"; // To be replaced
import { getMenuWithItems } from "../services/api"; // Import service function
// import { Menu, MenuItem } from "../types/menuItemTypes"; // Menu is incorrect here
import { MenuItem } from "../types/menuItemTypes";
import { IMenuClient /*, IMenuWithItemsClient */ } from "../types/menuTypes"; // Import correct menu types

interface UseMenuDataReturn {
  menuDetails: IMenuClient | null; // Use IMenuClient
  items: MenuItem[];
  loading: boolean;
  error: string | null;
  fetchData: () => void;
  clearError: () => void;
}

// This interface might be redundant if getMenuWithItems directly returns IMenuWithItemsClient
// interface MenuWithItemsResponse { ... }

export function useMenuData(menuId: string | undefined): UseMenuDataReturn {
  const [menuDetails, setMenuDetails] = useState<IMenuClient | null>(null); // Use IMenuClient
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    console.log("[useMenuData] fetchData CALLED. Current menuId:", menuId); // Log 1: Is fetchData even called?

    if (!menuId) {
      setError("Menu ID is missing.");
      setLoading(false);
      setMenuDetails(null);
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);
    // console.log(`[useMenuData] Fetching data for menuId: ${menuId}`);
    console.log(
      `[useMenuData] PRE-TRY: Attempting to fetch for menuId: ${menuId}`
    ); // Log 2: Just before the try block
    try {
      // const response = await api.get<MenuWithItemsResponse>(`/menus/${menuId}`);
      const menuWithItemsData = await getMenuWithItems(menuId); // Use service function

      console.log(
        // Log 3: The original log for received data
        "[useMenuData] menuWithItemsData received:",
        JSON.stringify(menuWithItemsData, null, 2)
      );

      if (menuWithItemsData) {
        const { items: fetchedItems, ...menuData } = menuWithItemsData;
        console.log(
          "[useMenuData] Destructured menuData:",
          JSON.stringify(menuData, null, 2)
        );
        console.log(
          "[useMenuData] Destructured fetchedItems:",
          JSON.stringify(fetchedItems, null, 2)
        );

        setMenuDetails(menuData); // menuData is IMenuClient from IMenuWithItemsClient
        setItems(fetchedItems || []);
      } else {
        setError("Menu data not found or error in fetching.");
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
    console.log(
      "[useMenuData] useEffect triggering fetchData. Current menuId:",
      menuId
    ); // Log for useEffect
    fetchData();
  }, [fetchData]); // Re-fetch if menuId changes (fetchData dependency includes menuId)

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { menuDetails, items, loading, error, fetchData, clearError };
}
