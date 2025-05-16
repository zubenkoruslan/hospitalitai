import React from "react";

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string; // Allow additional custom classes
  "data-testid"?: string; // Support for data-testid
  // Could add footer prop later if needed
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  className = "",
  "data-testid": dataTestId, // Destructure data-testid
}) => {
  return (
    <div
      data-testid={dataTestId} // Apply data-testid to the div
      className={`bg-white p-4 rounded-lg shadow border border-gray-200 ${className}`}
    >
      {title && (
        <h3 className="text-lg font-medium text-gray-700 mb-3">{title}</h3>
      )}
      <div>{children}</div>
    </div>
  );
};

export default Card;
