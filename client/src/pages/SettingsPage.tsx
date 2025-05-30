import React from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { CogIcon } from "@heroicons/react/24/outline";

const SettingsPage: React.FC = () => {
  return (
    <DashboardLayout title="Settings">
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-slate-500 to-gray-600 rounded-xl shadow-lg">
              <CogIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
              <p className="text-slate-600 mt-2">
                Manage your application preferences and configuration
              </p>
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div className="text-center py-12">
            <CogIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Settings Coming Soon
            </h3>
            <p className="text-slate-500">
              Application settings and preferences will be available here soon.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
