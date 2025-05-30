import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  acceptInvitation,
  getInvitationDetails,
  InvitationDetails,
} from "../services/api";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import PasswordInput, {
  validatePasswordStrength,
} from "../components/common/PasswordInput";
import ConfirmPasswordInput from "../components/common/ConfirmPasswordInput";
import { CheckCircleIcon, UserPlusIcon } from "@heroicons/react/24/outline";

const AcceptInvitationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const fetchInvitationDetails = async () => {
      if (!token) {
        setError("Invalid invitation link");
        setLoading(false);
        return;
      }

      try {
        const details = await getInvitationDetails(token);
        setInvitation(details);
        setFormData((prev) => ({ ...prev, name: details.name || "" }));
      } catch (err: any) {
        setError(
          err.response?.data?.message || "Invalid or expired invitation"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInvitationDetails();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password strength
    if (!validatePasswordStrength(formData.password)) {
      setError(
        "Password must be at least 6 characters and contain uppercase, lowercase, and number."
      );
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) return;

    setSubmitting(true);
    setError(null);

    try {
      await acceptInvitation(token, {
        password: formData.password,
        name: formData.name.trim(),
      });

      navigate("/login", {
        state: {
          message: "Account created successfully! Please log in.",
          email: invitation?.email,
        },
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to accept invitation");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner message="Loading invitation..." />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <div className="mb-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            Invalid Invitation
          </h3>
          <ErrorMessage message={error} />
          <Button
            variant="primary"
            onClick={() => navigate("/")}
            className="mt-4"
          >
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <UserPlusIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Join {invitation?.restaurantName}
          </h2>
          <p className="text-slate-600 mt-2">
            Complete your registration to get started
          </p>
        </div>

        {/* Success indicator */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-sm text-green-800">
              You've been invited to join the {invitation?.restaurantName} team!
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={invitation?.email || ""}
              disabled
              className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-600 font-medium"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter your full name"
            />
          </div>

          {/* Password Fields */}
          <PasswordInput
            label="Create Password"
            value={formData.password}
            onChange={(value) => setFormData({ ...formData, password: value })}
            placeholder="Create a password"
            disabled={submitting}
          />

          <ConfirmPasswordInput
            value={formData.confirmPassword}
            originalPassword={formData.password}
            onChange={(value) =>
              setFormData({ ...formData, confirmPassword: value })
            }
            placeholder="Confirm your password"
            disabled={submitting}
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={submitting}
            disabled={
              !formData.name.trim() ||
              !formData.password ||
              !formData.confirmPassword
            }
            className="w-full py-3 text-base font-semibold"
          >
            {submitting ? "Creating Account..." : "Complete Registration"}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-600">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Sign in
            </button>
          </p>
        </div>

        {/* Additional Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            What happens next?
          </h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Access training materials and SOPs</li>
            <li>• Take quizzes to test your knowledge</li>
            <li>• Stay updated with restaurant operations</li>
            <li>• Track your progress and achievements</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitationPage;
