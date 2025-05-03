import React from "react";
import { Filters } from "../../types/staffTypes"; // Corrected import path

// Interface for filter state
// // Removed local definition

// Prop Interface
interface StaffResultsFilterProps {
  filters: Filters;
  onFilterChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  onResetFilters: () => void;
}

// Filter Component
const StaffResultsFilter: React.FC<StaffResultsFilterProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
}) => {
  return (
    <div className="mb-6 bg-white shadow rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
      <div className="flex-1 min-w-0">
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
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <div className="flex-1 min-w-0">
        <label htmlFor="roleFilter" className="sr-only">
          Filter by role
        </label>
        <input
          type="text" // Assuming text for now, could be select if roles are predefined
          id="roleFilter"
          name="role" // Name attribute is important for the handler
          value={filters.role}
          onChange={onFilterChange}
          placeholder="Filter by role..."
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <button
        onClick={onResetFilters}
        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Reset Filters
      </button>
    </div>
  );
};

export default React.memo(StaffResultsFilter);
