import Navbar from "../components/Navbar";
import React, { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import StaffSettings from "../components/settings/StaffSettings";
import RestaurantSettings from "../components/settings/RestaurantSettings";
import {
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  CogIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

// Import new settings components (we'll create these)
import NotificationSettings from "../components/settings/NotificationSettings";
import SecuritySettings from "../components/settings/SecuritySettings";
import PreferencesSettings from "../components/settings/PreferencesSettings";

interface SettingsTab {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
  description: string;
}

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-600 mb-4">
                Not Authenticated
              </h1>
              <p className="text-gray-500">Please log in to access settings.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Define available tabs based on user role
  const getAvailableTabs = (): SettingsTab[] => {
    const ProfileComponent =
      user.role === "restaurant" ? RestaurantSettings : StaffSettings;

    const baseTabs: SettingsTab[] = [
      {
        id: "profile",
        name: "Profile & Account",
        icon: UserIcon,
        component: ProfileComponent,
        description: "Manage your profile information and account settings",
      },
      {
        id: "notifications",
        name: "Notifications",
        icon: BellIcon,
        component: NotificationSettings,
        description: "Configure email and notification preferences",
      },
      {
        id: "security",
        name: "Security",
        icon: ShieldCheckIcon,
        component: SecuritySettings,
        description: "Password, authentication, and security settings",
      },
      {
        id: "preferences",
        name: "Preferences",
        icon: CogIcon,
        component: PreferencesSettings,
        description: "Theme, language, and display preferences",
      },
    ];

    return baseTabs;
  };

  const availableTabs = getAvailableTabs();

  // Filter tabs based on search query
  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return availableTabs;

    return availableTabs.filter(
      (tab) =>
        tab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tab.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableTabs, searchQuery]);

  const activeTabData = availableTabs.find((tab) => tab.id === activeTab);
  const ActiveComponent =
    activeTabData?.component || (() => <div>Tab not found</div>);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 lg:mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                Settings
              </h1>
              <p className="text-gray-600">
                Manage your account settings and preferences.
              </p>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search settings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Mobile Tab Dropdown - Visible only on mobile */}
            <div className="lg:hidden mb-6">
              <div className="relative">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <div className="flex items-center">
                    {activeTabData && (
                      <>
                        <activeTabData.icon className="h-5 w-5 text-gray-600 mr-3" />
                        <span className="font-medium text-gray-900">
                          {activeTabData.name}
                        </span>
                      </>
                    )}
                  </div>
                  <ChevronDownIcon
                    className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                      mobileMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {mobileMenuOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                    {filteredTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 ${
                          activeTab === tab.id
                            ? "bg-blue-50 border-l-4 border-blue-500"
                            : ""
                        } ${
                          tab.id === filteredTabs[filteredTabs.length - 1].id
                            ? "rounded-b-lg"
                            : ""
                        }`}
                      >
                        <tab.icon className="h-5 w-5 text-gray-600 mr-3" />
                        <div>
                          <div className="font-medium text-gray-900">
                            {tab.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {tab.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Settings Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Desktop Sidebar Navigation - Hidden on mobile */}
              <div className="hidden lg:block lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 lg:p-6 sticky top-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Settings
                  </h2>
                  <nav className="space-y-2">
                    {filteredTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-start px-3 py-3 text-sm font-medium rounded-lg transition-colors duration-150 ease-in-out ${
                          activeTab === tab.id
                            ? "text-blue-600 bg-blue-50 border border-blue-200"
                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        <tab.icon className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
                        <div className="text-left">
                          <div className="font-medium">{tab.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {tab.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </nav>

                  {/* Search Results Info */}
                  {searchQuery.trim() && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">
                        {filteredTabs.length} setting
                        {filteredTabs.length !== 1 ? "s" : ""} found
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Content Area */}
              <div className="col-span-1 lg:col-span-3">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  {/* Tab Header */}
                  <div className="px-4 lg:px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center">
                      {activeTabData && (
                        <>
                          <activeTabData.icon className="h-6 w-6 text-gray-600 mr-3" />
                          <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                              {activeTabData.name}
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                              {activeTabData.description}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="p-4 lg:p-6">
                    <ActiveComponent />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
