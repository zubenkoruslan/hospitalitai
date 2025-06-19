import React from "react";
import { spacing } from "../../design-system";

export interface StackProps {
  children: React.ReactNode;
  direction?: "row" | "column";
  spacing?: "xs" | "sm" | "md" | "lg" | "xl" | "none";
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  wrap?: boolean;
  className?: string;
  as?: React.ElementType;
}

const Stack: React.FC<StackProps> = ({
  children,
  direction = "column",
  spacing: spacingProp = "md",
  align = "stretch",
  justify = "start",
  wrap = false,
  className = "",
  as: Component = "div",
}) => {
  // Convert spacing prop to Tailwind classes
  const getSpacingClass = () => {
    if (spacingProp === "none") return "";

    const spacingMap = {
      xs: "2",
      sm: "3",
      md: "4",
      lg: "6",
      xl: "8",
    };

    const spacingValue = spacingMap[spacingProp];
    if (direction === "column") {
      return `space-y-${spacingValue}`;
    } else {
      return `space-x-${spacingValue}`;
    }
  };

  // Convert alignment props to Tailwind classes
  const getAlignClass = () => {
    switch (align) {
      case "start":
        return "items-start";
      case "center":
        return "items-center";
      case "end":
        return "items-end";
      case "stretch":
        return "items-stretch";
      case "baseline":
        return "items-baseline";
      default:
        return "items-stretch";
    }
  };

  const getJustifyClass = () => {
    switch (justify) {
      case "start":
        return "justify-start";
      case "center":
        return "justify-center";
      case "end":
        return "justify-end";
      case "between":
        return "justify-between";
      case "around":
        return "justify-around";
      case "evenly":
        return "justify-evenly";
      default:
        return "justify-start";
    }
  };

  const directionClass = direction === "row" ? "flex-row" : "flex-col";
  const wrapClass = wrap ? "flex-wrap" : "flex-nowrap";

  const stackClasses = `
    flex ${directionClass} ${wrapClass}
    ${getSpacingClass()} ${getAlignClass()} ${getJustifyClass()}
    ${className}
  `
    .trim()
    .replace(/\s+/g, " ");

  return <Component className={stackClasses}>{children}</Component>;
};

export default Stack;
