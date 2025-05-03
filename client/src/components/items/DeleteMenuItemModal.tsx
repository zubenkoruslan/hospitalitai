import React from "react";

interface DeleteMenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  isSubmitting: boolean;
}

const DeleteMenuItemModal: React.FC<DeleteMenuItemModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  isSubmitting,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Confirm Deletion
        </h2>
        <p className="mb-6 text-gray-700">
          Are you sure you want to delete the item "<strong>{itemName}</strong>
          "? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            {isSubmitting ? "Deleting..." : "Delete Item"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteMenuItemModal;
