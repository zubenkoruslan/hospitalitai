import React from "react";

const SettingsPage: React.FC = () => {
  // TODO: Fetch user data and determine role (restaurant owner vs. staff)
  // TODO: Conditionally render RestaurantSettings or StaffSettings

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8 text-slate-700">Settings</h1>
      {/* Placeholder content - will be replaced by role-specific settings */}
      <p className="text-slate-600">Loading your settings...</p>
    </div>
  );
};

export default SettingsPage;
