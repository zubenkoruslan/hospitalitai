import React, { useState, useRef, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types/user";
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
  MapPinIcon,
  PresentationChartLineIcon,
  TrophyIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import { MapPinIcon as MapPinIconSolid } from "@heroicons/react/24/solid";
import QuizTypeSelectionModal from "./quiz/QuizTypeSelectionModal";

// Define props interface
interface NavbarProps {
  isBlockingNavigation?: boolean;
  onAttemptBlockedNavigation?: () => boolean;
  hidden?: boolean; // Add hidden prop to completely hide navbar
}

const Navbar: React.FC<NavbarProps> = ({
  isBlockingNavigation = false,
  onAttemptBlockedNavigation,
  hidden = false,
}) => {
  // Move all hooks ABOVE the conditional return to fix Rules of Hooks violation
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Always start collapsed on desktop
    return true;
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(() => {
    // Initialize from localStorage to persist across page navigation
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("navbar-pinned");
      return saved === "true";
    }
    return false;
  });
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== "undefined" && window.innerWidth < 1024;
  });
  const [showContent, setShowContent] = useState(false);
  const [isQuizTypeModalOpen, setIsQuizTypeModalOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // ALL useEffect hooks MOVED ABOVE conditional return to comply with Rules of Hooks

  // Save pinned state to localStorage to persist across page navigation
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("navbar-pinned", isPinned.toString());
    }
  }, [isPinned]);

  // Handle window resize and mobile detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      if (mobile) {
        setIsHovered(false);
        setShowContent(!isCollapsed);
      } else {
        // On desktop, consider both hover and pinned states
        setShowContent(isHovered || isPinned);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isCollapsed, isHovered]);

  // Handle content visibility timing
  useEffect(() => {
    const isExpanded = isMobile ? !isCollapsed : isHovered || isPinned;

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
  }, [isMobile, isCollapsed, isHovered, isPinned]);

  // Return null if navbar should be hidden (e.g., during quiz taking)
  // MOVED AFTER ALL hooks to comply with Rules of Hooks
  if (hidden) {
    return null;
  }

  // Base navigation items with icons (exclude dashboard for admin users)
  const baseNavItems =
    user?.role === UserRole.Admin
      ? []
      : [
          {
            name: "Dashboard",
            path:
              user?.role === UserRole.Staff ? "/staff/dashboard" : "/dashboard",
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

  // Navigation items specific to staff role
  const staffNavItems = [
    {
      name: "My Progress",
      path: "/staff/progress",
      icon: ChartBarIcon,
    },
    {
      name: "Achievements",
      path: "/staff/achievements",
      icon: TrophyIcon,
    },
  ];

  // Navigation items specific to admin role
  const adminNavItems = [
    {
      name: "Platform Analytics",
      path: "/admin/analytics",
      icon: PresentationChartLineIcon,
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
    ...(user?.role === UserRole.RestaurantOwner ? restaurantNavItems : []),
    ...(user?.role === UserRole.Staff ? staffNavItems : []),
    ...(user?.role === UserRole.Admin ? adminNavItems : []),
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
  };

  const handleLogout = () => {
    if (isBlockingNavigation && onAttemptBlockedNavigation) {
      const proceed = onAttemptBlockedNavigation();
      if (!proceed) return;
    }
    logout();
  };

  const toggleCollapse = () => {
    if (isMobile) {
      setIsCollapsed(!isCollapsed);
    } else {
      setIsPinned(!isPinned);
    }
  };

  const handleMouseEnter = () => {
    if (!isMobile) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 100);
    }
  };

  // Determine if navbar should be expanded
  const isExpanded = isMobile ? !isCollapsed : isHovered || isPinned;

  // Determine navbar visibility classes based on user role
  const getNavbarVisibilityClass = () => {
    if (user?.role === UserRole.Staff) {
      // Staff users: Hidden on mobile (they have BottomNavigation), visible on desktop
      return "hidden lg:block";
    } else {
      // Restaurant/Admin users: Visible on both mobile and desktop
      return "block";
    }
  };

  return (
    <nav
      ref={navRef}
      className={`${getNavbarVisibilityClass()} bg-white shadow-xl border-r border-slate-200/50 fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-out ${
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
                to={
                  user?.role === UserRole.Admin
                    ? "/admin/analytics"
                    : baseNavItems[0]?.path || "/dashboard"
                }
                className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent hover:from-primary-600 hover:to-accent-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 rounded-lg px-2 py-1 whitespace-nowrap"
                onClick={(e) =>
                  handleNavigationClick(
                    e,
                    user?.role === UserRole.Admin
                      ? "/admin/analytics"
                      : baseNavItems[0]?.path || "/dashboard"
                  )
                }
                aria-label="QuizCrunch - Go to main page"
              >
                QuizCrunch
              </Link>
            </div>

            {/* Toggle button - pin icon for desktop, chevron for mobile */}
            <button
              onClick={toggleCollapse}
              className={`p-2 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-md border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 ease-out min-w-[36px] min-h-[36px] flex items-center justify-center group ${
                !isExpanded && !isMobile
                  ? "absolute left-1/2 transform -translate-x-1/2"
                  : ""
              }`}
              aria-label={
                isMobile
                  ? !isExpanded
                    ? "Expand sidebar"
                    : "Collapse sidebar"
                  : !isExpanded
                  ? "Expand sidebar"
                  : isPinned
                  ? "Unpin sidebar"
                  : "Pin sidebar"
              }
              title={
                isMobile
                  ? !isExpanded
                    ? "Expand sidebar"
                    : "Collapse sidebar"
                  : !isExpanded
                  ? "Expand sidebar"
                  : isPinned
                  ? "Unpin sidebar"
                  : "Pin sidebar"
              }
            >
              <div className="transition-transform duration-200 ease-out group-hover:scale-110">
                {isMobile ? (
                  // Mobile: Show chevron arrows
                  !isExpanded ? (
                    <ChevronRightIcon className="h-4 w-4 text-muted-gray group-hover:text-primary" />
                  ) : (
                    <ChevronLeftIcon className="h-4 w-4 text-muted-gray group-hover:text-primary" />
                  )
                ) : // Desktop: Show arrow when collapsed, pin when expanded
                !isExpanded ? (
                  <ChevronRightIcon className="h-4 w-4 text-muted-gray group-hover:text-primary" />
                ) : isPinned ? (
                  <MapPinIconSolid className="h-4 w-4 text-primary group-hover:text-primary-600" />
                ) : (
                  <MapPinIcon className="h-4 w-4 text-muted-gray group-hover:text-primary" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Take Quiz CTA Button for Staff Users */}
        {user?.role === UserRole.Staff && (
          <div className="px-2 py-4 border-b border-slate-200/50">
            <button
              onClick={() => setIsQuizTypeModalOpen(true)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center min-h-[48px] group"
            >
              {/* Icon - always visible */}
              <div className="flex items-center justify-center w-12 h-full flex-shrink-0">
                <PlayIcon className="h-6 w-6 text-white group-hover:scale-110 transition-transform duration-200" />
              </div>

              {/* Text label - shows when expanded */}
              <div
                className={`overflow-hidden transition-all duration-200 ease-out ${
                  showContent ? "opacity-100 max-w-full" : "opacity-0 max-w-0"
                }`}
              >
                <span className="truncate whitespace-nowrap block pr-3 font-semibold text-white">
                  Take Quiz
                </span>
              </div>

              {/* Screen reader text for collapsed state */}
              {!isExpanded && <span className="sr-only">Take Quiz</span>}
            </button>
          </div>
        )}

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
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-muted-gray truncate">
                    {user?.role === UserRole.RestaurantOwner
                      ? "Restaurant Owner"
                      : user?.role === UserRole.Staff
                      ? "Staff Member"
                      : user?.role === UserRole.Admin
                      ? "Platform Admin"
                      : "User"}
                  </p>
                </div>
              </div>

              {/* Screen reader text for collapsed state */}
              {!isExpanded && (
                <span className="sr-only">
                  {user?.name || "User"} -{" "}
                  {user?.role === UserRole.RestaurantOwner
                    ? "Restaurant Owner"
                    : user?.role === UserRole.Staff
                    ? "Staff Member"
                    : user?.role === UserRole.Admin
                    ? "Platform Admin"
                    : "User"}
                </span>
              )}
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            className="w-full group relative flex items-center rounded-lg text-sm font-medium transition-all duration-200 ease-out min-h-[44px] text-red-600 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-1"
            aria-label="Sign out"
            title={!isExpanded ? "Sign out" : ""}
          >
            {/* Sign Out Icon - aligned with navigation icons */}
            <div className="flex items-center justify-center w-12 h-full flex-shrink-0">
              <div className="w-6 h-6 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
              </div>
            </div>

            {/* Sign Out Text - shows when expanded */}
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

      {/* Quiz Type Selection Modal for Staff */}
      {user?.role === UserRole.Staff && (
        <QuizTypeSelectionModal
          isOpen={isQuizTypeModalOpen}
          onClose={() => setIsQuizTypeModalOpen(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;
