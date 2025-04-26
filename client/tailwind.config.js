const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Adjust this path based on your project structure
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          // Deep Teal
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
          // Warm Coral
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
        background: {
          // Off-white
          DEFAULT: "#F8FAFC", // slate-50
        },
        text: {
          DEFAULT: "#1E293B", // slate-800 (Dark Slate)
          muted: "#64748B", // slate-500 (Muted Gray)
        },
        // Add aliases for easier use if desired
        teal: "#1F6F78",
        coral: "#FF6B6B",
        "off-white": "#F8FAFC",
        "dark-slate": "#1E293B",
        "muted-gray": "#64748B",
      },
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
        heading: ["Poppins", ...defaultTheme.fontFamily.sans], // Poppins for headings
      },
      borderRadius: {
        xl: "12px", // Custom larger rounded corners
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        // Add more animations if needed
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out forwards",
        "slide-up": "slide-up 0.3s ease-out forwards",
      },
      backgroundImage: {
        "gradient-primary-secondary":
          "linear-gradient(to right, var(--color-primary-500), var(--color-secondary-500))", // Example for buttons
        "gradient-navbar-border":
          "linear-gradient(to right, var(--color-primary-200), var(--color-secondary-200))", // Subtle gradient for border
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"), // Optional, for enhanced form styling
  ],
};
