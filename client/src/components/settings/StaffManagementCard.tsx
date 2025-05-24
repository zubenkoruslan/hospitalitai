import React from "react";
import { StaffMemberWithData } from "../../types/staffTypes"; // Import StaffMemberWithData

// The old StaffMember type is no longer needed if we use StaffMemberWithData directly
/*
export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role?: string;
}
*/

export interface StaffAnalyticsTableProps {
  // Renamed props interface
  staffDataList: StaffMemberWithData[]; // Expecting full data
  onRemoveStaff: (staffId: string) => Promise<void> | void;
  isLoadingRemove?: string | null;
  isLoadingList?: boolean;
}

const StaffAnalyticsTable: React.FC<StaffAnalyticsTableProps> = ({
  // Renamed component
  staffDataList,
  onRemoveStaff,
  isLoadingRemove,
  isLoadingList,
}) => {
  if (isLoadingList) {
    return (
      <p className="text-sm text-gray-500 italic py-4">Loading staff data...</p>
    );
  }

  if (staffDataList.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic py-4">
        No staff members have been added yet.
      </p>
    );
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "Invalid Date";
    }
  };

  const formatScore = (score: number | null | undefined) => {
    if (score === null || score === undefined) return "N/A";
    return `${score.toFixed(1)}%`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
            >
              Name
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
            >
              Email
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
            >
              Role
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
            >
              Date Joined
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider text-center"
            >
              Quizzes Taken
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider text-center"
            >
              Avg. Score
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {staffDataList.map((staff) => (
            <tr key={staff._id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                {staff.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                {staff.email}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                {staff.professionalRole || "N/A"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                {formatDate(staff.createdAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center">
                {staff.quizProgressSummaries?.length || 0}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center">
                {formatScore(staff.averageScore)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={() => onRemoveStaff(staff._id)}
                  disabled={isLoadingRemove === staff._id}
                  className="text-red-600 hover:text-red-800 disabled:text-slate-300 transition-colors duration-150 ease-in-out"
                >
                  {isLoadingRemove === staff._id ? "Removing..." : "Remove"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StaffAnalyticsTable; // Renamed default export
