// Animation system - optimized for performance and accessibility
export const animations = {
  // Duration scale (20% faster for better UX)
  duration: {
    instant: "0ms",
    fastest: "75ms", // 20% faster than 100ms
    fast: "120ms", // 20% faster than 150ms
    normal: "200ms", // 20% faster than 250ms
    slow: "320ms", // 20% faster than 400ms
    slower: "480ms", // 20% faster than 600ms
    slowest: "800ms", // 20% faster than 1000ms
  },

  // Easing curves for natural motion
  easing: {
    linear: "linear",
    ease: "ease",
    easeIn: "ease-in",
    easeOut: "ease-out",
    easeInOut: "ease-in-out",

    // Custom bezier curves for sophisticated animations
    easeInSine: "cubic-bezier(0.12, 0, 0.39, 0)",
    easeOutSine: "cubic-bezier(0.61, 1, 0.88, 1)",
    easeInOutSine: "cubic-bezier(0.37, 0, 0.63, 1)",

    easeInQuad: "cubic-bezier(0.11, 0, 0.5, 0)",
    easeOutQuad: "cubic-bezier(0.5, 1, 0.89, 1)",
    easeInOutQuad: "cubic-bezier(0.45, 0, 0.55, 1)",

    easeInCubic: "cubic-bezier(0.32, 0, 0.67, 0)",
    easeOutCubic: "cubic-bezier(0.33, 1, 0.68, 1)",
    easeInOutCubic: "cubic-bezier(0.65, 0, 0.35, 1)",

    // Special purpose easings
    bounceOut: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    backOut: "cubic-bezier(0.18, 0.89, 0.32, 1.28)",
    anticipate: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
  },

  // Transition presets for common use cases
  transitions: {
    // Basic transitions
    all: "all 200ms ease-in-out",
    colors:
      "color 200ms ease-in-out, background-color 200ms ease-in-out, border-color 200ms ease-in-out",
    opacity: "opacity 200ms ease-in-out",
    transform: "transform 200ms ease-in-out",

    // Interactive elements
    button: "all 200ms cubic-bezier(0.45, 0, 0.55, 1)",
    hover: "all 120ms ease-out",
    focus: "all 75ms ease-out",

    // Layout changes
    height: "height 320ms cubic-bezier(0.33, 1, 0.68, 1)",
    width: "width 320ms cubic-bezier(0.33, 1, 0.68, 1)",
    slide: "transform 320ms cubic-bezier(0.33, 1, 0.68, 1)",

    // Modal and overlay animations
    modal:
      "opacity 200ms ease-in-out, transform 200ms cubic-bezier(0.33, 1, 0.68, 1)",
    fade: "opacity 200ms ease-in-out",
    scale: "transform 200ms cubic-bezier(0.33, 1, 0.68, 1)",

    // Loading states
    pulse: "opacity 1200ms ease-in-out infinite alternate",
    spin: "transform 800ms linear infinite",
    bounce: "transform 1000ms cubic-bezier(0.34, 1.56, 0.64, 1) infinite",
  },

  // Animation states for different interaction phases
  states: {
    enter: {
      opacity: "1",
      transform: "translateY(0) scale(1)",
      transition:
        "opacity 200ms ease-out, transform 200ms cubic-bezier(0.33, 1, 0.68, 1)",
    },
    exit: {
      opacity: "0",
      transform: "translateY(-8px) scale(0.95)",
      transition: "opacity 120ms ease-in, transform 120ms ease-in",
    },
    initial: {
      opacity: "0",
      transform: "translateY(8px) scale(0.95)",
    },
  },

  // Keyframe animations
  keyframes: {
    fadeIn: {
      "0%": { opacity: "0" },
      "100%": { opacity: "1" },
    },
    fadeOut: {
      "0%": { opacity: "1" },
      "100%": { opacity: "0" },
    },
    slideInDown: {
      "0%": { opacity: "0", transform: "translateY(-16px)" },
      "100%": { opacity: "1", transform: "translateY(0)" },
    },
    slideInUp: {
      "0%": { opacity: "0", transform: "translateY(16px)" },
      "100%": { opacity: "1", transform: "translateY(0)" },
    },
    slideInLeft: {
      "0%": { opacity: "0", transform: "translateX(-16px)" },
      "100%": { opacity: "1", transform: "translateX(0)" },
    },
    slideInRight: {
      "0%": { opacity: "0", transform: "translateX(16px)" },
      "100%": { opacity: "1", transform: "translateX(0)" },
    },
    scaleIn: {
      "0%": { opacity: "0", transform: "scale(0.9)" },
      "100%": { opacity: "1", transform: "scale(1)" },
    },
    scaleOut: {
      "0%": { opacity: "1", transform: "scale(1)" },
      "100%": { opacity: "0", transform: "scale(0.9)" },
    },
    pulse: {
      "0%, 100%": { opacity: "1" },
      "50%": { opacity: "0.5" },
    },
    spin: {
      "0%": { transform: "rotate(0deg)" },
      "100%": { transform: "rotate(360deg)" },
    },
    bounce: {
      "0%, 20%, 53%, 80%, 100%": { transform: "translate3d(0, 0, 0)" },
      "40%, 43%": { transform: "translate3d(0, -8px, 0)" },
      "70%": { transform: "translate3d(0, -4px, 0)" },
      "90%": { transform: "translate3d(0, -2px, 0)" },
    },
    shake: {
      "0%, 100%": { transform: "translateX(0)" },
      "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-2px)" },
      "20%, 40%, 60%, 80%": { transform: "translateX(2px)" },
    },
  },
} as const;

// Animation utilities for React components
export const animationUtils = {
  // Create CSS transition string
  createTransition: (
    properties: string | string[],
    duration: keyof typeof animations.duration = "normal",
    easing: keyof typeof animations.easing = "easeInOut"
  ): string => {
    const props = Array.isArray(properties) ? properties : [properties];
    return props
      .map(
        (prop) =>
          `${prop} ${animations.duration[duration]} ${animations.easing[easing]}`
      )
      .join(", ");
  },

  // Get animation delay with stagger support
  getStaggerDelay: (index: number, baseDelay: number = 75): string => {
    return `${index * baseDelay}ms`;
  },

  // Reduce motion for accessibility
  respectsReducedMotion: (animation: string): string => {
    return `@media (prefers-reduced-motion: no-preference) { ${animation} }`;
  },

  // Animation state classes for CSS modules
  getAnimationClasses: (animationName: keyof typeof animations.keyframes) => ({
    enter: `animate-${animationName}`,
    enterActive: `animate-${animationName}-active`,
    exit: `animate-${animationName}-exit`,
    exitActive: `animate-${animationName}-exit-active`,
  }),
} as const;

// Preset animation configurations for common components
export const componentAnimations = {
  button: {
    hover: {
      transform: "scale(1.02)",
      transition: animations.transitions.hover,
    },
    active: {
      transform: "scale(0.98)",
      transition: animations.transitions.focus,
    },
  },

  modal: {
    backdrop: {
      enter: { opacity: "1" },
      exit: { opacity: "0" },
      transition: "opacity 200ms ease-in-out",
    },
    content: {
      enter: { opacity: "1", transform: "scale(1) translateY(0)" },
      exit: { opacity: "0", transform: "scale(0.95) translateY(-8px)" },
      transition: animations.transitions.modal,
    },
  },

  dropdown: {
    enter: {
      opacity: "1",
      transform: "scaleY(1) translateY(0)",
      transformOrigin: "top",
    },
    exit: {
      opacity: "0",
      transform: "scaleY(0.95) translateY(-4px)",
      transformOrigin: "top",
    },
    transition:
      "opacity 150ms ease-out, transform 150ms cubic-bezier(0.33, 1, 0.68, 1)",
  },

  toast: {
    enter: {
      opacity: "1",
      transform: "translateX(0) scale(1)",
    },
    exit: {
      opacity: "0",
      transform: "translateX(100%) scale(0.95)",
    },
    transition: "all 300ms cubic-bezier(0.33, 1, 0.68, 1)",
  },

  card: {
    hover: {
      transform: "translateY(-2px)",
      boxShadow: "0 8px 25px -8px rgba(0, 0, 0, 0.1)",
      transition: animations.transitions.hover,
    },
  },

  loading: {
    skeleton: {
      animation: `pulse 1.5s ${animations.easing.easeInOut} infinite`,
    },
    spinner: {
      animation: `spin 1s ${animations.easing.linear} infinite`,
    },
    dots: {
      animation: `bounce 1.4s ${animations.easing.easeInOut} infinite both`,
    },
  },
} as const;

// Type exports
export type AnimationDuration = keyof typeof animations.duration;
export type AnimationEasing = keyof typeof animations.easing;
export type AnimationTransition = keyof typeof animations.transitions;
export type AnimationKeyframe = keyof typeof animations.keyframes;
