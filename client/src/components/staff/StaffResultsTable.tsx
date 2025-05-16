import React from "react";
import { Link } from "react-router-dom";
import {
  // ResultSummary, // No longer directly used here
  StaffMemberWithData,
  // SortField, // Not used in this component directly
  // SortDirection, // Not used in this component directly
  ClientQuizProgressSummary, // Import the new type
} from "../../types/staffTypes";
// import { formatDate, isCompletedQuiz } from "../../utils/helpers"; // isCompletedQuiz no longer needed
import { formatDate } from "../../utils/helpers"; // Only formatDate needed
import Button from "../common/Button";

// Interfaces (Copied - consider shared types)
// // Removed local definitions

// Helper function (Copied - consider moving to utils)
// Keep helper for now, move later if needed

// Prop Interface
interface StaffResultsTableProps {
  staff: StaffMemberWithData[];
  expandedStaffId: string | null;
  onToggleExpand: (staffId: string) => void;
}

// Staff Results Table Component
const StaffResultsTable: React.FC<StaffResultsTableProps> = ({
  staff,
  expandedStaffId,
  onToggleExpand,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Name
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Role
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Quizzes Taken
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Avg. Score
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Joined
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {staff.map((staffMember) => {
            const isExpanded = expandedStaffId === staffMember._id;
            const quizzesWithProgress = staffMember.quizProgressSummaries || []; // Use new field

            const averageScore = staffMember.averageScore;

            return (
              <React.Fragment key={staffMember._id}>
                <tr className={isExpanded ? "bg-blue-50" : "hover:bg-gray-50"}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      to={`/staff/${staffMember._id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      aria-label={`View details for ${staffMember.name}`}
                    >
                      {staffMember.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {staffMember.professionalRole || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    {staffMember.quizzesTaken}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-center text-sm font-semibold ${
                      averageScore === null
                        ? "text-gray-500"
                        : averageScore >= 70
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {averageScore !== null
                      ? `${averageScore.toFixed(1)}%`
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(staffMember.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <Button
                      variant="secondary"
                      onClick={() => onToggleExpand(staffMember._id)}
                      className={`text-xs py-1 ${
                        isExpanded
                          ? "!bg-blue-200 !text-blue-800 hover:!bg-blue-300 focus:!ring-blue-500"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-indigo-500"
                      }`}
                      aria-expanded={isExpanded}
                      aria-controls={`details-${staffMember._id}`}
                      aria-label={`${
                        isExpanded ? "Hide" : "Show"
                      } quiz details for ${staffMember.name}`}
                    >
                      {isExpanded ? "Hide" : "Details"}
                    </Button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr id={`details-${staffMember._id}`}>
                    <td
                      colSpan={6} // Colspan might need adjustment if columns are added/removed later
                      className="px-6 py-4 bg-gray-50 border-t border-gray-200"
                    >
                      <div className="text-sm text-gray-800">
                        <h4 className="font-semibold mb-2 text-gray-700">
                          Quiz Details:
                        </h4>
                        {quizzesWithProgress.length > 0 ? (
                          <ul className="space-y-2">
                            {quizzesWithProgress.map(
                              (summary: ClientQuizProgressSummary) => {
                                return (
                                  <li
                                    key={summary.quizId} // Use quizId from summary
                                    className="border-b border-gray-100 pb-2 last:border-b-0 last:pb-0"
                                  >
                                    <span className="font-medium">
                                      {summary.quizTitle}
                                    </span>
                                    {typeof summary.averageScoreForQuiz ===
                                      "number" && (
                                      <span className="font-semibold ml-2">
                                        Avg Score:{" "}
                                        {summary.averageScoreForQuiz.toFixed(1)}
                                        %
                                      </span>
                                    )}
                                    <span className="ml-2">
                                      (Overall Progress:{" "}
                                      {summary.overallProgressPercentage}%
                                    </span>
                                    <span className="ml-0.5">)</span>{" "}
                                    {/* Closing parenthesis for overall progress block */}
                                    {summary.isCompletedOverall &&
                                      summary.lastAttemptTimestamp && (
                                        <span className="text-xs text-gray-500 ml-2">
                                          -{" "}
                                          {new Date(
                                            summary.lastAttemptTimestamp
                                          ).toLocaleDateString("en-GB", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                          })}
                                        </span>
                                      )}
                                  </li>
                                );
                              }
                            )}
                          </ul>
                        ) : (
                          <p className="text-gray-500 italic">
                            No quiz progress available for this staff member.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Memoize the component
// export default React.memo(StaffResultsTable); // Remove React.memo for diagnostics
export default StaffResultsTable; // Export directly
