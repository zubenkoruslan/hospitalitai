import React from "react";
// import "./App.css"; // <-- Re-enable this import
import { AuthProvider, useAuth } from "./context/AuthContext";
// import { NotificationProvider } from "./context/NotificationContext"; // Removed
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { ValidationProvider } from "./context/ValidationContext";

// Import Pages and Components
import LoginForm from "./components/LoginForm";
import SignupForm from "./components/SignupForm";
import RestaurantDashboard from "./pages/RestaurantDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import MenusPage from "./pages/MenusPage";
import MenuItemsPage from "./pages/MenuItemsPage";
import QuizCreation from "./pages/QuizCreation";
import QuizTakingPage from "./pages/QuizTakingPage";
import RestaurantStaffResultsPage from "./pages/RestaurantStaffResultsPage";
import StaffManagement from "./pages/StaffManagement";
import StaffDetails from "./pages/StaffDetails";
import HomePage from "./pages/HomePage";
import QuestionBankListPage from "./pages/QuestionBankListPage";
import QuestionBankDetailPage from "./pages/QuestionBankDetailPage";
// import NotificationsPage from "./pages/NotificationsPage"; // Removed

// Component to handle authenticated user redirection based on role
const AuthRedirect: React.FC = () => {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (token && user) {
    // User is logged in, redirect based on role
    if (user.role === "restaurant") {
      return <Navigate to="/dashboard" replace />;
    } else if (user.role === "staff") {
      return <Navigate to="/staff/dashboard" replace />;
    } else {
      // Fallback if role is unknown
      return <Navigate to="/login" replace />;
    }
  } else {
    // User is not logged in, redirect to homepage
    return <Navigate to="/" replace />;
  }
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <ValidationProvider>
          {/* <NotificationProvider> */}
          {/* Removed */}
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/signup" element={<SignupForm />} />
            <Route path="/auth-redirect" element={<AuthRedirect />} />

            {/* Shared Protected Routes (Removed Notifications) */}
            {/*
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              */}

            {/* Restaurant Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredRole="restaurant">
                  <RestaurantDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/menu"
              element={
                <ProtectedRoute requiredRole="restaurant">
                  <MenusPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/menu/:menuId"
              element={
                <ProtectedRoute requiredRole="restaurant">
                  <MenuItemsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz-management"
              element={
                <ProtectedRoute requiredRole="restaurant">
                  <QuizCreation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff-results"
              element={
                <ProtectedRoute requiredRole="restaurant">
                  <RestaurantStaffResultsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute requiredRole="restaurant">
                  <StaffManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/:id"
              element={
                <ProtectedRoute requiredRole="restaurant">
                  <StaffDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/question-banks"
              element={
                <ProtectedRoute requiredRole="restaurant">
                  <QuestionBankListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/question-banks/:bankId"
              element={
                <ProtectedRoute requiredRole="restaurant">
                  <QuestionBankDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Staff Protected Routes */}
            <Route
              path="/staff/dashboard"
              element={
                <ProtectedRoute requiredRole="staff">
                  <StaffDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/quiz/:quizId/take"
              element={
                <ProtectedRoute requiredRole="staff">
                  <QuizTakingPage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all for 404 Not Found */}
            <Route path="*" element={<div>404 Not Found</div>} />
          </Routes>
          {/* </NotificationProvider> */}
          {/* Removed */}
        </ValidationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
