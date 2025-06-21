import React, { useState } from "react";
import ProfileForm, { ProfileData } from "./ProfileForm";
import PasswordForm from "./PasswordForm";
import DeleteAccountCard from "./DeleteAccountCard";

// API service functions
import {
  updateUserProfile,
  changePassword,
  deleteUserAccount, // For staff self-deletion
} from "../../services/api";

// Context
import { useAuth } from "../../context/AuthContext";

// Types
import { PasswordChangeDataClient } from "../../services/api";

// UserSettingsUser interface can be removed if useAuth().user is directly used and sufficient

const StaffSettings: React.FC = () => {
  // Removed props, will use AuthContext
  const { user, fetchUser, logout } = useAuth();

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [, setIsAccountDeleting] = useState(false);

  const clearMessages = () => {
    setMessage(null);
    setError(null);
  };

  const handleUpdateProfile = async (formData: ProfileData) => {
    clearMessages();
    if (!user) return;
    setIsProfileLoading(true);
    try {
      // Staff only update their own name and email
      const updates: { name?: string; email?: string } = {};
      if (formData.name && formData.name !== user.name)
        updates.name = formData.name;
      if (formData.email && formData.email !== user.email)
        updates.email = formData.email;

      if (Object.keys(updates).length > 0) {
        await updateUserProfile(updates);
      }
      setMessage("Profile updated successfully!");
      if (fetchUser) fetchUser();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleChangePassword = async (
    passwordData: PasswordChangeDataClient
  ) => {
    clearMessages();
    setIsPasswordLoading(true);
    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setMessage("Password changed successfully!");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleDeleteSelfAccount = async () => {
    clearMessages();
    if (!user) return;
    setIsAccountDeleting(true);
    try {
      await deleteUserAccount(); // Staff deletes their own account
      setMessage(
        "Account deleted successfully. You will be logged out shortly."
      );
      setTimeout(() => {
        if (logout) logout();
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete account.");
      setIsAccountDeleting(false);
    }
  };

  if (!user) {
    return <p>Loading user data...</p>;
  }

  const profileInitialData: ProfileData = {
    name: user.name || "",
    email: user.email || "",
  };

  return (
    <div className="space-y-8">
      {message && (
        <div
          className="mb-6 p-4 text-sm text-green-700 bg-green-100 rounded-lg"
          role="alert"
        >
          {message}
        </div>
      )}
      {error && (
        <div
          className="mb-6 p-4 text-sm text-red-700 bg-red-100 rounded-lg"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-slate-700 mb-6">
            My Profile
          </h3>
          <ProfileForm
            initialData={profileInitialData}
            onSubmit={handleUpdateProfile}
            userType="staff"
            isLoading={isProfileLoading}
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-slate-700 mb-6">
            Change Password
          </h3>
          <PasswordForm
            onSubmit={handleChangePassword}
            isLoading={isPasswordLoading}
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mt-8 border border-red-300">
        <h3 className="text-xl font-semibold text-red-600 mb-6">
          Delete My Account
        </h3>
        <DeleteAccountCard
          onDeleteAccount={handleDeleteSelfAccount}
          userType="staff"
        />
      </div>
    </div>
  );
};

export default StaffSettings;
