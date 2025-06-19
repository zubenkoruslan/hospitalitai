import React from "react";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/24/outline";
import { typography, borderRadius } from "../../design-system";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  showHomeIcon?: boolean;
  maxItems?: number;
  className?: string;
  variant?: "default" | "outlined" | "minimal";
  size?: "sm" | "md" | "lg";
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = <ChevronRightIcon className="h-4 w-4 text-gray-400" />,
  showHomeIcon = true,
  maxItems = 5,
  className = "",
  variant = "default",
  size = "md",
}) => {
  // Handle collapsing when there are too many items
  const getDisplayItems = () => {
    if (items.length <= maxItems) {
      return items;
    }

    const collapsedItems: BreadcrumbItem[] = [
      items[0], // First item
      { label: "...", href: undefined, isActive: false }, // Ellipsis
      ...items.slice(-2), // Last 2 items
    ];

    return collapsedItems;
  };

  const displayItems = getDisplayItems();

  // Size configurations
  const sizeConfig = {
    sm: {
      fontSize: typography.fontSize.xs,
      padding: "px-2 py-1",
      iconSize: "h-3 w-3",
    },
    md: {
      fontSize: typography.fontSize.sm,
      padding: "px-3 py-1.5",
      iconSize: "h-4 w-4",
    },
    lg: {
      fontSize: typography.fontSize.base,
      padding: "px-4 py-2",
      iconSize: "h-5 w-5",
    },
  };

  // Variant configurations
  const variantConfig = {
    default: {
      containerClass: `bg-gray-50 border border-gray-200 ${borderRadius.md}`,
      activeClass: "text-primary-700 font-medium",
      inactiveClass: "text-gray-600 hover:text-gray-900",
      linkClass: "hover:bg-gray-100 transition-colors duration-150",
    },
    outlined: {
      containerClass: `border border-gray-300 ${borderRadius.md}`,
      activeClass: "text-primary-700 font-medium",
      inactiveClass: "text-gray-600 hover:text-gray-900",
      linkClass: "hover:bg-gray-50 transition-colors duration-150",
    },
    minimal: {
      containerClass: "",
      activeClass: "text-primary-700 font-medium",
      inactiveClass: "text-gray-600 hover:text-gray-900",
      linkClass: "hover:text-gray-900 transition-colors duration-150",
    },
  };

  const config = sizeConfig[size];
  const variantStyle = variantConfig[variant];

  const breadcrumbClasses = `
    flex items-center space-x-1 ${config.padding}
    ${variantStyle.containerClass} ${className}
  `
    .trim()
    .replace(/\s+/g, " ");

  const renderBreadcrumbItem = (item: BreadcrumbItem, index: number) => {
    const isLast = index === displayItems.length - 1;
    const isEllipsis = item.label === "...";

    // Icon rendering
    const IconComponent = item.icon;
    const renderIcon = () => {
      if (IconComponent) {
        return <IconComponent className={`${config.iconSize} mr-1.5`} />;
      }
      if (showHomeIcon && index === 0) {
        return <HomeIcon className={`${config.iconSize} mr-1.5`} />;
      }
      return null;
    };

    // Ellipsis item
    if (isEllipsis) {
      return (
        <span key={index} className={`${config.fontSize} text-gray-400 px-1`}>
          {item.label}
        </span>
      );
    }

    // Active (current) item
    if (item.isActive || isLast) {
      return (
        <span
          key={index}
          className={`
            flex items-center ${config.fontSize}
            ${variantStyle.activeClass} ${borderRadius.sm}
            ${config.padding.replace("py-", "py-0.5 ")}
          `}
          aria-current="page"
        >
          {renderIcon()}
          {item.label}
        </span>
      );
    }

    // Clickable item
    const handleClick = (e: React.MouseEvent) => {
      if (item.onClick) {
        e.preventDefault();
        item.onClick();
      }
    };

    const Element = item.href ? "a" : "button";
    const elementProps = item.href
      ? { href: item.href }
      : { type: "button" as const };

    return (
      <Element
        key={index}
        onClick={handleClick}
        className={`
          flex items-center ${config.fontSize}
          ${variantStyle.inactiveClass} ${variantStyle.linkClass}
          ${borderRadius.sm} ${config.padding.replace("py-", "py-0.5 ")}
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        {...elementProps}
      >
        {renderIcon()}
        {item.label}
      </Element>
    );
  };

  const renderSeparator = (index: number) => {
    if (index === displayItems.length - 1) return null;

    return (
      <span key={`separator-${index}`} className="flex items-center">
        {separator}
      </span>
    );
  };

  return (
    <nav className={breadcrumbClasses} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {displayItems.map((item, index) => (
          <li key={index} className="flex items-center space-x-1">
            {renderBreadcrumbItem(item, index)}
            {renderSeparator(index)}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
