import React, { forwardRef } from "react";
import { CheckIcon, MinusIcon } from "@heroicons/react/24/outline";
import { borderRadius, typography } from "../../design-system";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  // Design system props
  variant?: "default" | "primary" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";

  // Enhanced functionality
  label?: string;
  description?: string;
  indeterminate?: boolean;

  // State props
  error?: string;
  hint?: string;

  // Custom styling
  className?: string;
  testId?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      variant = "default",
      size = "md",
      label,
      description,
      indeterminate = false,
      error,
      hint,
      className = "",
      testId,
      disabled = false,
      required = false,
      id,
      checked = false,
      onChange,
      ...props
    },
    ref
  ) => {
    // Generate unique ID if not provided
    const checkboxId =
      id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    // Size styles
    const sizeClasses = {
      sm: {
        checkbox: "h-4 w-4",
        icon: "h-3 w-3",
        label: typography.fontSize.sm,
        description: typography.fontSize.xs,
      },
      md: {
        checkbox: "h-5 w-5",
        icon: "h-4 w-4",
        label: typography.fontSize.base,
        description: typography.fontSize.sm,
      },
      lg: {
        checkbox: "h-6 w-6",
        icon: "h-5 w-5",
        label: typography.fontSize.lg,
        description: typography.fontSize.base,
      },
    };

    // Variant styles
    const variantClasses = {
      default: {
        unchecked:
          "border-border-primary bg-background-primary hover:border-border-focus",
        checked: "border-primary-500 bg-primary-500 text-white",
        focus: "ring-2 ring-primary-500/20",
      },
      primary: {
        unchecked:
          "border-primary-300 bg-background-primary hover:border-primary-400",
        checked: "border-primary-600 bg-primary-600 text-white",
        focus: "ring-2 ring-primary-500/20",
      },
      success: {
        unchecked:
          "border-success-300 bg-background-primary hover:border-success-400",
        checked: "border-success-600 bg-success-600 text-white",
        focus: "ring-2 ring-success-500/20",
      },
      warning: {
        unchecked:
          "border-warning-300 bg-background-primary hover:border-warning-400",
        checked: "border-warning-600 bg-warning-600 text-white",
        focus: "ring-2 ring-warning-500/20",
      },
      error: {
        unchecked:
          "border-error-300 bg-background-primary hover:border-error-400",
        checked: "border-error-600 bg-error-600 text-white",
        focus: "ring-2 ring-error-500/20",
      },
    };

    // Error state classes
    const errorStateClasses = error ? "border-error-500" : "";

    // Disabled state classes
    const disabledClasses = disabled
      ? "opacity-50 cursor-not-allowed"
      : "cursor-pointer";

    const checkboxClasses = `
      ${sizeClasses[size].checkbox}
      ${borderRadius.sm}
      border-2 
      transition-all duration-200 ease-in-out
      flex items-center justify-center
      focus:outline-none
      ${errorStateClasses || variantClasses[variant].unchecked}
      ${
        (checked || indeterminate) && !error
          ? variantClasses[variant].checked
          : ""
      }
      ${disabledClasses}
    `;

    const containerClasses = `
      flex items-start gap-3
      ${disabled ? "opacity-50" : ""}
      ${className}
    `;

    return (
      <div className={containerClasses}>
        {/* Hidden native checkbox */}
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className="sr-only"
          data-testid={testId}
          {...props}
        />

        {/* Custom checkbox */}
        <label
          htmlFor={checkboxId}
          className={`
            relative 
            ${checkboxClasses}
            focus-within:${variantClasses[variant].focus}
          `}
        >
          {/* Check/Indeterminate Icon */}
          {(checked || indeterminate) && (
            <div className="absolute inset-0 flex items-center justify-center">
              {indeterminate ? (
                <MinusIcon className={sizeClasses[size].icon} />
              ) : (
                <CheckIcon className={sizeClasses[size].icon} />
              )}
            </div>
          )}
        </label>

        {/* Label and Description */}
        {(label || description) && (
          <div className="flex-1 min-w-0">
            {label && (
              <label
                htmlFor={checkboxId}
                className={`
                  block font-medium cursor-pointer
                  ${sizeClasses[size].label}
                  ${error ? "text-error-700" : "text-text-primary"}
                  ${disabled ? "cursor-not-allowed" : ""}
                `}
              >
                {label}
                {required && <span className="text-error-500 ml-1">*</span>}
              </label>
            )}

            {description && (
              <p
                className={`
                  mt-1 
                  ${sizeClasses[size].description}
                  ${error ? "text-error-600" : "text-text-secondary"}
                `}
              >
                {description}
              </p>
            )}
          </div>
        )}

        {/* Helper Text */}
        {(error || hint) && (
          <div className="w-full">
            {error && (
              <p
                className={`mt-1 ${typography.fontSize.sm} text-error-600 flex items-center`}
              >
                <svg
                  className="h-4 w-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </p>
            )}
            {hint && !error && (
              <p
                className={`mt-1 ${typography.fontSize.sm} text-text-secondary`}
              >
                {hint}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
