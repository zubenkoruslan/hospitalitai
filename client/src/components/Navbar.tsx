import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Base link common to both roles
  const baseLinks = [
    {
      name: "Dashboard",
      path: user?.role === "staff" ? "/staff-dashboard" : "/dashboard",
    },
  ];

  // Links specific to restaurant role
  const restaurantLinks = [
    { name: "Quiz Management", path: "/quiz-management" },
    { name: "Staff Management", path: "/staff" },
    { name: "Staff Results", path: "/staff-results" },
  ];

  // Links specific to staff role
  const staffLinks = [{ name: "Take Quiz", path: "/staff/quizzes" }];

  // Combine links based on role
  const navLinks = [
    ...baseLinks,
    ...(user?.role === "restaurant" ? restaurantLinks : []),
    ...(user?.role === "staff" ? staffLinks : []),
  ];

  // Styling constants
  const activeStyle = "text-blue-600 border-b-2 border-blue-600 font-semibold";
  const inactiveStyle =
    "text-gray-500 hover:text-gray-800 hover:border-gray-300 border-b-2 border-transparent";
  const baseStyle =
    "inline-flex items-center px-1 pt-1 text-sm font-medium transition duration-150 ease-in-out";

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-30 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side: Logo/Brand */}
          <div className="flex items-center">
            <Link
              to={baseLinks[0].path}
              className="text-xl font-bold text-blue-600 hover:opacity-80 transition-opacity"
            >
              HospitalityAI
            </Link>
          </div>

          {/* Center: Desktop Navigation Links */}
          <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                className={({ isActive }) =>
                  `${baseStyle} ${isActive ? activeStyle : inactiveStyle}`
                }
                aria-label={`Navigate to ${link.name}`}
              >
                {link.name}
              </NavLink>
            ))}
          </div>

          {/* Right side: Logout and Mobile Menu Button */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <button
              onClick={logout}
              className="ml-4 px-3 py-1.5 rounded-md text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
          {/* Mobile menu button */}
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
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
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* Close Icon */}
              <svg
                className={`h-6 w-6 ${isMobileMenuOpen ? "block" : "hidden"}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
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
              onClick={() => setIsMobileMenuOpen(false)} // Close menu on click
              className={({ isActive }) =>
                `block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  isActive
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                }`
              }
              aria-label={`Navigate to ${link.name}`}
            >
              {link.name}
            </NavLink>
          ))}
        </div>
        {/* Logout Button for Mobile */}
        <div className="pt-4 pb-3 border-t border-gray-200">
          <div className="px-2 space-y-1">
            <button
              onClick={() => {
                logout();
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-800"
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
