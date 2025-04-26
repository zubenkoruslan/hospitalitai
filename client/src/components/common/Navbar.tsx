import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext"; // Assuming you have an Auth context
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline"; // Heroicons for icons
import { Menu } from "@headlessui/react";
import { Transition } from "@headlessui/react";

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth(); // Get user and logout function from context
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login"); // Redirect to login page after logout
    } catch (error) {
      console.error("Logout failed:", error);
      // Handle logout error (e.g., show a notification)
    }
  };

  const commonLinkClasses =
    "text-off-white hover:text-accent transition-colors duration-200 px-3 py-2 rounded-md text-sm font-medium";
  const activeLinkClasses = "bg-teal-700"; // Optional: Class for active link

  const renderNavLinks = (isMobile: boolean = false) => (
    <>
      <Link
        to="/"
        className={`${commonLinkClasses} ${
          location.pathname === "/" ? activeLinkClasses : ""
        }`}
        onClick={() => isMobile && setIsMobileMenuOpen(false)}
      >
        Home
      </Link>
      {user?.role === "restaurant" && (
        <Link
          to="/restaurant-dashboard"
          className={`${commonLinkClasses} ${
            location.pathname === "/restaurant-dashboard"
              ? activeLinkClasses
              : ""
          }`}
          onClick={() => isMobile && setIsMobileMenuOpen(false)}
        >
          Dashboard
        </Link>
      )}
      {user?.role === "staff" && (
        <Link
          to="/staff-dashboard"
          className={`${commonLinkClasses} ${
            location.pathname === "/staff-dashboard" ? activeLinkClasses : ""
          }`}
          onClick={() => isMobile && setIsMobileMenuOpen(false)}
        >
          My Training
        </Link>
      )}
      {/* Add other common links as needed */}
    </>
  );

  return (
    <nav className="bg-primary shadow-md sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Desktop Nav */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0">
              {/* Replace with your actual logo */}
              <span className="text-2xl font-bold font-heading text-accent">
                Hospi<span className="text-off-white">Train</span>
              </span>
            </Link>
            <div className="hidden md:ml-6 md:block">
              <div className="flex items-baseline space-x-4">
                {renderNavLinks()}
              </div>
            </div>
          </div>

          {/* User/Auth Section */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {user ? (
                <div className="relative ml-3">
                  <button
                    onClick={handleLogout}
                    className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-primary"
                  >
                    <span className="sr-only">Logout</span>
                    <ArrowRightOnRectangleIcon
                      className="h-6 w-6 text-off-white hover:text-accent"
                      aria-hidden="true"
                    />
                    <span className="ml-2 text-off-white hover:text-accent text-sm font-medium hidden lg:block">
                      Logout
                    </span>
                  </button>
                  {/* Add dropdown for user profile link if needed */}
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link to="/login" className={commonLinkClasses}>
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-accent text-primary hover:bg-accent-dark font-medium px-4 py-2 rounded-md text-sm transition-colors duration-200 shadow"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-teal-700 p-2 text-off-white hover:bg-teal-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      <div
        className={`md:hidden transition-all duration-300 ease-in-out ${
          isMobileMenuOpen
            ? "max-h-screen opacity-100"
            : "max-h-0 opacity-0 overflow-hidden"
        }`}
        id="mobile-menu"
      >
        <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
          {renderNavLinks(true)}
        </div>
        <div className="border-t border-teal-700 pb-3 pt-4">
          {user ? (
            <div className="flex items-center px-5">
              <div className="flex-shrink-0">
                <UserCircleIcon className="h-10 w-10 rounded-full text-off-white" />
              </div>
              <div className="ml-3">
                <div className="text-base font-medium leading-none text-white">
                  {user.name}
                </div>
                <div className="text-sm font-medium leading-none text-gray-300">
                  {/* Optionally display role or other info if available */}
                  {/* <div className="text-sm font-medium leading-none text-gray-400">{user.email}</div> */}
                </div>
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                type="button"
                className="ml-auto flex-shrink-0 rounded-full bg-primary p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
              >
                <span className="sr-only">Logout</span>
                <ArrowRightOnRectangleIcon
                  className="h-6 w-6"
                  aria-hidden="true"
                />
              </button>
            </div>
          ) : (
            /* Add mobile profile/settings links here if needed */
            <div className="space-y-1 px-2">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-md px-3 py-2 text-base font-medium text-off-white hover:bg-teal-700 hover:text-white"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block rounded-md px-3 py-2 text-base font-medium text-off-white hover:bg-teal-700 hover:text-white"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
