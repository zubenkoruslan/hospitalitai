import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

interface TopNavigationProps {
  variant?: "transparent" | "solid";
}

const TopNavigation: React.FC<TopNavigationProps> = ({
  variant = "transparent",
}) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const baseClasses =
    "fixed top-0 left-0 right-0 z-50 transition-all duration-300";
  const variantClasses = {
    transparent: "bg-white/80 backdrop-blur-md border-b border-slate-200/50",
    solid: "bg-white shadow-lg border-b border-slate-200",
  };

  return (
    <>
      <nav className={`${baseClasses} ${variantClasses[variant]}`}>
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              to="/"
              className="text-2xl font-light text-dark-slate hover:opacity-80 transition-opacity"
            >
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-medium">
                QuizCrunch
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <Link
                to="/"
                className={`text-sm font-medium transition-colors ${
                  isActive("/")
                    ? "text-primary"
                    : "text-muted-gray hover:text-dark-slate"
                }`}
              >
                Home
              </Link>
              <Link
                to="/how"
                className={`text-sm font-medium transition-colors ${
                  isActive("/how")
                    ? "text-primary"
                    : "text-muted-gray hover:text-dark-slate"
                }`}
              >
                How It Works
              </Link>
            </div>

            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Link
                to="/login"
                className="text-sm font-medium text-muted-gray hover:text-dark-slate transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-xl bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-md hover:shadow-lg transition-all duration-200 ease-out transform hover:scale-[1.02] hover:-translate-y-0.5"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-muted-gray hover:text-dark-slate hover:bg-slate-100/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary transition-colors"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/50 shadow-lg">
          <div className="px-6 py-4 space-y-4">
            <Link
              to="/"
              className={`block text-base font-medium transition-colors ${
                isActive("/")
                  ? "text-primary"
                  : "text-muted-gray hover:text-dark-slate"
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/how"
              className={`block text-base font-medium transition-colors ${
                isActive("/how")
                  ? "text-primary"
                  : "text-muted-gray hover:text-dark-slate"
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              How It Works
            </Link>

            {/* Mobile CTA Buttons */}
            <div className="pt-4 border-t border-slate-200/50 space-y-3">
              <Link
                to="/login"
                className="block w-full text-center py-3 px-4 text-sm font-medium text-muted-gray hover:text-dark-slate bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="block w-full text-center py-3 px-4 text-sm font-medium rounded-xl bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopNavigation;
