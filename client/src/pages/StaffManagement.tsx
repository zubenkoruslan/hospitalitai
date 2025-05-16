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
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import Card from "../components/common/Card";
import {
  StaffMemberWithData,
  SortField,
  SortDirection,
} from "../types/staffTypes";
import { IRole } from "../types/roleTypes";
import RoleFormModal from "../components/common/RoleFormModal";

// --- Main Component ---
const StaffManagement: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffMemberWithData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchRestaurantStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
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
      setRolesError(null);
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
        `Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`
      )
    ) {
      return;
    }
    setRoleSubmitLoading(true);
    setRolesError(null);
    try {
      await deleteRole(roleId);
      await fetchRestaurantRoles();
      setStaffList((prevStaffList) =>
        prevStaffList.map((staff) =>
          staff.assignedRoleId === roleId
            ? {
                ...staff,
                assignedRoleId: undefined,
                professionalRole: undefined,
              }
            : staff
        )
      );
      if (selectedRoleId === roleId) setSelectedRoleId(null); // If deleted role was selected, reset filter
      console.log(`Successfully deleted role ${roleName}`);
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
    setError(null);
    try {
      const { staff: updatedStaffFromAPI } = await updateStaffAssignedRole(
        staffId,
        newRoleId
      );

      setStaffList((prevList) =>
        prevList.map((staff) =>
          staff._id === staffId
            ? {
                ...staff,
                assignedRoleId: updatedStaffFromAPI.assignedRoleId,
                professionalRole: updatedStaffFromAPI.professionalRole,
              }
            : staff
        )
      );
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
    let filteredList = staffList;
    if (selectedRoleId) {
      filteredList = staffList.filter(
        (staff) => staff.assignedRoleId === selectedRoleId
      );
    }

    if (!filteredList || filteredList.length === 0) return [];

    return [...filteredList].sort((a, b) => {
      let valA: any;
      let valB: any;
      switch (sortField) {
        case "name":
          valA = a.name?.toLowerCase() || "";
          valB = b.name?.toLowerCase() || "";
          break;
        case "joined":
          valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case "role":
          const roleAName =
            rolesList
              .find((r) => r._id === a.assignedRoleId)
              ?.name?.toLowerCase() || "";
          const roleBName =
            rolesList
              .find((r) => r._id === b.assignedRoleId)
              ?.name?.toLowerCase() || "";
          valA = roleAName;
          valB = roleBName;
          break;
        default:
          return 0;
      }
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [staffList, rolesList, sortField, sortDirection, selectedRoleId]);

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

        {error && <ErrorMessage message={error} />}
        {rolesError && !error && <ErrorMessage message={rolesError} />}

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

        <Card className="bg-white shadow-lg rounded-xl p-4 sm:p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Staff Members ({filteredAndSortedStaffList.length})
          </h2>
          {loading && filteredAndSortedStaffList.length === 0 && !error ? (
            <div className="text-center py-10">
              <LoadingSpinner message="Loading staff list..." />
            </div>
          ) : filteredAndSortedStaffList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSortRequest("name")}
                    >
                      Name
                      {sortField === "name" &&
                        (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSortRequest("role")}
                    >
                      Role
                      {sortField === "role" &&
                        (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSortRequest("joined")}
                    >
                      Joined
                      {sortField === "joined" &&
                        (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedStaffList.map((staff) => {
                    return (
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
                          {rolesLoading ? (
                            <LoadingSpinner />
                          ) : (
                            <select
                              value={staff.assignedRoleId || ""}
                              onChange={(e) =>
                                handleAssignRoleChange(
                                  staff._id,
                                  e.target.value || null
                                )
                              }
                              disabled={
                                assignRoleLoading === staff._id || rolesLoading
                              }
                              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:opacity-75 disabled:bg-gray-100"
                              aria-label={`Assign role to ${staff.name}`}
                            >
                              <option value="">Unassigned</option>
                              {rolesList.map((role) => (
                                <option key={role._id} value={role._id}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                          )}
                          {assignRoleLoading === staff._id && (
                            <span className="ml-2 text-xs text-gray-500">
                              (Updating...)
                            </span>
                          )}
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
                            disabled={assignRoleLoading === staff._id}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-10">
              {error && !rolesError
                ? "Could not load staff."
                : selectedRoleId
                ? `No staff members found with the role '${
                    rolesList.find((r) => r._id === selectedRoleId)?.name ||
                    selectedRoleId
                  }'.`
                : "No staff members found."}
            </p>
          )}
        </Card>

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

        <RoleFormModal
          isOpen={isRoleModalOpen}
          onClose={handleCloseRoleModal}
          onSubmit={handleRoleFormSubmit}
          currentRole={currentRole}
          isLoading={roleSubmitLoading}
        />
      </main>
    </div>
  );
};

export default StaffManagement;
