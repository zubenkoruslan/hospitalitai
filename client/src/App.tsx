import React from "react";
import "./App.css"; // <-- Re-enable this import
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
import MenusPage from "./pages/MenusPage";
import MenuItemsPage from "./pages/MenuItemsPage";
// import QuizPage from "./pages/QuizPage"; // Assuming this exists - commented out for now
import QuizCreation from "./pages/QuizCreation"; // <-- Keep this import
// import RegistrationPage from "./pages/RegistrationPage"; // Commented out for now
import MenuManagementPage from "./pages/MenuManagementPage";
import StaffQuizListPage from "./pages/StaffQuizListPage"; // Import staff quiz list page
import QuizTakingPage from "./pages/QuizTakingPage"; // Import quiz taking page
// Add import for the new results page
import RestaurantStaffResultsPage from "./pages/RestaurantStaffResultsPage";
// Add imports for new staff management pages
import StaffManagement from "./pages/StaffManagement";
import StaffDetails from "./pages/StaffDetails";
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
          <Route
            path="/menu"
            element={
              <ProtectedRoute requiredRole="restaurant">
                <MenusPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/menu/:menuId/items"
            element={
              <ProtectedRoute requiredRole="restaurant">
                <MenuItemsPage />
              </ProtectedRoute>
            }
          />
          {/* Add new route for Quiz Creation - Protected for restaurant */}
          <Route
            path="/quiz-management"
            element={
              <ProtectedRoute requiredRole="restaurant">
                <QuizCreation />
              </ProtectedRoute>
            }
          />
          {/* Quiz taking page for Staff - Protected for staff - Commented out if QuizPage doesn't exist */}
          {/* <Route
            path="/quiz"
            element={
              <ProtectedRoute requiredRole="staff">
                <QuizPage />
              </ProtectedRoute>
            }
          /> */}
          {/* NEW: Staff Quiz List Page */}
          <Route
            path="/staff/quizzes"
            element={
              <ProtectedRoute requiredRole="staff">
                <StaffQuizListPage />
              </ProtectedRoute>
            }
          />
          {/* NEW: Staff Quiz Taking Page */}
          <Route
            path="/staff/quiz/:quizId/take"
            element={
              <ProtectedRoute requiredRole="staff">
                <QuizTakingPage />
              </ProtectedRoute>
            }
          />
          {/* NEW: Restaurant Staff Results Page */}
          <Route
            path="/staff-results"
            element={
              <ProtectedRoute requiredRole="restaurant">
                <RestaurantStaffResultsPage />
              </ProtectedRoute>
            }
          />
          {/* NEW: Staff Management Pages (for Restaurant) */}
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
