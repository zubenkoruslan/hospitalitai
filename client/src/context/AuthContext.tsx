import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

// Define the shape of the decoded JWT payload
interface DecodedToken {
  userId: string;
  role: "restaurant" | "staff";
  name: string;
  restaurantId?: string;
  restaurantName?: string;
  professionalRole?: string;
  iat?: number;
  exp?: number;
}

// Define the shape of the context data
interface AuthContextType {
  token: string | null;
  user: DecodedToken | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("authToken")
  );
  const [user, setUser] = useState<DecodedToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = localStorage.getItem("authToken");
      if (storedToken) {
        try {
          const decoded = jwtDecode<DecodedToken>(storedToken);
          // Check token expiration
          if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            console.log("Token expired");
            throw new Error("Token expired");
          }
          // Token is valid, set state and headers
          setToken(storedToken);
          setUser(decoded);
          api.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${storedToken}`;
          console.log("Auth initialized with token.");
        } catch (error) {
          console.error("Failed to initialize auth from stored token:", error);
          // Clear invalid/expired token
          localStorage.removeItem("authToken");
          setToken(null);
          setUser(null);
          delete api.defaults.headers.common["Authorization"];
        }
      } else {
        // No token found, ensure state is clear
        setToken(null);
        setUser(null);
        delete api.defaults.headers.common["Authorization"];
        console.log("No token found, auth not initialized.");
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post("/auth/login", { email, password });
      const { token: receivedToken } = response.data;

      if (!receivedToken) {
        throw new Error("Login failed: No token received.");
      }

      // Store token and update state
      localStorage.setItem("authToken", receivedToken);
      setToken(receivedToken);

      // Decode and set user
      const decoded = jwtDecode<DecodedToken>(receivedToken);
      setUser(decoded);

      // Set auth header
      api.defaults.headers.common["Authorization"] = `Bearer ${receivedToken}`;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Login failed. Please check credentials.";
      console.error("Login API error:", err);
      setError(errorMessage);
      delete api.defaults.headers.common["Authorization"];
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("authToken");
    delete api.defaults.headers.common["Authorization"];
    console.log("User logged out, auth header removed.");
    navigate("/login");
  };

  const contextValue = {
    token,
    user,
    login,
    logout,
    isLoading,
    error,
  };

  // Don't render until auth check is complete
  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
