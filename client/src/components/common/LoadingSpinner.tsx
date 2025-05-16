import React from "react";

interface LoadingSpinnerProps {
  message?: string;
}

// Simple Loading Spinner
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => (
  <div
    className="flex flex-col justify-center items-center p-4"
    data-testid="loading-spinner-container"
    role="status"
  >
    <svg
      className="animate-spin h-8 w-8 text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      data-testid="loading-spinner"
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
    {message && (
      <p className="mt-3 text-sm text-gray-600" data-testid="loading-message">
        {message}
      </p>
    )}
  </div>
);

export default LoadingSpinner;
