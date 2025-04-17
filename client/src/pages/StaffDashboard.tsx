import React from "react";
import { useAuth } from "../context/AuthContext"; // Import useAuth

// Mock data for assigned courses/quizzes
const mockAssignedItems = [
  { id: "1", title: "Introduction to Wine Service", type: "Course" },
  { id: "2", title: "Basic Food Safety Quiz", type: "Quiz" },
  { id: "3", title: "Handling Guest Complaints", type: "Course" },
];

const StaffDashboard: React.FC = () => {
  const { user, isLoading, logout } = useAuth(); // Get user, isLoading, and logout function

  // Basic loading state
  if (isLoading) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  // Ensure user is logged in and is staff
  if (!user || user.role !== "staff") {
    // Redirect or show error
    return <div className="p-8">Access denied or user not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="mb-8 flex justify-between items-center flex-wrap">
        {" "}
        {/* Use Flexbox & wrap */}
        <div>
          {" "}
          {/* Wrap welcome text */}
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome, {user.name}!
          </h1>
          {user.restaurantName && (
            <p className="text-lg text-gray-600">{user.restaurantName}</p>
          )}
        </div>
        <button
          onClick={logout}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
        >
          Log Out
        </button>
      </header>

      <section>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Assigned Tasks
        </h2>

        {mockAssignedItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockAssignedItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow p-6 flex flex-col justify-between"
              >
                <div>
                  <span
                    className={`inline-block px-3 py-1 text-sm font-semibold rounded-full mb-3 ${
                      item.type === "Course"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {item.type}
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                </div>
                <button className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out">
                  {item.type === "Course" ? "Start Learning" : "Take Quiz"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">You have no assigned tasks right now.</p>
        )}
      </section>

      {/* Placeholders for future sections like Learning Materials, Recent Results */}
      {/* <section className="mt-8">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Learning Materials</h2>
        </section>
      <section className="mt-8">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Recent Results</h2>
        </section> */}
    </div>
  );
};

export default StaffDashboard;
