import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import ErrorMessage from "../common/ErrorMessage";

interface EditMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => Promise<void>;
  initialName: string;
  initialDescription: string;
  isSaving: boolean;
  error?: string | null;
}

const EditMenuModal: React.FC<EditMenuModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialName,
  initialDescription,
  isSaving,
  error,
}) => {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setDescription(initialDescription);
    }
  }, [isOpen, initialName, initialDescription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(name, description);
    // Do not close on submit from here, parent (MenuItemsPage) will close on success
  };

  const footerContent = (
    <>
      <Button variant="secondary" onClick={onClose} disabled={isSaving}>
        Cancel
      </Button>
      <Button
        type="submit"
        form="edit-menu-form"
        variant="primary"
        className="ml-3"
        disabled={isSaving || name.trim() === ""}
      >
        {isSaving ? "Saving Menu..." : "Save Menu Changes"}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Menu Details"
      footerContent={footerContent}
      size="lg"
    >
      <form onSubmit={handleSubmit} id="edit-menu-form" className="space-y-4">
        {error && <ErrorMessage message={error} />}
        <div>
          <label
            htmlFor="menuName"
            className="block text-sm font-medium text-gray-700"
          >
            Menu Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="menuName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={isSaving}
          />
        </div>
        <div>
          <label
            htmlFor="menuDescription"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="menuDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={isSaving}
          />
        </div>
      </form>
    </Modal>
  );
};

export default EditMenuModal;
