import React, { forwardRef } from "react";
import { borderRadius, colorTokens, typography } from "../../design-system";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  // Design system props
  variant?: "default" | "primary" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";

  // Enhanced functionality
  label?: string;
  description?: string;

  // State props
  error?: string;
  hint?: string;

  // Custom styling
  className?: string;
  testId?: string;
}

export interface RadioGroupProps {
  // Design system props
  variant?: "default" | "primary" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";

  // Group functionality
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;

  // Layout
  direction?: "vertical" | "horizontal";

  // Group state props
  label?: string;
  description?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;

  // Custom styling
  className?: string;
  testId?: string;
}

const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      variant = "default",
      size = "md",
      label,
      description,
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
    const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;

    // Size styles
    const sizeClasses = {
      sm: {
        radio: "h-4 w-4",
        indicator: "h-2 w-2",
        label: typography.fontSize.sm,
        description: typography.fontSize.xs,
      },
      md: {
        radio: "h-5 w-5",
        indicator: "h-2.5 w-2.5",
        label: typography.fontSize.base,
        description: typography.fontSize.sm,
      },
      lg: {
        radio: "h-6 w-6",
        indicator: "h-3 w-3",
        label: typography.fontSize.lg,
        description: typography.fontSize.base,
      },
    };

    // Variant styles
    const variantClasses = {
      default: {
        unchecked:
          "border-border-primary bg-background-primary hover:border-border-focus",
        checked: "border-primary-500 bg-background-primary",
        indicator: "bg-primary-500",
        focus: "ring-2 ring-primary-500/20",
      },
      primary: {
        unchecked:
          "border-primary-300 bg-background-primary hover:border-primary-400",
        checked: "border-primary-600 bg-background-primary",
        indicator: "bg-primary-600",
        focus: "ring-2 ring-primary-500/20",
      },
      success: {
        unchecked:
          "border-success-300 bg-background-primary hover:border-success-400",
        checked: "border-success-600 bg-background-primary",
        indicator: "bg-success-600",
        focus: "ring-2 ring-success-500/20",
      },
      warning: {
        unchecked:
          "border-warning-300 bg-background-primary hover:border-warning-400",
        checked: "border-warning-600 bg-background-primary",
        indicator: "bg-warning-600",
        focus: "ring-2 ring-warning-500/20",
      },
      error: {
        unchecked:
          "border-error-300 bg-background-primary hover:border-error-400",
        checked: "border-error-600 bg-background-primary",
        indicator: "bg-error-600",
        focus: "ring-2 ring-error-500/20",
      },
    };

    // Error state classes
    const errorStateClasses = error ? "border-error-500" : "";

    // Disabled state classes
    const disabledClasses = disabled
      ? "opacity-50 cursor-not-allowed"
      : "cursor-pointer";

    const radioClasses = `
      ${sizeClasses[size].radio}
      rounded-full
      border-2 
      transition-all duration-200 ease-in-out
      flex items-center justify-center
      focus:outline-none
      ${errorStateClasses || variantClasses[variant].unchecked}
      ${checked && !error ? variantClasses[variant].checked : ""}
      ${disabledClasses}
    `;

    const containerClasses = `
      flex items-start gap-3
      ${disabled ? "opacity-50" : ""}
      ${className}
    `;

    return (
      <div className={containerClasses}>
        {/* Hidden native radio */}
        <input
          ref={ref}
          type="radio"
          id={radioId}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className="sr-only"
          data-testid={testId}
          {...props}
        />

        {/* Custom radio */}
        <label
          htmlFor={radioId}
          className={`
            relative 
            ${radioClasses}
            focus-within:${variantClasses[variant].focus}
          `}
        >
          {/* Radio Indicator */}
          {checked && (
            <div
              className={`
                ${sizeClasses[size].indicator}
                rounded-full
                ${variantClasses[variant].indicator}
              `}
            />
          )}
        </label>

        {/* Label and Description */}
        {(label || description) && (
          <div className="flex-1 min-w-0">
            {label && (
              <label
                htmlFor={radioId}
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

Radio.displayName = "Radio";

// RadioGroup Component
const RadioGroup: React.FC<RadioGroupProps> = ({
  variant = "default",
  size = "md",
  name,
  options,
  value,
  onChange,
  direction = "vertical",
  label,
  description,
  error,
  hint,
  disabled = false,
  required = false,
  className = "",
  testId,
}) => {
  const groupId = `radio-group-${Math.random().toString(36).substr(2, 9)}`;

  const containerClasses = `
    ${className}
  `;

  const optionsContainerClasses = `
    ${direction === "horizontal" ? "flex flex-wrap gap-6" : "space-y-3"}
  `;

  return (
    <fieldset className={containerClasses} data-testid={testId}>
      {/* Group Label */}
      {label && (
        <legend
          className={`block ${typography.fontSize.base} font-medium text-text-primary mb-3`}
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </legend>
      )}

      {/* Group Description */}
      {description && (
        <p className={`${typography.fontSize.sm} text-text-secondary mb-4`}>
          {description}
        </p>
      )}

      {/* Radio Options */}
      <div
        className={optionsContainerClasses}
        role="radiogroup"
        aria-labelledby={label ? `${groupId}-label` : undefined}
      >
        {options.map((option) => (
          <Radio
            key={option.value}
            variant={variant}
            size={size}
            name={name}
            value={option.value}
            label={option.label}
            description={option.description}
            checked={value === option.value}
            disabled={disabled || option.disabled}
            onChange={() => onChange(option.value)}
            error={error}
          />
        ))}
      </div>

      {/* Group Helper Text */}
      {(error || hint) && (
        <div className="mt-3">
          {error && (
            <p
              className={`${typography.fontSize.sm} text-error-600 flex items-center`}
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
            <p className={`${typography.fontSize.sm} text-text-secondary`}>
              {hint}
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
};

export default Radio;
export { RadioGroup };
