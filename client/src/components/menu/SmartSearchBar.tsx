import React, { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";

interface SmartSearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onClearSearch: () => void;
  placeholder?: string;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  resultCount?: number;
  totalCount?: number;
}

const SmartSearchBar: React.FC<SmartSearchBarProps> = ({
  searchTerm,
  onSearchChange,
  onClearSearch,
  placeholder = "Search menu items...",
  showFilters = false,
  onToggleFilters,
  resultCount,
  totalCount,
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // Debounced search - only trigger search after user stops typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localSearchTerm !== searchTerm) {
        onSearchChange(localSearchTerm);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [localSearchTerm, searchTerm, onSearchChange]);

  // Sync with external search term changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalSearchTerm(e.target.value);
    },
    []
  );

  const handleClearSearch = useCallback(() => {
    setLocalSearchTerm("");
    onClearSearch();
  }, [onClearSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        handleClearSearch();
        (e.target as HTMLInputElement).blur();
      }
    },
    [handleClearSearch]
  );

  const showResultCount = resultCount !== undefined && totalCount !== undefined;
  const hasSearchTerm = localSearchTerm.trim().length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Main Search Bar */}
      <div className="relative">
        <div className="relative">
          {/* Search Icon */}
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>

          {/* Search Input */}
          <input
            type="text"
            value={localSearchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-12 pr-20 py-3 lg:py-4 border-0 rounded-xl bg-transparent focus:ring-0 focus:outline-none text-gray-900 placeholder-gray-500 text-sm lg:text-base"
            autoComplete="off"
            spellCheck="false"
          />

          {/* Action Buttons */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1">
            {/* Clear Search Button */}
            {hasSearchTerm && (
              <button
                onClick={handleClearSearch}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Clear search"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}

            {/* Filters Toggle Button */}
            {showFilters && onToggleFilters && (
              <button
                onClick={onToggleFilters}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Toggle filters"
              >
                <AdjustmentsHorizontalIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search Results Summary */}
      {showResultCount && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {hasSearchTerm ? (
                <>
                  Showing {resultCount} of {totalCount} items
                  {localSearchTerm && (
                    <span className="ml-1">
                      for "
                      <span className="font-medium text-gray-900">
                        {localSearchTerm}
                      </span>
                      "
                    </span>
                  )}
                </>
              ) : (
                <>Showing all {totalCount} items</>
              )}
            </span>

            {hasSearchTerm && (
              <button
                onClick={handleClearSearch}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartSearchBar;
