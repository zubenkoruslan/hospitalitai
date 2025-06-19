import React, { forwardRef } from "react";
import {
  colorTokens,
  spacing,
  typography,
  borderRadius,
} from "../../design-system";

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  id: string;
  error?: string;
  hint?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "filled" | "outlined";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  testId?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      id,
      error,
      hint,
      size = "md",
      variant = "default",
      leftIcon,
      rightIcon,
      isLoading = false,
      disabled = false,
      className = "",
      testId,
      ...props
    },
    ref
  ) => {
    // Base input styles optimized for design system
    const baseInputStyles = `
    w-full transition-all duration-200 ease-out
    placeholder:text-text-tertiary
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus-ring
  `;

    // Size-based styles (20% smaller)
    const sizeStyles = {
      sm: `px-3 py-1.5 ${typography.fontSize.xs[0]} min-h-[${spacing[8]}]`,
      md: `px-4 py-2 ${typography.fontSize.sm[0]} min-h-[${spacing[10]}]`,
      lg: `px-5 py-2.5 ${typography.fontSize.base[0]} min-h-[${spacing[12]}]`,
    };

    // Variant-specific styles using design tokens
    const variantStyles = {
      default: `
      bg-background-tertiary border border-border-primary
      hover:border-border-secondary focus:border-primary-500
      ${borderRadius.lg}
    `,
      filled: `
      bg-background-secondary border border-transparent
      hover:bg-background-primary focus:bg-background-tertiary
      focus:border-primary-500 ${borderRadius.lg}
    `,
      outlined: `
      bg-transparent border-2 border-border-primary
      hover:border-border-secondary focus:border-primary-500
      ${borderRadius.lg}
    `,
    };

    // Error states
    const errorStyles = error
      ? `
    border-error-500 focus:border-error-500 focus-ring-error
    bg-error-50/50
  `
      : "";

    // Icon spacing adjustments
    const iconSpacing = {
      left: leftIcon ? "pl-10" : "",
      right: rightIcon ? "pr-10" : "",
    };

    // Label styles (20% smaller)
    const labelStyles = `
    block ${typography.fontSize.sm[0]} font-medium text-text-primary mb-1
    ${error ? "text-error-600" : ""}
  `;

    // Error message styles
    const errorMessageStyles = `
    mt-1 ${typography.fontSize.xs[0]} text-error-600 flex items-center gap-1
  `;

    // Hint styles
    const hintStyles = `
    mt-1 ${typography.fontSize.xs[0]} text-text-tertiary
  `;

    const combinedInputClassName = `
    ${baseInputStyles}
    ${sizeStyles[size]}
    ${variantStyles[variant]}
    ${errorStyles}
    ${iconSpacing.left}
    ${iconSpacing.right}
    ${className}
  `
      .trim()
      .replace(/\s+/g, " ");

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label htmlFor={id} className={labelStyles}>
            {label}
            {props.required && (
              <span className="text-error-500 ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        {/* Input container */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary">
              {leftIcon}
            </div>
          )}

          {/* Input field */}
          <input
            ref={ref}
            id={id}
            disabled={disabled || isLoading}
            className={combinedInputClassName}
            data-testid={testId}
            aria-invalid={!!error}
            aria-describedby={
              [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
                .filter(Boolean)
                .join(" ") || undefined
            }
            {...props}
          />

          {/* Right icon or loading spinner */}
          {(rightIcon || isLoading) && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-tertiary">
              {isLoading ? (
                <svg
                  className="animate-spin h-4 w-4"
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
              ) : (
                rightIcon
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div
            id={`${id}-error`}
            className={errorMessageStyles}
            role="alert"
            aria-live="polite"
          >
            <svg
              className="h-4 w-4 flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}

        {/* Hint message */}
        {hint && !error && (
          <div id={`${id}-hint`} className={hintStyles}>
            {hint}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
