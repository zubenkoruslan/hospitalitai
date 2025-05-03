import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
// Import shared Menu type
import { Menu } from "../types/menuItemTypes";

// Define a minimal Menu interface needed by the hook/dashboard
// Consider moving to a shared types file if used elsewhere
/* // Removed local definition
interface MenuSummary {
  _id: string;
  name: string; // Include name if needed for display/listing
  // Add other fields if necessary (e.g., description, itemCount)
}
*/

interface UseMenusReturn {
  menus: Menu[]; // Use imported Menu type
  loading: boolean;
  error: string | null;
  fetchMenus: () => void;
}

export function useMenus(): UseMenusReturn {
  const [menus, setMenus] = useState<Menu[]>([]); // Use imported Menu type
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchMenus = useCallback(async () => {
    // Assuming only restaurant owners can fetch the full menu list
    if (!(user && user.role === "restaurant")) {
      setError("Access denied. Only restaurant owners can view menus.");
      setLoading(false);
      setMenus([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Adjust the expected response structure based on your API
      const response = await api.get<{ menus: Menu[] }>("/menus"); // Expect Menu[]
      setMenus(response.data.menus || []);
    } catch (err: any) {
      console.error("Error fetching menus:", err);
      setError(err.response?.data?.message || "Failed to fetch menus.");
      setMenus([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  return { menus, loading, error, fetchMenus };
}
