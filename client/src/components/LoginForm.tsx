import React, { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Fixed import path

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
    <form onSubmit={handleSubmit} style={styles.form}>
      <h2>Login</h2>
      {/* Display component error OR auth error */}
      {(componentError || authError) && (
        <p style={styles.errorText}>{componentError || authError}</p>
      )}
      <div style={styles.inputGroup}>
        <label htmlFor="email" style={styles.label}>
          Email:
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
          disabled={isLoading}
        />
      </div>
      <div style={styles.inputGroup}>
        <label htmlFor="password" style={styles.label}>
          Password:
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
          disabled={isLoading}
        />
      </div>
      <button type="submit" disabled={isLoading} style={styles.button}>
        {isLoading ? "Logging in..." : "Login"}
      </button>
      {/* Add link to signup page */}
      <p style={styles.signupLink}>
        Don't have an account? <a href="/signup">Sign Up</a>
      </p>
      {/* Add forgot password link */}
      <p style={styles.forgotPasswordLink}>
        <a href="/forgot-password">Forgot Password?</a>
      </p>
    </form>
  );
};

// Basic inline styles for demonstration
const styles: { [key: string]: React.CSSProperties } = {
  form: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "2rem",
    border: "1px solid #ccc",
    borderRadius: "8px",
    maxWidth: "400px",
    margin: "2rem auto",
    backgroundColor: "#f9f9f9",
  },
  inputGroup: {
    marginBottom: "1rem",
    width: "100%",
  },
  label: {
    display: "block",
    marginBottom: "0.5rem",
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    padding: "0.75rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
    boxSizing: "border-box", // Required for correct width calculation with padding
  },
  button: {
    padding: "0.75rem 1.5rem",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "1rem",
    marginTop: "1rem",
    opacity: 1, // Default opacity
    transition: "opacity 0.3s ease",
  },
  // Note: Styling disabled state directly via inline styles is limited.
  // Consider CSS Modules or styled-components for pseudo-classes like :disabled.
  errorText: {
    color: "red",
    marginBottom: "1rem",
    textAlign: "center",
  },
  signupLink: {
    marginTop: "1rem",
    fontSize: "0.9rem",
  },
  forgotPasswordLink: {
    marginTop: "0.5rem",
    fontSize: "0.9rem",
  },
};

export default LoginForm;
