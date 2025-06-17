import React from "react";
import Button from "../common/Button";
import { TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface BulkActionsBarProps {
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete: () => void;
  onExitBulkMode: () => void;
  totalItems: number;
  isDeleting?: boolean;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onExitBulkMode,
  totalItems,
  isDeleting = false,
}) => {
  return (
    <div className="sticky top-0 z-10 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-sm font-medium text-blue-900">
            {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
          </div>

          <div className="flex space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={
                selectedCount === totalItems ? onDeselectAll : onSelectAll
              }
              className="text-xs"
            >
              {selectedCount === totalItems ? "Deselect All" : "Select All"}
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {selectedCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onBulkDelete}
              disabled={isDeleting}
              className="flex items-center gap-1 text-xs"
            >
              <TrashIcon className="h-3 w-3" />
              {isDeleting ? "Deleting..." : `Delete ${selectedCount}`}
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={onExitBulkMode}
            className="flex items-center gap-1 text-xs"
          >
            <XMarkIcon className="h-3 w-3" />
            Exit
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsBar;
