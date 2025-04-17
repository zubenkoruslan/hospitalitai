import React, { createContext, useState, useContext, ReactNode } from "react";
import axios from "axios";

// Define the shape of the context data
interface AuthContextType {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  // Add user role or other user info if needed
  // userRole: 'Restaurant' | 'Staff' | null;
}

// Create the context with a default value of null
const AuthContext = createContext<AuthContextType | null>(null);

// Define the props for the provider component
interface AuthProviderProps {
  children: ReactNode;
}

// Create the AuthProvider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Initialize token from localStorage
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("authToken")
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [userRole, setUserRole] = useState<AuthContextType['userRole']>(null); // Example for user role

  // Function to handle login API call and state updates
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // *** Replace with your actual backend API endpoint ***
      const response = await axios.post("/api/auth/login", { email, password });

      // --- Adjust based on your actual API response structure ---
      const { token: receivedToken /*, role */ } = response.data;
      // ---------------------------------------------------------

      if (!receivedToken) {
        throw new Error("Login failed: No token received.");
      }

      setToken(receivedToken);
      // setUserRole(role); // Set user role if returned by API
      localStorage.setItem("authToken", receivedToken);
      // localStorage.setItem('userRole', role); // Store role if needed
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Login failed. Please check credentials.";
      console.error("Login API error:", err);
      setError(errorMessage);
      // Re-throw the error so the component can catch it if needed
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle logout
  const logout = () => {
    setToken(null);
    // setUserRole(null);
    localStorage.removeItem("authToken");
    // localStorage.removeItem('userRole');
    // Optionally redirect to login page
    // window.location.href = '/login'; // Or use navigate if within router context
  };

  // Value provided by the context
  const contextValue = {
    token,
    login,
    logout,
    isLoading,
    error,
    // userRole,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    // This error means you are trying to use the context
    // outside of where it is provided. Ensure your component
    // is wrapped by AuthProvider in the component tree.
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
