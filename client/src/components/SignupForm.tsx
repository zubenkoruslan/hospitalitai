import React, { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Button from "./common/Button";
import ErrorMessage from "./common/ErrorMessage";

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
      restaurantId: role === "staff" ? restaurantId : undefined,
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

  // Style constants for reuse (adjust as needed)
  const inputClasses =
    "appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8 bg-white p-10 shadow-xl rounded-2xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-700">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <ErrorMessage message={error} />}

          {/* Role Selection */}
          <fieldset className="space-y-2">
            <legend className={labelClasses}>I am a:</legend>
            <div className="flex items-center justify-around space-x-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <label className="flex items-center cursor-pointer p-2 rounded-md hover:bg-gray-100 transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="staff"
                  checked={role === "staff"}
                  onChange={() => setRole("staff")}
                  disabled={isLoading}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-offset-1"
                />
                <span className="ml-2 text-sm text-gray-700">Staff Member</span>
              </label>
              <label className="flex items-center cursor-pointer p-2 rounded-md hover:bg-gray-100 transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="restaurant"
                  checked={role === "restaurant"}
                  onChange={() => setRole("restaurant")}
                  disabled={isLoading}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-offset-1"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Restaurant Owner/Manager
                </span>
              </label>
            </div>
          </fieldset>

          {/* Common Fields */}
          <div>
            <label htmlFor="name" className={labelClasses}>
              Full Name
            </label>
            <div className="mt-1">
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className={inputClasses}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className={labelClasses}>
              Email address
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={inputClasses}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          <div>
            <label htmlFor="password" className={labelClasses}>
              Password (min. 6 characters)
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className={inputClasses}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          <div>
            <label htmlFor="confirmPassword" className={labelClasses}>
              Confirm Password
            </label>
            <div className="mt-1">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className={inputClasses}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Conditional Fields */}
          {role === "restaurant" && (
            <div>
              <label htmlFor="restaurantName" className={labelClasses}>
                Restaurant Name
              </label>
              <div className="mt-1">
                <input
                  id="restaurantName"
                  name="restaurantName"
                  type="text"
                  required={role === "restaurant"}
                  className={`${inputClasses} ${
                    role !== "restaurant" ? "bg-gray-100" : ""
                  }`}
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}
          {role === "staff" && (
            <>
              <div>
                <label htmlFor="restaurantId" className={labelClasses}>
                  Restaurant ID (provided by your manager)
                </label>
                <div className="mt-1">
                  <input
                    id="restaurantId"
                    name="restaurantId"
                    type="text"
                    required={role === "staff"}
                    className={`${inputClasses} ${
                      role !== "staff" ? "bg-gray-100" : ""
                    }`}
                    value={restaurantId}
                    onChange={(e) => setRestaurantId(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </>
          )}

          <div className="mt-8">
            <Button
              type="submit"
              variant="primary"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out disabled:opacity-50"
              isLoading={isLoading}
            >
              Sign Up
            </Button>
          </div>
        </form>
        <div className="text-sm text-center">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupForm;
