import React from "react";
import { useAuth } from "../context/AuthContext";
import RestaurantSettings from "../components/settings/RestaurantSettings";
import StaffSettings from "../components/settings/StaffSettings";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Navbar from "../components/Navbar";

const SettingsPage: React.FC = () => {
  const { user, isLoading } = useAuth();

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
          {" "}
          {/* Adjust height considering navbar */}
          <LoadingSpinner />
        </div>
      );
    }

    if (!user) {
      return (
        <div className="text-center py-10">
          <p className="text-red-500 text-lg">
            Please log in to view settings.
          </p>
        </div>
      );
    }

    let settingsComponent = null;
    let pageTitle = "Settings";

    if (user.role === "restaurant") {
      settingsComponent = <RestaurantSettings />;
      pageTitle = "Restaurant Account Settings";
    } else if (user.role === "staff") {
      settingsComponent = <StaffSettings />;
      pageTitle = "My Account Settings";
    } else {
      settingsComponent = (
        <div className="text-center py-10">
          <p className="text-gray-600 text-lg">
            No settings available for your user role.
          </p>
        </div>
      );
    }

    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-slate-800 sm:text-5xl">
            {pageTitle}
          </h1>
        </header>
        <div className="bg-white shadow-xl rounded-lg p-6 sm:p-8">
          {settingsComponent}
        </div>
      </main>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      {renderContent()}
    </div>
  );
};

export default SettingsPage;
