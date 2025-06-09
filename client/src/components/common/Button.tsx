import React from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "success"
  | "destructive"
  | "white"
  | "ghost"
  | "gradient";

type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  isLoading = false,
  className = "",
  type = "button",
  fullWidth = false,
  icon,
  iconPosition = "left",
  ...props
}) => {
  // Base styles for all buttons with modern Apple-inspired design
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] backdrop-blur-sm";

  // Size-based styles
  const sizeStyles = {
    sm: "px-3 py-2 text-xs gap-1.5 min-h-[32px]",
    md: "px-4 py-2.5 text-sm gap-2 min-h-[40px]",
    lg: "px-6 py-3 text-base gap-2.5 min-h-[48px]",
  };

  // Variant-specific styles with brand colors
  const variantStyles = {
    primary:
      "bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl hover:shadow-primary/25 focus:ring-primary/50 border border-primary/20",
    secondary:
      "bg-gradient-to-r from-muted-gray to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white shadow-lg hover:shadow-xl hover:shadow-slate/25 focus:ring-slate-500/50 border border-slate/20",
    accent:
      "bg-gradient-to-r from-accent to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white shadow-lg hover:shadow-xl hover:shadow-accent/25 focus:ring-accent/50 border border-accent/20",
    success:
      "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl hover:shadow-green/25 focus:ring-green-500/50 border border-green/20",
    destructive:
      "bg-gradient-to-r from-secondary to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-white shadow-lg hover:shadow-xl hover:shadow-secondary/25 focus:ring-secondary/50 border border-secondary/20",
    white:
      "bg-white/90 hover:bg-white text-dark-slate shadow-lg hover:shadow-xl border border-slate-200/50 hover:border-slate-300/50 focus:ring-primary/50",
    ghost:
      "bg-transparent hover:bg-slate-100/50 text-muted-gray hover:text-dark-slate focus:ring-primary/50 border border-transparent hover:border-slate-200/50",
    gradient:
      "bg-gradient-to-r from-primary via-accent to-secondary hover:from-primary-600 hover:via-accent-600 hover:to-secondary-600 text-white shadow-lg hover:shadow-xl focus:ring-primary/50 border border-white/20",
  };

  // Full width style
  const widthStyle = fullWidth ? "w-full" : "";

  // Hover transform styles
  const transformStyles = "hover:scale-[1.02] hover:-translate-y-0.5";

  // Loading spinner color based on variant
  const getSpinnerColor = (variant: ButtonVariant) => {
    switch (variant) {
      case "white":
      case "ghost":
        return "text-dark-slate";
      default:
        return "text-white";
    }
  };

  const combinedClassName = `
    ${baseStyles}
    ${sizeStyles[size]}
    ${variantStyles[variant]}
    ${widthStyle}
    ${transformStyles}
    ${className}
  `
    .trim()
    .replace(/\s+/g, " ");

  const spinnerColor = getSpinnerColor(variant);

  const buttonContent = () => {
    if (isLoading) {
      return (
        <span className="flex items-center justify-center">
          <svg
            className={`animate-spin h-4 w-4 ${spinnerColor} ${
              children ? "mr-2" : ""
            }`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {children && <span>Loading...</span>}
        </span>
      );
    }

    if (icon) {
      return (
        <>
          {iconPosition === "left" && (
            <span className="flex-shrink-0">{icon}</span>
          )}
          {children}
          {iconPosition === "right" && (
            <span className="flex-shrink-0">{icon}</span>
          )}
        </>
      );
    }

    return children;
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={combinedClassName}
      {...props}
    >
      {buttonContent()}
    </button>
  );
};

export default Button;
