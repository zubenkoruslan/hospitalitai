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
    // Ensure user and restaurantId are available
    if (!user || !user.restaurantId) {
      setError(
        user
          ? "User is not associated with a restaurant."
          : "User not authenticated."
      );
      setLoading(false);
      setMenus([]);
      return;
    }

    // Optional: Role check if needed, e.g., allow 'manager' as well
    // if (!["restaurant", "restaurantAdmin", "manager"].includes(user.role)) {
    //   setError("Access denied. Insufficient role to view menus.");
    //   setLoading(false);
    //   setMenus([]);
    //   return;
    // }

    setLoading(true);
    setError(null);
    try {
      const apiUrl = `/menus/restaurant/${user.restaurantId}`; // Construct URL
      console.log("Calling API with URL:", apiUrl); // Log the URL

      // Ensure the expected response type matches the actual backend response structure
      const response = await api.get<{
        success: boolean;
        count: number;
        data: Menu[];
      }>(
        apiUrl // Use the constructed URL
      );
      setMenus(response.data.data || []); // Adjusted to access response.data.data
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
