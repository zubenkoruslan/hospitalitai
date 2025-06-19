import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { borderRadius, typography } from "../../design-system";

export interface ToastProps {
  id: string;
  title?: string;
  message: string;
  variant?: "success" | "error" | "warning" | "info";
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: (id: string) => void;
  position?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "bottom-center";
  style?: React.CSSProperties;
}

export interface ToastContextType {
  toasts: ToastProps[];
  addToast: (toast: Omit<ToastProps, "id">) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

// Toast Context
const ToastContext = createContext<ToastContextType | null>(null);

// Toast Component
const Toast: React.FC<ToastProps> = ({
  id,
  title,
  message,
  variant = "info",
  duration = 5000,
  persistent = false,
  action,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Auto-remove toast after duration
  useEffect(() => {
    if (!persistent && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, persistent]);

  // Animate in on mount
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose?.(id);
    }, 300); // Match exit animation duration
  };

  // Variant configurations
  const variantConfig = {
    success: {
      icon: CheckCircleIcon,
      iconColor: "text-success-600",
      borderColor: "border-success-200",
      backgroundColor: "bg-success-50",
      titleColor: "text-success-900",
      messageColor: "text-success-700",
    },
    error: {
      icon: XCircleIcon,
      iconColor: "text-error-600",
      borderColor: "border-error-200",
      backgroundColor: "bg-error-50",
      titleColor: "text-error-900",
      messageColor: "text-error-700",
    },
    warning: {
      icon: ExclamationTriangleIcon,
      iconColor: "text-warning-600",
      borderColor: "border-warning-200",
      backgroundColor: "bg-warning-50",
      titleColor: "text-warning-900",
      messageColor: "text-warning-700",
    },
    info: {
      icon: InformationCircleIcon,
      iconColor: "text-primary-600",
      borderColor: "border-primary-200",
      backgroundColor: "bg-primary-50",
      titleColor: "text-primary-900",
      messageColor: "text-primary-700",
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  const toastClasses = `
    relative flex items-start space-x-3 p-4 
    ${config.backgroundColor} ${config.borderColor}
    border ${borderRadius.lg} shadow-lg backdrop-blur-sm
    transform transition-all duration-300 ease-out
    ${
      isVisible && !isExiting
        ? "opacity-100 translate-x-0 scale-100"
        : "opacity-0 translate-x-full scale-95"
    }
    ${!isVisible ? "translate-y-2" : "translate-y-0"}
    max-w-sm w-full
  `;

  return (
    <div className={toastClasses}>
      {/* Icon */}
      <div className="flex-shrink-0">
        <Icon className={`h-5 w-5 ${config.iconColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <p
            className={`${typography.fontSize.sm} font-medium ${config.titleColor} mb-1`}
          >
            {title}
          </p>
        )}
        <p className={`${typography.fontSize.sm} ${config.messageColor}`}>
          {message}
        </p>

        {/* Action Button */}
        {action && (
          <div className="mt-3">
            <button
              onClick={action.onClick}
              className={`
                ${typography.fontSize.sm} font-medium
                ${config.titleColor} hover:underline
                focus:outline-none focus:underline
              `}
            >
              {action.label}
            </button>
          </div>
        )}
      </div>

      {/* Close Button */}
      {!persistent && (
        <div className="flex-shrink-0">
          <button
            onClick={handleClose}
            className={`
              rounded-md inline-flex ${config.messageColor} 
              hover:${config.titleColor} focus:outline-none 
              focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-50
              transition-colors duration-150
            `}
          >
            <span className="sr-only">Close</span>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Progress Bar (if not persistent) */}
      {!persistent && duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
          <div
            className={`h-full ${
              variant === "success"
                ? "bg-success-500"
                : variant === "error"
                ? "bg-error-500"
                : variant === "warning"
                ? "bg-warning-500"
                : "bg-primary-500"
            } transition-all ease-linear`}
            style={{
              width: "100%",
              animation: `shrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

// Toast Container Component
interface ToastContainerProps {
  position?: ToastProps["position"];
  maxToasts?: number;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  position = "top-right",
  maxToasts = 5,
}) => {
  const toastContext = useContext(ToastContext);

  if (!toastContext) {
    console.warn("ToastContainer must be used within a ToastProvider");
    return null;
  }

  const { toasts, removeToast } = toastContext;

  // Position classes
  const positionClasses = {
    "top-right": "fixed top-4 right-4 z-50",
    "top-left": "fixed top-4 left-4 z-50",
    "bottom-right": "fixed bottom-4 right-4 z-50",
    "bottom-left": "fixed bottom-4 left-4 z-50",
    "top-center": "fixed top-4 left-1/2 transform -translate-x-1/2 z-50",
    "bottom-center": "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50",
  };

  // Limit number of toasts
  const visibleToasts = toasts.slice(0, maxToasts);

  return (
    <div className={positionClasses[position]}>
      <div className="space-y-2">
        {visibleToasts.map((toast, index) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={removeToast}
            style={{
              zIndex: 1000 - index,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Toast Provider Component
interface ToastProviderProps {
  children: React.ReactNode;
  defaultPosition?: ToastProps["position"];
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  defaultPosition = "top-right",
  maxToasts = 5,
}) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = useCallback(
    (toast: Omit<ToastProps, "id">): string => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast: ToastProps = {
        ...toast,
        id,
        position: toast.position || defaultPosition,
      };

      setToasts((prev) => [...prev, newToast]);
      return id;
    },
    [defaultPosition]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer position={defaultPosition} maxToasts={maxToasts} />
    </ToastContext.Provider>
  );
};

// Hook to use toast
export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  const { addToast, removeToast, clearAll } = context;

  // Convenience methods
  const toast = {
    success: (
      message: string,
      options?: Partial<Omit<ToastProps, "id" | "variant" | "message">>
    ) => addToast({ ...options, message, variant: "success" }),

    error: (
      message: string,
      options?: Partial<Omit<ToastProps, "id" | "variant" | "message">>
    ) => addToast({ ...options, message, variant: "error" }),

    warning: (
      message: string,
      options?: Partial<Omit<ToastProps, "id" | "variant" | "message">>
    ) => addToast({ ...options, message, variant: "warning" }),

    info: (
      message: string,
      options?: Partial<Omit<ToastProps, "id" | "variant" | "message">>
    ) => addToast({ ...options, message, variant: "info" }),

    custom: (toast: Omit<ToastProps, "id">) => addToast(toast),

    dismiss: removeToast,
    dismissAll: clearAll,
  };

  return toast;
};

export default Toast;
