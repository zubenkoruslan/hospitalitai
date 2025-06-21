import React, { useState, useEffect } from "react";
import {
  sendStaffInvitation,
  getRoles,
  SendInvitationRequest,
} from "../../services/api";
import { IRole } from "../../types/roleTypes";
import { useAuth } from "../../context/AuthContext";
import Button from "../common/Button";
import ErrorMessage from "../common/ErrorMessage";
import {
  EnvelopeIcon,
  UserPlusIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

interface StaffInvitationFormProps {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

const StaffInvitationForm: React.FC<StaffInvitationFormProps> = ({
  onSuccess,
  onError,
  className = "",
}) => {
  const { user } = useAuth();

  const [formData, setFormData] = useState<SendInvitationRequest>({
    email: "",
    name: "",
    assignedRoleId: "",
  });

  const [roles, setRoles] = useState<IRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch available roles
  useEffect(() => {
    const fetchRoles = async () => {
      if (!user?.restaurantId) {
        setRolesLoading(false);
        return;
      }

      try {
        const fetchedRoles = await getRoles(user.restaurantId);
        setRoles(fetchedRoles || []);
      } catch (err: unknown) {
        console.error("Failed to fetch roles:", err);
        setError("Failed to load roles");
      } finally {
        setRolesLoading(false);
      }
    };

    fetchRoles();
  }, [user?.restaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const invitationData: SendInvitationRequest = {
        email: formData.email.trim(),
        name: formData.name?.trim() || undefined,
        assignedRoleId: formData.assignedRoleId || undefined,
      };

      await sendStaffInvitation(invitationData);

      const successMessage = `Invitation sent successfully to ${formData.email}! ✨`;
      setSuccess(successMessage);

      // Reset form
      setFormData({
        email: "",
        name: "",
        assignedRoleId: "",
      });

      // Call success callback
      if (onSuccess) {
        onSuccess(successMessage);
      }
    } catch (err: unknown) {
      // Type guard for axios error response
      const isAxiosError = (
        error: unknown
      ): error is { response?: { data?: { message?: string } } } => {
        return (
          typeof error === "object" && error !== null && "response" in error
        );
      };

      const errorMessage =
        isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Failed to send invitation";
      setError(errorMessage);

      // Call error callback
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof SendInvitationRequest,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear messages when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <UserPlusIcon className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Invite New Staff Member
          </h3>
          <p className="text-sm text-slate-600">
            Send a professional invitation email to join your team
          </p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center">
            <SparklesIcon className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-sm text-green-800 font-medium">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Invitation Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <EnvelopeIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="staff@example.com"
              />
            </div>
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Full Name (Optional)
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="John Doe"
            />
          </div>
        </div>

        {/* Role Assignment */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Assign Role (Optional)
          </label>
          {rolesLoading ? (
            <div className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50">
              <span className="text-slate-500">Loading roles...</span>
            </div>
          ) : (
            <select
              value={formData.assignedRoleId}
              onChange={(e) =>
                handleInputChange("assignedRoleId", e.target.value)
              }
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">Select a role (optional)</option>
              {roles.map((role) => (
                <option key={role._id} value={role._id}>
                  {role.name}
                  {role.description && ` - ${role.description}`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            disabled={!formData.email.trim() || loading}
            className="w-full py-3 text-base font-semibold"
          >
            {loading ? "Sending Invitation..." : "Send Invitation"}
          </Button>
        </div>
      </form>

      {/* Info Section */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          How it works:
        </h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Staff member receives a professional invitation email</li>
          <li>• They click the link to complete registration</li>
          <li>• Account is automatically linked to your restaurant</li>
          <li>• They can immediately access training materials and quizzes</li>
        </ul>
      </div>
    </div>
  );
};

export default StaffInvitationForm;
