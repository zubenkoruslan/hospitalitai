import React, { useState, useMemo } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { borderRadius, typography } from "../../design-system";
import Button from "./Button";
import Input from "./Input";
import Checkbox from "./Checkbox";

export interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
  sticky?: boolean;
}

export interface DataTableProps<T> {
  // Data
  data: T[];
  columns: DataTableColumn<T>[];

  // Functionality
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  selectable?: boolean;

  // Selection
  selectedRows?: Set<string | number>;
  onSelectionChange?: (selectedRows: Set<string | number>) => void;
  rowKey?: keyof T | ((row: T) => string | number);

  // Pagination
  paginated?: boolean;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;

  // Search and filter
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: Record<string, unknown>;
  onFiltersChange?: (filters: Record<string, unknown>) => void;

  // Styling
  variant?: "default" | "bordered" | "striped";
  size?: "sm" | "md" | "lg";
  stickyHeader?: boolean;
  maxHeight?: string;

  // States
  loading?: boolean;
  error?: string;
  emptyMessage?: string;

  // Actions
  onRowClick?: (row: T, index: number) => void;
  bulkActions?: Array<{
    key: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    action: (selectedRows: T[]) => void;
    variant?: "default" | "destructive";
  }>;

  // Custom styling
  className?: string;
  testId?: string;
}

function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  sortable = true,
  filterable = false,
  searchable = false,
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange,
  rowKey = "id",
  paginated = false,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  searchValue = "",
  onSearchChange,
  filters = {},
  onFiltersChange,
  variant = "default",
  size = "md",
  stickyHeader = false,
  maxHeight,
  loading = false,
  error,
  emptyMessage = "No data available",
  onRowClick,
  bulkActions = [],
  className = "",
  testId,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<Record<string, string>>(
    filters as Record<string, string>
  );

  // Get row key function
  const getRowKey = (row: T): string | number => {
    if (typeof rowKey === "function") {
      return rowKey(row);
    }
    return row[rowKey];
  };

  // Filter and search data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchable && searchValue.trim()) {
      const searchLower = searchValue.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const value = row[col.key as keyof T];
          return String(value).toLowerCase().includes(searchLower);
        })
      );
    }

    // Apply filters
    if (filterable && Object.keys(localFilters).length > 0) {
      result = result.filter((row) =>
        Object.entries(localFilters).every(([key, filterValue]) => {
          if (!filterValue) return true;
          const rowValue = row[key as keyof T];
          return String(rowValue)
            .toLowerCase()
            .includes(filterValue.toLowerCase());
        })
      );
    }

    return result;
  }, [data, searchValue, localFilters, columns, searchable, filterable]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof T];
      const bValue = b[sortConfig.key as keyof T];

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!paginated) return sortedData;

    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, paginated, currentPage, pageSize]);

  // Handle sorting
  const handleSort = (columnKey: string) => {
    if (!sortable) return;

    setSortConfig((current) => {
      if (current?.key === columnKey) {
        if (current.direction === "asc") {
          return { key: columnKey, direction: "desc" };
        } else {
          return null; // Remove sort
        }
      }
      return { key: columnKey, direction: "asc" };
    });
  };

  // Handle selection
  const handleSelectAll = () => {
    if (!selectable || !onSelectionChange) return;

    const allKeys = paginatedData.map((row) => getRowKey(row));
    if (selectedRows.size === allKeys.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allKeys));
    }
  };

  const handleSelectRow = (rowKey: string | number) => {
    if (!selectable || !onSelectionChange) return;

    const newSelection = new Set(selectedRows);
    if (newSelection.has(rowKey)) {
      newSelection.delete(rowKey);
    } else {
      newSelection.add(rowKey);
    }
    onSelectionChange(newSelection);
  };

  // Handle filter changes
  const handleFilterChange = (columnKey: string, value: string) => {
    const newFilters = { ...localFilters, [columnKey]: value };
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  // Size classes
  const sizeClasses = {
    sm: {
      cell: "px-3 py-2",
      text: typography.fontSize.sm,
    },
    md: {
      cell: "px-4 py-3",
      text: typography.fontSize.base,
    },
    lg: {
      cell: "px-6 py-4",
      text: typography.fontSize.lg,
    },
  };

  // Variant classes
  const variantClasses = {
    default: "border border-border-primary",
    bordered: "border-2 border-border-primary",
    striped: "border border-border-primary",
  };

  const tableClasses = `
    w-full divide-y divide-border-secondary
    ${variantClasses[variant]}
    ${borderRadius.lg}
    overflow-hidden
    ${className}
  `;

  const containerClasses = `
    ${maxHeight ? `max-h-[${maxHeight}]` : ""}
    overflow-auto
    ${borderRadius.lg}
    border border-border-primary
  `;

  return (
    <div className="space-y-4" data-testid={testId}>
      {/* Search and Filter Controls */}
      {(searchable || filterable || bulkActions.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Search */}
            {searchable && (
              <Input
                placeholder="Search..."
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                leftIcon={MagnifyingGlassIcon}
                size={size}
                className="w-64"
              />
            )}

            {/* Filter Toggle */}
            {filterable && (
              <Button
                variant={showFilters ? "primary" : "secondary"}
                size={size}
                onClick={() => setShowFilters(!showFilters)}
                leftIcon={FunnelIcon}
              >
                Filters
              </Button>
            )}
          </div>

          {/* Bulk Actions */}
          {selectable && selectedRows.size > 0 && bulkActions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className={`${typography.fontSize.sm} text-text-secondary`}>
                {selectedRows.size} selected
              </span>
              {bulkActions.map((action) => (
                <Button
                  key={action.key}
                  variant={action.variant || "secondary"}
                  size="sm"
                  leftIcon={action.icon}
                  onClick={() => {
                    const selectedData = paginatedData.filter((row) =>
                      selectedRows.has(getRowKey(row))
                    );
                    action.action(selectedData);
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter Inputs */}
      {filterable && showFilters && (
        <div className="p-4 bg-background-secondary rounded-lg border border-border-primary">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {columns
              .filter((col) => col.filterable)
              .map((column) => (
                <Input
                  key={String(column.key)}
                  label={`Filter ${column.header}`}
                  placeholder={`Filter by ${column.header.toLowerCase()}...`}
                  value={localFilters[String(column.key)] || ""}
                  onChange={(e) =>
                    handleFilterChange(String(column.key), e.target.value)
                  }
                  size="sm"
                />
              ))}
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setLocalFilters({});
                onFiltersChange?.({});
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className={containerClasses}>
        <table className={tableClasses}>
          {/* Header */}
          <thead
            className={`bg-background-secondary ${
              stickyHeader ? "sticky top-0 z-10" : ""
            }`}
          >
            <tr>
              {/* Selection Header */}
              {selectable && (
                <th className={`${sizeClasses[size].cell} w-12`}>
                  <Checkbox
                    checked={
                      selectedRows.size === paginatedData.length &&
                      paginatedData.length > 0
                    }
                    indeterminate={
                      selectedRows.size > 0 &&
                      selectedRows.size < paginatedData.length
                    }
                    onChange={handleSelectAll}
                    size={size}
                  />
                </th>
              )}

              {/* Column Headers */}
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`
                    ${sizeClasses[size].cell}
                    ${sizeClasses[size].text}
                    font-semibold text-text-primary
                    text-${column.align || "left"}
                    ${column.width ? `w-[${column.width}]` : ""}
                    ${
                      column.sortable && sortable
                        ? "cursor-pointer hover:bg-background-tertiary"
                        : ""
                    }
                    ${
                      column.sticky
                        ? "sticky left-0 bg-background-secondary"
                        : ""
                    }
                  `}
                  onClick={() =>
                    column.sortable && handleSort(String(column.key))
                  }
                >
                  <div className="flex items-center justify-between">
                    <span>{column.header}</span>
                    {column.sortable && sortable && (
                      <div className="ml-2 flex flex-col">
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === "asc" ? (
                            <ChevronUpIcon className="h-4 w-4" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4" />
                          )
                        ) : (
                          <div className="h-4 w-4 opacity-50">
                            <ChevronUpIcon className="h-3 w-3" />
                            <ChevronDownIcon className="h-3 w-3 -mt-1" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="bg-background-primary divide-y divide-border-secondary">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className={`${sizeClasses[size].cell} text-center text-text-secondary`}
                >
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                    <span className="ml-2">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className={`${sizeClasses[size].cell} text-center text-error-600`}
                >
                  <div className="py-8">
                    <svg
                      className="mx-auto h-12 w-12 text-error-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <p className="mt-2">{error}</p>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className={`${sizeClasses[size].cell} text-center text-text-secondary`}
                >
                  <div className="py-8">
                    <svg
                      className="mx-auto h-12 w-12 text-text-tertiary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="mt-2">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const rowKeyValue = getRowKey(row);
                const isSelected = selectedRows.has(rowKeyValue);

                return (
                  <tr
                    key={String(rowKeyValue)}
                    className={`
                      ${
                        variant === "striped" && index % 2 === 1
                          ? "bg-background-secondary"
                          : ""
                      }
                      ${
                        onRowClick
                          ? "cursor-pointer hover:bg-background-secondary"
                          : ""
                      }
                      ${isSelected ? "bg-primary-50" : ""}
                      transition-colors duration-150
                    `}
                    onClick={() => onRowClick?.(row, index)}
                  >
                    {/* Selection Cell */}
                    {selectable && (
                      <td className={sizeClasses[size].cell}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelectRow(rowKeyValue)}
                          size={size}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}

                    {/* Data Cells */}
                    {columns.map((column) => (
                      <td
                        key={String(column.key)}
                        className={`
                          ${sizeClasses[size].cell}
                          ${sizeClasses[size].text}
                          text-text-primary
                          text-${column.align || "left"}
                          ${column.sticky ? "sticky left-0 bg-inherit" : ""}
                        `}
                      >
                        {column.render
                          ? column.render(
                              row[column.key as keyof T],
                              row,
                              index
                            )
                          : String(row[column.key as keyof T] || "")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {paginated && !loading && paginatedData.length > 0 && (
        <div className="flex items-center justify-between">
          <div className={`${typography.fontSize.sm} text-text-secondary`}>
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, sortedData.length)} of{" "}
            {sortedData.length} results
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => onPageChange?.(currentPage - 1)}
            >
              Previous
            </Button>

            <span
              className={`${typography.fontSize.sm} text-text-secondary px-3`}
            >
              Page {currentPage} of {Math.ceil(sortedData.length / pageSize)}
            </span>

            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage === Math.ceil(sortedData.length / pageSize)}
              onClick={() => onPageChange?.(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
