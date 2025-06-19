// Design Tokens - Central export for all design system tokens
export * from "./colors";
export * from "./spacing";
export * from "./typography";
export * from "./breakpoints";

// Re-export commonly used tokens for convenience
export { colorTokens } from "./colors";
export {
  spacing,
  componentSpacing,
  touchTargets,
  borderRadius,
} from "./spacing";
export { typography, typographyComponents } from "./typography";
export {
  breakpoints,
  breakpointValues,
  mediaQueries,
  deviceCategories,
} from "./breakpoints";

// Design system version and metadata
export const designSystemVersion = "1.0.0";
export const designSystemName = "HospitalityAI Design System";

// Token categories for documentation and tooling
export const tokenCategories = {
  colors: [
    "primary",
    "secondary",
    "accent",
    "success",
    "warning",
    "error",
    "info",
    "gray",
    "background",
    "text",
    "border",
  ],
  spacing: ["spacing", "componentSpacing", "touchTargets", "borderRadius"],
  typography: [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "letterSpacing",
    "lineHeight",
    "typographyComponents",
  ],
  breakpoints: [
    "breakpoints",
    "breakpointValues",
    "mediaQueries",
    "deviceCategories",
  ],
} as const;

// Validation utilities for design tokens
export const validateToken = (
  category: keyof typeof tokenCategories,
  token: string
): boolean => {
  const categoryTokens = tokenCategories[category];
  return Array.isArray(categoryTokens) && categoryTokens.includes(token);
};

// Helper to get all tokens in a category
export const getTokensInCategory = (category: keyof typeof tokenCategories) => {
  return tokenCategories[category];
};
