import React from "react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  color = "text-blue-600",
  className = "",
}) => {
  let sizeClasses = "";
  switch (size) {
    case "sm":
      sizeClasses = "h-5 w-5";
      break;
    case "md":
      sizeClasses = "h-8 w-8";
      break;
    case "lg":
      sizeClasses = "h-12 w-12";
      break;
    default:
      sizeClasses = "h-8 w-8";
  }

  return (
    <svg
      className={`animate-spin ${sizeClasses} ${color} ${className}`}
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
  );
};

export default Spinner;
