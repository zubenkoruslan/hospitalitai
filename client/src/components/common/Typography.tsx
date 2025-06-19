import React from "react";
import { typography, colorTokens } from "../../design-system";

type TypographyVariant =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "body1"
  | "body2"
  | "caption"
  | "overline"
  | "button"
  | "code";

type TypographyColor =
  | "primary"
  | "secondary"
  | "tertiary"
  | "inverse"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "accent";

type TypographyAlign = "left" | "center" | "right" | "justify";

type TypographyWeight = "light" | "normal" | "medium" | "semibold" | "bold";

interface TypographyProps {
  children: React.ReactNode;
  variant?: TypographyVariant;
  color?: TypographyColor;
  align?: TypographyAlign;
  weight?: TypographyWeight;
  className?: string;
  component?: React.ElementType;
  gutterBottom?: boolean;
  noWrap?: boolean;
  testId?: string;
}

const Typography: React.FC<TypographyProps> = ({
  children,
  variant = "body1",
  color = "primary",
  align = "left",
  weight,
  className = "",
  component,
  gutterBottom = false,
  noWrap = false,
  testId,
}) => {
  // Variant-specific styling (20% smaller)
  const variantClasses = {
    h1: `${typography.fontSize["3xl"][0]} font-bold leading-tight tracking-tight`,
    h2: `${typography.fontSize["2xl"][0]} font-bold leading-tight tracking-tight`,
    h3: `${typography.fontSize.xl[0]} font-semibold leading-snug tracking-tight`,
    h4: `${typography.fontSize.lg[0]} font-semibold leading-snug`,
    h5: `${typography.fontSize.base[0]} font-medium leading-normal`,
    h6: `${typography.fontSize.sm[0]} font-medium leading-normal uppercase tracking-wide`,
    body1: `${typography.fontSize.base[0]} leading-relaxed`,
    body2: `${typography.fontSize.sm[0]} leading-normal`,
    caption: `${typography.fontSize.xs[0]} leading-tight`,
    overline: `${typography.fontSize.xs[0]} uppercase tracking-widest font-medium`,
    button: `${typography.fontSize.sm[0]} font-medium leading-none`,
    code: `${typography.fontSize.sm[0]} font-mono leading-normal`,
  };

  // Color classes using design tokens
  const colorClasses = {
    primary: "text-text-primary",
    secondary: "text-text-secondary",
    tertiary: "text-text-tertiary",
    inverse: "text-text-inverse",
    success: "text-success-600",
    warning: "text-warning-600",
    error: "text-error-600",
    info: "text-info-600",
    accent: "text-accent-600",
  };

  // Alignment classes
  const alignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
    justify: "text-justify",
  };

  // Weight classes
  const weightClasses = {
    light: "font-light",
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  };

  // Default component mapping
  const defaultComponents: Record<TypographyVariant, React.ElementType> = {
    h1: "h1",
    h2: "h2",
    h3: "h3",
    h4: "h4",
    h5: "h5",
    h6: "h6",
    body1: "p",
    body2: "p",
    caption: "span",
    overline: "span",
    button: "span",
    code: "code",
  };

  // Determine component to use
  const Component =
    component || (defaultComponents[variant] as React.ElementType);

  // Additional classes
  const gutterClass = gutterBottom ? "mb-4" : "";
  const wrapClass = noWrap ? "truncate" : "";
  const weightClass = weight ? weightClasses[weight] : "";

  // Combine all classes
  const combinedClassName = `
    ${variantClasses[variant]}
    ${colorClasses[color]}
    ${alignClasses[align]}
    ${weightClass}
    ${gutterClass}
    ${wrapClass}
    ${className}
  `
    .trim()
    .replace(/\s+/g, " ");

  return (
    <Component className={combinedClassName} data-testid={testId}>
      {children}
    </Component>
  );
};

export default Typography;
