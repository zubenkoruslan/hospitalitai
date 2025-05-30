import React, { useState, useEffect } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

interface PasswordStrength {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
}

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  showStrengthIndicator?: boolean;
  className?: string;
  id?: string;
  name?: string;
  autoComplete?: string;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  value,
  onChange,
  placeholder = "Enter password",
  required = true,
  disabled = false,
  showStrengthIndicator = true,
  className = "",
  id = "password",
  name = "password",
  autoComplete = "new-password",
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
  });

  // Update password strength as user types
  useEffect(() => {
    setPasswordStrength({
      minLength: value.length >= 6,
      hasUppercase: /[A-Z]/.test(value),
      hasLowercase: /[a-z]/.test(value),
      hasNumber: /\d/.test(value),
    });
  }, [value]);

  const isPasswordValid = Object.values(passwordStrength).every(Boolean);

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className="w-full pr-12 pl-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          className="absolute inset-y-0 right-0 pr-3 flex items-center disabled:opacity-50"
        >
          {showPassword ? (
            <EyeSlashIcon className="h-5 w-5 text-slate-400 hover:text-slate-600" />
          ) : (
            <EyeIcon className="h-5 w-5 text-slate-400 hover:text-slate-600" />
          )}
        </button>
      </div>

      {/* Password Requirements */}
      {showStrengthIndicator && value && (
        <div className="mt-3 space-y-2">
          <div className="text-xs">
            <div
              className={`flex items-center ${
                passwordStrength.minLength ? "text-green-600" : "text-slate-500"
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
                passwordStrength.hasNumber ? "text-green-600" : "text-slate-500"
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
  );
};

// Export both the component and the validation function
export const validatePasswordStrength = (password: string): boolean => {
  return (
    password.length >= 6 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
};

export default PasswordInput;
