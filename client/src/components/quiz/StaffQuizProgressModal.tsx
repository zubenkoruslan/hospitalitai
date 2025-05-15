import React from "react";
import Modal from "../common/Modal"; // Corrected path to Modal
import { ClientStaffQuizProgress } from "../../services/api";
import LoadingSpinner from "../common/LoadingSpinner";
import ErrorMessage from "../common/ErrorMessage";
import Button from "../common/Button";

interface StaffQuizProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizTitle: string;
  progressData: ClientStaffQuizProgress[] | null;
  isLoading: boolean;
  error: string | null;
  restaurantId?: string; // Optional, if needed for more context or actions
}

const StaffQuizProgressModal: React.FC<StaffQuizProgressModalProps> = ({
  isOpen,
  onClose,
  quizTitle,
  progressData,
  isLoading,
  error,
}) => {
  if (!isOpen) return null;

  const calculatePercentage = (seen: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((seen / total) * 100);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Staff Progress: <span className="text-blue-600">{quizTitle}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-150 text-2xl font-semibold p-1 leading-none rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {isLoading && <LoadingSpinner message="Loading staff progress..." />}
        {error && <ErrorMessage message={error} />}

        {!isLoading && !error && progressData && progressData.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Staff Member
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Progress
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Seen / Total
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Last Attempt
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {progressData.map((item) => {
                  const staffName = (item.staffUserId as any)?.firstName
                    ? `${(item.staffUserId as any).firstName} ${
                        (item.staffUserId as any).lastName
                      }`
                    : (item.staffUserId as string) || "Unknown Staff";
                  const percentage = calculatePercentage(
                    item.seenQuestionIds.length,
                    item.totalUniqueQuestionsInSource
                  );
                  return (
                    <tr key={item._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {staffName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${
                              item.isCompletedOverall
                                ? "bg-green-500"
                                : "bg-blue-500"
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-xs">{percentage}%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {item.isCompletedOverall ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Completed
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            In Progress
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.seenQuestionIds.length} /{" "}
                        {item.totalUniqueQuestionsInSource}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.lastAttemptTimestamp
                          ? new Date(
                              item.lastAttemptTimestamp
                            ).toLocaleDateString()
                          : "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading &&
          !error &&
          (!progressData || progressData.length === 0) && (
            <p className="text-center text-gray-500 py-8">
              No progress data found for this quiz.
            </p>
          )}

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default StaffQuizProgressModal;
