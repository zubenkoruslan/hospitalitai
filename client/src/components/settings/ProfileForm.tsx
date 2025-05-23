import React from "react";

interface ProfileFormProps {
  // TODO: Define props: initialData, onSubmit, userType: 'restaurant' | 'staff'
}

const ProfileForm: React.FC<ProfileFormProps> = (
  {
    /* TODO: Destructure props */
  }
) => {
  // TODO: Manage form state (e.g., name, email, restaurantName)
  // TODO: Handle form input changes
  // TODO: Handle form submission

  return (
    <form className="space-y-4">
      {/* TODO: Add form fields based on userType (e.g., Restaurant Name for restaurant) */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-slate-700"
        >
          Name
        </label>
        <input
          type="text"
          id="name"
          // TODO: value and onChange
          className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700"
        >
          Email
        </label>
        <input
          type="email"
          id="email"
          // TODO: value and onChange, possibly disabled if not editable
          className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
        />
      </div>
      {/* TODO: Add Restaurant Name field conditionally */}
      <button
        type="submit"
        className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
      >
        Save Changes
      </button>
    </form>
  );
};

export default ProfileForm;
