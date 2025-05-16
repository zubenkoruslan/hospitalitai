import React, { useState, useEffect } from "react";
import { IRole } from "../../types/roleTypes";
import Button from "./Button"; // Assuming Button is in the same directory

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    roleData: Partial<
      Omit<IRole, "_id" | "restaurantId" | "createdAt" | "updatedAt"> & {
        restaurantId?: string;
      }
    >
  ) => void; // Allow restaurantId for creation
  currentRole: IRole | null;
  isLoading?: boolean; // Added isLoading prop
}

const RoleFormModal: React.FC<RoleFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentRole,
  isLoading = false, // Default to false
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentRole) {
      setName(currentRole.name);
      setDescription(currentRole.description || "");
    } else {
      setName("");
      setDescription("");
    }
    setError(null); // Reset error when modal opens or currentRole changes
  }, [currentRole, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent submission if already loading
    if (!name.trim()) {
      setError("Role name is required.");
      return;
    }
    onSubmit({ name, description });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {currentRole ? "Edit Role" : "Create New Role"}
          </h3>
          <form onSubmit={handleSubmit} className="mt-2 px-7 py-3">
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <fieldset disabled={isLoading}>
              {" "}
              {/* Disable fieldset when loading */}
              <div className="mb-4">
                <label
                  htmlFor="roleName"
                  className="block text-sm font-medium text-gray-700 text-left mb-1"
                >
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="roleName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 disabled:bg-gray-100"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="roleDescription"
                  className="block text-sm font-medium text-gray-700 text-left mb-1"
                >
                  Description
                </label>
                <textarea
                  id="roleDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 disabled:bg-gray-100"
                  disabled={isLoading}
                />
              </div>
            </fieldset>
            <div className="items-center px-4 py-3 flex justify-end space-x-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                isLoading={isLoading}
              >
                {isLoading
                  ? currentRole
                    ? "Saving..."
                    : "Creating..."
                  : currentRole
                  ? "Save Changes"
                  : "Create Role"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RoleFormModal;
