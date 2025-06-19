import React from "react";
import { borderRadius } from "../../design-system";

export interface SkeletonProps {
  variant?: "text" | "rectangular" | "circular" | "rounded";
  width?: string | number;
  height?: string | number;
  className?: string;
  animate?: boolean;
  lines?: number; // For text variant
  children?: React.ReactNode;
}

const Skeleton: React.FC<SkeletonProps> = ({
  variant = "text",
  width,
  height,
  className = "",
  animate = true,
  lines = 1,
  children,
}) => {
  // Base skeleton classes
  const baseClasses = `
    bg-gray-200 
    ${animate ? "animate-pulse" : ""}
    ${className}
  `
    .trim()
    .replace(/\s+/g, " ");

  // Variant-specific styling
  const getVariantClasses = () => {
    switch (variant) {
      case "text":
        return `${borderRadius.sm}`;
      case "rectangular":
        return "";
      case "circular":
        return "rounded-full";
      case "rounded":
        return borderRadius.lg;
      default:
        return borderRadius.sm;
    }
  };

  // Get dimensions
  const getDimensions = () => {
    const styles: React.CSSProperties = {};

    if (width) {
      styles.width = typeof width === "number" ? `${width}px` : width;
    }

    if (height) {
      styles.height = typeof height === "number" ? `${height}px` : height;
    }

    // Default dimensions for variants
    if (!width && !height) {
      switch (variant) {
        case "text":
          styles.height = "1rem";
          styles.width = "100%";
          break;
        case "circular":
          styles.width = "3rem";
          styles.height = "3rem";
          break;
        case "rectangular":
        case "rounded":
          styles.width = "100%";
          styles.height = "2rem";
          break;
      }
    }

    return styles;
  };

  const skeletonClasses = `${baseClasses} ${getVariantClasses()}`;
  const styles = getDimensions();

  // Text variant with multiple lines
  if (variant === "text" && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, index) => {
          // Make last line shorter for more realistic look
          const isLastLine = index === lines - 1;
          const lineWidth = isLastLine ? "75%" : "100%";

          return (
            <div
              key={index}
              className={skeletonClasses}
              style={{
                ...styles,
                width:
                  styles.width && styles.width !== "100%"
                    ? styles.width
                    : lineWidth,
              }}
            />
          );
        })}
      </div>
    );
  }

  // Single skeleton element
  return (
    <div className={skeletonClasses} style={styles}>
      {children}
    </div>
  );
};

// Preset skeleton patterns for common use cases
export const SkeletonText: React.FC<Omit<SkeletonProps, "variant">> = (
  props
) => <Skeleton {...props} variant="text" />;

export const SkeletonAvatar: React.FC<Omit<SkeletonProps, "variant">> = (
  props
) => <Skeleton {...props} variant="circular" width={40} height={40} />;

export const SkeletonButton: React.FC<Omit<SkeletonProps, "variant">> = (
  props
) => <Skeleton {...props} variant="rounded" width={100} height={36} />;

export const SkeletonCard: React.FC<{ className?: string }> = ({
  className = "",
}) => (
  <div className={`space-y-4 p-4 ${className}`}>
    <Skeleton variant="rectangular" width="100%" height={200} />
    <SkeletonText lines={2} />
    <div className="flex items-center space-x-3">
      <SkeletonAvatar />
      <div className="flex-1">
        <SkeletonText width="60%" />
        <SkeletonText width="40%" />
      </div>
    </div>
  </div>
);

export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className = "" }) => (
  <div className={`space-y-3 ${className}`}>
    {/* Header */}
    <div className="flex space-x-4">
      {Array.from({ length: columns }, (_, index) => (
        <SkeletonText key={index} width="100%" height={24} />
      ))}
    </div>

    {/* Rows */}
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4">
        {Array.from({ length: columns }, (_, colIndex) => (
          <SkeletonText key={colIndex} width="100%" height={20} />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonList: React.FC<{
  items?: number;
  showAvatar?: boolean;
  className?: string;
}> = ({ items = 5, showAvatar = true, className = "" }) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: items }, (_, index) => (
      <div key={index} className="flex items-center space-x-3">
        {showAvatar && <SkeletonAvatar />}
        <div className="flex-1 space-y-2">
          <SkeletonText width="75%" />
          <SkeletonText width="50%" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonForm: React.FC<{
  fields?: number;
  className?: string;
}> = ({ fields = 4, className = "" }) => (
  <div className={`space-y-6 ${className}`}>
    {Array.from({ length: fields }, (_, index) => (
      <div key={index} className="space-y-2">
        <SkeletonText width="25%" height={16} />
        <Skeleton variant="rounded" width="100%" height={40} />
      </div>
    ))}
    <div className="flex space-x-4">
      <SkeletonButton />
      <SkeletonButton />
    </div>
  </div>
);

export default Skeleton;
