// Optimized spacing scale - 20% smaller for better information density
export const spacing = {
  0: "0",
  px: "1px",
  0.5: "0.1rem", // 1.6px (~20% smaller than 2px)
  1: "0.2rem", // 3.2px (~20% smaller than 4px)
  1.5: "0.3rem", // 4.8px (~20% smaller than 6px)
  2: "0.4rem", // 6.4px (~20% smaller than 8px)
  2.5: "0.5rem", // 8px (~20% smaller than 10px)
  3: "0.6rem", // 9.6px (~20% smaller than 12px)
  3.5: "0.7rem", // 11.2px (~20% smaller than 14px)
  4: "0.8rem", // 12.8px (~20% smaller than 16px)
  5: "1rem", // 16px (~20% smaller than 20px)
  6: "1.2rem", // 19.2px (~20% smaller than 24px)
  7: "1.4rem", // 22.4px (~20% smaller than 28px)
  8: "1.6rem", // 25.6px (~20% smaller than 32px)
  9: "1.8rem", // 28.8px (~20% smaller than 36px)
  10: "2rem", // 32px (~20% smaller than 40px)
  11: "2.2rem", // 35.2px (~20% smaller than 44px)
  12: "2.4rem", // 38.4px (~20% smaller than 48px)
  14: "2.8rem", // 44.8px (~20% smaller than 56px)
  16: "3.2rem", // 51.2px (~20% smaller than 64px)
  20: "4rem", // 64px (~20% smaller than 80px)
  24: "4.8rem", // 76.8px (~20% smaller than 96px)
  28: "5.6rem", // 89.6px (~20% smaller than 112px)
  32: "6.4rem", // 102.4px (~20% smaller than 128px)
  36: "7.2rem", // 115.2px (~20% smaller than 144px)
  40: "8rem", // 128px (~20% smaller than 160px)
  44: "8.8rem", // 140.8px (~20% smaller than 176px)
  48: "9.6rem", // 153.6px (~20% smaller than 192px)
  52: "10.4rem", // 166.4px (~20% smaller than 208px)
  56: "11.2rem", // 179.2px (~20% smaller than 224px)
  60: "12rem", // 192px (~20% smaller than 240px)
  64: "12.8rem", // 204.8px (~20% smaller than 256px)
  72: "14.4rem", // 230.4px (~20% smaller than 288px)
  80: "16rem", // 256px (~20% smaller than 320px)
  96: "19.2rem", // 307.2px (~20% smaller than 384px)
} as const;

// Component-specific spacing utilities
export const componentSpacing = {
  // Button spacing
  button: {
    sm: { px: spacing[3], py: spacing[1.5], gap: spacing[1.5] },
    md: { px: spacing[4], py: spacing[2], gap: spacing[2] },
    lg: { px: spacing[5], py: spacing[2.5], gap: spacing[2.5] },
  },

  // Card spacing
  card: {
    sm: spacing[3],
    md: spacing[4],
    lg: spacing[6],
  },

  // Form spacing
  form: {
    fieldGap: spacing[4],
    labelGap: spacing[1],
    inputPadding: { px: spacing[3], py: spacing[2] },
  },

  // Layout spacing
  layout: {
    containerPadding: {
      sm: spacing[4],
      md: spacing[6],
      lg: spacing[8],
    },
    sectionGap: {
      sm: spacing[8],
      md: spacing[12],
      lg: spacing[16],
    },
  },
} as const;

// Touch target sizes (optimized but accessible)
export const touchTargets = {
  minimum: "2.25rem", // 36px - exceeds WCAG minimum of 24px
  comfortable: "2.75rem", // 44px - standard comfortable size
  large: "3rem", // 48px - large touch target
} as const;

// Border radius scale
export const borderRadius = {
  none: "0",
  sm: "0.125rem", // 2px
  DEFAULT: "0.25rem", // 4px
  md: "0.375rem", // 6px
  lg: "0.5rem", // 8px
  xl: "0.75rem", // 12px
  "2xl": "1rem", // 16px
  "3xl": "1.5rem", // 24px
  full: "9999px",
} as const;

// Type exports for TypeScript
export type SpacingToken = typeof spacing;
export type SpacingScale = keyof typeof spacing;
export type ComponentSpacing = typeof componentSpacing;
export type TouchTarget = keyof typeof touchTargets;
export type BorderRadius = keyof typeof borderRadius;
