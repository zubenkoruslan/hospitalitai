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
      <div className="text-center">
        <p className="text-lg text-slate-600">
          Are you sure you want to delete the category "
          <strong className="font-semibold">{categoryName}</strong>"?
        </p>
        <p className="text-sm text-slate-500 mt-3">
          All items currently in this category will be reassigned to a category
          named "<strong className="font-medium">Non Assigned</strong>".
        </p>
        <p className="text-sm text-slate-500 mt-2">
          This action cannot be undone.
        </p>
      </div>
    </Modal>
  );
};

export default DeleteCategoryModal;
