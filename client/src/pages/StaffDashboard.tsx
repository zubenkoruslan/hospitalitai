import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

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
  const { user, isLoading: authIsLoading } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome, {user.name}!
            </h1>
            {user.restaurantName && (
              <p className="text-lg text-gray-600">{user.restaurantName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow duration-200">
              <h3 className="text-xl font-semibold mb-3 text-gray-800">
                Available Quizzes
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                View and take quizzes assigned by your manager.
              </p>
              <Link
                to="/staff/quizzes"
                className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition duration-150 ease-in-out"
              >
                View Quizzes
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow duration-200">
              <h3 className="text-xl font-semibold mb-3 text-gray-800">
                My Results
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Review your past quiz attempts and scores.
              </p>
              <Link
                to="/staff/my-results"
                className="inline-block px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition duration-150 ease-in-out"
              >
                View My Results
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StaffDashboard;
