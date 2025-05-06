import React from "react";

type ButtonVariant = "primary" | "secondary" | "success" | "destructive"; // Added destructive

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: ButtonVariant;
  disabled?: boolean;
  className?: string; // Allow overriding or adding classes
  type?: "button" | "submit" | "reset";
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = "primary", // Default to primary
  disabled = false,
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
      disabled={disabled}
      className={combinedClassName}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
