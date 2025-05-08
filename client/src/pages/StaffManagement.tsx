import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";

// --- Interfaces ---
interface StaffMemberSummary {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  professionalRole?: string;
}

// --- Main Component ---
const StaffManagement: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffMemberSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStaff = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<{ staff: StaffMemberSummary[] }>(
          "/staff"
        );
        setStaffList(response.data.staff || []);
      } catch (err: any) {
        console.error("Error fetching staff list:", err);
        setError(err.response?.data?.message || "Failed to load staff data.");
        setStaffList([]);
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === "restaurant") {
      fetchStaff();
    } else {
      setError("Access Denied. Only restaurant owners can view this page.");
      setLoading(false);
    }
  }, [user]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "Invalid Date";
    }
  };

  // --- Delete Handler ---
  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    // Confirmation dialog
    if (
      !window.confirm(
        `Are you sure you want to delete ${staffName}? This action cannot be undone.`
      )
    ) {
      return;
    }

    // Set loading state specifically for this row? (Optional, more complex)
    // For now, rely on the main loading state if needed, or just update UI optimistically/on success.

    try {
      await api.delete(`/staff/${staffId}`);
      // Update UI: Remove the deleted staff member from the list
      setStaffList((prevList) =>
        prevList.filter((staff) => staff._id !== staffId)
      );
      // Optionally show a success message (e.g., using a toast notification library)
      console.log(`Successfully deleted ${staffName}`);
    } catch (err: any) {
      console.error(`Error deleting staff member ${staffName}:`, err);
      // Display error message to the user
      setError(err.response?.data?.message || `Failed to delete ${staffName}.`);
      // Clear error after a few seconds (optional)
      setTimeout(() => setError(null), 5000);
    }
  };

  if (loading && staffList.length === 0 && !error) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <LoadingSpinner message="Loading staff list..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Staff Management
          </h1>
          {/* Add New Staff Button Removed */}
          {/* <button
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-50"
            disabled
            aria-label="Add New Staff (disabled)"
          >
            + Add New Staff
          </button> */}
        </div>

        {error && <ErrorMessage message={error} />}

        {loading && staffList.length > 0 ? (
          <div className="text-center py-10">
            <LoadingSpinner message="Refreshing staff list..." />
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            {staffList.length > 0 ? (
              <div className="overflow-x-auto">
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
                        Role
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Joined
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {staffList.map((staff) => (
                      <tr key={staff._id} className="hover:bg-gray-50 group">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <Link
                            to={`/staff/${staff._id}`}
                            className="text-blue-600 hover:text-blue-800 group-hover:underline"
                            aria-label={`View details for ${staff.name}`}
                          >
                            {staff.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {staff.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {staff.professionalRole || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(staff.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <Button
                            variant="destructive"
                            onClick={() =>
                              handleDeleteStaff(staff._id, staff.name)
                            }
                            className="text-xs px-2 py-1"
                            aria-label={`Delete ${staff.name}`}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-6 px-4">
                No staff members found.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default StaffManagement;
