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
import StaffInvitationForm from "../components/staff/StaffInvitationForm";
import PendingInvitationsTable from "../components/staff/PendingInvitationsTable";
import {
  StaffMemberWithData,
  SortField,
  SortDirection,
} from "../types/staffTypes";
import { IRole } from "../types/roleTypes";
import RoleFormModal from "../components/common/RoleFormModal";
import {
  UsersIcon,
  UserPlusIcon,
  CogIcon,
  PlusIcon,
  EyeIcon,
  TrashIcon,
  PencilIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ClockIcon,
  StarIcon,
} from "@heroicons/react/24/outline";

// Helper function to format percentages
const formatPercentage = (value: number | null) =>
  value === null ? "N/A" : `${value.toFixed(1)}%`;

// Helper function to calculate staff completion rate (restored)
// Updated to calculate based on quiz participation rather than seeing all questions
const calculateStaffCompletionRate = (staff: StaffMemberWithData): number => {
  if (staff.quizProgressSummaries && staff.quizProgressSummaries.length > 0) {
    // Count quizzes where staff has made at least one attempt (has an average score)
    const participatedCount = staff.quizProgressSummaries.filter(
      (qps) =>
        qps.averageScoreForQuiz !== null &&
        qps.averageScoreForQuiz !== undefined
    ).length;
    return (participatedCount / staff.quizProgressSummaries.length) * 100;
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
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);

  // Active tab state
  const [activeTab, setActiveTab] = useState<"staff" | "roles" | "invitations">(
    "staff"
  );

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Filtering state
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null); // null means all roles

  // Expandable cards state (for mobile role cards)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const { user } = useAuth();

  const clearMessages = () => {
    setMessage(null);
    setError(null);
    setRolesError(null); // Also clear role-specific errors if any general message clear is called
  };

  // Handle card expand/collapse on mobile
  const toggleCardExpansion = useCallback((cardId: string) => {
    setExpandedCards((prev) => {
      const newExpandedCards = new Set(prev);
      if (newExpandedCards.has(cardId)) {
        newExpandedCards.delete(cardId);
      } else {
        newExpandedCards.add(cardId);
      }
      return newExpandedCards;
    });
  }, []);

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

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      list = list.filter(
        (staff) =>
          staff.name?.toLowerCase().includes(searchLower) ||
          staff.email?.toLowerCase().includes(searchLower) ||
          rolesList
            .find((role) => role._id === staff.assignedRoleId)
            ?.name.toLowerCase()
            .includes(searchLower)
      );
    }

    // Apply role filter
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
  }, [
    staffList,
    sortField,
    sortDirection,
    selectedRoleId,
    searchTerm,
    rolesList,
  ]);

  // Staff statistics
  const staffStats = useMemo(() => {
    const totalStaff = staffList.length;
    const activeStaff = staffList.filter((s) => s.averageScore !== null).length;
    const avgScore =
      staffList.length > 0
        ? staffList.reduce((sum, s) => sum + (s.averageScore || 0), 0) /
          staffList.length
        : 0;
    const avgCompletion =
      staffList.length > 0
        ? staffList.reduce(
            (sum, s) => sum + calculateStaffCompletionRate(s),
            0
          ) / staffList.length
        : 0;

    return { totalStaff, activeStaff, avgScore, avgCompletion };
  }, [staffList]);

  const tableHeaders: { label: string; field: SortField | null }[] = [
    { label: "Staff Member", field: "name" },
    { label: "Email", field: "email" },
    { label: "Role", field: null },
    { label: "Avg. Score", field: "averageScore" },
    { label: "Completion", field: "completionRate" },
    { label: "", field: null },
  ];

  const tabs = [
    {
      id: "staff",
      name: "Staff Members",
      icon: UsersIcon,
      count: staffList.length,
    },
    { id: "roles", name: "Roles", icon: CogIcon, count: rolesList.length },
    { id: "invitations", name: "Invitations", icon: EnvelopeIcon, count: 0 },
  ] as const;

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center min-h-[60vh]">
                <LoadingSpinner message="Loading staff and roles..." />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-slate-50 to-slate-100">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Enhanced Header with gradient background */}
            <div className="bg-gradient-to-br from-background via-slate-50 to-slate-100">
              {/* Page Header */}
              <div className="mb-6 bg-gradient-to-r from-primary/5 via-white to-accent/5 rounded-2xl p-4 lg:p-6 border border-primary/10 shadow-md backdrop-blur-sm">
                <div className="flex flex-col gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-1.5 bg-gradient-to-r from-primary to-accent rounded-lg shadow-md">
                        <UserGroupIcon className="h-5 w-5 text-white" />
                      </div>
                      <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        Team Management
                      </h1>
                    </div>
                    <p className="text-muted-gray text-sm mb-3">
                      Manage your team members, roles, and invitations in one
                      place.
                    </p>
                  </div>

                  {/* Action Buttons - Stack on mobile */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => setActiveTab("invitations")}
                      className="group inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg text-sm"
                    >
                      <EnvelopeIcon className="h-4 w-4 mr-1.5 group-hover:scale-110 transition-transform duration-200" />
                      <span className="hidden sm:inline">Invitations</span>
                      <span className="sm:hidden">Invites</span>
                    </button>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="group inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium rounded-lg hover:from-emerald-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg text-sm"
                    >
                      <UserPlusIcon className="h-4 w-4 mr-1.5 group-hover:scale-110 transition-transform duration-200" />
                      <span className="hidden sm:inline">Invite Staff</span>
                      <span className="sm:hidden">Invite</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Enhanced Stats Cards with animations */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6">
                <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-3 lg:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 relative overflow-hidden group">
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                  <div className="relative z-10">
                    <div className="flex items-center space-x-2 lg:space-x-3">
                      <div className="p-2 lg:p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg lg:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                        <UsersIcon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs lg:text-sm font-medium text-slate-500 group-hover:text-slate-600 truncate">
                          Total Staff
                        </p>
                        <p className="text-xl lg:text-3xl font-bold text-slate-900 transition-colors duration-300">
                          {staffStats.totalStaff}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-3 lg:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                  <div className="relative z-10">
                    <div className="flex items-center space-x-2 lg:space-x-4">
                      <div className="p-2 lg:p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg lg:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                        <AcademicCapIcon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs lg:text-sm font-medium text-slate-500 group-hover:text-slate-600 truncate">
                          Active Learners
                        </p>
                        <p className="text-xl lg:text-3xl font-bold text-slate-900 transition-colors duration-300">
                          {staffStats.activeStaff}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-3 lg:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                  <div className="relative z-10">
                    <div className="flex items-center space-x-2 lg:space-x-4">
                      <div className="p-2 lg:p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg lg:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                        <StarIcon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs lg:text-sm font-medium text-slate-500 group-hover:text-slate-600 truncate">
                          Avg. Score
                        </p>
                        <p className="text-xl lg:text-3xl font-bold text-slate-900 transition-colors duration-300">
                          {formatPercentage(staffStats.avgScore)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-3 lg:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>

                  <div className="relative z-10">
                    <div className="flex items-center space-x-2 lg:space-x-4">
                      <div className="p-2 lg:p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg lg:rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                        <ClockIcon className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs lg:text-sm font-medium text-slate-500 group-hover:text-slate-600 truncate">
                          Avg. Completion
                        </p>
                        <p className="text-xl lg:text-3xl font-bold text-slate-900 transition-colors duration-300">
                          {formatPercentage(staffStats.avgCompletion)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            {message && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  <span className="text-green-700 font-medium">{message}</span>
                </div>
                <button
                  type="button"
                  className="text-green-500 hover:text-green-700 transition-colors"
                  onClick={() => setMessage(null)}
                  aria-label="Dismiss"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>
            )}

            {(error || rolesError) && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <ErrorMessage
                  message={error || rolesError || ""}
                  onDismiss={() => {
                    setError(null);
                    setRolesError(null);
                  }}
                />
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`${
                          activeTab === tab.id
                            ? "border-emerald-500 text-emerald-600 bg-emerald-50"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        } flex items-center gap-2 whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm transition-all duration-200 rounded-t-lg`}
                      >
                        <Icon className="h-5 w-5" />
                        {tab.name}
                        {tab.count > 0 && (
                          <span
                            className={`${
                              activeTab === tab.id
                                ? "bg-emerald-600 text-white"
                                : "bg-gray-100 text-gray-600"
                            } inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium min-w-[20px] h-5`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === "staff" && (
                  <div className="space-y-6">
                    {/* Search and Filter Bar */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex-1 max-w-md">
                        <div className="relative">
                          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search staff by name, email, or role..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                            showFilters || selectedRoleId
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <FunnelIcon className="h-4 w-4" />
                          Filters
                          {selectedRoleId && (
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-1 rounded-full">
                              1
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Filter Panel */}
                    {showFilters && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex flex-wrap gap-3 items-center">
                          <span className="text-sm font-medium text-gray-700">
                            Filter by role:
                          </span>
                          <button
                            onClick={() => setSelectedRoleId(null)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              selectedRoleId === null
                                ? "bg-emerald-600 text-white"
                                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                            }`}
                          >
                            All ({staffList.length})
                          </button>
                          {rolesList.map((role) => (
                            <button
                              key={role._id}
                              onClick={() => setSelectedRoleId(role._id)}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                selectedRoleId === role._id
                                  ? "bg-emerald-600 text-white"
                                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                              }`}
                            >
                              {role.name} ({roleCounts[role._id] || 0})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Staff Table */}
                    {filteredAndSortedStaffList.length > 0 ? (
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                {tableHeaders.map((col, index) => (
                                  <th
                                    key={col.label}
                                    scope="col"
                                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                                      col.field
                                        ? "cursor-pointer hover:bg-gray-100 transition-colors"
                                        : ""
                                    } ${
                                      // Hide Email, Role, Avg. Score, Completion on mobile
                                      index === 1 ||
                                      index === 2 ||
                                      index === 3 ||
                                      index === 4
                                        ? "hidden md:table-cell"
                                        : ""
                                    }`}
                                    onClick={() =>
                                      col.field && handleSortRequest(col.field)
                                    }
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span>{col.label}</span>
                                      {sortField === col.field && col.field && (
                                        <ChevronDownIcon
                                          className={`h-4 w-4 transform transition-transform ${
                                            sortDirection === "asc"
                                              ? "rotate-180"
                                              : ""
                                          }`}
                                        />
                                      )}
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {filteredAndSortedStaffList.map(
                                (staff, index) => (
                                  <tr
                                    key={staff._id}
                                    className={`hover:bg-gray-50 transition-colors ${
                                      index % 2 === 0
                                        ? "bg-white"
                                        : "bg-gray-50/30"
                                    }`}
                                  >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <div className="h-10 w-10 flex-shrink-0">
                                          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                            <span className="text-sm font-medium text-emerald-700">
                                              {staff.name
                                                ?.charAt(0)
                                                ?.toUpperCase() || "?"}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="ml-4">
                                          <Link
                                            to={`/staff/${staff._id}`}
                                            className="text-sm font-medium text-gray-900 hover:text-emerald-600 transition-colors"
                                          >
                                            {staff.name}
                                          </Link>
                                          <p className="text-sm text-gray-500">
                                            Member since{" "}
                                            {formatDate(staff.createdAt)}
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                                      {staff.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                                      <select
                                        value={staff.assignedRoleId || ""}
                                        onChange={(e) =>
                                          handleAssignRoleChange(
                                            staff._id,
                                            e.target.value || null
                                          )
                                        }
                                        disabled={
                                          assignRoleLoading === staff._id
                                        }
                                        className="text-sm border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                                      >
                                        <option value="">Unassigned</option>
                                        {rolesList.map((role) => (
                                          <option
                                            key={role._id}
                                            value={role._id}
                                          >
                                            {role.name}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                                      <div className="flex items-center">
                                        <span
                                          className={`text-sm font-medium ${
                                            (staff.averageScore || 0) >= 70
                                              ? "text-green-600"
                                              : (staff.averageScore || 0) >= 50
                                              ? "text-orange-600"
                                              : "text-red-600"
                                          }`}
                                        >
                                          {formatPercentage(staff.averageScore)}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                                      <div className="flex items-center">
                                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                          <div
                                            className="bg-emerald-600 h-2 rounded-full"
                                            style={{
                                              width: `${calculateStaffCompletionRate(
                                                staff
                                              )}%`,
                                            }}
                                          ></div>
                                        </div>
                                        <span className="text-sm text-gray-600">
                                          {formatPercentage(
                                            calculateStaffCompletionRate(staff)
                                          )}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                      <div className="flex items-center justify-end space-x-2">
                                        <Link
                                          to={`/staff/${staff._id}`}
                                          className="text-emerald-600 hover:text-emerald-900 transition-colors"
                                        >
                                          <EyeIcon className="h-4 w-4" />
                                        </Link>
                                        <button
                                          onClick={() =>
                                            handleDeleteStaff(
                                              staff._id,
                                              staff.name
                                            )
                                          }
                                          className="text-red-600 hover:text-red-900 transition-colors"
                                          disabled={
                                            assignRoleLoading === staff._id
                                          }
                                        >
                                          <TrashIcon className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                        <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">
                          {searchTerm || selectedRoleId
                            ? "No staff found"
                            : "No staff members yet"}
                        </h3>
                        <p className="mt-2 text-gray-600">
                          {searchTerm || selectedRoleId
                            ? "Try adjusting your search or filter criteria"
                            : "Get started by inviting your first team member"}
                        </p>
                        {!searchTerm && !selectedRoleId && (
                          <Button
                            variant="primary"
                            onClick={() => setShowInviteModal(true)}
                            className="mt-4"
                          >
                            <UserPlusIcon className="h-4 w-4 mr-2" />
                            Invite Staff
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "roles" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Role Management
                        </h3>
                        <p className="text-gray-600">
                          Create and manage roles for your team members
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        onClick={handleOpenCreateRoleModal}
                        disabled={roleSubmitLoading}
                        className="flex items-center gap-2 text-sm px-3 py-1.5"
                      >
                        <PlusIcon className="h-3 w-3" />
                        Create Role
                      </Button>
                    </div>

                    {rolesList.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rolesList.map((role) => {
                          const isExpanded =
                            expandedCards.has(role._id) || false;

                          return (
                            <div
                              key={role._id}
                              className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
                            >
                              {/* Mobile Header (collapsed by default) */}
                              <div
                                className="md:hidden"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCardExpansion(role._id);
                                }}
                              >
                                <div className="p-4 flex items-center justify-between cursor-pointer">
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <div className="flex-shrink-0 p-1.5 bg-gray-50 rounded-lg border border-gray-200">
                                      <CogIcon className="h-4 w-4 text-gray-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-base font-semibold text-gray-900 truncate">
                                        {role.name}
                                      </h4>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditRoleModal(role);
                                      }}
                                      disabled={roleSubmitLoading}
                                      className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors duration-200"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteRole(role._id, role.name);
                                      }}
                                      disabled={roleSubmitLoading}
                                      className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors duration-200"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                    <div className="transform transition-transform duration-200">
                                      {isExpanded ? (
                                        <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                                      ) : (
                                        <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Mobile Expanded Content */}
                              {isExpanded && (
                                <div className="md:hidden border-t border-gray-100">
                                  <div className="p-4 space-y-4">
                                    {/* Description */}
                                    <p className="text-gray-600 text-sm">
                                      {role.description ||
                                        "No description provided"}
                                    </p>

                                    {/* Staff Count */}
                                    <div className="flex items-center text-sm text-gray-500">
                                      <UsersIcon className="h-4 w-4 mr-2" />
                                      {roleCounts[role._id] || 0} staff members
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Desktop Full Content (always visible) */}
                              <div className="hidden md:block p-6">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                      {role.name}
                                    </h4>
                                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                      {role.description ||
                                        "No description provided"}
                                    </p>
                                    <div className="flex items-center text-sm text-gray-500">
                                      <UsersIcon className="h-4 w-4 mr-1" />
                                      {roleCounts[role._id] || 0} staff members
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-gray-100">
                                  <Button
                                    variant="secondary"
                                    onClick={() =>
                                      handleOpenEditRoleModal(role)
                                    }
                                    disabled={roleSubmitLoading}
                                    className="text-xs px-3 py-1.5"
                                  >
                                    <PencilIcon className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() =>
                                      handleDeleteRole(role._id, role.name)
                                    }
                                    disabled={roleSubmitLoading}
                                    className="text-xs px-3 py-1.5"
                                  >
                                    <TrashIcon className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                        <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">
                          No roles yet
                        </h3>
                        <p className="mt-2 text-gray-600">
                          Create your first role to organize your team
                        </p>
                        <Button
                          variant="primary"
                          onClick={handleOpenCreateRoleModal}
                          className="mt-4"
                        >
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Create Role
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "invitations" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Staff Invitations
                      </h3>
                      <p className="text-gray-600">
                        Send invitations and manage pending invites
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <StaffInvitationForm
                        onSuccess={(message) => {
                          setMessage(message);
                          setTimeout(() => setMessage(null), 5000);
                        }}
                        onError={(error) => {
                          setError(error);
                          setTimeout(() => setError(null), 5000);
                        }}
                      />
                      <PendingInvitationsTable
                        onInvitationCancelled={() => {
                          setMessage("Invitation cancelled successfully");
                          setTimeout(() => setMessage(null), 3000);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Role Modal */}
      {isRoleModalOpen && (
        <RoleFormModal
          isOpen={isRoleModalOpen}
          onClose={handleCloseRoleModal}
          onSubmit={handleRoleFormSubmit}
          currentRole={currentRole}
          isLoading={roleSubmitLoading}
        />
      )}

      {/* Staff Invitation Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Invite Staff Member
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            <StaffInvitationForm
              onSuccess={(message) => {
                setMessage(message);
                setShowInviteModal(false);
                setTimeout(() => setMessage(null), 5000);
              }}
              onError={(error) => {
                setError(error);
                setTimeout(() => setError(null), 5000);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
