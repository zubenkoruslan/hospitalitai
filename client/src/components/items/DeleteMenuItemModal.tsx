import React from "react";
import Button from "../common/Button";
import Modal from "../common/Modal";

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
  const footer = (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="destructive"
        onClick={onConfirm}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Deleting..." : "Delete Item"}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Deletion"
      size="md"
      footerContent={footer}
    >
      <p className="text-slate-600 text-center text-lg">
        Are you sure you want to delete the item "
        <strong className="font-semibold">{itemName}</strong>"?
        <br />
        <span className="text-sm text-slate-500 mt-1 block">
          This action cannot be undone.
        </span>
      </p>
    </Modal>
  );
};

export default DeleteMenuItemModal;
