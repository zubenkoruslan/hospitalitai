import React, { useState, useEffect } from "react";
import api from "../services/api";

interface Staff {
  _id: string;
  name: string;
  email: string;
}

interface Quiz {
  _id: string;
  title: string;
}

interface AssignmentProps {
  quizId: string;
  quizTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

const QuizAssignment: React.FC<AssignmentProps> = ({
  quizId,
  quizTitle,
  onClose,
  onSuccess,
}) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await api.get("/staff");
        setStaff(response.data.staff || []);
        setIsLoading(false);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load staff members");
        setIsLoading(false);
      }
    };

    fetchStaff();
  }, []);

  const handleStaffSelection = (staffId: string) => {
    setSelectedStaff((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStaff.length === staff.length) {
      // If all are selected, deselect all
      setSelectedStaff([]);
    } else {
      // Otherwise, select all
      setSelectedStaff(staff.map((s) => s._id));
    }
  };

  const handleSubmit = async () => {
    if (selectedStaff.length === 0) {
      setError("Please select at least one staff member");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post("/quiz/assign", {
        quizId,
        staffIds: selectedStaff,
      });

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to assign quiz");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Assign Quiz: {quizTitle}
        </h2>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            <p>{error}</p>
          </div>
        )}

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Staff Members
            </label>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {selectedStaff.length === staff.length
                ? "Deselect All"
                : "Select All"}
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <svg
                className="animate-spin h-8 w-8 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          ) : staff.length === 0 ? (
            <p className="text-gray-500 py-2">No staff members found.</p>
          ) : (
            <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md">
              <ul className="divide-y divide-gray-200">
                {staff.map((member) => (
                  <li key={member._id} className="p-3 hover:bg-gray-50">
                    <div className="flex items-center">
                      <input
                        id={`staff-${member._id}`}
                        name="staff-selection"
                        type="checkbox"
                        checked={selectedStaff.includes(member._id)}
                        onChange={() => handleStaffSelection(member._id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor={`staff-${member._id}`}
                        className="ml-3 block text-sm font-medium text-gray-700"
                      >
                        {member.name}
                        <span className="block text-xs text-gray-500">
                          {member.email}
                        </span>
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedStaff.length === 0}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? "Assigning..." : "Assign Quiz"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizAssignment;
