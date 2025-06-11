import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Button from "../common/Button";
import {
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface NotificationPreferences {
  emailNotifications: boolean;
  quizReminders: boolean;
  resultsNotifications: boolean;
  weeklyReports: boolean;
  systemUpdates: boolean;
  mobileNotifications: boolean;
  reminderFrequency: "immediate" | "daily" | "weekly";
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize with default preferences (in a real app, this would come from the backend)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    quizReminders: true,
    resultsNotifications: true,
    weeklyReports: false,
    systemUpdates: true,
    mobileNotifications: false,
    reminderFrequency: "daily",
    quietHours: {
      enabled: false,
      start: "22:00",
      end: "08:00",
    },
  });

  const handleToggle = (key: keyof NotificationPreferences) => {
    if (key === "quietHours") return; // Handle separately

    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleFrequencyChange = (
    frequency: NotificationPreferences["reminderFrequency"]
  ) => {
    setPreferences((prev) => ({
      ...prev,
      reminderFrequency: frequency,
    }));
  };

  const handleQuietHoursToggle = () => {
    setPreferences((prev) => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        enabled: !prev.quietHours.enabled,
      },
    }));
  };

  const handleQuietHoursTimeChange = (type: "start" | "end", value: string) => {
    setPreferences((prev) => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [type]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      // TODO: Implement API call to save notification preferences
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      setMessage("Notification preferences saved successfully!");
    } catch (err: any) {
      setError("Failed to save notification preferences. Please try again.");
    } finally {
      setIsLoading(false);
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

      {/* Email Notifications */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <EnvelopeIcon className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            Email Notifications
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">Quiz Reminders</p>
              <p className="text-sm text-gray-500">
                Get notified about assigned quizzes
              </p>
            </div>
            <ToggleSwitch
              enabled={preferences.quizReminders}
              onChange={() => handleToggle("quizReminders")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">Quiz Results</p>
              <p className="text-sm text-gray-500">
                Receive notifications when quiz results are available
              </p>
            </div>
            <ToggleSwitch
              enabled={preferences.resultsNotifications}
              onChange={() => handleToggle("resultsNotifications")}
            />
          </div>

          {user?.role === "restaurant" && (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Weekly Reports</p>
                <p className="text-sm text-gray-500">
                  Staff performance and analytics summaries
                </p>
              </div>
              <ToggleSwitch
                enabled={preferences.weeklyReports}
                onChange={() => handleToggle("weeklyReports")}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">System Updates</p>
              <p className="text-sm text-gray-500">
                Important announcements and feature updates
              </p>
            </div>
            <ToggleSwitch
              enabled={preferences.systemUpdates}
              onChange={() => handleToggle("systemUpdates")}
            />
          </div>
        </div>
      </div>

      {/* Reminder Frequency */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <ClockIcon className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            Reminder Frequency
          </h3>
        </div>

        <div className="space-y-3">
          {(["immediate", "daily", "weekly"] as const).map((frequency) => (
            <label key={frequency} className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="reminderFrequency"
                value={frequency}
                checked={preferences.reminderFrequency === frequency}
                onChange={() => handleFrequencyChange(frequency)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-3 text-sm font-medium text-gray-700 capitalize">
                {frequency === "immediate"
                  ? "Immediate"
                  : `${
                      frequency.charAt(0).toUpperCase() + frequency.slice(1)
                    } digest`}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <BellIcon className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Quiet Hours</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">Enable Quiet Hours</p>
              <p className="text-sm text-gray-500">
                No notifications during specified hours
              </p>
            </div>
            <ToggleSwitch
              enabled={preferences.quietHours.enabled}
              onChange={handleQuietHoursToggle}
            />
          </div>

          {preferences.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={preferences.quietHours.start}
                  onChange={(e) =>
                    handleQuietHoursTimeChange("start", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={preferences.quietHours.end}
                  onChange={(e) =>
                    handleQuietHoursTimeChange("end", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Notifications (Future Feature) */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-500">
            Mobile Notifications
          </h3>
          <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
            Coming Soon
          </span>
        </div>

        <p className="text-sm text-gray-500">
          Push notifications for mobile devices will be available in a future
          update.
        </p>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="primary"
          onClick={handleSave}
          disabled={isLoading}
          isLoading={isLoading}
          className="px-6 py-2"
        >
          Save Preferences
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettings;
