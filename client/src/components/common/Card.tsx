import React from "react";

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string; // Allow additional custom classes
  "data-testid"?: string; // Support for data-testid
  variant?:
    | "default"
    | "elevated"
    | "outlined"
    | "gradient"
    | "primary"
    | "accent"; // Different card styles
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
  const baseClasses =
    "rounded-2xl transition-all duration-300 ease-out backdrop-blur-sm";

  // Variant-based styling with brand colors
  const variantClasses = {
    default:
      "bg-white/80 border border-slate-200/50 shadow-lg hover:shadow-xl hover:shadow-slate-200/20",
    elevated:
      "bg-white shadow-xl hover:shadow-2xl border border-slate-100/50 hover:border-slate-200/50",
    outlined:
      "bg-white/60 border-2 border-slate-300/50 hover:border-primary/30 shadow-md hover:shadow-lg",
    gradient:
      "bg-gradient-to-br from-white via-slate-50/50 to-white border border-slate-200/50 shadow-lg hover:shadow-xl",
    primary:
      "bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 shadow-lg hover:shadow-primary/10 hover:shadow-xl",
    accent:
      "bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 shadow-lg hover:shadow-accent/10 hover:shadow-xl",
  };

  // Size-based padding
  const sizeClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  // Hover effect classes
  const hoverClasses = hover
    ? "transform hover:scale-[1.02] hover:-translate-y-2 hover:shadow-2xl"
    : "";

  // Clickable classes
  const clickableClasses = clickable
    ? "cursor-pointer group hover:shadow-2xl transform hover:scale-[1.01] hover:-translate-y-1 active:scale-[0.99] transition-all duration-200"
    : "";

  // Title styling based on variant and size
  const getTitleClasses = (variant: string, size: string) => {
    const baseTitleClasses = "font-semibold mb-4 tracking-tight";

    const sizeMap = {
      sm: "text-base",
      md: "text-lg",
      lg: "text-xl",
    };

    const colorMap = {
      default: "text-dark-slate",
      elevated: "text-dark-slate",
      outlined: "text-dark-slate",
      gradient: "text-dark-slate",
      primary:
        "bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent",
      accent:
        "bg-gradient-to-r from-accent to-accent-600 bg-clip-text text-transparent",
    };

    return `${baseTitleClasses} ${sizeMap[size as keyof typeof sizeMap]} ${
      colorMap[variant as keyof typeof colorMap]
    }`;
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
          <h3 className={getTitleClasses(variant, size)}>{title}</h3>
          {/* Elegant divider with gradient */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-300/50 to-transparent mb-4"></div>
        </div>
      )}

      <div className="relative">{children}</div>

      {/* Enhanced focus ring for accessibility */}
      {clickable && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-primary/50 ring-opacity-0 focus-within:ring-opacity-100 transition-all duration-300 pointer-events-none" />
      )}

      {/* Subtle shine effect on hover for clickable cards */}
      {clickable && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}
    </CardComponent>
  );
};

export default Card;
