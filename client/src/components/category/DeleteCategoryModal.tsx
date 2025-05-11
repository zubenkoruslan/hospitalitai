import React from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";

interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  categoryName: string | null;
  isDeleting: boolean;
}

const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  categoryName,
  isDeleting,
}) => {
  if (!categoryName) return null;

  const footerContent = (
    <>
      <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        onClick={onConfirm}
        disabled={isDeleting}
        className="ml-3"
      >
        {isDeleting ? "Deleting..." : "Confirm Delete"}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Delete Category: ${categoryName}?`}
      size="md"
      footerContent={footerContent}
    >
      <p className="text-sm text-gray-600">
        Are you sure you want to delete the category "{categoryName}"?
      </p>
      <p className="text-sm text-gray-600 mt-2">
        All items currently in this category will be reassigned to a category
        named "Non Assigned".
      </p>
      <p className="text-sm text-gray-600 mt-2">
        This action cannot be undone.
      </p>
    </Modal>
  );
};

export default DeleteCategoryModal;
