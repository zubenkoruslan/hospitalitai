import React from "react";

// Simple Error Message
interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void; // Optional onDismiss prop
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onDismiss }) => (
  <div
    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4"
    role="alert"
  >
    <strong className="font-bold">Error: </strong>
    <span className="block sm:inline">{message}</span>
    {onDismiss && (
      <button
        onClick={onDismiss}
        className="absolute top-0 bottom-0 right-0 px-4 py-3"
        aria-label="Dismiss error"
      >
        <span className="text-xl font-bold text-red-700 hover:text-red-900">
          &times;
        </span>
      </button>
    )}
  </div>
);

export default ErrorMessage;
