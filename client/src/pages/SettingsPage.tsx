import React from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import RestaurantSettings from "../components/settings/RestaurantSettings";
import StaffSettings from "../components/settings/StaffSettings";
import { useAuth } from "../context/AuthContext";
import { CogIcon } from "@heroicons/react/24/outline";

const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <DashboardLayout title="Settings">
        <div className="space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="text-center py-12">
              <CogIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Loading...
              </h3>
              <p className="text-slate-500">
                Please wait while we load your settings.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-slate-600 rounded-xl shadow-lg">
              <CogIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
              <p className="text-slate-600 mt-2">
                Manage your{" "}
                {user.role === "restaurant" ? "restaurant" : "personal"}{" "}
                preferences and configuration
              </p>
            </div>
          </div>
        </div>

        {/* Settings Content - Conditional based on user role */}
        {user.role === "restaurant" ? (
          <RestaurantSettings />
        ) : user.role === "staff" ? (
          <StaffSettings />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="text-center py-12">
              <CogIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Settings Not Available
              </h3>
              <p className="text-slate-500">
                Settings are not available for your user role.
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
