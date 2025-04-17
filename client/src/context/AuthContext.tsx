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
  // Initialize token from localStorage
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("authToken")
  );
  const [user, setUser] = useState<DecodedToken | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Decode token whenever it changes
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        console.log("Decoded Token Payload:", decoded);
        setUser(decoded);
      } catch (error) {
        console.error("Failed to decode token:", error);
        // Handle invalid token (e.g., logout user)
        setToken(null);
        setUser(null);
        localStorage.removeItem("authToken");
        navigate("/login");
      }
    } else {
      setUser(null); // Clear user when token is null
    }
  }, [token, navigate]); // Dependency array ensures this runs when token changes

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

      // Setting the token will trigger the useEffect to decode it and set the user
      localStorage.setItem("authToken", receivedToken);
      setToken(receivedToken);

      // No longer need to set role/user manually here, useEffect handles it
      // setUserRole(role);
      // localStorage.setItem('userRole', role);
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
    setUser(null); // Clear user state on logout
    localStorage.removeItem("authToken");
    navigate("/login");
    // localStorage.removeItem('userRole');
    // Optionally redirect to login page
    // window.location.href = '/login'; // Or use navigate if within router context
  };

  // Value provided by the context
  const contextValue = {
    token,
    user,
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
