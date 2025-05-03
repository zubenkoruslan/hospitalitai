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
    try {
      // Fetch both in parallel
      const [menuDetailsResponse, itemsResponse] = await Promise.all([
        api.get<{ menu: Menu }>(`/menus/${menuId}`),
        api.get<{ items: MenuItem[] }>("/items", { params: { menuId } }),
      ]);

      setMenuDetails(menuDetailsResponse.data.menu || null);
      setItems(itemsResponse.data.items || []);
    } catch (err: any) {
      console.error(`Error fetching data for menu ${menuId}:`, err);
      setError(err.response?.data?.message || "Failed to fetch menu data.");
      setMenuDetails(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [menuId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]); // Re-fetch if menuId changes

  return { menuDetails, items, loading, error, fetchData };
}
