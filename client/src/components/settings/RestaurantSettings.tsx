import React, { useState, useEffect } from "react";
import ProfileForm, { ProfileData } from "./ProfileForm";
import PasswordForm from "./PasswordForm";
import DeleteAccountCard from "./DeleteAccountCard";
import { useNavigate } from "react-router-dom";

// API service functions
import {
  updateUserProfile,
  changePassword,
  updateRestaurantProfile,
  deleteRestaurantAccount,
  PasswordChangeDataClient,
} from "../../services/api.ts";

// Context
import { useAuth } from "../../context/AuthContext";

// Types from API service
// PasswordChangeDataClient is now imported directly above

const RestaurantSettings: React.FC = () => {
  const { user, fetchUser, logout } = useAuth();
  const navigate = useNavigate();

  // General message state
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Loading states for different sections
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isAccountDeleting, setIsAccountDeleting] = useState(false);

  const clearMessages = () => {
    setMessage(null);
    setError(null);
  };

  const handleUpdateProfile = async (formData: ProfileData) => {
    clearMessages();
    if (!user) return;
    setIsProfileLoading(true);

    try {
      const userProfileUpdates: { name?: string; email?: string } = {};
      if (formData.name && formData.name !== user.name) {
        userProfileUpdates.name = formData.name;
      }
      if (formData.email && formData.email !== user.email) {
        userProfileUpdates.email = formData.email;
      }

      if (Object.keys(userProfileUpdates).length > 0) {
        await updateUserProfile(userProfileUpdates);
      }

      if (
        formData.restaurantName &&
        user.restaurantId &&
        formData.restaurantName !== user.restaurantName
      ) {
        // Assuming RestaurantProfileUpdateData from server expects { name?: string; ... }
        await updateRestaurantProfile(user.restaurantId, {
          name: formData.restaurantName,
        });
      }

      setMessage("Profile updated successfully!");
      if (fetchUser)
        fetchUser(); // Refresh user data in AuthContext if fetchUser exists
      else console.warn("fetchUser function not available on AuthContext");
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

  const handleDeleteRestaurantAccount = async () => {
    clearMessages();
    if (!user || !user.restaurantId) {
      setError("Restaurant information not found for deletion.");
      return;
    }
    setIsAccountDeleting(true);
    try {
      await deleteRestaurantAccount(user.restaurantId);
      setMessage(
        "Restaurant account deleted successfully. You will be logged out shortly."
      );
      setTimeout(() => {
        if (logout) logout(); // Call logout from AuthContext
        // Navigation will be handled by AuthContext/App routing if logout clears user
        // Or explicitly navigate if needed: navigate("/login");
      }, 3000); // Delay for message visibility
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to delete restaurant account."
      );
      setIsAccountDeleting(false); // Ensure loading state is reset on error
    }
    // Don't set isLoadingAccountDeleting to false here if logout is happening
  };

  if (!user) {
    return <p>Loading user data or user not found...</p>;
  }

  const profileInitialData: ProfileData = {
    name: user.name || "",
    email: user.email || "",
    restaurantName: user.restaurantName || "",
  };

  return (
    <div className="space-y-8">
      {/* Display Messages */}
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

      {/* Grid for Profile and Password sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Restaurant Profile Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-slate-700 mb-6">
            Restaurant Profile
          </h3>
          <ProfileForm
            initialData={profileInitialData}
            onSubmit={handleUpdateProfile}
            userType="restaurant"
            isLoading={isProfileLoading}
          />
        </div>

        {/* Change Password Card */}
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

      {/* Delete Account Card (full width, styled differently) */}
      <div className="bg-white p-6 rounded-lg shadow-md mt-8 border border-red-300">
        <h3 className="text-xl font-semibold text-red-600 mb-6">
          Delete Restaurant Account
        </h3>
        <DeleteAccountCard
          onDeleteAccount={handleDeleteRestaurantAccount}
          userType="restaurant"
        />
      </div>
    </div>
  );
};

export default RestaurantSettings;
