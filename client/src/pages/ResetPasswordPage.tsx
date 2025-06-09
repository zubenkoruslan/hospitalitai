import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { verifyResetToken, resetPassword } from "../services/api";
import Button from "../components/common/Button";
import ErrorMessage from "../components/common/ErrorMessage";
import LoadingSpinner from "../components/common/LoadingSpinner";
import {
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  // Token verification state
  const [tokenVerified, setTokenVerified] = useState<boolean | null>(null);
  const [userInfo, setUserInfo] = useState<{
    email?: string;
    userName?: string;
  }>({});

  // Form state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Password strength validation
  const [passwordStrength, setPasswordStrength] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
  });

  // Verify token on component mount
  useEffect(() => {
    if (!token) {
      setTokenVerified(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const result = await verifyResetToken(token);
        if (result.valid) {
          setTokenVerified(true);
          setUserInfo({ email: result.email, userName: result.userName });
        } else {
          setTokenVerified(false);
        }
      } catch (err) {
        setTokenVerified(false);
      }
    };

    verifyToken();
  }, [token]);

  // Update password strength as user types
  useEffect(() => {
    setPasswordStrength({
      minLength: password.length >= 6,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
    });
  }, [password]);

  const isPasswordValid = Object.values(passwordStrength).every(Boolean);
  const doPasswordsMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      setError("Password does not meet all requirements");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Invalid reset token");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Loading state while verifying token
  if (tokenVerified === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg">
          <LoadingSpinner />
          <p className="text-slate-600 mt-4 text-center">
            Verifying reset link...
          </p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (tokenVerified === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Invalid Reset Link
          </h2>

          <p className="text-slate-600 mb-6">
            This password reset link is invalid or has expired. Reset links are
            only valid for 1 hour.
          </p>

          <div className="space-y-3">
            <Link to="/forgot-password">
              <Button variant="primary" className="w-full">
                Request New Reset Link
              </Button>
            </Link>

            <Link
              to="/login"
              className="block w-full text-center py-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Password Reset Successful!
          </h2>

          <p className="text-slate-600 mb-6">
            Your password has been successfully reset. You can now log in with
            your new password.
          </p>

          <Button
            variant="primary"
            onClick={() => navigate("/login")}
            className="w-full"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Main reset password form
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <KeyIcon className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Reset Your Password
          </h2>
          {userInfo.userName && (
            <p className="text-slate-600 mt-2">
              Hi {userInfo.userName}, create a new password for your account.
            </p>
          )}
          {userInfo.email && (
            <p className="text-sm text-slate-500 mt-1">{userInfo.email}</p>
          )}
        </div>

        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                required
                className="w-full pr-12 pl-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                placeholder="Enter new password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                )}
              </button>
            </div>

            {/* Password Requirements */}
            {password && (
              <div className="mt-3 space-y-2">
                <div className="text-xs">
                  <div
                    className={`flex items-center ${
                      passwordStrength.minLength
                        ? "text-green-600"
                        : "text-slate-500"
                    }`}
                  >
                    <span className="mr-2">
                      {passwordStrength.minLength ? "✓" : "○"}
                    </span>
                    At least 6 characters
                  </div>
                  <div
                    className={`flex items-center ${
                      passwordStrength.hasUppercase
                        ? "text-green-600"
                        : "text-slate-500"
                    }`}
                  >
                    <span className="mr-2">
                      {passwordStrength.hasUppercase ? "✓" : "○"}
                    </span>
                    One uppercase letter
                  </div>
                  <div
                    className={`flex items-center ${
                      passwordStrength.hasLowercase
                        ? "text-green-600"
                        : "text-slate-500"
                    }`}
                  >
                    <span className="mr-2">
                      {passwordStrength.hasLowercase ? "✓" : "○"}
                    </span>
                    One lowercase letter
                  </div>
                  <div
                    className={`flex items-center ${
                      passwordStrength.hasNumber
                        ? "text-green-600"
                        : "text-slate-500"
                    }`}
                  >
                    <span className="mr-2">
                      {passwordStrength.hasNumber ? "✓" : "○"}
                    </span>
                    One number
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                }}
                required
                className={`w-full pr-12 pl-4 py-3 border rounded-xl focus:ring-2 transition-colors ${
                  confirmPassword && password === confirmPassword
                    ? "border-green-300 focus:ring-green-500 focus:border-green-500"
                    : confirmPassword && password !== confirmPassword
                    ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                    : "border-slate-300 focus:ring-green-500 focus:border-green-500"
                }`}
                placeholder="Confirm new password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                )}
              </button>
            </div>

            {confirmPassword && (
              <div className="mt-2">
                {doPasswordsMatch ? (
                  <p className="text-sm text-green-600">✓ Passwords match</p>
                ) : (
                  <p className="text-sm text-red-600">
                    ✗ Passwords do not match
                  </p>
                )}
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="success"
            isLoading={loading}
            disabled={!isPasswordValid || !doPasswordsMatch || loading}
            className="w-full py-3 text-base font-semibold"
          >
            Reset Password
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
