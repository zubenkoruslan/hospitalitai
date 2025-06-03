import React from "react";
import { Filters, StaffMemberWithData } from "../../types/staffTypes"; // Corrected import path, added StaffMemberWithData
import Button from "../common/Button"; // Import Button

// Define performance categories consistently
const PERFORMANCE_CATEGORIES = {
  excellent: { label: "Excellent (90%+)", min: 90, max: 100 },
  good: { label: "Good (75-89%)", min: 75, max: 89.99 },
  average: { label: "Average (60-74%)", min: 60, max: 74.99 },
  needsWork: { label: "Needs Work (<60%)", min: 0, max: 59.99 },
  noResults: { label: "No Results Yet" },
};

// Prop Interface - Updated
interface StaffResultsFilterProps {
  filters: Filters;
  staffData: StaffMemberWithData[]; // Needed for deriving roles
  selectedCategory: string | null;
  onFilterChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  onCategoryChange: (category: string | null) => void;
  onResetFilters: () => void;
}

// Filter Component - Updated
const StaffResultsFilter: React.FC<StaffResultsFilterProps> = ({
  filters,
  staffData, // Receive staffData
  selectedCategory,
  onFilterChange,
  onCategoryChange,
  onResetFilters,
}) => {
  // Derive unique roles for the dropdown (memoize if performance needed)
  const uniqueRoles = React.useMemo(() => {
    const roles = new Set<string>();
    staffData.forEach((staff) => {
      const roleName = staff.assignedRoleName || staff.professionalRole;
      if (roleName) {
        roles.add(roleName);
      }
    });
    return Array.from(roles).sort();
  }, [staffData]);

  return (
    <div className="mb-6 bg-white shadow rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
      <div className="flex-1 min-w-0 md:w-1/4">
        <label htmlFor="nameFilter" className="sr-only">
          Filter by name
        </label>
        <input
          type="text"
          id="nameFilter"
          name="name" // Name attribute is important for the handler
          value={filters.name}
          onChange={onFilterChange}
          placeholder="Filter by name..."
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-75 disabled:bg-gray-100"
        />
      </div>
      <div className="flex-1 min-w-0 md:w-1/4">
        <label htmlFor="roleFilter" className="sr-only">
          Filter by role
        </label>
        <select
          id="roleFilter"
          name="role" // Name attribute for the handler
          value={filters.role}
          onChange={onFilterChange}
          className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-75 disabled:bg-gray-100"
        >
          <option value="">All Roles</option>
          {uniqueRoles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-0 md:w-1/4">
        <label htmlFor="categoryFilter" className="sr-only">
          Filter by performance
        </label>
        <select
          id="categoryFilter"
          name="performanceCategory" // Use a distinct name if needed, or handle directly
          value={selectedCategory || ""} // Handle null state
          onChange={(e) =>
            onCategoryChange(e.target.value === "" ? null : e.target.value)
          }
          className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-75 disabled:bg-gray-100"
        >
          <option value="">All Performance</option>
          {Object.entries(PERFORMANCE_CATEGORIES).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-shrink-0">
        <Button variant="secondary" onClick={onResetFilters}>
          Reset Filters
        </Button>
      </div>
    </div>
  );
};

export default React.memo(StaffResultsFilter);
