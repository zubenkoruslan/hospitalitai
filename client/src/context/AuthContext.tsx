import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";

import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import api from "../services/api"; // Reverted to default import
import {
  login as loginService,
  getCurrentUser as getCurrentUserService,
} from "../services/api"; // Import api services
import { ClientUserMinimal, UserRole } from "../types/user"; // For context user type
import { AuthResponse } from "../types/authTypes"; // For loginService params

// Define the shape of the actual decoded JWT payload
export interface DecodedToken {
  id: string; // Standard JWT subject, maps to user._id
  role: UserRole;
  name: string;
  restaurantId?: string;
  // professionalRole?: string; // Not typically in token, part of User object
  // restaurantName?: string; // Not in token, part of login response body
  iat?: number;
  exp?: number;
}

// Define the shape of the context data
export interface AuthContextType {
  token: string | null;
  user: ClientUserMinimal | null; // User object will be ClientUserMinimal
  login: (email: string, password: string) => Promise<void>; // Parameters match LoginCredentials
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  fetchUser: () => Promise<void>; // Added fetchUser
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("authToken")
  );
  const [user, setUser] = useState<ClientUserMinimal | null>(null); // User state is ClientUserMinimal
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchUser = async () => {
    try {
      console.log("Fetching user data...");
      const { user: fetchedUser } = await getCurrentUserService();
      console.log("User data fetched successfully:", fetchedUser?.name);
      setUser(fetchedUser);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      // Potentially handle error, e.g., logout if user fetch fails critically
      // setError("Failed to refresh user data.");
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      console.log("Initializing auth...");
      const storedToken = localStorage.getItem("authToken");
      if (storedToken) {
        console.log("Found stored token, validating...");
        try {
          const decoded = jwtDecode<DecodedToken>(storedToken);
          if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            throw new Error("Token expired");
          }
          // Token is not expired, set it for API calls
          api.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${storedToken}`;
          setToken(storedToken);

          // Fetch user data with the valid token
          await fetchUser();
        } catch (error) {
          console.error("Failed to initialize auth from stored token:", error);
          localStorage.removeItem("authToken");
          setToken(null);
          setUser(null);
          delete api.defaults.headers.common["Authorization"];
        }
      } else {
        console.log("No stored token found");
        setToken(null);
        setUser(null);
        delete api.defaults.headers.common["Authorization"];
      }
      console.log("Auth initialization complete");
      setIsLoading(false);
    };

    initializeAuth();
  }, []); // Removed fetchUser from dependency array to avoid loop, initializeAuth calls it.

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Attempting login...");

      const response: AuthResponse = await loginService({ email, password });
      const { token: receivedToken, user: loggedInUser } = response;

      localStorage.setItem("authToken", receivedToken);
      setToken(receivedToken);
      setUser(loggedInUser);
      api.defaults.headers.common["Authorization"] = `Bearer ${receivedToken}`;
      console.log("Login successful for:", loggedInUser?.name);
    } catch (err: unknown) {
      // Type guard for error structure - CONSERVATIVE: only type what's actually used
      const isErrorWithResponse = (
        error: unknown
      ): error is {
        response?: {
          data?: {
            message?: string;
          };
        };
        message?: string;
      } => {
        return typeof error === "object" && error !== null;
      };

      const errorMessage =
        isErrorWithResponse(err) && err.response?.data?.message
          ? err.response.data.message
          : isErrorWithResponse(err) && err.message
          ? err.message
          : "Login failed. Please check credentials or server connection.";
      console.error("Login API error:", err);
      setError(errorMessage);
      delete api.defaults.headers.common["Authorization"];
      // No need to throw here if error state is handled by UI
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("authToken");
    delete api.defaults.headers.common["Authorization"];
    navigate("/login");
  };

  const contextValue = {
    token,
    user,
    login,
    logout,
    isLoading,
    error,
    fetchUser, // Added fetchUser to context value
  };

  // Don't render children until the initial auth check is complete.
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
        }}
      >
        Loading...
      </div>
    ); // Show loading instead of null to prevent blank screen
  }

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Export separately to fix Fast Refresh
export { useAuth };
