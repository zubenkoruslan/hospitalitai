import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Mock data for assigned quizzes
const mockQuizzes = [
  { id: "quiz1", title: "Basic Food Safety" },
  { id: "quiz2", title: "Wine Service Fundamentals" },
  { id: "quiz3", title: "Allergen Awareness" },
];

// Simple Loading Spinner Placeholder
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-4">
    <svg
      className="animate-spin h-8 w-8 text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  </div>
);

// Simple Error Message Placeholder
const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div
    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
    role="alert"
  >
    <strong className="font-bold">Error: </strong>
    <span className="block sm:inline">{message}</span>
  </div>
);

const StaffDashboard: React.FC = () => {
  const { user, isLoading: authIsLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Add state for actual quiz data later
  const quizzesLoading = false; // Placeholder
  const quizzesError = null; // Placeholder

  const handleLogout = () => {
    setIsSidebarOpen(false);
    logout();
  };

  if (authIsLoading) return <LoadingSpinner />;

  if (!user || user.role !== "staff") {
    return (
      <div className="p-8 flex flex-col items-center">
        <ErrorMessage message="Access Denied. Please log in as Staff." />
        <button
          onClick={() => navigate("/login")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Login
        </button>
      </div>
    );
  }

  const navLinks = [
    { name: "Quizzes", path: "/quizzes" },
    { name: "Results", path: "/results" },
  ];

  const SidebarContent = () => (
    <div className="h-full flex flex-col bg-white border-r border-gray-200 w-64">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Staff Portal</h2>
        {user.restaurantName && (
          <p className="text-sm text-gray-500 truncate">
            {user.restaurantName}
          </p>
        )}
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navLinks.map((link) => (
          <Link
            key={link.name}
            to={link.path}
            onClick={() => setIsSidebarOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            {link.name}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 hover:text-red-800"
        >
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Desktop Sidebar */}
      <div className="hidden md:block flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar (Drawer) */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${
          isSidebarOpen ? "block" : "hidden"
        }`}
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none text-white"
              onClick={() => setIsSidebarOpen(false)}
            >
              X
            </button>
          </div>
          <SidebarContent />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none md:hidden"
                >
                  ☰
                </button>
              </div>
              <div className="flex items-center">
                <h1 className="text-lg font-semibold text-gray-800">
                  Staff Portal
                </h1>
              </div>
              <div className="flex items-center"></div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome, {user.name}!
            </h1>
            {user.restaurantName && (
              <p className="text-lg text-gray-600">{user.restaurantName}</p>
            )}
          </div>

          {/* Grid for Content Cards */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Quizzes Card */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-3 text-gray-900">
                Assigned Quizzes
              </h3>
              {quizzesLoading && <LoadingSpinner />}
              {quizzesError && <ErrorMessage message={quizzesError} />}
              {!quizzesLoading && !quizzesError && (
                <ul className="space-y-2">
                  {mockQuizzes.length > 0 ? (
                    mockQuizzes.map((quiz) => (
                      <li
                        key={quiz.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm text-gray-800">
                          {quiz.title}
                        </span>
                        <Link to={`/quizzes/${quiz.id}/take`}>
                          <button className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                            Take Quiz
                          </button>
                        </Link>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500">
                      No quizzes assigned.
                    </li>
                  )}
                </ul>
              )}
            </div>
            {/* Results Card */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-3 text-gray-900">
                Your Results
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Review your past quiz performance.
              </p>
              <Link to="/results">
                <button className="w-full px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                  View Results
                </button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StaffDashboard;
