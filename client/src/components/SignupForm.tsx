import React, { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
// import { useAuth } from '../context/AuthContext'; // Import if login on signup is needed

const SignupForm: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"staff" | "restaurant">("staff"); // Default role
  const [restaurantName, setRestaurantName] = useState(""); // For restaurant owner signup
  const [restaurantId, setRestaurantId] = useState(""); // REVERT: For staff signup

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  // const { login } = useAuth(); // Get login function if needed

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (role === "restaurant" && !restaurantName.trim()) {
      setError("Restaurant name is required for restaurant owners.");
      return;
    }
    if (role === "staff" && !restaurantId.trim()) {
      setError("Restaurant ID is required for staff members.");
      return;
    }

    setIsLoading(true);

    const signupData = {
      name,
      email,
      password,
      role,
      restaurantName: role === "restaurant" ? restaurantName : undefined,
      restaurantId: role === "staff" ? restaurantId : undefined, // Send ID for staff
    };

    try {
      // Replace with your actual signup endpoint
      const response = await axios.post("/api/auth/signup", signupData);

      console.log("Signup successful:", response.data);
      // Optionally login the user immediately if API returns token
      // if (response.data.token) {
      //     // Need login logic from AuthContext to store token
      //     localStorage.setItem('authToken', response.data.token);
      //     // Potentially update auth context state if login function does more
      // }

      // Navigate to login page or dashboard after successful signup
      alert("Signup successful! Please log in."); // Simple feedback
      navigate("/login");
    } catch (err: any) {
      console.error("Signup failed:", err);
      const errorMessage =
        err.response?.data?.message ||
        "Signup failed. Please check your details and try again.";
      // Display specific validation errors if available
      if (err.response?.data?.errors) {
        const specificErrors = Object.values(err.response.data.errors)
          .map((e: any) => e.message)
          .join(" \n");
        setError(`${errorMessage}\n${specificErrors}`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h2>Sign Up</h2>
      {error && (
        <p style={styles.errorText}>
          {error.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              <br />
            </span>
          ))}
        </p>
      )}

      {/* Role Selection */}
      <div style={styles.inputGroup}>
        <label style={styles.label}>I am a:</label>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <label>
            <input
              type="radio"
              name="role"
              value="staff"
              checked={role === "staff"}
              onChange={() => setRole("staff")}
              disabled={isLoading}
            />{" "}
            Staff
          </label>
          <label>
            <input
              type="radio"
              name="role"
              value="restaurant"
              checked={role === "restaurant"}
              onChange={() => setRole("restaurant")}
              disabled={isLoading}
            />{" "}
            Restaurant Owner/Manager
          </label>
        </div>
      </div>

      {/* Common Fields */}
      <div style={styles.inputGroup}>
        <label htmlFor="name" style={styles.label}>
          Full Name:
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={styles.input}
          disabled={isLoading}
        />
      </div>
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
          minLength={6}
          style={styles.input}
          disabled={isLoading}
        />
      </div>
      <div style={styles.inputGroup}>
        <label htmlFor="confirmPassword" style={styles.label}>
          Confirm Password:
        </label>
        <input
          type="password"
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          style={styles.input}
          disabled={isLoading}
        />
      </div>

      {/* Conditional Fields */}
      {role === "restaurant" && (
        <div style={styles.inputGroup}>
          <label htmlFor="restaurantName" style={styles.label}>
            Restaurant Name:
          </label>
          <input
            type="text"
            id="restaurantName"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            required={role === "restaurant"}
            style={styles.input}
            disabled={isLoading}
          />
        </div>
      )}
      {role === "staff" && (
        <div style={styles.inputGroup}>
          {/* This might be better as an invite code lookup later */}
          <label htmlFor="restaurantId" style={styles.label}>
            Restaurant ID (Provided by Manager):
          </label>
          <input
            type="text"
            id="restaurantId"
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
            required={role === "staff"}
            style={styles.input}
            disabled={isLoading}
          />
        </div>
      )}

      <button type="submit" disabled={isLoading} style={styles.button}>
        {isLoading ? "Signing up..." : "Sign Up"}
      </button>

      <p style={styles.loginLink}>
        Already have an account? <a href="/login">Log In</a>
      </p>
    </form>
  );
};

// Reusing similar basic styles from LoginForm for consistency
const styles: { [key: string]: React.CSSProperties } = {
  form: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "2rem",
    border: "1px solid #ccc",
    borderRadius: "8px",
    maxWidth: "450px", // Slightly wider for more fields
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
    boxSizing: "border-box",
  },
  button: {
    padding: "0.75rem 1.5rem",
    backgroundColor: "#28a745", // Green for signup
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "1rem",
    marginTop: "1rem",
    opacity: 1,
    transition: "opacity 0.3s ease",
  },
  errorText: {
    color: "red",
    marginBottom: "1rem",
    textAlign: "center",
    whiteSpace: "pre-line", // Allow newline characters for multiple errors
  },
  loginLink: {
    marginTop: "1.5rem",
    fontSize: "0.9rem",
  },
};

export default SignupForm;
