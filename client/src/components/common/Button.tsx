import React from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "destructive"
  | "white"; // Added white variant

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: ButtonVariant;
  disabled?: boolean;
  isLoading?: boolean; // <-- New prop
  className?: string; // Allow overriding or adding classes
  type?: "button" | "submit" | "reset";
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = "primary", // Default to primary
  disabled = false,
  isLoading = false, // <-- New prop default
  className = "",
  type = "button",
  ...props // Pass down other button attributes like aria-label, etc.
}) => {
  // Base styles common to all buttons
  const baseStyles =
    "px-4 py-2 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition ease-in-out duration-150";

  // Variant-specific styles
  let variantStyles = "";
  switch (variant) {
    case "secondary":
      variantStyles =
        "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500"; // Using indigo focus for secondary as discussed
      break;
    case "success":
      variantStyles =
        "border border-transparent text-white bg-green-600 hover:bg-green-700 focus:ring-green-500";
      break;
    case "destructive": // Added destructive style
      variantStyles =
        "border border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500";
      break;
    case "white": // Added white style
      variantStyles =
        "border border-transparent text-blue-600 bg-white hover:bg-gray-100 focus:ring-blue-500";
      break;
    case "primary": // Default case
    default:
      variantStyles =
        "border border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500";
      break;
  }

  const combinedClassName = `${baseStyles} ${variantStyles} ${className}`;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading} // <-- Disable if isLoading
      className={combinedClassName}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Processing...
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
