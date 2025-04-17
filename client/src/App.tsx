import React from "react";
import "./App.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

// Import Page/Component Placeholders
import LoginForm from "./components/LoginForm";
import SignupForm from "./components/SignupForm";
import RestaurantDashboard from "./pages/RestaurantDashboard";
import StaffDashboard from "./pages/StaffDashboard";
// TODO: Import other page components as needed

// Placeholder for protected route logic
// import ProtectedRoute from './components/ProtectedRoute';

// Component to handle root path redirection based on auth state
const RootRedirect: React.FC = () => {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    // Optional: Show a loading indicator while checking auth
    return <div>Loading...</div>;
  }

  if (token && user) {
    // User is logged in, redirect based on role
    if (user.role === "restaurant") {
      return <Navigate to="/dashboard" replace />;
    } else if (user.role === "staff") {
      return <Navigate to="/staff-dashboard" replace />;
    } else {
      // Fallback if role is unknown (shouldn't happen ideally)
      return <Navigate to="/login" replace />;
    }
  } else {
    // User is not logged in, redirect to login
    return <Navigate to="/login" replace />;
  }
};

function App() {
  // Basic structure - routing logic will likely get more complex
  // with protected routes and role-based access.

  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginForm />} />
          <Route path="/signup" element={<SignupForm />} />
          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="restaurant">
                <RestaurantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff-dashboard"
            element={
              <ProtectedRoute requiredRole="staff">
                <StaffDashboard />
              </ProtectedRoute>
            }
          />
          {/* Root path handled by RootRedirect component */}
          <Route path="/" element={<RootRedirect />} />
          {/* TODO: Add routes for other pages like MenuManagement, QuizManagement etc. */}
          {/* Example structure for protected route: */}
          {/* <Route path="/menus" element={ 
                <ProtectedRoute requiredRole="restaurant"> 
                  <MenuManagementPage /> 
                </ProtectedRoute> 
              } /> 
          */}
          {/* Catch-all for 404 Not Found - Optional */}
          {/* <Route path="*" element={<div>404 Not Found</div>} /> */}
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
