import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

// Define interface for staff member data
interface StaffMember {
  _id: string;
  name: string;
  email: string;
  createdAt: string; // Or Date if you parse it
}

const RestaurantDashboard: React.FC = () => {
  const { user, isLoading: authIsLoading, logout } = useAuth();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState<boolean>(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  console.log("User object in RestaurantDashboard:", user);

  // Fetch staff when component mounts and user is available
  useEffect(() => {
    const fetchStaff = async () => {
      // Ensure user is loaded and is a restaurant owner with an ID
      if (user && user.role === "restaurant" && user.restaurantId) {
        setStaffLoading(true);
        setStaffError(null);
        try {
          // Use the imported api instance which includes the token interceptor
          const response = await api.get<{ staff: StaffMember[] }>(
            "/auth/staff"
          );
          setStaffList(response.data.staff || []);
        } catch (err: any) {
          console.error("Error fetching staff:", err);
          setStaffError(
            err.response?.data?.message || "Failed to load staff list."
          );
          setStaffList([]); // Clear list on error
        } finally {
          setStaffLoading(false);
        }
      }
    };

    // Only run fetch if auth is not loading
    if (!authIsLoading) {
      fetchStaff();
    }
    // Dependency array includes user to refetch if user context changes
    // (e.g., after login), and authIsLoading to wait for context
  }, [user, authIsLoading]);

  // Basic loading state
  if (authIsLoading) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  // Ensure user is logged in and is a restaurant owner/manager
  // (You might add more robust role checking based on your needs)
  if (!user || user.role !== "restaurant") {
    // Redirect to login or show an error/different view
    // For now, just show a simple message
    return <div className="p-8">Access denied or user not found.</div>;
  }

  const restaurantId = user.restaurantId;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="mb-8 flex justify-between items-center flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {user.restaurantName
              ? `${user.restaurantName}`
              : "Restaurant Dashboard"}
          </h1>
          <p className="text-lg text-gray-600">Welcome, {user.name}!</p>
        </div>
        <button
          onClick={logout}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
        >
          Log Out
        </button>
      </header>

      {/* Section to display Restaurant ID */}
      {restaurantId && (
        <section className="mb-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">
            Your Restaurant ID
          </h2>
          <p className="text-gray-600 mb-4">
            Share this ID with your staff members so they can register and join
            your restaurant on the platform.
          </p>
          <div className="bg-gray-100 p-4 rounded">
            <p className="text-lg font-mono text-gray-800 break-all">
              {restaurantId}
            </p>
          </div>
          {/* Optional: Add a copy button here */}
        </section>
      )}

      {/* Staff List Section */}
      <section className="mb-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Staff Members ({staffList.length})
        </h2>
        {staffLoading && <p className="text-gray-500">Loading staff...</p>}
        {staffError && <p className="text-red-500">Error: {staffError}</p>}
        {!staffLoading && !staffError && (
          <div className="overflow-x-auto">
            {staffList.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Email
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staffList.map((staff) => (
                    <tr key={staff._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {staff.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {staff.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(staff.createdAt).toLocaleDateString()}{" "}
                        {/* Format date */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500">No staff members found.</p>
            )}
          </div>
        )}
      </section>

      {/* Placeholders for other sections */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Example Stat Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Active Staff
          </h3>
          <p className="text-3xl font-bold text-gray-900">0</p>{" "}
          {/* Placeholder */}
        </div>

        {/* Example Action Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Manage Staff
          </h3>
          <button className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out">
            View Staff
          </button>
        </div>

        {/* Add more cards for Quizzes, Menus, Settings etc. */}
      </section>
    </div>
  );
};

export default RestaurantDashboard;
