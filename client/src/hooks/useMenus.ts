import { useState, useEffect, useCallback } from "react";
// import api from "../services/api"; // To be replaced
import { getMenusByRestaurant } from "../services/api"; // Import service function
import { useAuth } from "../context/AuthContext";
// Import IMenuClient from menuTypes.ts
import { IMenuClient } from "../types/menuTypes"; // Corrected import path for menu type

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
  menus: IMenuClient[]; // Use IMenuClient type
  loading: boolean;
  error: string | null;
  fetchMenus: (status?: "all" | "active" | "inactive") => void; // Allow status in fetchMenus
}

export function useMenus(
  initialStatus: "all" | "active" | "inactive" = "all" // Default to "all"
): UseMenusReturn {
  const [menus, setMenus] = useState<IMenuClient[]>([]); // Use IMenuClient type
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Add a state for the current status being fetched
  const [currentStatus, setCurrentStatus] = useState<
    "all" | "active" | "inactive"
  >(initialStatus);
  const { user } = useAuth();

  const fetchMenus = useCallback(
    async (statusToFetch: "all" | "active" | "inactive" = currentStatus) => {
      // Use currentStatus as default
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
        // const apiUrl = `/menus/restaurant/${user.restaurantId}`; // Construct URL
        // console.log("Calling API with URL:", apiUrl); // Log the URL

        // Ensure the expected response type matches the actual backend response structure
        // const response = await api.get<{
        //   success: boolean;
        //   count: number;
        //   data: Menu[];
        // }>(
        //   apiUrl // Use the constructed URL
        // );
        // setMenus(response.data.data || []); // Adjusted to access response.data.data
        if (user && user.restaurantId) {
          // Ensure restaurantId is present before calling
          const fetchedMenus = await getMenusByRestaurant(
            user.restaurantId,
            statusToFetch // Pass statusToFetch to the API call
          );
          setMenus(fetchedMenus || []);
          setCurrentStatus(statusToFetch); // Update currentStatus if fetch was successful with a new status
        } else {
          // This case should ideally be caught by the check at the beginning of fetchMenus
          // but as a safeguard if user/restaurantId becomes null between check and call:
          setMenus([]);
          // Optionally set an error, though the initial check should handle it.
        }
      } catch (err: unknown) {
        console.error("Error fetching menus:", err);

        // Type guard for axios error
        const isAxiosError = (
          error: unknown
        ): error is {
          response: { data?: { message?: string } };
        } => {
          return (
            typeof error === "object" && error !== null && "response" in error
          );
        };

        if (isAxiosError(err)) {
          setError(err.response.data?.message || "Failed to fetch menus.");
        } else {
          setError("Failed to fetch menus.");
        }
        setMenus([]);
      } finally {
        setLoading(false);
      }
    },
    [user, currentStatus] // Add currentStatus to dependencies
  );

  useEffect(() => {
    fetchMenus(currentStatus); // Fetch with the currentStatus on mount and when currentStatus changes
  }, [fetchMenus, currentStatus]); // fetchMenus will also change if currentStatus does, so this is a bit redundant but safe

  return { menus, loading, error, fetchMenus };
}
