const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Adjust this path based on your project structure
  ],
  theme: {
    // Override default theme with optimized values
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },

    // Optimized font sizes (~20% smaller)
    fontSize: {
      xs: ["0.6rem", { lineHeight: "0.8rem" }],
      sm: ["0.7rem", { lineHeight: "1rem" }],
      base: ["0.8rem", { lineHeight: "1.2rem" }],
      lg: ["0.9rem", { lineHeight: "1.4rem" }],
      xl: ["1rem", { lineHeight: "1.4rem" }],
      "2xl": ["1.2rem", { lineHeight: "1.6rem" }],
      "3xl": ["1.5rem", { lineHeight: "1.8rem" }],
      "4xl": ["1.8rem", { lineHeight: "2rem" }],
      "5xl": ["2.4rem", { lineHeight: "2.4rem" }],
      "6xl": ["3rem", { lineHeight: "3rem" }],
      "7xl": ["3.6rem", { lineHeight: "3.6rem" }],
      "8xl": ["4.8rem", { lineHeight: "4.8rem" }],
      "9xl": ["6.4rem", { lineHeight: "6.4rem" }],
    },

    // Optimized spacing scale (~20% smaller)
    spacing: {
      0: "0",
      px: "1px",
      0.5: "0.1rem",
      1: "0.2rem",
      1.5: "0.3rem",
      2: "0.4rem",
      2.5: "0.5rem",
      3: "0.6rem",
      3.5: "0.7rem",
      4: "0.8rem",
      5: "1rem",
      6: "1.2rem",
      7: "1.4rem",
      8: "1.6rem",
      9: "1.8rem",
      10: "2rem",
      11: "2.2rem",
      12: "2.4rem",
      14: "2.8rem",
      16: "3.2rem",
      20: "4rem",
      24: "4.8rem",
      28: "5.6rem",
      32: "6.4rem",
      36: "7.2rem",
      40: "8rem",
      44: "8.8rem",
      48: "9.6rem",
      52: "10.4rem",
      56: "11.2rem",
      60: "12rem",
      64: "12.8rem",
      72: "14.4rem",
      80: "16rem",
      96: "19.2rem",
    },

    extend: {
      colors: {
        // Brand Colors
        primary: {
          DEFAULT: "#1F6F78",
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
          DEFAULT: "#FF6B6B",
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
          DEFAULT: "#6366F1",
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
          DEFAULT: "#10B981",
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
          DEFAULT: "#F59E0B",
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
          DEFAULT: "#EF4444",
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
          DEFAULT: "#3B82F6",
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

        // Background Colors
        background: {
          primary: "#F8FAFC",
          secondary: "#F1F5F9",
          tertiary: "#FFFFFF",
        },

        // Text Colors
        text: {
          primary: "#1E293B",
          secondary: "#475569",
          tertiary: "#64748B",
          inverse: "#FFFFFF",
        },

        // Border Colors
        border: {
          primary: "#E2E8F0",
          secondary: "#CBD5E1",
          focus: "#6366F1",
        },

        // Legacy aliases for backward compatibility
        teal: "#1F6F78",
        coral: "#FF6B6B",
        "off-white": "#F8FAFC",
        "dark-slate": "#1E293B",
        "muted-gray": "#64748B",
        indigo: "#6366F1",
      },

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

      borderRadius: {
        xl: "0.75rem", // 12px
        "2xl": "1rem", // 16px
        "3xl": "1.5rem", // 24px
      },

      // Touch target minimum sizes (optimized but accessible)
      minHeight: {
        touch: "2.25rem", // 36px - exceeds WCAG minimum
        "touch-comfortable": "2.75rem", // 44px
        "touch-large": "3rem", // 48px
      },

      minWidth: {
        touch: "2.25rem", // 36px - exceeds WCAG minimum
        "touch-comfortable": "2.75rem", // 44px
        "touch-large": "3rem", // 48px
      },

      // Enhanced animations with optimized movement (~20% smaller)
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(16px)", opacity: "0" }, // ~20% smaller than 20px
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-16px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(16px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" }, // ~20% smaller than -10px
        },
      },

      animation: {
        "fade-in": "fade-in 0.3s ease-out forwards",
        "slide-up": "slide-up 0.3s ease-out forwards",
        "slide-down": "slide-down 0.3s ease-out forwards",
        "slide-in-left": "slide-in-left 0.3s ease-out forwards",
        "slide-in-right": "slide-in-right 0.3s ease-out forwards",
        "scale-in": "scale-in 0.2s ease-out forwards",
        "bounce-subtle": "bounce-subtle 1s ease-in-out infinite",
      },

      // Custom shadows with optimized sizes
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        DEFAULT:
          "0 1px 4px 0 rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", // ~20% smaller
        md: "0 2px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", // ~20% smaller
        lg: "0 8px 20px -4px rgb(0 0 0 / 0.1), 0 4px 8px -4px rgb(0 0 0 / 0.1)", // ~20% smaller
        xl: "0 16px 32px -8px rgb(0 0 0 / 0.1), 0 8px 16px -8px rgb(0 0 0 / 0.1)", // ~20% smaller
        "2xl": "0 20px 40px -12px rgb(0 0 0 / 0.25)", // ~20% smaller
        inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    // Add custom plugin for design system utilities
    function ({ addUtilities, theme }) {
      addUtilities({
        ".touch-target": {
          minHeight: theme("minHeight.touch"),
          minWidth: theme("minWidth.touch"),
        },
        ".touch-target-comfortable": {
          minHeight: theme("minHeight.touch-comfortable"),
          minWidth: theme("minWidth.touch-comfortable"),
        },
        ".touch-target-large": {
          minHeight: theme("minHeight.touch-large"),
          minWidth: theme("minWidth.touch-large"),
        },
        ".focus-ring": {
          outline: "2px solid transparent",
          outlineOffset: "2px",
          boxShadow: `0 0 0 2px ${theme("colors.accent.500")}40`,
        },
        ".focus-ring-error": {
          boxShadow: `0 0 0 2px ${theme("colors.error.500")}40`,
        },
        ".focus-ring-success": {
          boxShadow: `0 0 0 2px ${theme("colors.success.500")}40`,
        },
      });
    },
  ],
};
