import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDownIcon,
  Bars3BottomLeftIcon,
  Bars3BottomRightIcon,
  CurrencyDollarIcon,
  ClockIcon,
  FolderIcon,
  FireIcon,
} from "@heroicons/react/24/outline";

export type SortOption =
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "category-asc"
  | "category-desc"
  | "recent"
  | "popular";

interface SortConfig {
  value: SortOption;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface SortDropdownProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  disabled?: boolean;
}

const sortOptions: SortConfig[] = [
  {
    value: "name-asc",
    label: "Name (A-Z)",
    icon: Bars3BottomLeftIcon,
    description: "Alphabetical order",
  },
  {
    value: "name-desc",
    label: "Name (Z-A)",
    icon: Bars3BottomRightIcon,
    description: "Reverse alphabetical",
  },
  {
    value: "price-asc",
    label: "Price (Low to High)",
    icon: CurrencyDollarIcon,
    description: "Cheapest first",
  },
  {
    value: "price-desc",
    label: "Price (High to Low)",
    icon: CurrencyDollarIcon,
    description: "Most expensive first",
  },
  {
    value: "category-asc",
    label: "Category (A-Z)",
    icon: FolderIcon,
    description: "Group by category",
  },
  {
    value: "recent",
    label: "Recently Added",
    icon: ClockIcon,
    description: "Newest items first",
  },
  {
    value: "popular",
    label: "Most Popular",
    icon: FireIcon,
    description: "Based on quiz frequency",
  },
];

const SortDropdown: React.FC<SortDropdownProps> = ({
  currentSort,
  onSortChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentSortConfig =
    sortOptions.find((option) => option.value === currentSort) ||
    sortOptions[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSortSelect = (sortValue: SortOption) => {
    onSortChange(sortValue);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          flex items-center justify-between w-full lg:w-auto min-w-[200px] px-4 py-2.5 
          bg-white border border-gray-200 rounded-lg shadow-sm text-sm font-medium 
          transition-colors duration-200
          ${
            disabled
              ? "text-gray-400 cursor-not-allowed"
              : "text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          }
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Sort options"
      >
        <div className="flex items-center space-x-2">
          <currentSortConfig.icon className="h-4 w-4" />
          <span className="truncate">{currentSortConfig.label}</span>
        </div>
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 lg:left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-2">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
              Sort by
            </div>

            {sortOptions.map((option) => {
              const isSelected = option.value === currentSort;
              const IconComponent = option.icon;

              return (
                <button
                  key={option.value}
                  onClick={() => handleSortSelect(option.value)}
                  className={`
                    w-full flex items-start px-3 py-3 text-left hover:bg-gray-50 transition-colors
                    ${isSelected ? "bg-blue-50 border-r-2 border-blue-500" : ""}
                  `}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <IconComponent
                      className={`h-4 w-4 flex-shrink-0 ${
                        isSelected ? "text-blue-600" : "text-gray-400"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium ${
                          isSelected ? "text-blue-900" : "text-gray-900"
                        }`}
                      >
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {option.description}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SortDropdown;
