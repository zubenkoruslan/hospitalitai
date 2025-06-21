import React, { forwardRef, useState, useRef, useEffect } from "react";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import { borderRadius, typography } from "../../design-system";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  // Design system props
  variant?: "default" | "filled" | "outlined";
  size?: "sm" | "md" | "lg";

  // Enhanced functionality
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  multiSelect?: boolean;
  clearable?: boolean;

  // State props
  error?: string;
  hint?: string;
  label?: string;

  // Icons
  leftIcon?: React.ComponentType<{ className?: string }>;

  // Custom styling
  className?: string;
  testId?: string;

  // Event handlers
  onSelectionChange?: (value: string | string[]) => void;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      variant = "default",
      size = "md",
      options = [],
      placeholder = "Select an option...",
      searchable = false,
      multiSelect = false,
      clearable = false,
      error,
      hint,
      label,
      leftIcon: LeftIcon,
      className = "",
      testId,
      onSelectionChange,
      value,
      disabled = false,
      required = false,
      id,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedValues, setSelectedValues] = useState<string[]>(
      multiSelect
        ? Array.isArray(value)
          ? value
          : value
          ? [value]
          : []
        : value
        ? [value as string]
        : []
    );

    const selectRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Handle clicks outside to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          selectRef.current &&
          !selectRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
          setSearchTerm("");
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen]);

    // Filter options based on search term
    const filteredOptions =
      searchable && searchTerm
        ? options.filter((option) =>
            option.label.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : options;

    // Get display value for the select
    const getDisplayValue = () => {
      if (selectedValues.length === 0) return placeholder;

      if (multiSelect) {
        if (selectedValues.length === 1) {
          return (
            options.find((opt) => opt.value === selectedValues[0])?.label || ""
          );
        }
        return `${selectedValues.length} selected`;
      }

      return (
        options.find((opt) => opt.value === selectedValues[0])?.label || ""
      );
    };

    // Handle option selection
    const handleOptionSelect = (optionValue: string) => {
      let newSelectedValues: string[];

      if (multiSelect) {
        if (selectedValues.includes(optionValue)) {
          newSelectedValues = selectedValues.filter(
            (val) => val !== optionValue
          );
        } else {
          newSelectedValues = [...selectedValues, optionValue];
        }
      } else {
        newSelectedValues = [optionValue];
        setIsOpen(false);
      }

      setSelectedValues(newSelectedValues);

      const returnValue = multiSelect
        ? newSelectedValues
        : newSelectedValues[0] || "";
      onSelectionChange?.(returnValue);
    };

    // Handle clear selection
    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedValues([]);
      onSelectionChange?.(multiSelect ? [] : "");
    };

    // Base classes
    const baseClasses = `
      relative w-full cursor-pointer focus-within:outline-none
      transition-all duration-200 ease-in-out
    `;

    // Variant styles
    const variantClasses = {
      default: `
        bg-background-primary border border-border-primary 
        hover:border-border-focus focus-within:border-border-focus 
        focus-within:ring-2 focus-within:ring-primary-500/20
      `,
      filled: `
        bg-background-secondary border border-transparent
        hover:bg-background-tertiary focus-within:bg-background-primary
        focus-within:border-border-focus focus-within:ring-2 focus-within:ring-primary-500/20
      `,
      outlined: `
        bg-transparent border-2 border-border-primary
        hover:border-border-focus focus-within:border-primary-500
        focus-within:ring-2 focus-within:ring-primary-500/20
      `,
    };

    // Size styles
    const sizeClasses = {
      sm: {
        trigger: `px-3 py-1.5 ${borderRadius.sm} ${typography.fontSize.sm}`,
        icon: "h-4 w-4",
        option: `px-3 py-1.5 ${typography.fontSize.sm}`,
      },
      md: {
        trigger: `px-4 py-2 ${borderRadius.md} ${typography.fontSize.base}`,
        icon: "h-5 w-5",
        option: `px-4 py-2 ${typography.fontSize.base}`,
      },
      lg: {
        trigger: `px-5 py-2.5 ${borderRadius.lg} ${typography.fontSize.lg}`,
        icon: "h-6 w-6",
        option: `px-5 py-2.5 ${typography.fontSize.lg}`,
      },
    };

    // Error/success state classes
    const stateClasses = error
      ? "border-error-500 focus-within:border-error-500 focus-within:ring-error-500/20"
      : "";

    const triggerClasses = `
      ${baseClasses}
      ${variantClasses[variant]}
      ${sizeClasses[size].trigger}
      ${stateClasses}
      ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      ${className}
    `;

    const dropdownClasses = `
      absolute top-full left-0 right-0 mt-1 
      bg-background-primary border border-border-primary 
      ${borderRadius.md} shadow-lg z-50
      max-h-60 overflow-y-auto
    `;

    const optionClasses = (isSelected: boolean, isDisabled: boolean) => `
      ${sizeClasses[size].option}
      flex items-center justify-between
      cursor-pointer transition-colors duration-150
      ${
        isSelected
          ? "bg-primary-50 text-primary-700"
          : "text-text-primary hover:bg-background-secondary"
      }
      ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
    `;

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className={`block ${typography.fontSize.sm} font-medium text-text-primary mb-1`}
          >
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}

        {/* Select Container */}
        <div ref={selectRef} className="relative">
          {/* Hidden native select for form compatibility */}
          <select
            ref={ref}
            id={id}
            value={multiSelect ? undefined : selectedValues[0] || ""}
            disabled={disabled}
            required={required}
            className="sr-only"
            data-testid={testId}
            {...props}
          >
            {!multiSelect && <option value="">Select...</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Custom Select Trigger */}
          <div
            className={triggerClasses}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-labelledby={label ? `${id}-label` : undefined}
          >
            <div className="flex items-center min-h-0 w-full">
              {/* Left Icon */}
              {LeftIcon && (
                <LeftIcon
                  className={`${sizeClasses[size].icon} text-text-secondary mr-2 flex-shrink-0`}
                />
              )}

              {/* Display Value */}
              <span
                className={`flex-1 truncate ${
                  selectedValues.length === 0
                    ? "text-text-secondary"
                    : "text-text-primary"
                }`}
              >
                {getDisplayValue()}
              </span>

              {/* Clear Button */}
              {clearable && selectedValues.length > 0 && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-background-secondary"
                  aria-label="Clear selection"
                >
                  <svg
                    className={sizeClasses[size].icon}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}

              {/* Dropdown Icon */}
              <ChevronDownIcon
                className={`${
                  sizeClasses[size].icon
                } text-text-secondary flex-shrink-0 ml-2 transform transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>

          {/* Dropdown */}
          {isOpen && (
            <div className={dropdownClasses}>
              {/* Search Input */}
              {searchable && (
                <div className="p-3 border-b border-border-primary">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search options..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full px-3 py-1.5 ${borderRadius.sm} ${typography.fontSize.sm} border border-border-primary focus:outline-none focus:border-primary-500`}
                    autoFocus
                  />
                </div>
              )}

              {/* Options */}
              <div role="listbox" aria-multiselectable={multiSelect}>
                {filteredOptions.length === 0 ? (
                  <div
                    className={`${sizeClasses[size].option} text-text-secondary italic`}
                  >
                    {searchTerm ? "No options found" : "No options available"}
                  </div>
                ) : (
                  filteredOptions.map((option) => {
                    const isSelected = selectedValues.includes(option.value);

                    return (
                      <div
                        key={option.value}
                        className={optionClasses(
                          isSelected,
                          option.disabled || false
                        )}
                        onClick={() =>
                          !option.disabled && handleOptionSelect(option.value)
                        }
                        role="option"
                        aria-selected={isSelected}
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          {/* Option Icon */}
                          {option.icon && (
                            <option.icon
                              className={`${sizeClasses[size].icon} mr-2 flex-shrink-0`}
                            />
                          )}

                          {/* Option Label */}
                          <span className="truncate">{option.label}</span>
                        </div>

                        {/* Selected Indicator */}
                        {isSelected && (
                          <CheckIcon
                            className={`${sizeClasses[size].icon} text-primary-600 flex-shrink-0 ml-2`}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Helper Text */}
        {(error || hint) && (
          <div className={`mt-1 ${typography.fontSize.sm}`}>
            {error && (
              <p className="text-error-600 flex items-center">
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
            {hint && !error && <p className="text-text-secondary">{hint}</p>}
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
