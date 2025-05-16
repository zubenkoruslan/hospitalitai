import React from "react";
import Modal from "../common/Modal";
import { ClientStaffQuizProgress } from "../../types/staffTypes";
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
  restaurantId?: string;
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

  const calculatePercentage = (
    seen: number,
    totalInput: number | undefined | null
  ) => {
    const total =
      typeof totalInput === "number" && totalInput > 0 ? totalInput : 0;
    if (total === 0) return 0;
    const seenValid = typeof seen === "number" ? seen : 0;
    return Math.round((seenValid / total) * 100);
  };

  const modalTitle = (
    <>
      Staff Progress: <span className="text-sky-600">{quizTitle}</span>
    </>
  );

  const footerContent = (
    <Button onClick={onClose} variant="secondary">
      Close
    </Button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      footerContent={footerContent}
      size="xl"
    >
      {isLoading && <LoadingSpinner message="Loading staff progress..." />}
      {error && <ErrorMessage message={error} />}

      {!isLoading && !error && progressData && progressData.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  Staff Member
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  Progress
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  Last Attempt
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                >
                  Avg. Score
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {progressData.map((item: ClientStaffQuizProgress) => {
                let staffName = "Unknown Staff";
                if (typeof item.staffUserId === "string") {
                  staffName = `Staff ID: ${item.staffUserId}`;
                } else if (
                  typeof item.staffUserId === "object" &&
                  item.staffUserId !== null
                ) {
                  const user = item.staffUserId as any;
                  if (user.name && user.name.trim() !== "") {
                    staffName = user.name.trim();
                  } else if (user.email) {
                    staffName = user.email;
                  } else if (user._id) {
                    staffName = `Staff ID: ${user._id}`;
                  }
                }

                const seenIds = Array.isArray(item.seenQuestionIds)
                  ? item.seenQuestionIds
                  : [];
                const totalQsInSource =
                  typeof item.totalUniqueQuestionsInSource === "number"
                    ? item.totalUniqueQuestionsInSource
                    : 0;

                const percentage = calculatePercentage(
                  seenIds.length,
                  totalQsInSource
                );
                return (
                  <tr key={item._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                      {staffName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <div className="flex items-center">
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${
                              item.isCompletedOverall
                                ? "bg-emerald-500"
                                : "bg-sky-500"
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="ml-3 text-xs text-slate-500">
                          {percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {item.lastAttemptTimestamp
                        ? new Date(
                            item.lastAttemptTimestamp
                          ).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {typeof item.averageScore === "number"
                        ? `${item.averageScore.toFixed(0)}%`
                        : "0%"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!isLoading && !error && (!progressData || progressData.length === 0) && (
        <p className="text-center text-slate-500 py-8">
          No progress data found for this quiz.
        </p>
      )}
    </Modal>
  );
};

export default StaffQuizProgressModal;
