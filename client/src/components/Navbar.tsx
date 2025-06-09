import React, { useState, useRef, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  HomeIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  BookOpenIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

// Define props interface
interface NavbarProps {
  isBlockingNavigation?: boolean;
  onAttemptBlockedNavigation?: () => boolean;
}

const Navbar: React.FC<NavbarProps> = ({
  isBlockingNavigation = false,
  onAttemptBlockedNavigation,
}) => {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Always start collapsed on desktop
    return true;
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== "undefined" && window.innerWidth < 1024;
  });
  const [showContent, setShowContent] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Handle window resize and mobile detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      if (mobile) {
        setIsHovered(false);
        setShowContent(!isCollapsed);
      } else {
        setShowContent(isHovered);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isCollapsed, isHovered]);

  // Handle content visibility timing
  useEffect(() => {
    const isExpanded = isMobile ? !isCollapsed : isHovered;

    if (contentTimeoutRef.current) {
      clearTimeout(contentTimeoutRef.current);
    }

    if (isExpanded) {
      setShowContent(true);
    } else {
      contentTimeoutRef.current = setTimeout(() => {
        setShowContent(false);
      }, 100);
    }

    return () => {
      if (contentTimeoutRef.current) {
        clearTimeout(contentTimeoutRef.current);
      }
    };
  }, [isMobile, isCollapsed, isHovered]);

  // Base navigation items with icons
  const baseNavItems = [
    {
      name: "Dashboard",
      path: user?.role === "staff" ? "/staff/dashboard" : "/dashboard",
      icon: HomeIcon,
    },
  ];

  // Navigation items specific to restaurant role
  const restaurantNavItems = [
    {
      name: "Menu Management",
      path: "/menu",
      icon: DocumentTextIcon,
    },
    {
      name: "Quiz Management",
      path: "/quiz-management",
      icon: AcademicCapIcon,
    },
    {
      name: "SOP Management",
      path: "/sop-management",
      icon: BookOpenIcon,
    },
    {
      name: "Staff Management",
      path: "/staff",
      icon: UsersIcon,
    },
    {
      name: "Staff Analytics",
      path: "/staff-results",
      icon: ChartBarIcon,
    },
  ];

  // Settings navigation item
  const settingsNavItem = {
    name: "Settings",
    path: "/settings",
    icon: CogIcon,
  };

  // Combine main navigation items based on role
  const mainNavItems = [
    ...baseNavItems,
    ...(user?.role === "restaurant" ? restaurantNavItems : []),
    settingsNavItem,
  ];

  // Navigation Handler
  const handleNavigationClick = (event: React.MouseEvent, to: string) => {
    if (isBlockingNavigation && onAttemptBlockedNavigation) {
      const proceed = onAttemptBlockedNavigation();
      if (!proceed) {
        event.preventDefault();
        return;
      }
    }

    if (isMobile) {
      setIsCollapsed(true);
    }
  };

  const handleLogout = () => {
    if (isBlockingNavigation && onAttemptBlockedNavigation) {
      const proceed = onAttemptBlockedNavigation();
      if (!proceed) {
        return;
      }
    }
    logout();
  };

  const toggleCollapse = () => {
    if (isMobile) {
      setIsCollapsed(!isCollapsed);
    }
  };

  const handleMouseEnter = () => {
    if (!isMobile) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovered(true);
      }, 150);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      setIsHovered(false);
    }
  };

  // Determine if navbar should be expanded
  const isExpanded = isMobile ? !isCollapsed : isHovered;

  return (
    <nav
      ref={navRef}
      className={`bg-gradient-to-b from-background to-white shadow-xl border-r border-slate-200/50 fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-out ${
        isExpanded ? "w-64" : "w-16"
      }`}
      role="navigation"
      aria-label="Main navigation"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex flex-col h-full">
        {/* Header section with logo and collapse button */}
        <div className="border-b border-slate-200/50 h-14 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="h-14 px-3 flex items-center justify-between">
            {/* Logo */}
            <div
              className={`transition-all duration-300 ease-out overflow-hidden ${
                showContent
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-4"
              }`}
            >
              <Link
                to={baseNavItems[0].path}
                className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent hover:from-primary-600 hover:to-accent-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 rounded-lg px-2 py-1 whitespace-nowrap"
                onClick={(e) => handleNavigationClick(e, baseNavItems[0].path)}
                aria-label="QuizCrunch - Go to dashboard"
              >
                QuizCrunch
              </Link>
            </div>

            {/* Collapse button - centered when collapsed */}
            <button
              onClick={toggleCollapse}
              className={`p-2 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-md border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 ease-out min-w-[36px] min-h-[36px] flex items-center justify-center group ${
                !isExpanded
                  ? "absolute left-1/2 transform -translate-x-1/2"
                  : ""
              }`}
              aria-label={!isExpanded ? "Expand sidebar" : "Collapse sidebar"}
              title={!isExpanded ? "Expand sidebar" : "Collapse sidebar"}
            >
              <div className="transition-transform duration-200 ease-out group-hover:scale-110">
                {!isExpanded ? (
                  <ChevronRightIcon className="h-4 w-4 text-muted-gray group-hover:text-primary" />
                ) : (
                  <ChevronLeftIcon className="h-4 w-4 text-muted-gray group-hover:text-primary" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Main Navigation Links */}
        <div className="flex-1 py-4 overflow-y-auto">
          <div className="space-y-1 px-2">
            {mainNavItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    `group relative flex items-center rounded-lg text-sm font-medium transition-all duration-200 ease-out min-h-[44px] ${
                      isActive
                        ? "bg-gradient-to-r from-primary/10 to-accent/10 text-primary-700 border border-primary/20 shadow-sm"
                        : "text-muted-gray hover:bg-slate-50 hover:text-dark-slate hover:shadow-sm"
                    } focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1`
                  }
                  aria-label={`Navigate to ${item.name}`}
                  onClick={(e) => handleNavigationClick(e, item.path)}
                  title={!isExpanded ? `${item.name}` : ""}
                  style={{
                    transitionDelay: showContent ? `${index * 20}ms` : "0ms",
                  }}
                >
                  {/* Icon - perfectly centered in collapsed state */}
                  <div className="flex items-center justify-center w-12 h-full flex-shrink-0">
                    <div className="w-6 h-6 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                      <Icon className="h-5 w-5 flex-shrink-0" />
                    </div>
                  </div>

                  {/* Text label - slides in smoothly when expanded */}
                  <div
                    className={`overflow-hidden transition-all duration-200 ease-out ${
                      showContent
                        ? "opacity-100 max-w-full"
                        : "opacity-0 max-w-0"
                    }`}
                  >
                    <span className="truncate whitespace-nowrap block pr-3 font-medium">
                      {item.name}
                    </span>
                  </div>

                  {/* Screen reader text for collapsed state */}
                  {!isExpanded && <span className="sr-only">{item.name}</span>}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* User Profile and Sign Out at bottom */}
        <div className="border-t border-slate-200/50 p-2 bg-gradient-to-r from-slate-50/50 to-white">
          {/* User Profile Info - styled like navigation items */}
          <div className="mb-2">
            <div className="group relative flex items-center rounded-lg text-sm font-medium transition-all duration-200 ease-out min-h-[44px] text-dark-slate hover:bg-slate-50">
              {/* User Avatar Icon - aligned with navigation icons */}
              <div className="flex items-center justify-center w-12 h-full flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm shadow-md">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
              </div>

              {/* Username - shows when expanded */}
              <div
                className={`overflow-hidden transition-all duration-200 ease-out ${
                  showContent ? "opacity-100 max-w-full" : "opacity-0 max-w-0"
                }`}
              >
                <div className="pr-3">
                  <p className="text-sm font-semibold text-dark-slate truncate">
                    {user?.name || "User Name"}
                  </p>
                  <p className="text-xs text-muted-gray truncate capitalize">
                    {user?.role || "Role"}
                  </p>
                </div>
              </div>

              {/* Screen reader text for collapsed state */}
              {!isExpanded && <span className="sr-only">User Profile</span>}
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            className="group relative flex items-center w-full rounded-lg text-sm font-medium transition-all duration-200 ease-out min-h-[44px] text-secondary hover:bg-secondary/10 hover:text-secondary-700 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-1 border border-transparent hover:border-secondary/20"
            aria-label="Sign out"
            title={!isExpanded ? "Sign out" : ""}
          >
            {/* Icon - perfectly centered in collapsed state */}
            <div className="flex items-center justify-center w-12 h-full flex-shrink-0">
              <div className="w-6 h-6 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
              </div>
            </div>

            {/* Text label */}
            <div
              className={`overflow-hidden transition-all duration-200 ease-out ${
                showContent ? "opacity-100 max-w-full" : "opacity-0 max-w-0"
              }`}
            >
              <span className="truncate whitespace-nowrap block pr-3 font-medium">
                Sign Out
              </span>
            </div>

            {/* Screen reader text for collapsed state */}
            {!isExpanded && <span className="sr-only">Sign Out</span>}
          </button>
        </div>
      </div>

      {/* Enhanced animation styles */}
      <style>{`
        /* Smooth hover effect for navbar */
        nav:hover {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08);
        }

        /* Enhanced focus indicators */
        nav a:focus-visible,
        nav button:focus-visible {
          outline: 2px solid rgb(31 111 120 / 0.5);
          outline-offset: 2px;
        }

        /* Better touch targets on mobile */
        @media (max-width: 768px) {
          nav a,
          nav button {
            min-height: 48px;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          nav,
          nav *,
          nav *::before,
          nav *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
