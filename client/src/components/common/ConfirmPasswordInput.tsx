import React, { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

interface ConfirmPasswordInputProps {
  label?: string;
  value: string;
  originalPassword: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  autoComplete?: string;
}

const ConfirmPasswordInput: React.FC<ConfirmPasswordInputProps> = ({
  label = "Confirm Password",
  value,
  originalPassword,
  onChange,
  placeholder = "Confirm your password",
  required = true,
  disabled = false,
  className = "",
  id = "confirmPassword",
  name = "confirmPassword",
  autoComplete = "new-password",
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const doPasswordsMatch = value === originalPassword && value.length > 0;
  const hasValue = value.length > 0;

  // Determine border color based on validation
  const getBorderColor = () => {
    if (!hasValue) return "border-slate-300";
    return doPasswordsMatch ? "border-green-300" : "border-red-300";
  };

  // Determine focus ring color
  const getFocusRing = () => {
    if (!hasValue) return "focus:ring-blue-500 focus:border-blue-500";
    return doPasswordsMatch
      ? "focus:ring-green-500 focus:border-green-500"
      : "focus:ring-red-500 focus:border-red-500";
  };

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
          className={`w-full pr-12 pl-4 py-3 border rounded-xl transition-colors ${getBorderColor()} ${getFocusRing()}`}
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

      {/* Password Match Indicator */}
      {hasValue && (
        <div className="mt-2">
          {doPasswordsMatch ? (
            <p className="text-sm text-green-600 flex items-center">
              <span className="mr-1">✓</span>
              Passwords match
            </p>
          ) : (
            <p className="text-sm text-red-600 flex items-center">
              <span className="mr-1">✗</span>
              Passwords do not match
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ConfirmPasswordInput;
