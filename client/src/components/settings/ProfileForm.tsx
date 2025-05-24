import React, { useState, useEffect } from "react";

// Define a basic user type for prop validation
export interface ProfileData {
  name: string;
  email: string;
  restaurantName?: string; // Optional for staff
}

export interface ProfileFormProps {
  initialData: ProfileData;
  onSubmit: (data: ProfileData) => Promise<void> | void;
  userType: "restaurant" | "staff";
  isLoading?: boolean; // Optional: for loading state during submission
}

const ProfileForm: React.FC<ProfileFormProps> = ({
  initialData,
  onSubmit,
  userType,
  isLoading,
}) => {
  const [name, setName] = useState(initialData.name || "");
  const [email, setEmail] = useState(initialData.email || "");
  const [restaurantName, setRestaurantName] = useState(
    initialData.restaurantName || ""
  );

  useEffect(() => {
    setName(initialData.name || "");
    setEmail(initialData.email || "");
    if (userType === "restaurant") {
      setRestaurantName(initialData.restaurantName || "");
    }
  }, [initialData, userType]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData: ProfileData = { name, email };
    if (userType === "restaurant") {
      formData.restaurantName = restaurantName;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="profile-name"
          className="block text-sm font-medium text-gray-700"
        >
          Name
        </label>
        <input
          type="text"
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="profile-email"
          className="block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          type="email"
          id="profile-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
        />
      </div>

      {userType === "restaurant" && (
        <div>
          <label
            htmlFor="profile-restaurant-name"
            className="block text-sm font-medium text-gray-700"
          >
            Restaurant Name
          </label>
          <input
            type="text"
            id="profile-restaurant-name"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-sky-300 disabled:cursor-not-allowed"
      >
        {isLoading ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
};

export default ProfileForm;
