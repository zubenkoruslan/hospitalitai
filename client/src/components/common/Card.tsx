import React from "react";
import { typography, borderRadius } from "../../design-system";

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
  testId?: string;
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
  testId,
}) => {
  // Base classes optimized for design system
  const baseClasses = `
    ${borderRadius["2xl"]} transition-all duration-300 ease-out
    backdrop-blur-sm focus:outline-none
  `;

  // Variant-based styling using design tokens
  const variantClasses = {
    default: `
      bg-background-tertiary border border-border-primary
      hover:shadow-lg hover:border-border-secondary
      shadow-md
    `,
    elevated: `
      bg-background-tertiary shadow-lg hover:shadow-xl
      border border-border-primary/50 hover:border-border-secondary/50
    `,
    outlined: `
      bg-background-tertiary/60 border-2 border-border-primary
      hover:border-primary-300 shadow-sm hover:shadow-md
    `,
    gradient: `
      bg-gradient-to-br from-background-tertiary via-background-secondary/50 to-background-tertiary
      border border-border-primary/50 shadow-md hover:shadow-lg
    `,
    primary: `
      bg-gradient-to-br from-primary-50 to-primary-100
      border border-primary-200 shadow-md hover:shadow-lg hover:shadow-primary-500/10
    `,
    accent: `
      bg-gradient-to-br from-accent-50 to-accent-100
      border border-accent-200 shadow-md hover:shadow-lg hover:shadow-accent-500/10
    `,
  };

  // Size-based padding (20% smaller)
  const sizeClasses = {
    sm: `p-3`, // Using spacing[3] = 0.6rem
    md: `p-4`, // Using spacing[4] = 0.8rem
    lg: `p-6`, // Using spacing[6] = 1.2rem
  };

  // Hover effect classes
  const hoverClasses = hover
    ? "transform hover:scale-[1.02] hover:-translate-y-1 hover:shadow-xl"
    : "";

  // Clickable classes
  const clickableClasses = clickable
    ? `cursor-pointer group hover:shadow-xl transform hover:scale-[1.01] 
       hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200
       focus-ring`
    : "";

  // Title styling based on variant and size (20% smaller)
  const getTitleClasses = (variant: string, size: string) => {
    const baseTitleClasses = "font-semibold mb-3 tracking-tight";

    const sizeMap = {
      sm: typography.fontSize.sm[0], // 0.7rem
      md: typography.fontSize.base[0], // 0.8rem
      lg: typography.fontSize.lg[0], // 0.9rem
    };

    const colorMap = {
      default: "text-text-primary",
      elevated: "text-text-primary",
      outlined: "text-text-primary",
      gradient: "text-text-primary",
      primary:
        "bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent",
      accent:
        "bg-gradient-to-r from-accent-600 to-accent-700 bg-clip-text text-transparent",
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
      data-testid={dataTestId || testId}
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
          {/* Elegant divider with design system colors */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-border-secondary to-transparent mb-3"></div>
        </div>
      )}

      <div className="relative">{children}</div>

      {/* Enhanced focus ring for accessibility using design tokens */}
      {clickable && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-primary-500/50 ring-opacity-0 focus-within:ring-opacity-100 transition-all duration-300 pointer-events-none" />
      )}

      {/* Subtle shine effect on hover for clickable cards */}
      {clickable && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-background-tertiary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}
    </CardComponent>
  );
};

export default Card;
