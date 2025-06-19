// Mobile-first responsive breakpoints
export const breakpoints = {
  sm: "640px", // Small devices (landscape phones)
  md: "768px", // Medium devices (tablets)
  lg: "1024px", // Large devices (laptops/desktops)
  xl: "1280px", // Extra large devices (large desktops)
  "2xl": "1536px", // 2x extra large devices (larger desktops)
} as const;

// Breakpoint utilities for JavaScript
export const breakpointValues = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

// Media query helpers
export const mediaQueries = {
  // Mobile first (min-width)
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  "2xl": `@media (min-width: ${breakpoints["2xl"]})`,

  // Max width queries (for mobile-specific styles)
  maxSm: `@media (max-width: ${breakpointValues.sm - 1}px)`,
  maxMd: `@media (max-width: ${breakpointValues.md - 1}px)`,
  maxLg: `@media (max-width: ${breakpointValues.lg - 1}px)`,
  maxXl: `@media (max-width: ${breakpointValues.xl - 1}px)`,

  // Range queries
  smToMd: `@media (min-width: ${breakpoints.sm}) and (max-width: ${
    breakpointValues.md - 1
  }px)`,
  mdToLg: `@media (min-width: ${breakpoints.md}) and (max-width: ${
    breakpointValues.lg - 1
  }px)`,
  lgToXl: `@media (min-width: ${breakpoints.lg}) and (max-width: ${
    breakpointValues.xl - 1
  }px)`,

  // Touch and hover device detection
  touchDevice: "@media (hover: none) and (pointer: coarse)",
  hoverDevice: "@media (hover: hover) and (pointer: fine)",

  // Orientation queries
  portrait: "@media (orientation: portrait)",
  landscape: "@media (orientation: landscape)",

  // High DPI displays
  retina:
    "@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)",
} as const;

// Device categories for responsive design
export const deviceCategories = {
  mobile: {
    min: 0,
    max: breakpointValues.md - 1,
    description: "Mobile phones (portrait and landscape)",
  },
  tablet: {
    min: breakpointValues.md,
    max: breakpointValues.lg - 1,
    description: "Tablets and small laptops",
  },
  desktop: {
    min: breakpointValues.lg,
    max: Infinity,
    description: "Desktop computers and large screens",
  },
} as const;

// Responsive utility functions
export const getDeviceCategory = (
  width: number
): keyof typeof deviceCategories => {
  if (width < breakpointValues.md) return "mobile";
  if (width < breakpointValues.lg) return "tablet";
  return "desktop";
};

export const isDevice = (
  category: keyof typeof deviceCategories,
  width: number
): boolean => {
  const device = deviceCategories[category];
  return width >= device.min && width <= device.max;
};

// Container max widths for different breakpoints
export const containerMaxWidths = {
  sm: "100%",
  md: "100%",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

// Type exports for TypeScript
export type Breakpoint = keyof typeof breakpoints;
export type BreakpointValue = (typeof breakpointValues)[Breakpoint];
export type MediaQuery = keyof typeof mediaQueries;
export type DeviceCategory = keyof typeof deviceCategories;
