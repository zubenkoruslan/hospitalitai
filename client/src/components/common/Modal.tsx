import React, { useEffect, useRef } from "react";
import {
  colorTokens,
  spacing,
  typography,
  borderRadius,
} from "../../design-system";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  variant?: "default" | "primary" | "accent" | "destructive";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  testId?: string;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = "md",
  variant = "default",
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  testId,
  className = "",
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Size-based styles (20% smaller)
  const sizeClasses = {
    sm: "max-w-sm", // ~20% smaller than standard
    md: "max-w-md", // ~20% smaller than standard
    lg: "max-w-lg", // ~20% smaller than standard
    xl: "max-w-2xl", // ~20% smaller than standard
    full: "max-w-[95vw] max-h-[95vh]",
  };

  // Variant-based styling using design tokens
  const variantClasses = {
    default: `
      bg-background-tertiary border border-border-primary
      shadow-xl
    `,
    primary: `
      bg-gradient-to-br from-primary-50 to-primary-100
      border border-primary-200 shadow-xl
    `,
    accent: `
      bg-gradient-to-br from-accent-50 to-accent-100
      border border-accent-200 shadow-xl
    `,
    destructive: `
      bg-gradient-to-br from-error-50 to-error-100
      border border-error-200 shadow-xl
    `,
  };

  // Title styling based on variant (20% smaller)
  const getTitleClasses = (variant: string) => {
    const baseTitleClasses = `font-semibold ${typography.fontSize.lg[0]} mb-3 tracking-tight`;

    const colorMap = {
      default: "text-text-primary",
      primary: "text-primary-700",
      accent: "text-accent-700",
      destructive: "text-error-700",
    };

    return `${baseTitleClasses} ${colorMap[variant as keyof typeof colorMap]}`;
  };

  // Close button styling based on variant
  const getCloseButtonClasses = (variant: string) => {
    const baseClasses = `
      absolute top-3 right-3 p-1.5 rounded-lg transition-all duration-200
      hover:scale-110 active:scale-95 focus:outline-none focus-ring
    `;

    const colorMap = {
      default:
        "text-text-secondary hover:text-text-primary hover:bg-background-secondary",
      primary: "text-primary-600 hover:text-primary-700 hover:bg-primary-100",
      accent: "text-accent-600 hover:text-accent-700 hover:bg-accent-100",
      destructive: "text-error-600 hover:text-error-700 hover:bg-error-100",
    };

    return `${baseClasses} ${colorMap[variant as keyof typeof colorMap]}`;
  };

  // Modal content classes
  const modalClasses = `
    ${borderRadius["2xl"]} p-5 w-full mx-4 my-8 relative
    transform transition-all duration-300 ease-out
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${className}
  `
    .trim()
    .replace(/\s+/g, " ");

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, closeOnEscape, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      data-testid={testId}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-text-primary/60 backdrop-blur-sm"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={modalClasses}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        tabIndex={-1}
        style={{ animation: "slide-up 0.3s ease-out forwards" }}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between mb-4">
            {title && (
              <h2 id="modal-title" className={getTitleClasses(variant)}>
                {title}
              </h2>
            )}

            {showCloseButton && (
              <button
                onClick={onClose}
                className={getCloseButtonClasses(variant)}
                aria-label="Close modal"
                type="button"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="relative max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
