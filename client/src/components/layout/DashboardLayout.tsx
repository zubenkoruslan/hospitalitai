import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bars3Icon,
  XMarkIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRightIcon className="h-4 w-4 text-muted-gray mx-2 flex-shrink-0" />
            )}
            {item.href ? (
              <Link
                to={item.href}
                className="text-sm font-medium text-muted-gray hover:text-primary transition-colors duration-200 hover:underline focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-md px-1"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-sm font-semibold text-dark-slate">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  breadcrumb,
  actions,
  sidebar,
  className = "",
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-slate-50 to-slate-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 flex z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-black/25 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Mobile sidebar */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl border-r border-slate-200">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white transition-colors duration-200"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>

            {/* Mobile sidebar content */}
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center justify-center px-4 mb-8">
                <Link
                  to="/"
                  className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
                >
                  QuizCrunch
                </Link>
              </div>
              {sidebar}
            </div>
          </div>
        </div>
      )}

      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        {/* Sidebar component */}
        <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-background to-white border-r border-slate-200/50 shadow-xl">
          <div className="flex items-center h-16 flex-shrink-0 px-6 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-slate-200/50">
            <Link
              to="/"
              className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent hover:from-primary-600 hover:to-accent-600 transition-all duration-200"
            >
              QuizCrunch
            </Link>
          </div>
          <div className="flex-1 flex flex-col overflow-y-auto pt-6 pb-4">
            {sidebar}
          </div>
        </div>
      </div>

      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white/80 backdrop-blur-lg border-b border-slate-200/50 shadow-sm">
          <button
            type="button"
            className="px-4 border-r border-slate-200/50 text-muted-gray hover:text-dark-slate hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/50 lg:hidden transition-colors duration-200"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex-1 px-6 flex justify-between items-center">
            <div className="flex-1">
              {breadcrumb && (
                <nav className="flex" aria-label="Breadcrumb">
                  <ol className="flex items-center space-x-2">
                    {React.Children.map(breadcrumb, (child, index) => (
                      <li key={index} className="flex items-center">
                        {index > 0 && (
                          <ChevronRightIcon className="h-4 w-4 text-muted-gray mx-2 flex-shrink-0" />
                        )}
                        {child}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
            </div>

            {/* Header actions */}
            {actions && (
              <div className="ml-4 flex items-center space-x-4">{actions}</div>
            )}
          </div>
        </div>

        {/* Page header */}
        {title && (
          <div className="bg-gradient-to-r from-white to-slate-50 border-b border-slate-200/50 px-6 py-8">
            <div className="max-w-7xl mx-auto">
              <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl font-light text-dark-slate tracking-tight">
                    {title}
                  </h1>
                  {breadcrumb && <div className="mt-2">{breadcrumb}</div>}
                </div>
                {actions && (
                  <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
                    {actions}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className={`py-8 ${className}`}>
            <div className="max-w-7xl mx-auto px-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
};

export { Breadcrumb };
export default DashboardLayout;
