import React, { useState } from "react";
import PasswordInput, {
  validatePasswordStrength,
} from "../common/PasswordInput";
import ConfirmPasswordInput from "../common/ConfirmPasswordInput";
import Button from "../common/Button";

// Define basic password data structure
interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordFormProps {
  onSubmit: (data: PasswordChangeData) => Promise<void> | void;
  isLoading?: boolean; // Optional: for loading state during submission
}

const PasswordForm: React.FC<PasswordFormProps> = ({
  onSubmit,
  isLoading = false,
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validate current password
    if (!currentPassword.trim()) {
      setError("Current password is required.");
      return;
    }

    // Validate new password strength
    if (!validatePasswordStrength(newPassword)) {
      setError(
        "New password must be at least 6 characters and contain uppercase, lowercase, and number."
      );
      return;
    }

    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    // Check if new password is different from current
    if (currentPassword === newPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    onSubmit({ currentPassword, newPassword, confirmPassword });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* Current Password Field */}
      <div>
        <label
          htmlFor="current-password"
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          Current Password
        </label>
        <div className="relative">
          <input
            type="password"
            id="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            disabled={isLoading}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter your current password"
          />
        </div>
      </div>

      {/* New Password Field with Enhanced Validation */}
      <PasswordInput
        label="New Password"
        value={newPassword}
        onChange={setNewPassword}
        disabled={isLoading}
        placeholder="Create a new password"
        id="new-password"
        name="new-password"
        autoComplete="new-password"
      />

      {/* Confirm New Password Field */}
      <ConfirmPasswordInput
        label="Confirm New Password"
        value={confirmPassword}
        originalPassword={newPassword}
        onChange={setConfirmPassword}
        disabled={isLoading}
        placeholder="Confirm your new password"
        id="confirm-password"
        name="confirm-password"
        autoComplete="new-password"
      />

      <Button
        type="submit"
        variant="primary"
        disabled={
          isLoading || !currentPassword || !newPassword || !confirmPassword
        }
        isLoading={isLoading}
        className="w-full py-3 px-4"
      >
        Change Password
      </Button>
    </form>
  );
};

export default PasswordForm;
