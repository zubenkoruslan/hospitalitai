import { Variants } from "framer-motion";

// Card animations for menu items
export const cardAnimations: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
  hover: {
    y: -2,
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
};

// Stagger container for multiple cards
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

// Slide animations for navigation
export const slideInLeft: Variants = {
  initial: {
    x: -100,
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
  exit: {
    x: -100,
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

export const slideInRight: Variants = {
  initial: {
    x: 100,
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
  exit: {
    x: 100,
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

export const fadeInUp: Variants = {
  initial: {
    y: 30,
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    y: 30,
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

export const fadeInDown: Variants = {
  initial: {
    y: -30,
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    y: -30,
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

// Expansion animations for mobile cards
export const expandCollapse: Variants = {
  collapsed: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
      opacity: { duration: 0.2 },
    },
  },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
      opacity: { duration: 0.2, delay: 0.1 },
    },
  },
};

// Tab navigation animations
export const tabAnimations: Variants = {
  inactive: {
    color: "#6B7280", // text-gray-500
    borderBottomColor: "transparent",
    transition: { duration: 0.2 },
  },
  active: {
    color: "#2563EB", // text-blue-600
    borderBottomColor: "#2563EB", // border-blue-500
    transition: { duration: 0.2 },
  },
  hover: {
    color: "#374151", // text-gray-700
    borderBottomColor: "#D1D5DB", // border-gray-300
    transition: { duration: 0.15 },
  },
};

// Loading spinner animation
export const spinnerAnimation: Variants = {
  spin: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

// Badge/pill animations
export const badgeAnimation: Variants = {
  initial: {
    scale: 0,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
    },
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: { duration: 0.2 },
  },
  hover: {
    scale: 1.05,
    transition: { duration: 0.15 },
  },
};

// Search bar animations
export const searchBarAnimation: Variants = {
  initial: {
    width: "100%",
    scale: 1,
  },
  focus: {
    scale: 1.02,
    transition: { duration: 0.2 },
  },
  blur: {
    scale: 1,
    transition: { duration: 0.2 },
  },
};

// Modal animations
export const modalAnimation: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

// Background overlay animation
export const overlayAnimation: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

// Button animations
export const buttonAnimation: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: { duration: 0.15 },
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
  disabled: {
    opacity: 0.5,
    scale: 1,
    transition: { duration: 0.2 },
  },
};

// Icon animations
export const iconAnimation: Variants = {
  initial: { rotate: 0 },
  hover: {
    rotate: 5,
    transition: { duration: 0.2 },
  },
  tap: {
    rotate: -5,
    transition: { duration: 0.1 },
  },
};

// Chevron rotation for expandable cards
export const chevronAnimation: Variants = {
  collapsed: {
    rotate: 0,
    transition: { duration: 0.2 },
  },
  expanded: {
    rotate: 180,
    transition: { duration: 0.2 },
  },
};

// Price badge animation
export const priceAnimation: Variants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.2,
      duration: 0.3,
    },
  },
  hover: {
    scale: 1.05,
    transition: { duration: 0.15 },
  },
};

// Quick actions animation
export const quickActionAnimation: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  hover: {
    y: -2,
    transition: { duration: 0.2 },
  },
  tap: {
    y: 0,
    scale: 0.98,
    transition: { duration: 0.1 },
  },
};

// Progress bar animation
export const progressAnimation: Variants = {
  initial: {
    width: "0%",
  },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: {
      duration: 0.8,
      ease: [0.4, 0, 0.2, 1],
    },
  }),
};

// Toast notification animation
export const toastAnimation: Variants = {
  initial: {
    opacity: 0,
    x: 100,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    x: 100,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

// Page transition animations
export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
    },
  },
};

// Export animation presets for common use cases
export const animationPresets = {
  // Fast interactions
  fast: {
    duration: 0.15,
    ease: [0.4, 0, 0.2, 1],
  },
  // Standard interactions
  standard: {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1],
  },
  // Slow, dramatic effects
  slow: {
    duration: 0.5,
    ease: [0.4, 0, 0.2, 1],
  },
  // Spring animations
  spring: {
    type: "spring",
    stiffness: 100,
    damping: 15,
  },
  // Bouncy spring
  bouncySpring: {
    type: "spring",
    stiffness: 400,
    damping: 10,
  },
} as const;
