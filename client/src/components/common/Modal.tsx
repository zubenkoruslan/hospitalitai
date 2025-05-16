import React, { ReactNode, useEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footerContent?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl"; // Add more sizes as needed
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footerContent,
  size = "md", // Default size
}) => {
  const modalRef = useRef<HTMLDivElement>(null); // Ref for the modal content

  // Handle Escape key press for closing the modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Set initial focus to the modal container or a specific element
      // For simplicity, focusing the modal content div itself.
      // A more robust solution might focus the first interactive element or the close button.
      modalRef.current?.focus();
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-xl",
    xl: "max-w-3xl",
    "2xl": "max-w-5xl",
  };

  // Stop propagation prevents closing modal when clicking inside the modal content
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Stop propagation for keys that might trigger overlay actions if they bubble
    // e.g., if overlay has onKeyDown for Enter/Space to close.
    // This ensures that pressing Enter/Space inside the modal content area
    // doesn't inadvertently close the modal if those keys are also handled by the overlay.
    if (e.key === "Enter" || e.key === " ") {
      e.stopPropagation();
    }
    // Add other specific key stopPropagation if needed, e.g. Escape, Tab (though Tab is usually for focus)
  };

  const handleOverlayKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out animate-fade-in-short"
      onClick={onClose} // Close on overlay click
      onKeyDown={handleOverlayKeyDown} // Handle Enter/Space for overlay
      role="button" // Overlay acts as a clickable area to close
      tabIndex={0} // Make overlay focusable for keydown
      aria-label="Close modal" // Accessible name for the overlay acting as a close button
    >
      {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={modalRef} // Assign ref
        role="dialog" // The actual dialog content
        aria-modal="true"
        aria-labelledby={
          typeof title === "string" && title ? "modal-title" : undefined
        }
        tabIndex={-1} // Make the modal content focusable for programmatic focus
        className={`bg-white rounded-xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 ease-in-out animate-slide-up-fast`}
        onClick={handleContentClick} // Prevent closing when clicking modal content
        onKeyDown={handleContentKeyDown} // Added to satisfy click-events-have-key-events
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-200">
          {title ? (
            typeof title === "string" ? (
              <h2
                id="modal-title"
                className="text-xl font-semibold text-slate-700"
              >
                {title}
              </h2>
            ) : (
              <div className="text-xl font-semibold text-slate-700">
                {title}
              </div>
            )
          ) : (
            <div /> // Empty div to keep space for close button
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 rounded-full p-1.5 transition-colors duration-150 ease-in-out"
            aria-label="Close modal"
          >
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-600">
          {children}
        </div>

        {/* Footer */}
        {footerContent && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
            {footerContent}
          </div>
        )}
      </div>
      {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions */}
    </div>
  );
};

export default Modal;

// Add animation styles if not already globally defined
// Consider moving these to a global CSS file if used elsewhere
// For now, keeping it here for simplicity if Modal is the primary user of these animations
const modalStyles = `
  @keyframes fadeInShort {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .animate-fade-in-short {
    animation: fadeInShort 0.2s ease-out forwards;
  }
  @keyframes slideUpFast {
    from { opacity: 0.8; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-slide-up-fast {
    animation: slideUpFast 0.2s ease-out forwards;
  }
`;

// Inject styles into the head - This is a common pattern for component-specific global styles
// but might be better handled by your global CSS setup or a CSS-in-JS solution.
// For now, keeping it here for simplicity if Modal is the primary user of these animations
if (typeof window !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = modalStyles;
  document.head.appendChild(styleSheet);
}
