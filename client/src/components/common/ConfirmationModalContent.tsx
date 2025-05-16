import React from "react";
import Button from "./Button";

interface ConfirmationModalContentProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmButtonVariant?: "primary" | "secondary" | "success" | "destructive";
  isLoadingConfirm?: boolean;
}

const ConfirmationModalContent: React.FC<ConfirmationModalContentProps> = ({
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonVariant = "primary",
  isLoadingConfirm = false,
}) => {
  return (
    <div className="space-y-4">
      {/* The main Modal component will render its own title if provided via its own props.
          This title here is for the content area if needed, but usually,
          the Modal's top-level title prop is sufficient.
          We can leave this logic here if specific content needs a sub-header.
          For now, we'll assume the parent Modal provides the main title.
      */}
      {/* {title && <h3 className="text-lg font-medium text-gray-900">{title}</h3>} */}
      <p className="text-sm text-gray-600">{message}</p>
      <div className="flex justify-end space-x-3 pt-3">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isLoadingConfirm}
        >
          {cancelText}
        </Button>
        <Button
          variant={confirmButtonVariant}
          onClick={onConfirm}
          isLoading={isLoadingConfirm}
        >
          {confirmText}
        </Button>
      </div>
    </div>
  );
};

export default ConfirmationModalContent;
