import React, { useState } from "react";
import Button from "../common/Button";
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  BellIcon,
  PaintBrushIcon,
} from "@heroicons/react/24/outline";

interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: "en" | "es" | "fr" | "de";
  fontSize: "small" | "medium" | "large";
  animations: boolean;
  soundEffects: boolean;
  reducedMotion: boolean;
  emailFormat: "html" | "text";
  timezone: string;
  dateFormat: "US" | "EU" | "ISO";
  timeFormat: "12h" | "24h";
}

const PreferencesSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize with default preferences (in a real app, this would come from the backend)
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: "system",
    language: "en",
    fontSize: "medium",
    animations: true,
    soundEffects: false,
    reducedMotion: false,
    emailFormat: "html",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: "US",
    timeFormat: "12h",
  });

  const clearMessages = () => {
    setMessage(null);
    setError(null);
  };

  const handlePreferenceChange = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleToggle = (key: keyof UserPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    clearMessages();

    try {
      // TODO: Implement API call to save user preferences
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      setMessage("Preferences saved successfully!");

      // Apply theme changes immediately (in a real app)
      if (preferences.theme === "dark") {
        document.documentElement.classList.add("dark");
      } else if (preferences.theme === "light") {
        document.documentElement.classList.remove("dark");
      } else {
        // System theme
        const systemTheme = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        if (systemTheme) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    } catch {
      setError("Failed to save preferences. Please try again.");
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

  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
  ];

  const timezones = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney",
  ];

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

      {/* Theme & Appearance */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-6">
          <PaintBrushIcon className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            Theme & Appearance
          </h3>
        </div>

        <div className="space-y-6">
          {/* Theme Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "light", label: "Light", icon: SunIcon },
                { value: "dark", label: "Dark", icon: MoonIcon },
                { value: "system", label: "System", icon: ComputerDesktopIcon },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() =>
                    handlePreferenceChange(
                      "theme",
                      value as UserPreferences["theme"]
                    )
                  }
                  className={`p-4 border-2 rounded-lg transition-all duration-200 ease-in-out ${
                    preferences.theme === value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Icon className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                  <div className="text-sm font-medium text-gray-900">
                    {label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Font Size
            </label>
            <div className="space-y-2">
              {[
                { value: "small", label: "Small", sample: "Sample Text" },
                { value: "medium", label: "Medium", sample: "Sample Text" },
                { value: "large", label: "Large", sample: "Sample Text" },
              ].map(({ value, label, sample }) => (
                <label
                  key={value}
                  className="flex items-center cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="fontSize"
                    value={value}
                    checked={preferences.fontSize === value}
                    onChange={() =>
                      handlePreferenceChange(
                        "fontSize",
                        value as UserPreferences["fontSize"]
                      )
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {label}
                      </span>
                      <span
                        className={`text-gray-600 ${
                          value === "small"
                            ? "text-xs"
                            : value === "medium"
                            ? "text-sm"
                            : "text-base"
                        }`}
                      >
                        {sample}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Visual Preferences */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Animations</p>
                <p className="text-sm text-gray-500">
                  Enable smooth transitions and animations
                </p>
              </div>
              <ToggleSwitch
                enabled={preferences.animations}
                onChange={() => handleToggle("animations")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Reduced Motion</p>
                <p className="text-sm text-gray-500">
                  Minimize motion for accessibility
                </p>
              </div>
              <ToggleSwitch
                enabled={preferences.reducedMotion}
                onChange={() => handleToggle("reducedMotion")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700">Sound Effects</p>
                <p className="text-sm text-gray-500">
                  Play sounds for notifications and interactions
                </p>
              </div>
              <ToggleSwitch
                enabled={preferences.soundEffects}
                onChange={() => handleToggle("soundEffects")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Language & Region */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-6">
          <GlobeAltIcon className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            Language & Region
          </h3>
        </div>

        <div className="space-y-6">
          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Language
            </label>
            <div className="grid grid-cols-2 gap-3">
              {languages.map(({ code, name, flag }) => (
                <button
                  key={code}
                  onClick={() =>
                    handlePreferenceChange(
                      "language",
                      code as UserPreferences["language"]
                    )
                  }
                  className={`p-3 border-2 rounded-lg transition-all duration-200 ease-in-out flex items-center ${
                    preferences.language === code
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg mr-3">{flag}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              value={preferences.timezone}
              onChange={(e) =>
                handlePreferenceChange("timezone", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time Format */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Format
              </label>
              <select
                value={preferences.dateFormat}
                onChange={(e) =>
                  handlePreferenceChange(
                    "dateFormat",
                    e.target.value as UserPreferences["dateFormat"]
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="US">MM/DD/YYYY (US)</option>
                <option value="EU">DD/MM/YYYY (EU)</option>
                <option value="ISO">YYYY-MM-DD (ISO)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Format
              </label>
              <select
                value={preferences.timeFormat}
                onChange={(e) =>
                  handlePreferenceChange(
                    "timeFormat",
                    e.target.value as UserPreferences["timeFormat"]
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="12h">12-hour (AM/PM)</option>
                <option value="24h">24-hour</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Email & Communication */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-6">
          <BellIcon className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            Email & Communication
          </h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Email Format
          </label>
          <div className="space-y-2">
            {[
              {
                value: "html",
                label: "HTML",
                description: "Rich formatting with images and styling",
              },
              {
                value: "text",
                label: "Plain Text",
                description: "Simple text-only format",
              },
            ].map(({ value, label, description }) => (
              <label
                key={value}
                className="flex items-start cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="emailFormat"
                  value={value}
                  checked={preferences.emailFormat === value}
                  onChange={() =>
                    handlePreferenceChange(
                      "emailFormat",
                      value as UserPreferences["emailFormat"]
                    )
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-700">
                    {label}
                  </div>
                  <div className="text-xs text-gray-500">{description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
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

export default PreferencesSettings;
