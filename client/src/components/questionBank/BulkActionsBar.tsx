import React from "react";
import {
  CheckIcon,
  XMarkIcon,
  TrashIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import Button from "../common/Button";

interface BulkActionsBarProps {
  selectedIds: string[];
  totalItems: number;
  activeTab: "active" | "preview";
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete: () => void;
  onBulkApprove?: () => void; // Only for preview tab
  onBulkExport?: () => void;
  isLoading?: boolean;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedIds,
  totalItems,
  activeTab,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onBulkApprove,
  onBulkExport,
  isLoading = false,
}) => {
  const selectedCount = selectedIds.length;
  const allSelected = selectedCount === totalItems && totalItems > 0;
  const someSelected = selectedCount > 0;

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Selection Status and Select All/Deselect All */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {!allSelected ? (
              <button
                onClick={onSelectAll}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-3 py-2 rounded-lg font-medium transition-all duration-200 ease-out transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center gap-2 text-sm"
              >
                <CheckIcon className="h-4 w-4" />
                Select All ({totalItems})
              </button>
            ) : (
              <button
                onClick={onDeselectAll}
                disabled={isLoading}
                className="bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-3 py-2 rounded-lg font-medium transition-all duration-200 ease-out transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center gap-2 text-sm"
              >
                <XMarkIcon className="h-4 w-4" />
                Deselect All
              </button>
            )}
          </div>

          {someSelected && (
            <div className="text-sm text-gray-600">
              {selectedCount} of {totalItems} question
              {selectedCount === 1 ? "" : "s"} selected
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {someSelected && (
          <div className="flex items-center gap-2">
            {/* Preview tab specific actions */}
            {activeTab === "preview" && onBulkApprove && (
              <Button
                variant="primary"
                onClick={onBulkApprove}
                disabled={isLoading}
                className="flex items-center gap-2 text-sm px-4 py-2"
              >
                <CheckIcon className="h-4 w-4" />
                {isLoading
                  ? "Approving..."
                  : `Approve ${selectedCount} Question${
                      selectedCount === 1 ? "" : "s"
                    }`}
              </Button>
            )}

            {/* Active tab specific actions */}
            {activeTab === "active" && onBulkExport && (
              <Button
                variant="secondary"
                onClick={onBulkExport}
                disabled={isLoading}
                className="flex items-center gap-2 text-sm px-4 py-2"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                Export Selected
              </Button>
            )}

            {/* Common actions */}
            <Button
              variant="destructive"
              onClick={onBulkDelete}
              disabled={isLoading}
              className="flex items-center gap-2 text-sm px-4 py-2"
            >
              <TrashIcon className="h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        )}
      </div>

      {/* Selection Summary */}
      {someSelected && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Selected questions will be{" "}
            {activeTab === "preview" && onBulkApprove
              ? "moved to active status"
              : "permanently deleted"}
            . This action cannot be undone.
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkActionsBar;
