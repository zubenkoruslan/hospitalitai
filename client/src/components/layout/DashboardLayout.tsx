import React, { useState, ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  HomeIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  BookOpenIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  breadcrumb?: { name: string; href?: string }[];
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  breadcrumb,
}) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Navigation items based on user role
  const navigationItems = [
    {
      name: "Dashboard",
      href: user?.role === "staff" ? "/staff/dashboard" : "/dashboard",
      icon: HomeIcon,
      roles: ["restaurant", "staff"],
    },
    {
      name: "Menu Management",
      href: "/menu",
      icon: DocumentTextIcon,
      roles: ["restaurant"],
    },
    {
      name: "Quiz Management",
      href: "/quiz-management",
      icon: AcademicCapIcon,
      roles: ["restaurant"],
    },
    {
      name: "SOP Management",
      href: "/sop-management",
      icon: BookOpenIcon,
      roles: ["restaurant"],
    },
    {
      name: "Staff Management",
      href: "/staff",
      icon: UsersIcon,
      roles: ["restaurant"],
    },
    {
      name: "Quiz Results",
      href: "/staff-results",
      icon: ChartBarIcon,
      roles: ["restaurant"],
    },
    {
      name: "Settings",
      href: "/settings",
      icon: CogIcon,
      roles: ["restaurant", "staff"],
    },
  ].filter((item) => item.roles.includes(user?.role || ""));

  const isCurrentPage = (href: string) => {
    return (
      location.pathname === href || location.pathname.startsWith(href + "/")
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 flex z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-black bg-opacity-25"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Mobile sidebar */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>

            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h1 className="text-2xl font-bold text-blue-600">QuizCrunch</h1>
              </div>
              <nav className="mt-8 px-2 space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={`${
                        isCurrentPage(item.href)
                          ? "bg-blue-600 text-white shadow-lg"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      } group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      {item.name}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Mobile user section */}
            <div className="flex-shrink-0 flex border-t border-slate-200 p-4">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-700">
                    {user?.name || "User"}
                  </p>
                  <button
                    onClick={logout}
                    className="flex items-center text-xs text-slate-500 hover:text-red-600 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="h-3 w-3 mr-1" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white/80 backdrop-blur-sm border-r border-slate-200/50 shadow-lg">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-6">
              <h1 className="text-2xl font-bold text-blue-600">QuizCrunch</h1>
            </div>
            <nav className="mt-8 flex-1 px-4 space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={`${
                      isCurrentPage(item.href)
                        ? "bg-blue-600 text-white shadow-lg scale-105"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    } group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 hover:scale-105`}
                  >
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.name}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Desktop user section */}
          <div className="flex-shrink-0 flex border-t border-slate-200/50 p-4">
            <div className="flex items-center w-full">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                <span className="text-sm font-medium text-white">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-slate-700">
                  {user?.name || "User"}
                </p>
                <button
                  onClick={logout}
                  className="flex items-center text-xs text-slate-500 hover:text-red-600 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="h-3 w-3 mr-1" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white/80 backdrop-blur-sm border-b border-slate-200/50 shadow-sm">
          <button
            type="button"
            className="px-4 border-r border-slate-200 text-slate-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex-1">
              {breadcrumb && (
                <nav className="flex" aria-label="Breadcrumb">
                  <ol className="flex items-center space-x-2">
                    {breadcrumb.map((item, index) => (
                      <li key={item.name} className="flex items-center">
                        {index > 0 && (
                          <svg
                            className="flex-shrink-0 h-4 w-4 text-slate-400 mx-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        {item.href ? (
                          <NavLink
                            to={item.href}
                            className="text-sm font-medium text-slate-500 hover:text-slate-700"
                          >
                            {item.name}
                          </NavLink>
                        ) : (
                          <span className="text-sm font-medium text-slate-900">
                            {item.name}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
              {title && !breadcrumb && (
                <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
              )}
            </div>

            <div className="ml-4 flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-xs font-medium text-white">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <span className="hidden md:block text-sm font-medium text-slate-700">
                  {user?.name || "User"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
