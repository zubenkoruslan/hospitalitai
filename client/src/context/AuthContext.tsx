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
import api from "../services/api"; // Assuming api is your configured axios instance

// Define the shape of the decoded JWT payload
interface DecodedToken {
  userId: string; // Assuming MongoDB ObjectId strings
  role: "restaurant" | "staff";
  name: string; // Add name field
  restaurantId?: string;
  restaurantName?: string; // Add optional restaurantName
  // Add other fields your token might contain (e.g., name, email)
  iat?: number; // Issued at
  exp?: number; // Expiration time
}

// Define the shape of the context data
interface AuthContextType {
  token: string | null;
  user: DecodedToken | null;
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
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("authToken")
  );
  const [user, setUser] = useState<DecodedToken | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as true until check is done
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = localStorage.getItem("authToken");
      if (storedToken) {
        try {
          const decoded = jwtDecode<DecodedToken>(storedToken);
          // Optional: Check token expiration
          if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            console.log("Token expired");
            throw new Error("Token expired");
          }
          // Token is valid (or doesn't have exp), set state and headers
          setToken(storedToken);
          setUser(decoded);
          // *** Set default auth header for subsequent API calls ***
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
          // Ensure header is removed if initialization fails
          delete api.defaults.headers.common["Authorization"];
        }
      } else {
        // No token found, ensure state is clear and header is removed
        setToken(null);
        setUser(null);
        delete api.defaults.headers.common["Authorization"];
        console.log("No token found, auth not initialized.");
      }
      setIsLoading(false); // Finished loading/checking auth state
    };

    initializeAuth();
  }, []); // Empty dependency array means run only once on mount

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

      // Decode and set user immediately after getting token
      const decoded = jwtDecode<DecodedToken>(receivedToken);
      setUser(decoded);

      // *** Set default auth header on successful login ***
      api.defaults.headers.common["Authorization"] = `Bearer ${receivedToken}`;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Login failed. Please check credentials.";
      console.error("Login API error:", err);
      setError(errorMessage);
      delete api.defaults.headers.common["Authorization"]; // Clear header on login fail
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("authToken");
    // *** Remove default auth header on logout ***
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

  // Render children only after initial loading is complete
  // Or show a loading spinner globally
  if (isLoading) {
    // Optional: Return a global loading spinner or null
    // return <div>Loading Authentication...</div>;
    return null; // Or render children immediately if you handle loading inside components
  }

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
