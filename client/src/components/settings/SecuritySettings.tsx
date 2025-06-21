import React, { useState } from "react";
import Button from "../common/Button";
import PasswordForm from "./PasswordForm";
import {
  ShieldCheckIcon,
  KeyIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { PasswordChangeDataClient } from "../../services/api";
import { changePassword } from "../../services/api";

interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginAlerts: boolean;
  sessionTimeout: number; // minutes
  autoLogout: boolean;
}

interface LoginSession {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}

const SecuritySettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Security settings state
  const [settings, setSettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    loginAlerts: true,
    sessionTimeout: 60, // 1 hour
    autoLogout: true,
  });

  // Mock active sessions (in real app, this would come from backend)
  const [activeSessions] = useState<LoginSession[]>([
    {
      id: "1",
      device: "MacBook Pro - Chrome",
      location: "San Francisco, CA",
      lastActive: "Just now",
      current: true,
    },
    {
      id: "2",
      device: "iPhone - Safari",
      location: "San Francisco, CA",
      lastActive: "2 hours ago",
      current: false,
    },
  ]);

  const clearMessages = () => {
    setMessage(null);
    setError(null);
  };

  const handlePasswordChange = async (
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

  const handleSettingToggle = (key: keyof SecuritySettings) => {
    if (key === "sessionTimeout") return; // Handle separately

    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSessionTimeoutChange = (minutes: number) => {
    setSettings((prev) => ({
      ...prev,
      sessionTimeout: minutes,
    }));
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    clearMessages();

    try {
      // TODO: Implement API call to save security settings
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      setMessage("Security settings saved successfully!");
    } catch {
      setError("Failed to save security settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      // TODO: Implement API call to terminate session
      console.log("Terminating session:", sessionId);
      setMessage("Session terminated successfully!");
    } catch {
      setError("Failed to terminate session. Please try again.");
    }
  };

  const ToggleSwitch: React.FC<{
    enabled: boolean;
    onChange: () => void;
    disabled?: boolean;
  }> = ({ enabled, onChange, disabled = false }) => (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        enabled ? "bg-blue-600" : "bg-gray-200"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-8">
      {/* Messages */}
      {message && (
        <div
          className="p-4 text-sm text-green-700 bg-green-100 rounded-lg"
          role="alert"
        >
          {message}
        </div>
      )}
      {error && (
        <div
          className="p-4 text-sm text-red-700 bg-red-100 rounded-lg"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Password Management */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-6">
          <KeyIcon className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            Password Management
          </h3>
        </div>

        <PasswordForm
          onSubmit={handlePasswordChange}
          isLoading={isPasswordLoading}
        />
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <ShieldCheckIcon className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            Two-Factor Authentication
          </h3>
          <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
            Coming Soon
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between opacity-50">
            <div>
              <p className="font-medium text-gray-700">Enable 2FA</p>
              <p className="text-sm text-gray-500">
                Add an extra layer of security to your account
              </p>
            </div>
            <ToggleSwitch
              enabled={settings.twoFactorEnabled}
              onChange={() => handleSettingToggle("twoFactorEnabled")}
              disabled={true}
            />
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Two-Factor Authentication Coming Soon
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  We're working on implementing 2FA support for enhanced account
                  security. This feature will be available in a future update.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Preferences */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <ShieldCheckIcon className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            Security Preferences
          </h3>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">Login Alerts</p>
              <p className="text-sm text-gray-500">
                Get notified of new logins to your account
              </p>
            </div>
            <ToggleSwitch
              enabled={settings.loginAlerts}
              onChange={() => handleSettingToggle("loginAlerts")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">Auto Logout</p>
              <p className="text-sm text-gray-500">
                Automatically log out after period of inactivity
              </p>
            </div>
            <ToggleSwitch
              enabled={settings.autoLogout}
              onChange={() => handleSettingToggle("autoLogout")}
            />
          </div>

          {settings.autoLogout && (
            <div className="pl-6 border-l-2 border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Session Timeout
              </label>
              <div className="space-y-2">
                {[15, 30, 60, 120, 240].map((minutes) => (
                  <label
                    key={minutes}
                    className="flex items-center cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="sessionTimeout"
                      value={minutes}
                      checked={settings.sessionTimeout === minutes}
                      onChange={() => handleSessionTimeoutChange(minutes)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-3 text-sm text-gray-700">
                      {minutes >= 60
                        ? `${minutes / 60} hour${minutes > 60 ? "s" : ""}`
                        : `${minutes} minutes`}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <ComputerDesktopIcon className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            Active Sessions
          </h3>
        </div>

        <div className="space-y-4">
          {activeSessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {session.device.includes("iPhone") ? (
                    <DevicePhoneMobileIcon className="h-6 w-6 text-gray-400" />
                  ) : (
                    <ComputerDesktopIcon className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 flex items-center">
                    {session.device}
                    {session.current && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Current
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">{session.location}</p>
                  <p className="text-xs text-gray-400">
                    Last active: {session.lastActive}
                  </p>
                </div>
              </div>

              {!session.current && (
                <Button
                  variant="white"
                  size="sm"
                  onClick={() => handleTerminateSession(session.id)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Terminate
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="primary"
          onClick={handleSaveSettings}
          disabled={isLoading}
          isLoading={isLoading}
          className="px-6 py-2"
        >
          Save Security Settings
        </Button>
      </div>
    </div>
  );
};

export default SecuritySettings;
