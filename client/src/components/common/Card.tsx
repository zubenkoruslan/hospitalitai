import React from "react";

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string; // Allow additional custom classes
  "data-testid"?: string; // Support for data-testid
  variant?: "default" | "elevated" | "outlined" | "gradient"; // Different card styles
  size?: "sm" | "md" | "lg"; // Different card sizes
  hover?: boolean; // Enable hover effects
  clickable?: boolean; // Make card appear clickable
  onClick?: () => void; // Click handler for clickable cards
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  className = "",
  "data-testid": dataTestId,
  variant = "default",
  size = "md",
  hover = false,
  clickable = false,
  onClick,
}) => {
  // Base classes for all cards
  const baseClasses = "rounded-xl transition-all duration-200 ease-out";

  // Variant-based styling
  const variantClasses = {
    default: "bg-white border border-slate-200 shadow-sm hover:shadow-md",
    elevated: "bg-white shadow-lg hover:shadow-xl border border-slate-100",
    outlined:
      "bg-white border-2 border-slate-300 hover:border-slate-400 shadow-sm",
    gradient:
      "bg-gradient-to-br from-white to-slate-50 border border-slate-200 shadow-sm hover:shadow-md",
  };

  // Size-based padding
  const sizeClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  // Hover effect classes
  const hoverClasses = hover
    ? "transform hover:scale-[1.02] hover:-translate-y-1"
    : "";

  // Clickable classes
  const clickableClasses = clickable
    ? "cursor-pointer hover:shadow-lg transform hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99]"
    : "";

  // Title size based on card size
  const titleClasses = {
    sm: "text-base font-semibold text-slate-800 mb-3",
    md: "text-lg font-semibold text-slate-800 mb-4",
    lg: "text-xl font-semibold text-slate-800 mb-5",
  };

  // Combine all classes
  const cardClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${hoverClasses}
    ${clickableClasses}
    ${className}
  `
    .trim()
    .replace(/\s+/g, " ");

  const CardComponent = clickable ? "button" : "div";

  return (
    <CardComponent
      data-testid={dataTestId}
      className={cardClasses}
      onClick={clickable ? onClick : undefined}
      type={clickable ? "button" : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {title && (
        <div className="mb-0">
          <h3 className={titleClasses[size]}>{title}</h3>
          {/* Optional subtle divider line */}
          <div className="w-full h-px bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 mb-4"></div>
        </div>
      )}

      <div className="relative">{children}</div>

      {/* Focus ring for accessibility when clickable */}
      {clickable && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-sky-500 ring-opacity-0 focus-within:ring-opacity-100 transition-all duration-200 pointer-events-none" />
      )}
    </CardComponent>
  );
};

export default Card;
