import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  getStaffList,
  deleteStaffMember,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  updateStaffAssignedRole,
  inviteStaff,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import Card from "../components/common/Card";
import KPICard from "../components/settings/KPICard";
import {
  StaffMemberWithData,
  SortField,
  SortDirection,
} from "../types/staffTypes";
import { IRole } from "../types/roleTypes";
import RoleFormModal from "../components/common/RoleFormModal";

// Helper function to format percentages
const formatPercentage = (value: number | null) =>
  value === null ? "N/A" : `${value.toFixed(1)}%`;

// Helper function to calculate staff completion rate (restored)
const calculateStaffCompletionRate = (staff: StaffMemberWithData): number => {
  if (staff.quizProgressSummaries && staff.quizProgressSummaries.length > 0) {
    const completedCount = staff.quizProgressSummaries.filter(
      (qps) => qps.isCompletedOverall
    ).length;
    return (completedCount / staff.quizProgressSummaries.length) * 100;
  }
  return 0;
};

const StaffManagement: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffMemberWithData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [rolesList, setRolesList] = useState<IRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState<boolean>(true);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [roleSubmitLoading, setRoleSubmitLoading] = useState<boolean>(false);
  const [assignRoleLoading, setAssignRoleLoading] = useState<string | null>(
    null
  );

  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [currentRole, setCurrentRole] = useState<IRole | null>(null);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Filtering state
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null); // null means all roles

  const { user } = useAuth();

  const clearMessages = () => {
    setMessage(null);
    setError(null);
    setRolesError(null); // Also clear role-specific errors if any general message clear is called
  };

  const fetchRestaurantStaff = useCallback(async () => {
    setLoading(true);
    clearMessages();
    try {
      const fetchedStaff = await getStaffList();
      setStaffList(fetchedStaff || []);
    } catch (err: any) {
      console.error("Error fetching staff list:", err);
      setError(err.response?.data?.message || "Failed to load staff data.");
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRestaurantRoles = useCallback(async () => {
    if (user?.restaurantId) {
      setRolesLoading(true);
      // Keep existing error state for roles, don't clear general error
      try {
        const fetchedRoles = await getRoles(user.restaurantId);
        setRolesList(fetchedRoles || []);
      } catch (err: any) {
        console.error("Error fetching roles list:", err);
        setRolesError(
          err.response?.data?.message || "Failed to load roles data."
        );
        setRolesList([]);
      } finally {
        setRolesLoading(false);
      }
    }
  }, [user?.restaurantId]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (user && user.role === "restaurant" && user.restaurantId) {
        await fetchRestaurantStaff();
        await fetchRestaurantRoles();
      } else {
        setError("Access Denied. Only restaurant owners can view this page.");
        setLoading(false);
        setRolesLoading(false);
      }
    };
    fetchInitialData();
  }, [user, fetchRestaurantStaff, fetchRestaurantRoles]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (_e) {
      return "Invalid Date";
    }
  };

  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${staffName}? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await deleteStaffMember(staffId);
      setStaffList((prevList) =>
        prevList.filter((staff) => staff._id !== staffId)
      );
      console.log(`Successfully deleted ${staffName}`);
      await fetchRestaurantStaff();
      setMessage(`${staffName} has been successfully deleted.`);
    } catch (err: any) {
      console.error(`Error deleting staff member ${staffName}:`, err);
      setError(err.response?.data?.message || `Failed to delete ${staffName}.`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleOpenCreateRoleModal = () => {
    setCurrentRole(null);
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRoleModal = (role: IRole) => {
    setCurrentRole(role);
    setIsRoleModalOpen(true);
  };

  const handleCloseRoleModal = () => {
    setIsRoleModalOpen(false);
    setCurrentRole(null);
    setRolesError(null);
  };

  const handleRoleFormSubmit = async (
    roleFormData: Partial<
      Omit<IRole, "_id" | "restaurantId" | "createdAt" | "updatedAt"> & {
        restaurantId?: string;
      }
    >
  ) => {
    if (!user?.restaurantId) {
      setRolesError("Restaurant ID not found. Cannot save role.");
      return;
    }
    setRoleSubmitLoading(true);
    setRolesError(null);

    try {
      if (currentRole?._id) {
        await updateRole(currentRole._id, {
          name: roleFormData.name,
          description: roleFormData.description,
        });
      } else {
        await createRole({
          ...roleFormData,
          name: roleFormData.name || "",
          restaurantId: user.restaurantId,
        });
      }
      await fetchRestaurantRoles();
      handleCloseRoleModal();
      setMessage(
        currentRole
          ? "Role updated successfully."
          : "Role created successfully."
      );
    } catch (err: any) {
      console.error("Error submitting role form:", err);
      setRolesError(err.response?.data?.message || "Failed to save role.");
    } finally {
      setRoleSubmitLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the role "${roleName}"? This may affect assigned staff.`
      )
    ) {
      return;
    }
    setRoleSubmitLoading(true);
    setRolesError(null);
    try {
      await deleteRole(roleId);
      await fetchRestaurantRoles();
      await fetchRestaurantStaff();
      setMessage(`Role "${roleName}" has been successfully deleted.`);
      if (selectedRoleId === roleId) setSelectedRoleId(null);
    } catch (err: any) {
      console.error(`Error deleting role ${roleName}:`, err);
      setRolesError(
        err.response?.data?.message || `Failed to delete role ${roleName}.`
      );
    } finally {
      setRoleSubmitLoading(false);
    }
  };

  const handleAssignRoleChange = async (
    staffId: string,
    newRoleId: string | null
  ) => {
    setAssignRoleLoading(staffId);
    clearMessages(); // Clear previous messages
    try {
      await updateStaffAssignedRole(staffId, newRoleId);
      await fetchRestaurantStaff();
      setMessage(`Successfully assigned role to staff.`);
    } catch (err: any) {
      console.error("Error assigning role to staff:", err);
      setError(
        err.response?.data?.message || "Failed to update staff role assignment."
      );
      setTimeout(() => setError(null), 5000);
    } finally {
      setAssignRoleLoading(null);
    }
  };

  // Sorting handler
  const handleSortRequest = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Memoized counts for roles
  const roleCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    staffList.forEach((staff) => {
      if (staff.assignedRoleId) {
        counts[staff.assignedRoleId] = (counts[staff.assignedRoleId] || 0) + 1;
      }
    });
    return counts;
  }, [staffList]);

  // Memoized filtered and sorted staff list
  const filteredAndSortedStaffList = useMemo(() => {
    let list = [...staffList];

    if (selectedRoleId) {
      list = list.filter((staff) => staff.assignedRoleId === selectedRoleId);
    }

    if (!list || list.length === 0) return [];

    return list.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortField) {
        case "name":
          valA = a.name?.toLowerCase() || "";
          valB = b.name?.toLowerCase() || "";
          break;
        case "email":
          valA = a.email?.toLowerCase() || "";
          valB = b.email?.toLowerCase() || "";
          break;
        case "averageScore":
          valA =
            a.averageScore === null || a.averageScore === undefined
              ? -Infinity
              : a.averageScore;
          valB =
            b.averageScore === null || b.averageScore === undefined
              ? -Infinity
              : b.averageScore;
          return sortDirection === "asc" ? valA - valB : valB - valA;
        case "completionRate":
          valA = calculateStaffCompletionRate(a);
          valB = calculateStaffCompletionRate(b);
          return sortDirection === "asc" ? valA - valB : valB - valA;
        case "createdAt":
          valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        default:
          return 0;
      }
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [staffList, sortField, sortDirection, selectedRoleId]);

  const tableHeaders: { label: string; field: SortField | null }[] = [
    { label: "Name", field: "name" },
    { label: "Email", field: "email" },
    { label: "Avg. Score", field: "averageScore" },
    { label: "Completion %", field: "completionRate" },
    { label: "Date Joined", field: "createdAt" },
    { label: "Assign Role", field: null },
    { label: "Actions", field: null },
  ];

  if ((loading || rolesLoading) && !error && !rolesError) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <LoadingSpinner message="Loading staff and roles..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Staff & Role Management
          </h1>
        </div>

        {message && (
          <div
            className="mb-6 p-4 text-sm text-green-700 bg-green-100 rounded-lg"
            role="alert"
          >
            {message}
            <button
              type="button"
              className="ml-auto -mx-1.5 -my-1.5 bg-green-100 text-green-500 rounded-lg focus:ring-2 focus:ring-green-400 p-1.5 hover:bg-green-200 inline-flex h-8 w-8"
              onClick={() => setMessage(null)}
              aria-label="Dismiss"
            >
              <span className="sr-only">Dismiss</span>
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </button>
          </div>
        )}
        {error && (
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        )}
        {rolesError && (
          <ErrorMessage
            message={rolesError}
            onDismiss={() => setRolesError(null)}
          />
        )}

        {/* Role Filter Section */}
        {!rolesLoading && (
          <div className="mb-8 p-4 bg-white shadow rounded-lg">
            <h3 className="text-lg font-medium text-gray-700 mb-3">
              Filter by Role:
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedRoleId(null)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${
                    selectedRoleId === null
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }
                `}
              >
                All Roles ({staffList.length})
              </button>
              {rolesList.map((role) => (
                <button
                  key={role._id}
                  onClick={() => setSelectedRoleId(role._id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${
                      selectedRoleId === role._id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }
                  `}
                >
                  {role.name} ({roleCounts[role._id] || 0})
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="lg:col-span-2">
          <Card>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h3 className="text-xl font-semibold text-slate-700 mb-3 sm:mb-0">
                Staff Members ({filteredAndSortedStaffList.length})
              </h3>
              {!rolesLoading && rolesList.length > 0 && (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-slate-600">
                    Filter by role:
                  </span>
                  <select
                    value={selectedRoleId || ""}
                    onChange={(e) => setSelectedRoleId(e.target.value || null)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-sm"
                  >
                    <option value="">All Roles ({staffList.length})</option>
                    {rolesList.map((role) => (
                      <option key={role._id} value={role._id}>
                        {role.name} ({roleCounts[role._id] || 0})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {loading && filteredAndSortedStaffList.length === 0 && !error ? (
              <div className="text-center py-10">
                <LoadingSpinner message="Loading staff data..." />
              </div>
            ) : filteredAndSortedStaffList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {tableHeaders.map((col) => (
                        <th
                          key={col.label}
                          scope="col"
                          className={`px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider ${
                            col.field
                              ? "cursor-pointer hover:bg-slate-100 transition-colors"
                              : ""
                          }`}
                          onClick={() =>
                            col.field && handleSortRequest(col.field)
                          }
                        >
                          {col.label}
                          {sortField === col.field && col.field && (
                            <span className="ml-1">
                              {sortDirection === "asc" ? "▲" : "▼"}
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredAndSortedStaffList.map((staff) => (
                      <tr
                        key={staff._id}
                        className="hover:bg-slate-50 transition-colors group"
                      >
                        {tableHeaders.map((col) => (
                          <td
                            key={`${staff._id}-${col.label}`}
                            className="px-4 py-3 whitespace-nowrap text-sm text-slate-600"
                          >
                            {col.field === "name" && (
                              <Link
                                to={`/staff/${staff._id}`}
                                className="font-medium text-sky-600 hover:text-sky-800 group-hover:underline"
                              >
                                {staff.name}
                              </Link>
                            )}
                            {col.field === "email" && staff.email}
                            {col.field === "averageScore" &&
                              formatPercentage(staff.averageScore)}
                            {col.field === "completionRate" &&
                              formatPercentage(
                                calculateStaffCompletionRate(staff)
                              )}
                            {col.field === "createdAt" &&
                              formatDate(staff.createdAt)}

                            {col.label === "Assign Role" &&
                              (rolesLoading ? (
                                <span className="text-xs text-slate-400">
                                  Loading...
                                </span>
                              ) : assignRoleLoading === staff._id ? (
                                <LoadingSpinner />
                              ) : rolesList.length > 0 ? (
                                <select
                                  value={staff.assignedRoleId || ""}
                                  onChange={(e) =>
                                    handleAssignRoleChange(
                                      staff._id,
                                      e.target.value || null
                                    )
                                  }
                                  disabled={
                                    assignRoleLoading === staff._id ||
                                    rolesLoading
                                  }
                                  className="block w-full max-w-[150px] pl-3 pr-8 py-1 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-xs"
                                  aria-label={`Assign role to ${staff.name}`}
                                >
                                  <option value="">Unassigned</option>
                                  {rolesList.map((role) => (
                                    <option key={role._id} value={role._id}>
                                      {role.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  No roles
                                </span>
                              ))}

                            {col.label === "Actions" && (
                              <div className="flex items-center justify-end space-x-2">
                                <Link
                                  to={`/staff/${staff._id}`}
                                  className="text-sky-600 hover:text-sky-800 transition-colors text-xs font-medium py-1 px-2 rounded-md hover:bg-sky-50"
                                  title="View Details"
                                >
                                  View
                                </Link>
                                <Button
                                  variant="destructive"
                                  onClick={() =>
                                    handleDeleteStaff(staff._id, staff.name)
                                  }
                                  title="Remove Staff"
                                  disabled={assignRoleLoading === staff._id}
                                  className="text-xs !px-2 !py-1"
                                >
                                  Remove
                                </Button>
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-slate-500 py-10">
                {loading
                  ? "Loading staff..."
                  : error
                  ? "Could not load staff data."
                  : selectedRoleId
                  ? `No staff members found with the role '${
                      rolesList.find((r) => r._id === selectedRoleId)?.name ||
                      "selected role"
                    }'`
                  : "No staff members currently in the system. Invite one to get started!"}
              </p>
            )}
          </Card>
        </div>

        <Card className="bg-white shadow-lg rounded-xl p-4 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              Manage Roles
            </h2>
            <Button
              variant="primary"
              onClick={handleOpenCreateRoleModal}
              disabled={roleSubmitLoading || !!assignRoleLoading}
            >
              Create New Role
            </Button>
          </div>
          {rolesLoading && rolesList.length === 0 && !rolesError ? (
            <div className="text-center py-10">
              <LoadingSpinner message="Loading roles..." />
            </div>
          ) : rolesList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rolesList.map((role) => (
                <div
                  key={role._id}
                  className="bg-gray-50 rounded-lg shadow p-5 flex flex-col justify-between ring-1 ring-gray-200"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {role.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 min-h-[40px] line-clamp-2">
                      {role.description || "No description provided."}
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-end space-x-3">
                    <Button
                      variant="secondary"
                      className="text-xs px-3 py-1.5"
                      onClick={() => handleOpenEditRoleModal(role)}
                      disabled={roleSubmitLoading || !!assignRoleLoading}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      className="text-xs px-3 py-1.5"
                      onClick={() => handleDeleteRole(role._id, role.name)}
                      disabled={roleSubmitLoading || !!assignRoleLoading}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-10">
              {rolesError && !error
                ? "Could not load roles."
                : "No roles found. Create one to get started!"}
            </p>
          )}
        </Card>

        {isRoleModalOpen && (
          <RoleFormModal
            isOpen={isRoleModalOpen}
            onClose={handleCloseRoleModal}
            onSubmit={handleRoleFormSubmit}
            currentRole={currentRole}
            isLoading={roleSubmitLoading}
          />
        )}
      </main>
    </div>
  );
};

export default StaffManagement;
