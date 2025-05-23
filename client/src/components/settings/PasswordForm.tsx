import React from "react";

interface PasswordFormProps {
  // TODO: Define props: onSubmit
}

const PasswordForm: React.FC<PasswordFormProps> = (
  {
    /* TODO: Destructure props */
  }
) => {
  // TODO: Manage form state (currentPassword, newPassword, confirmPassword)
  // TODO: Handle form input changes
  // TODO: Handle form submission (with validation)

  return (
    <form className="space-y-4">
      <div>
        <label
          htmlFor="currentPassword"
          className="block text-sm font-medium text-slate-700"
        >
          Current Password
        </label>
        <input
          type="password"
          id="currentPassword"
          // TODO: value and onChange
          className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="newPassword"
          className="block text-sm font-medium text-slate-700"
        >
          New Password
        </label>
        <input
          type="password"
          id="newPassword"
          // TODO: value and onChange
          className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-slate-700"
        >
          Confirm New Password
        </label>
        <input
          type="password"
          id="confirmPassword"
          // TODO: value and onChange
          className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
      >
        Change Password
      </button>
    </form>
  );
};

export default PasswordForm;
