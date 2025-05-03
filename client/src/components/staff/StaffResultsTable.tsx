import React from "react";
import {
  ResultSummary,
  StaffMemberWithData,
  SortField,
  SortDirection,
} from "../../types/staffTypes"; // Corrected import path
import { formatDate, isCompletedQuiz } from "../../utils/helpers";

// Interfaces (Copied - consider shared types)
// // Removed local definitions

// Helper function (Copied - consider moving to utils)
// Keep helper for now, move later if needed

// Prop Interface
interface StaffResultsTableProps {
  staff: StaffMemberWithData[];
  sortBy: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  expandedStaffId: string | null;
  onToggleExpand: (staffId: string) => void;
  sortArrow: (field: SortField) => React.ReactNode;
}

// Staff Results Table Component
const StaffResultsTable: React.FC<StaffResultsTableProps> = ({
  staff,
  sortBy,
  sortDirection,
  onSort,
  expandedStaffId,
  onToggleExpand,
  sortArrow,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort("name")}
            >
              Name {sortArrow("name")}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort("role")}
            >
              Role {sortArrow("role")}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort("quizzesTaken")}
            >
              Quizzes Taken {sortArrow("quizzesTaken")}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort("averageScore")}
            >
              Avg. Score {sortArrow("averageScore")}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort("joined")}
            >
              Joined {sortArrow("joined")}
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {staff.map((staffMember) => {
            const isExpanded = expandedStaffId === staffMember._id;
            const completedQuizzes = Array.isArray(staffMember.resultsSummary)
              ? staffMember.resultsSummary.filter(isCompletedQuiz)
              : [];
            const averageScore = staffMember.averageScore;

            return (
              <React.Fragment key={staffMember._id}>
                <tr className={isExpanded ? "bg-blue-50" : "hover:bg-gray-50"}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {staffMember.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {staffMember.email}
                    </div>
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
                    <button
                      onClick={() => onToggleExpand(staffMember._id)}
                      className={`p-1 px-2 rounded text-xs ${
                        isExpanded
                          ? "bg-blue-200 text-blue-800"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                      aria-expanded={isExpanded}
                      aria-controls={`details-${staffMember._id}`}
                      aria-label={`${
                        isExpanded ? "Hide" : "Show"
                      } quiz details for ${staffMember.name}`}
                    >
                      {isExpanded ? "Hide" : "Details"}
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr id={`details-${staffMember._id}`}>
                    <td
                      colSpan={6} // Adjusted colspan
                      className="px-6 py-4 bg-gray-50 border-t border-gray-200"
                    >
                      {/* TODO: Extract this detail view to StaffResultRowDetail.tsx later? */}
                      <div className="text-sm text-gray-800">
                        <h4 className="font-semibold mb-2 text-gray-700">
                          Quiz Details:
                        </h4>
                        {completedQuizzes.length > 0 ? (
                          <ul className="space-y-2">
                            {completedQuizzes.map((result) => (
                              <li
                                key={result._id}
                                className="border-b border-gray-100 pb-2 last:border-b-0 last:pb-0"
                              >
                                <span className="font-medium">
                                  {result.quizTitle}:
                                </span>{" "}
                                {result.score}/{result.totalQuestions} (
                                {(
                                  (result.score / result.totalQuestions) *
                                  100
                                ).toFixed(0)}
                                %)
                                <span className="text-xs text-gray-500 ml-2">
                                  {" "}
                                  (Completed:{" "}
                                  {formatDate(result.completedAt, true)})
                                </span>
                                <span className="text-xs text-gray-500 ml-2">
                                  {" "}
                                  (Retakes:{" "}
                                  {result.retakeCount > 0
                                    ? result.retakeCount - 1
                                    : 0}
                                  )
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500 italic">
                            No quizzes completed yet.
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
export default React.memo(StaffResultsTable);
