import React from "react";
// import "./App.css"; // <-- Re-enabled this import - NOW REMOVING
import { AuthProvider, useAuth } from "./context/AuthContext";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { ValidationProvider } from "./context/ValidationContext";
import { NotificationProvider } from "./context/NotificationContext";

// Import Pages and Components
import LoginForm from "./components/LoginForm";
import SignupForm from "./components/SignupForm";
import RestaurantDashboard from "./pages/RestaurantDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import MenusPage from "./pages/MenusPage";
import MenuItemsPage from "./pages/MenuItemsPage";
import QuizAndBankManagementPage from "./pages/QuizAndBankManagementPage";
import QuizTakingPage from "./pages/QuizTakingPage";
import RestaurantStaffResultsPage from "./pages/RestaurantStaffResultsPage";
import StaffManagement from "./pages/StaffManagement";
import StaffDetails from "./pages/StaffDetails";
import HomePage from "./pages/HomePage";
// import QuestionBankListPage from "./pages/QuestionBankListPage"; // Removed import
import QuestionBankDetailPage from "./pages/QuestionBankDetailPage";
import QuestionBankEditPage from "./pages/QuestionBankEditPage";
import AiQuestionReviewPage from "./pages/AiQuestionReviewPage";
import CreateQuizPage from "./pages/CreateQuizPage";
import SettingsPage from "./pages/SettingsPage";
import SopManagementPage from "./pages/SopManagementPage";
import SopDocumentDetailPage from "./pages/SopDocumentDetailPage";
import MenuUploadPage from "./pages/MenuUploadPage";
import AcceptInvitationPage from "./pages/AcceptInvitationPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotificationsPage from "./pages/NotificationsPage";
// import StaffAnalyticsPage from "./pages/StaffAnalyticsPage"; // Removed import
// import GenerateQuizPage from "./pages/GenerateQuizPage"; // Removed import for GenerateQuizPage

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
          <NotificationProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginForm />} />
              <Route path="/signup" element={<SignupForm />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route
                path="/reset-password/:token"
                element={<ResetPasswordPage />}
              />
              <Route
                path="/staff/accept-invitation/:token"
                element={<AcceptInvitationPage />}
              />
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
                    <QuizAndBankManagementPage />
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
              {/* REMOVED: Route for QuestionBankListPage as it has been deleted. QuizAndBankManagementPage is the entry point. */}
              {/*
              <Route
                path="/question-banks"
                element={
                  <ProtectedRoute requiredRole="restaurant">
                    <QuestionBankListPage />
                  </ProtectedRoute>
                }
              />
              */}
              <Route
                path="/question-banks/:bankId"
                element={
                  <ProtectedRoute requiredRole="restaurant">
                    <QuestionBankDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/question-banks/:bankId/review-ai-questions"
                element={
                  <ProtectedRoute requiredRole="restaurant">
                    <AiQuestionReviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/question-banks/:bankId/edit"
                element={
                  <ProtectedRoute requiredRole="restaurant">
                    <QuestionBankEditPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-quiz"
                element={
                  <ProtectedRoute requiredRole="restaurant">
                    <CreateQuizPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sop-management"
                element={
                  <ProtectedRoute requiredRole="restaurant">
                    <SopManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sop-management/:documentId"
                element={
                  <ProtectedRoute requiredRole="restaurant">
                    <SopDocumentDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/new-test-route"
                element={<div>This is the new test route page!</div>}
              />
              <Route
                path="/menu-upload-path"
                element={
                  <ProtectedRoute requiredRole="restaurant">
                    <MenuUploadPage />
                  </ProtectedRoute>
                }
              />
              {/* 
                REMOVED: Route for generating quiz from question banks (now a modal)
                <Route
                  path="/generate-quiz"
                  element={
                    <ProtectedRoute requiredRole="restaurant">
                      <GenerateQuizPage />
                    </ProtectedRoute>
                  }
                />
              */}

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

              {/* Route for CreateQuizPage, ensuring correct ProtectedRoute usage */}
              <Route
                path="/create-quiz"
                element={
                  <ProtectedRoute requiredRole="restaurant">
                    <CreateQuizPage />
                  </ProtectedRoute>
                }
              />

              {/* Shared Protected Routes */}
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              {/* <Route staff-analytics route removed
                path="/staff-analytics"
                element={
                  <ProtectedRoute requiredRole="restaurant">
                    <StaffAnalyticsPage />
                  </ProtectedRoute>
                }
              /> */}

              {/* Catch-all for 404 Not Found */}
              <Route path="*" element={<div>404 Not Found</div>} />
            </Routes>
          </NotificationProvider>
        </ValidationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
