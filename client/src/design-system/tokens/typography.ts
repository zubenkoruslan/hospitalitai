// Optimized typography scale - 20% smaller for better information density
export const typography = {
  fontFamily: {
    sans: [
      "Inter",
      "system-ui",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "Helvetica Neue",
      "Arial",
      "sans-serif",
    ],
    heading: [
      "Poppins",
      "Inter",
      "system-ui",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "Helvetica Neue",
      "Arial",
      "sans-serif",
    ],
    mono: [
      "JetBrains Mono",
      "Fira Code",
      "ui-monospace",
      "SFMono-Regular",
      "Monaco",
      "Consolas",
      "Liberation Mono",
      "Courier New",
      "monospace",
    ],
  },

  // Optimized font sizes (~20% smaller)
  fontSize: {
    xs: ["0.6rem", { lineHeight: "0.8rem" }], // ~20% smaller than 0.75rem
    sm: ["0.7rem", { lineHeight: "1rem" }], // ~20% smaller than 0.875rem
    base: ["0.8rem", { lineHeight: "1.2rem" }], // ~20% smaller than 1rem
    lg: ["0.9rem", { lineHeight: "1.4rem" }], // ~20% smaller than 1.125rem
    xl: ["1rem", { lineHeight: "1.4rem" }], // ~20% smaller than 1.25rem
    "2xl": ["1.2rem", { lineHeight: "1.6rem" }], // ~20% smaller than 1.5rem
    "3xl": ["1.5rem", { lineHeight: "1.8rem" }], // ~20% smaller than 1.875rem
    "4xl": ["1.8rem", { lineHeight: "2rem" }], // ~20% smaller than 2.25rem
    "5xl": ["2.4rem", { lineHeight: "2.4rem" }], // ~20% smaller than 3rem
    "6xl": ["3rem", { lineHeight: "3rem" }], // ~20% smaller than 3.75rem
    "7xl": ["3.6rem", { lineHeight: "3.6rem" }], // ~20% smaller than 4.5rem
    "8xl": ["4.8rem", { lineHeight: "4.8rem" }], // ~20% smaller than 6rem
    "9xl": ["6.4rem", { lineHeight: "6.4rem" }], // ~20% smaller than 8rem
  },

  fontWeight: {
    thin: "100",
    extralight: "200",
    light: "300",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
    black: "900",
  },

  letterSpacing: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0em",
    wide: "0.025em",
    wider: "0.05em",
    widest: "0.1em",
  },

  lineHeight: {
    none: "1",
    tight: "1.25",
    snug: "1.375",
    normal: "1.5",
    relaxed: "1.625",
    loose: "2",
  },
} as const;

// Component-specific typography styles
export const typographyComponents = {
  // Heading styles
  headings: {
    h1: {
      fontSize: typography.fontSize["4xl"],
      fontWeight: typography.fontWeight.bold,
      lineHeight: typography.lineHeight.tight,
      letterSpacing: typography.letterSpacing.tight,
      fontFamily: typography.fontFamily.heading,
    },
    h2: {
      fontSize: typography.fontSize["3xl"],
      fontWeight: typography.fontWeight.bold,
      lineHeight: typography.lineHeight.tight,
      letterSpacing: typography.letterSpacing.tight,
      fontFamily: typography.fontFamily.heading,
    },
    h3: {
      fontSize: typography.fontSize["2xl"],
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.snug,
      fontFamily: typography.fontFamily.heading,
    },
    h4: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.snug,
      fontFamily: typography.fontFamily.heading,
    },
    h5: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.normal,
      fontFamily: typography.fontFamily.heading,
    },
    h6: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.normal,
      fontFamily: typography.fontFamily.heading,
    },
  },

  // Body text styles
  body: {
    large: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.relaxed,
      fontFamily: typography.fontFamily.sans,
    },
    normal: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.normal,
      fontFamily: typography.fontFamily.sans,
    },
    small: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.normal,
      fontFamily: typography.fontFamily.sans,
    },
  },

  // UI element styles
  ui: {
    button: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.none,
      letterSpacing: typography.letterSpacing.wide,
      fontFamily: typography.fontFamily.sans,
    },
    label: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.normal,
      fontFamily: typography.fontFamily.sans,
    },
    caption: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.normal,
      fontFamily: typography.fontFamily.sans,
    },
    code: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.lineHeight.normal,
      fontFamily: typography.fontFamily.mono,
    },
  },

  // Link styles
  link: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.normal,
    fontFamily: typography.fontFamily.sans,
  },
} as const;

// Helper function to create responsive typography classes
export const createResponsiveTypography = (
  mobile: keyof typeof typography.fontSize,
  tablet?: keyof typeof typography.fontSize,
  desktop?: keyof typeof typography.fontSize
) => {
  let classes = `text-${mobile}`;
  if (tablet) classes += ` md:text-${tablet}`;
  if (desktop) classes += ` lg:text-${desktop}`;
  return classes;
};

// Type exports for TypeScript
export type TypographyToken = typeof typography;
export type FontSize = keyof typeof typography.fontSize;
export type FontWeight = keyof typeof typography.fontWeight;
export type FontFamily = keyof typeof typography.fontFamily;
export type LetterSpacing = keyof typeof typography.letterSpacing;
export type LineHeight = keyof typeof typography.lineHeight;
export type TypographyComponents = typeof typographyComponents;
