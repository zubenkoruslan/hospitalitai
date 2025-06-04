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
  BellIcon,
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
    // Always start collapsed
    return true;
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== "undefined" && window.innerWidth < 1024;
  });
  const [showContent, setShowContent] = useState(false); // For smooth content transitions
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Handle window resize and mobile detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      // On mobile, always use collapsed state, ignore hover
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
      // Show content immediately when expanding
      setShowContent(true);
    } else {
      // Delay hiding content to allow width transition to complete
      contentTimeoutRef.current = setTimeout(() => {
        setShowContent(false);
      }, 100); // Hide content 100ms after collapse starts
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

  // Common navigation items for all roles
  const commonNavItems = [
    {
      name: "Notifications",
      path: "/notifications",
      icon: BellIcon,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: CogIcon,
    },
  ];

  // Combine navigation items based on role
  const navItems = [
    ...baseNavItems,
    ...(user?.role === "restaurant" ? restaurantNavItems : []),
    ...commonNavItems,
  ];

  // Navigation Handler with improved accessibility
  const handleNavigationClick = (event: React.MouseEvent, to: string) => {
    if (isBlockingNavigation && onAttemptBlockedNavigation) {
      const proceed = onAttemptBlockedNavigation();
      if (!proceed) {
        event.preventDefault();
        return;
      }
    }

    // Auto-collapse on mobile after navigation
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
    // Only allow manual toggle on mobile/tablet
    if (isMobile) {
      setIsCollapsed(!isCollapsed);
    }
  };

  const handleMouseEnter = () => {
    // Only allow hover expansion on desktop with delay
    if (!isMobile) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      // Add slight delay to prevent accidental expansion
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovered(true);
      }, 150);
    }
  };

  const handleMouseLeave = () => {
    // Only allow hover collapse on desktop
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
      className={`bg-white shadow-lg fixed left-0 top-0 h-full z-40 transition-all duration-200 ease-out ${
        isExpanded ? "w-64" : "w-16"
      }`}
      role="navigation"
      aria-label="Main navigation"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex flex-col h-full">
        {/* Header section with logo and collapse button */}
        <div className="border-b border-slate-200 h-16">
          <div className="flex items-center justify-between relative h-16 px-4">
            {/* Logo with smooth fade - absolute positioned to not affect layout */}
            <div
              className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-all duration-200 ease-out overflow-hidden ${
                showContent
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-4"
              }`}
            >
              <Link
                to={baseNavItems[0].path}
                className="text-xl font-bold text-slate-700 hover:text-sky-600 transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 rounded-lg px-2 py-1 whitespace-nowrap"
                onClick={(e) => handleNavigationClick(e, baseNavItems[0].path)}
                aria-label="QuizCrunch - Go to dashboard"
              >
                QuizCrunch
              </Link>
            </div>

            {/* Collapse button - always visible, centered when collapsed */}
            <button
              onClick={toggleCollapse}
              className={`p-2 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all duration-200 ease-out min-w-[44px] min-h-[44px] flex items-center justify-center ${
                !isExpanded
                  ? "absolute left-1/2 transform -translate-x-1/2"
                  : "ml-auto"
              }`}
              aria-label={!isExpanded ? "Expand sidebar" : "Collapse sidebar"}
              title={!isExpanded ? "Expand sidebar" : "Collapse sidebar"}
            >
              <div className="transition-transform duration-200 ease-out">
                {!isExpanded ? (
                  <ChevronRightIcon className="h-5 w-5 text-slate-600" />
                ) : (
                  <ChevronLeftIcon className="h-5 w-5 text-slate-600" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Navigation Links - Enhanced with better visual hierarchy */}
        <div className="flex-1 py-4 overflow-y-auto">
          <div className="space-y-1 px-2">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    `group relative flex items-center rounded-lg text-sm font-medium transition-all duration-150 ease-in-out min-h-[44px] ${
                      isActive
                        ? "bg-sky-100 text-sky-700 border border-sky-200 shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-700"
                    } focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-inset`
                  }
                  aria-label={`Navigate to ${item.name}`}
                  onClick={(e) => handleNavigationClick(e, item.path)}
                  title={!isExpanded ? `${item.name}` : ""}
                  style={{
                    transitionDelay: showContent ? `${index * 50}ms` : "0ms",
                  }}
                >
                  {/* Fixed icon position - never moves */}
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <Icon className="h-5 w-5 flex-shrink-0" />
                    </div>
                  </div>

                  {/* Invisible spacer to maintain click area in collapsed state */}
                  <div className="w-full h-full absolute inset-0"></div>

                  {/* Text container - slides out from icon position */}
                  <div
                    className={`ml-11 overflow-hidden transition-all duration-200 ease-out ${
                      showContent
                        ? "opacity-100 max-w-full"
                        : "opacity-0 max-w-0"
                    }`}
                    style={{
                      transform: showContent
                        ? "translateX(0)"
                        : "translateX(-8px)",
                    }}
                  >
                    <span className="truncate whitespace-nowrap block py-3 pr-3">
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

        {/* User info and Sign Out at bottom */}
        <div className="border-t border-slate-200 p-2">
          {/* User info */}
          <div className="mb-2">
            <div className="flex items-center rounded-lg p-2">
              {/* Fixed icon position to match navigation icons */}
              <div className="absolute left-3">
                <div className="w-5 h-5 flex items-center justify-center">
                  <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shadow-sm">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                </div>
              </div>
              {/* Text positioned to align with navigation text */}
              <div
                className={`ml-11 overflow-hidden transition-all duration-200 ease-out ${
                  showContent ? "opacity-100 max-w-full" : "opacity-0 max-w-0"
                }`}
                style={{
                  transform: showContent ? "translateX(0)" : "translateX(-8px)",
                }}
              >
                <p className="text-sm font-medium text-slate-800 truncate">
                  {user?.name || "User Name"}
                </p>
                <p className="text-xs text-slate-500 truncate capitalize">
                  {user?.role || "Role"}
                </p>
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            className="group relative flex items-center w-full rounded-lg text-sm font-medium transition-all duration-150 ease-in-out min-h-[44px] text-red-600 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-inset"
            aria-label="Sign out"
            title={!isExpanded ? "Sign out" : ""}
          >
            {/* Fixed icon position - never moves */}
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <div className="w-5 h-5 flex items-center justify-center">
                <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
              </div>
            </div>

            {/* Invisible spacer to maintain click area in collapsed state */}
            <div className="w-full h-full absolute inset-0"></div>

            {/* Text container - slides out from icon position */}
            <div
              className={`ml-11 overflow-hidden transition-all duration-200 ease-out ${
                showContent ? "opacity-100 max-w-full" : "opacity-0 max-w-0"
              }`}
              style={{
                transform: showContent ? "translateX(0)" : "translateX(-8px)",
              }}
            >
              <span className="truncate whitespace-nowrap block py-3 pr-3">
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
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideInRight {
          from { transform: translateX(-8px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @keyframes slideInLeft {
          from { transform: translateX(8px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.15s ease-out forwards;
        }
        
        .animate-slide-in-right {
          animation: slideInRight 0.2s ease-out forwards;
        }

        .animate-slide-in-left {
          animation: slideInLeft 0.2s ease-out forwards;
        }

        /* Smooth hover effect for navbar */
        nav:hover {
          box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        /* Enhanced focus indicators */
        nav a:focus-visible,
        nav button:focus-visible {
          outline: 2px solid #0ea5e9;
          outline-offset: 2px;
        }

        /* Smooth icon transitions */
        nav .group:hover svg {
          transform: scale(1.05);
        }

        /* Text reveal effect */
        .text-reveal {
          overflow: hidden;
          white-space: nowrap;
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
