import React, { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types/user";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "restaurant" | "staff" | "admin"; // Optional role requirement
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, token, isLoading } = useAuth();
  const location = useLocation();

  // Wait for auth context to finish loading
  if (isLoading) {
    // You might want a more sophisticated loading spinner here
    return <div>Loading authentication...</div>;
  }

  // If not authenticated, redirect to login, saving the intended destination
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If a specific role is required and the user doesn't have it, redirect
  // You could redirect to a specific "Unauthorized" page or back to login/home
  if (requiredRole && user.role !== requiredRole) {
    // For now, redirecting to a hypothetical base dashboard or login might be simplest
    // Or redirect based on the *actual* role?
    // Example: redirect staff trying to access restaurant dash to staff dash
    if (user.role === UserRole.Staff) {
      return <Navigate to="/staff/dashboard" replace />;
    } else if (user.role === UserRole.RestaurantOwner) {
      return <Navigate to="/dashboard" replace />;
    } else if (user.role === UserRole.Admin) {
      return <Navigate to="/admin/analytics" replace />;
    }
    // Fallback if role is unexpected
    return <Navigate to="/login" replace />;
  }

  // If authenticated and role matches (or no role required), render the child component
  return <>{children}</>;
};

export default ProtectedRoute;
