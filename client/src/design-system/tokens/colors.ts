export const colorTokens = {
  // Brand Colors
  primary: {
    50: "#E4F6F7",
    100: "#B8E4E7",
    200: "#8CD2D8",
    300: "#5FC0C8",
    400: "#31AFB8",
    500: "#1F6F78", // Base
    600: "#195960",
    700: "#134348",
    800: "#0D2D30",
    900: "#071718",
  },
  secondary: {
    50: "#FFEAEA",
    100: "#FFD0D0",
    200: "#FFB6B6",
    300: "#FF9C9C",
    400: "#FF8282",
    500: "#FF6B6B", // Base
    600: "#E65F5F",
    700: "#CC5353",
    800: "#B34747",
    900: "#993B3B",
  },
  accent: {
    50: "#EEF2FF",
    100: "#E0E7FF",
    200: "#C7D2FE",
    300: "#A5B4FC",
    400: "#818CF8",
    500: "#6366F1", // Base
    600: "#4F46E5",
    700: "#4338CA",
    800: "#3730A3",
    900: "#312E81",
  },

  // Semantic Colors
  success: {
    50: "#ECFDF5",
    100: "#D1FAE5",
    200: "#A7F3D0",
    300: "#6EE7B7",
    400: "#34D399",
    500: "#10B981",
    600: "#059669",
    700: "#047857",
    800: "#065F46",
    900: "#064E3B",
  },
  warning: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    200: "#FDE68A",
    300: "#FCD34D",
    400: "#FBBF24",
    500: "#F59E0B",
    600: "#D97706",
    700: "#B45309",
    800: "#92400E",
    900: "#78350F",
  },
  error: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    200: "#FECACA",
    300: "#FCA5A5",
    400: "#F87171",
    500: "#EF4444",
    600: "#DC2626",
    700: "#B91C1C",
    800: "#991B1B",
    900: "#7F1D1D",
  },
  info: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1D4ED8",
    800: "#1E40AF",
    900: "#1E3A8A",
  },

  // Neutral Colors
  gray: {
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
  },

  // Background Colors
  background: {
    primary: "#F8FAFC", // gray-50
    secondary: "#F1F5F9", // gray-100
    tertiary: "#FFFFFF",
  },

  // Text Colors
  text: {
    primary: "#1E293B", // gray-800
    secondary: "#475569", // gray-600
    tertiary: "#64748B", // gray-500
    inverse: "#FFFFFF",
  },

  // Border Colors
  border: {
    primary: "#E2E8F0", // gray-200
    secondary: "#CBD5E1", // gray-300
    focus: "#6366F1", // accent-500
  },
} as const;

// Type exports for TypeScript
export type ColorToken = typeof colorTokens;
export type ColorScale = keyof typeof colorTokens;
export type ColorShade = keyof typeof colorTokens.primary;
