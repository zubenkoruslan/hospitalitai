import React, { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../services/api";
import Button from "../components/common/Button";
import ErrorMessage from "../components/common/ErrorMessage";
import {
  KeyIcon,
  EnvelopeIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await requestPasswordReset(email.trim());
      setMessage(response.message);
      setSuccess(true);
    } catch (err: unknown) {
      // Type guard for API error structure - CONSERVATIVE: only type what's actually used
      const isAPIError = (
        error: unknown
      ): error is {
        response?: {
          data?: {
            message?: string;
          };
        };
      } => {
        return (
          typeof error === "object" && error !== null && "response" in error
        );
      };

      setError(
        isAPIError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Failed to send password reset email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Check Your Email
          </h2>

          <p className="text-slate-600 mb-6 leading-relaxed">{message}</p>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Important:</strong> The reset link will expire in 1 hour
              for security reasons. If you don't see the email, check your spam
              folder.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              variant="primary"
              onClick={() => setSuccess(false)}
              className="w-full"
            >
              Send Another Email
            </Button>

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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <KeyIcon className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Forgot Password?
          </h2>
          <p className="text-slate-600 mt-2">
            Enter your email address and we'll send you a link to reset your
            password.
          </p>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <EnvelopeIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null); // Clear error when user types
                }}
                required
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                placeholder="Enter your email address"
                disabled={loading}
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            disabled={!email.trim() || loading}
            className="w-full py-3 text-base font-semibold bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            {loading ? "Sending Reset Link..." : "Send Reset Link"}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center space-y-4">
          <Link
            to="/login"
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            ← Back to Login
          </Link>

          <div className="text-xs text-slate-500">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Sign up here
            </Link>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <h4 className="text-sm font-medium text-slate-900 mb-2">
            🔒 Security Notice
          </h4>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>• Reset links expire after 1 hour</li>
            <li>• We'll only send emails to registered accounts</li>
            <li>• For security, we don't reveal if an email exists</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
