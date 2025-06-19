import React from "react";
import {
  colorTokens,
  spacing,
  touchTargets,
  typography,
} from "../../design-system";

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
  testId?: string;
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
  testId,
  ...props
}) => {
  // Base styles optimized for design system
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 ease-out focus:outline-none focus-ring disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.96] touch-target";

  // Size-based styles (20% smaller than standard)
  const sizeStyles = {
    sm: `px-3 py-1.5 ${typography.fontSize.xs[0]} gap-1.5 min-h-[${touchTargets.minimum}]`,
    md: `px-4 py-2 ${typography.fontSize.sm[0]} gap-2 min-h-[${touchTargets.comfortable}]`,
    lg: `px-6 py-2.5 ${typography.fontSize.base[0]} gap-2.5 min-h-[${touchTargets.large}]`,
  };

  // Variant-specific styles using design tokens
  const variantStyles = {
    primary: `bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-text-inverse 
              shadow-md hover:shadow-lg hover:shadow-primary-500/25 
              border border-primary-500 hover:border-primary-600`,

    secondary: `bg-text-secondary hover:bg-text-primary text-text-inverse 
                shadow-md hover:shadow-lg hover:shadow-gray-500/25 
                border border-text-secondary hover:border-text-primary`,

    accent: `bg-accent-500 hover:bg-accent-600 active:bg-accent-700 text-text-inverse 
             shadow-md hover:shadow-lg hover:shadow-accent-500/25 
             border border-accent-500 hover:border-accent-600`,

    success: `bg-success-500 hover:bg-success-600 active:bg-success-700 text-text-inverse 
              shadow-md hover:shadow-lg hover:shadow-success-500/25 
              border border-success-500 hover:border-success-600`,

    destructive: `bg-error-500 hover:bg-error-600 active:bg-error-700 text-text-inverse 
                  shadow-md hover:shadow-lg hover:shadow-error-500/25 
                  border border-error-500 hover:border-error-600`,

    white: `bg-background-tertiary hover:bg-background-secondary text-text-primary 
            shadow-md hover:shadow-lg border border-border-primary hover:border-border-secondary`,

    ghost: `bg-transparent hover:bg-background-secondary text-text-secondary hover:text-text-primary 
            border border-transparent hover:border-border-primary`,

    gradient: `bg-gradient-to-r from-primary-500 via-accent-500 to-secondary-500 
               hover:from-primary-600 hover:via-accent-600 hover:to-secondary-600 
               text-text-inverse shadow-md hover:shadow-lg border border-white/20`,
  };

  // Full width style
  const widthStyle = fullWidth ? "w-full" : "";

  // Hover transform styles (optimized for design system)
  const transformStyles = "hover:scale-[1.02] hover:-translate-y-0.5";

  // Loading spinner color based on variant
  const getSpinnerColor = (variant: ButtonVariant) => {
    switch (variant) {
      case "white":
      case "ghost":
        return "text-text-primary";
      default:
        return "text-text-inverse";
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
            aria-hidden="true"
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
            <span className="flex-shrink-0" aria-hidden="true">
              {icon}
            </span>
          )}
          {children}
          {iconPosition === "right" && (
            <span className="flex-shrink-0" aria-hidden="true">
              {icon}
            </span>
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
      data-testid={testId}
      aria-busy={isLoading}
      aria-disabled={disabled || isLoading}
      {...props}
    >
      {buttonContent()}
    </button>
  );
};

export default Button;
