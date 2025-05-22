import React, { useState, useRef, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Define props interface
interface NavbarProps {
  isBlockingNavigation?: boolean;
  onAttemptBlockedNavigation?: () => boolean; // Returns true if navigation should proceed
}

const Navbar: React.FC<NavbarProps> = ({
  isBlockingNavigation = false,
  onAttemptBlockedNavigation,
}) => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isDropdownOpen &&
        dropdownButtonRef.current &&
        dropdownMenuRef.current &&
        !dropdownButtonRef.current.contains(event.target as Node) &&
        !dropdownMenuRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Base link common to both roles
  const baseLinks = [
    {
      name: "Dashboard",
      path: user?.role === "staff" ? "/staff/dashboard" : "/dashboard",
    },
  ];

  // Links specific to restaurant role
  const restaurantLinks = [
    { name: "Menu Management", path: "/menu" },
    { name: "Quiz Management", path: "/quiz-management" },
    { name: "Staff Management", path: "/staff" },
    { name: "Quiz Results", path: "/staff-results" },
  ];

  // Combine links based on role
  const navLinks = [
    ...baseLinks,
    ...(user?.role === "restaurant" ? restaurantLinks : []),
  ];

  // Styling constants
  const activeStyle = "text-sky-600 border-b-2 border-sky-500 font-semibold";
  const inactiveStyle =
    "text-slate-600 hover:text-sky-600 hover:border-sky-500 border-b-2 border-transparent transition-colors duration-200 ease-in-out";
  const baseStyle = "inline-flex items-center px-3 py-2 text-sm font-medium";

  // --- Navigation Handler ---
  const handleNavigationClick = (event: React.MouseEvent, _to: string) => {
    if (isBlockingNavigation && onAttemptBlockedNavigation) {
      const proceed = onAttemptBlockedNavigation(); // Ask for confirmation
      if (!proceed) {
        event.preventDefault(); // Stop navigation if user cancels
        return;
      }
      // If proceed is true, navigation continues (handled by Link/NavLink or explicit navigate below)
    }
    // Optional: Close menus if navigation proceeds
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
    // If not using Link/NavLink directly (e.g., for dropdown items), navigate explicitly:
    // navigate(to);
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-30 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side: Logo/Brand */}
          <div className="flex-none flex items-center">
            <Link
              to={baseLinks[0].path}
              className="text-2xl font-bold text-slate-700 hover:text-sky-600 transition-colors duration-150 ease-in-out"
              onClick={(e) => handleNavigationClick(e, baseLinks[0].path)}
            >
              QuizSavvy
            </Link>
          </div>

          {/* Center: Desktop Navigation Links - Centered using flex-1 and justify-center */}
          <div className="hidden sm:flex flex-1 justify-center items-center">
            <div className="flex space-x-8">
              {navLinks.map((link) => (
                <NavLink
                  key={link.name}
                  to={link.path}
                  className={({ isActive }) =>
                    `${baseStyle} ${isActive ? activeStyle : inactiveStyle}`
                  }
                  aria-label={`Navigate to ${link.name}`}
                  onClick={(e) => handleNavigationClick(e, link.path)}
                >
                  {link.name}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Right side: Profile, notifications, etc. */}
          <div className="flex-none flex items-center space-x-4">
            {/* User profile/menu */}
            <div className="relative">
              <button
                ref={dropdownButtonRef}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center p-1.5 rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors duration-150 ease-in-out"
              >
                {/* User profile icon */}
                <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm shadow-sm">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
              </button>

              {/* Dropdown menu */}
              {isDropdownOpen && (
                <div
                  ref={dropdownMenuRef}
                  className="origin-top-right absolute right-0 mt-2 w-56 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none py-2"
                >
                  <div className="px-1 py-1">
                    <div className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {user?.name || "User Name"}
                      </p>
                    </div>
                    <div className="border-t border-slate-100 my-1"></div>
                    <NavLink
                      to={baseLinks[0].path}
                      className="group flex items-center w-full px-4 py-2.5 text-sm text-slate-700 rounded-lg hover:bg-sky-50 hover:text-sky-700 transition-colors duration-150 ease-in-out"
                      onClick={(e) => {
                        if (
                          isBlockingNavigation &&
                          onAttemptBlockedNavigation
                        ) {
                          const proceed = onAttemptBlockedNavigation();
                          if (!proceed) {
                            e.preventDefault();
                            return;
                          }
                        }
                        setIsDropdownOpen(false);
                      }}
                    >
                      Dashboard
                    </NavLink>
                    <button
                      onClick={() => {
                        if (
                          isBlockingNavigation &&
                          onAttemptBlockedNavigation
                        ) {
                          const proceed = onAttemptBlockedNavigation();
                          if (!proceed) {
                            return;
                          }
                        }
                        logout();
                        setIsDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors duration-150 ease-in-out"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-500 hover:text-sky-600 hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle mobile menu"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {/* Hamburger Icon */}
              <svg
                className={`block h-6 w-6 ${
                  isMobileMenuOpen ? "hidden" : "block"
                }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* Close Icon */}
              <svg
                className={`h-6 w-6 ${isMobileMenuOpen ? "block" : "hidden"}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state. */}
      <div
        className={`${
          isMobileMenuOpen ? "block" : "hidden"
        } sm:hidden absolute w-full bg-white shadow-lg z-20 animate-fade-down`}
        id="mobile-menu"
      >
        <div className="pt-2 pb-3 space-y-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              onClick={(e) => handleNavigationClick(e, link.path)}
              className={({ isActive }) =>
                `block pl-4 pr-4 py-3 border-l-4 text-base font-medium transition-colors duration-150 ease-in-out ${
                  isActive
                    ? "bg-sky-50 border-sky-500 text-sky-700"
                    : "border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800"
                }`
              }
              aria-label={`Navigate to ${link.name}`}
            >
              {link.name}
            </NavLink>
          ))}
        </div>
        {/* Logout Button for Mobile */}
        <div className="pt-4 pb-3 border-t border-slate-200">
          <div className="px-2 space-y-1">
            <button
              onClick={() => {
                if (isBlockingNavigation && onAttemptBlockedNavigation) {
                  const proceed = onAttemptBlockedNavigation();
                  if (!proceed) {
                    return;
                  }
                }
                logout();
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left pl-4 pr-4 py-3 border-l-4 border-transparent text-base font-medium text-red-600 hover:bg-red-100 hover:border-red-500 hover:text-red-700 transition-colors duration-150 ease-in-out"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      {/* Basic animation styles */}
      <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fadeIn 0.5s ease-out forwards;
                }
                @keyframes fadeDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-down {
                    animation: fadeDown 0.2s ease-out forwards;
                }
            `}</style>
    </nav>
  );
};

export default Navbar;
