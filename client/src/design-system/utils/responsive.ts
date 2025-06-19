import { useState, useEffect } from "react";
import { breakpointValues, type DeviceCategory } from "../tokens/breakpoints";

// Hook for detecting responsive breakpoints
export const useResponsive = () => {
  const [breakpoint, setBreakpoint] = useState<string>("sm");
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setWindowSize({ width, height });

      // Determine current breakpoint
      if (width >= breakpointValues["2xl"]) setBreakpoint("2xl");
      else if (width >= breakpointValues.xl) setBreakpoint("xl");
      else if (width >= breakpointValues.lg) setBreakpoint("lg");
      else if (width >= breakpointValues.md) setBreakpoint("md");
      else setBreakpoint("sm");
    };

    // Set initial values
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    // Current breakpoint
    breakpoint,

    // Window dimensions
    windowSize,

    // Convenience booleans
    isMobile: breakpoint === "sm",
    isTablet: breakpoint === "md",
    isDesktop: ["lg", "xl", "2xl"].includes(breakpoint),
    isLargeDesktop: ["xl", "2xl"].includes(breakpoint),

    // Specific breakpoint checks
    isSmall: breakpoint === "sm",
    isMedium: breakpoint === "md",
    isLarge: breakpoint === "lg",
    isExtraLarge: breakpoint === "xl",
    is2ExtraLarge: breakpoint === "2xl",

    // Size comparisons
    isSmallOrLarger:
      breakpointValues[breakpoint as keyof typeof breakpointValues] >=
      breakpointValues.sm,
    isMediumOrLarger:
      breakpointValues[breakpoint as keyof typeof breakpointValues] >=
      breakpointValues.md,
    isLargeOrLarger:
      breakpointValues[breakpoint as keyof typeof breakpointValues] >=
      breakpointValues.lg,
    isXLOrLarger:
      breakpointValues[breakpoint as keyof typeof breakpointValues] >=
      breakpointValues.xl,

    // Device category
    deviceCategory: getDeviceCategory(windowSize.width),
  };
};

// Hook for detecting touch devices
export const useIsTouchDevice = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(
        "ontouchstart" in window ||
          navigator.maxTouchPoints > 0 ||
          // @ts-ignore
          navigator.msMaxTouchPoints > 0
      );
    };

    checkTouchDevice();
  }, []);

  return isTouchDevice;
};

// Hook for detecting user preferences
export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState({
    reducedMotion: false,
    highContrast: false,
    darkMode: false,
  });

  useEffect(() => {
    const checkPreferences = () => {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      const highContrast = window.matchMedia(
        "(prefers-contrast: high)"
      ).matches;
      const darkMode = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

      setPreferences({
        reducedMotion,
        highContrast,
        darkMode,
      });
    };

    checkPreferences();

    // Listen for changes
    const mediaQueries = [
      window.matchMedia("(prefers-reduced-motion: reduce)"),
      window.matchMedia("(prefers-contrast: high)"),
      window.matchMedia("(prefers-color-scheme: dark)"),
    ];

    mediaQueries.forEach((mq) =>
      mq.addEventListener("change", checkPreferences)
    );

    return () => {
      mediaQueries.forEach((mq) =>
        mq.removeEventListener("change", checkPreferences)
      );
    };
  }, []);

  return preferences;
};

// Utility function to get device category
export const getDeviceCategory = (width: number): DeviceCategory => {
  if (width < breakpointValues.md) return "mobile";
  if (width < breakpointValues.lg) return "tablet";
  return "desktop";
};

// Utility function to check if width matches a breakpoint
export const matchesBreakpoint = (
  width: number,
  breakpoint: keyof typeof breakpointValues
): boolean => {
  return width >= breakpointValues[breakpoint];
};

// Utility function to get responsive value based on current breakpoint
export const getResponsiveValue = <T>(
  values: {
    default: T;
    sm?: T;
    md?: T;
    lg?: T;
    xl?: T;
    "2xl"?: T;
  },
  currentBreakpoint: string
): T => {
  // Start with default value
  let value = values.default;

  // Apply responsive values in order
  if (currentBreakpoint === "sm" && values.sm !== undefined) value = values.sm;
  if (
    ["md", "lg", "xl", "2xl"].includes(currentBreakpoint) &&
    values.md !== undefined
  )
    value = values.md;
  if (
    ["lg", "xl", "2xl"].includes(currentBreakpoint) &&
    values.lg !== undefined
  )
    value = values.lg;
  if (["xl", "2xl"].includes(currentBreakpoint) && values.xl !== undefined)
    value = values.xl;
  if (currentBreakpoint === "2xl" && values["2xl"] !== undefined)
    value = values["2xl"];

  return value;
};

// Class name builder for responsive utilities
export const buildResponsiveClasses = (
  baseClass: string,
  responsiveValues?: {
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    "2xl"?: string;
  }
): string => {
  let classes = baseClass;

  if (responsiveValues) {
    if (responsiveValues.sm) classes += ` sm:${responsiveValues.sm}`;
    if (responsiveValues.md) classes += ` md:${responsiveValues.md}`;
    if (responsiveValues.lg) classes += ` lg:${responsiveValues.lg}`;
    if (responsiveValues.xl) classes += ` xl:${responsiveValues.xl}`;
    if (responsiveValues["2xl"]) classes += ` 2xl:${responsiveValues["2xl"]}`;
  }

  return classes.trim();
};

// Hook for responsive font sizes based on screen size
export const useResponsiveFontSize = (
  baseFontSize: string,
  multiplier: { sm?: number; md?: number; lg?: number; xl?: number } = {}
) => {
  const { breakpoint } = useResponsive();

  // Default multipliers for each breakpoint
  const defaultMultipliers = {
    sm: 1,
    md: 1.1,
    lg: 1.2,
    xl: 1.3,
  };

  const activeMultiplier =
    {
      ...defaultMultipliers,
      ...multiplier,
    }[breakpoint as keyof typeof defaultMultipliers] || 1;

  // This would need to be implemented based on your CSS-in-JS solution
  // For now, return the class name that should be applied
  return `text-${baseFontSize}`;
};

// Container queries utility (for when container queries are supported)
export const useContainerQuery = (
  containerRef: React.RefObject<HTMLElement>
) => {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [containerRef]);

  return {
    containerSize,
    isContainerSmall: containerSize.width < 400,
    isContainerMedium: containerSize.width >= 400 && containerSize.width < 768,
    isContainerLarge: containerSize.width >= 768,
  };
};

// Orientation utilities
export const useOrientation = () => {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "portrait"
  );

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? "portrait" : "landscape"
      );
    };

    handleOrientationChange();
    window.addEventListener("resize", handleOrientationChange);

    return () => window.removeEventListener("resize", handleOrientationChange);
  }, []);

  return {
    orientation,
    isPortrait: orientation === "portrait",
    isLandscape: orientation === "landscape",
  };
};
