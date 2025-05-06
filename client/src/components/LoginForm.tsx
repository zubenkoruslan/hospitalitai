import React, { useState, FormEvent, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Fixed import path
import Button from "./common/Button"; // Import Button component
import ErrorMessage from "./common/ErrorMessage"; // Assuming ErrorMessage uses Tailwind

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [componentError, setComponentError] = useState<string | null>(null); // Separate error state for component-level display
  const navigate = useNavigate();
  const auth = useAuth(); // Get context values

  // Handle case where context might not be ready or loaded yet
  if (!auth) {
    // Optionally return a loading state or null
    return <div>Loading auth context...</div>;
  }

  const { login, isLoading, error: authError, user, token } = auth;

  // --- Navigation Effect --- >>
  // Navigate user after successful login when user/token context changes
  useEffect(() => {
    // Only navigate if we have a user and token, and not during initial load
    if (user && token && !isLoading) {
      console.log("User logged in, navigating based on role:", user.role);
      if (user.role === "staff") {
        navigate("/staff/dashboard");
      } else if (user.role === "restaurant") {
        navigate("/dashboard");
      } else {
        // Default redirect if role is unexpected (shouldn't happen ideally)
        navigate("/");
      }
    }
    // Dependency array includes user and token to trigger on login/logout
    // Also include navigate and isLoading to satisfy lint rules
  }, [user, token, navigate, isLoading]);
  // --- Navigation Effect --- <<

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setComponentError(null);
    // Clear previous auth errors? Maybe not, context handles its error state.

    if (!email || !password) {
      setComponentError("Please enter both email and password.");
      return;
    }

    try {
      await login(email, password);
      // *** Removed navigation logic from here ***
      // Navigation will now be handled by the useEffect hook when the context updates
    } catch (err) {
      console.error("Login submission failed:", err);
      // Only set component error if the context hasn't already set one.
      if (!authError) {
        setComponentError("Login failed unexpectedly.");
      }
      // The authError from the context will be displayed automatically
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 shadow-md rounded-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Display component error OR auth error using ErrorMessage component */}
          {(componentError || authError) && (
            <ErrorMessage
              message={componentError || authError || "An error occurred"}
            />
          )}
          <input type="hidden" name="remember" defaultValue="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            {/* Optional: Add remember me checkbox here if needed */}
            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="group relative w-full flex justify-center"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </form>
        <div className="text-sm text-center">
          <p className="text-gray-600">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
