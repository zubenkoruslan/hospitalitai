import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

// --- Interfaces ---
interface StaffMemberSummary {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
}

// --- Helper Components ---
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-8">
    <svg
      className="animate-spin h-8 w-8 text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  </div>
);

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div
    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4"
    role="alert"
  >
    <strong className="font-bold">Error: </strong>
    <span className="block sm:inline">{message}</span>
  </div>
);

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

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Staff Management
            </h1>
            {/* Placeholder Button */}
            <button
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-50"
              disabled
              aria-label="Add New Staff (disabled)"
            >
              + Add New Staff
            </button>
          </div>

          {loading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} />}

          {!loading && !error && (
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
                          Joined
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">View Details</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {staffList.map((staff) => (
                        <tr key={staff._id} className="hover:bg-gray-50 group">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {/* Clickable Name */}
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
                            {formatDate(staff.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              to={`/staff/${staff._id}`}
                              className="text-indigo-600 hover:text-indigo-900"
                              aria-label={`View details for ${staff.name}`}
                            >
                              Details
                            </Link>
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
        </div>
      </main>
    </div>
  );
};

export default StaffManagement;
