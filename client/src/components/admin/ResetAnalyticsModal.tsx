import React, { useState } from "react";
import { resetAnalytics, ResetAnalyticsOptions } from "../../services/api";
import Button from "../common/Button";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface ResetAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetComplete: () => void;
}

const ResetAnalyticsModal: React.FC<ResetAnalyticsModalProps> = ({
  isOpen,
  onClose,
  onResetComplete,
}) => {
  const [options, setOptions] = useState<ResetAnalyticsOptions>({
    resetQuizAttempts: false,
    resetStaffProgress: false,
    resetArchivedAnalytics: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!isOpen) return null;

  const handleReset = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log(
        "[Reset Analytics] Starting analytics reset with options:",
        options
      );

      const result = await resetAnalytics(options);

      console.log("[Reset Analytics] Reset completed:", result);
      setResult(result);

      // Trigger analytics refresh across the app
      window.dispatchEvent(new CustomEvent("analytics-refresh"));

      // Small delay to ensure backend cache has been invalidated
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("analytics-refresh"));
        onResetComplete();
      }, 500);
    } catch (err) {
      console.error("[Reset Analytics] Error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to reset analytics"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    setShowConfirmation(false);
    handleReset();
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setResult(null);
    setError(null);
    onClose();
  };

  const isDestructiveOperation =
    options.resetQuizAttempts || options.resetStaffProgress;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Reset Analytics</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {!showConfirmation && !result && (
          <>
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Select what analytics data to reset:
              </p>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={false}
                    disabled
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium text-gray-900">
                      Analytics Records
                    </span>
                    <p className="text-sm text-gray-600">
                      Always reset (UserKnowledgeAnalytics)
                    </p>
                  </div>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.resetStaffProgress}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        resetStaffProgress: e.target.checked,
                      }))
                    }
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium text-gray-900">
                      Staff Quiz Progress
                    </span>
                    <p className="text-sm text-gray-600">
                      Reset quiz completion status
                    </p>
                  </div>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.resetArchivedAnalytics}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        resetArchivedAnalytics: e.target.checked,
                      }))
                    }
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium text-gray-900">
                      Archived Analytics
                    </span>
                    <p className="text-sm text-gray-600">
                      Delete historical analytics data
                    </p>
                  </div>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.resetQuizAttempts}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        resetQuizAttempts: e.target.checked,
                      }))
                    }
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium text-red-700">
                      Quiz Attempts
                    </span>
                    <p className="text-sm text-red-600">
                      ⚠️ DESTRUCTIVE: Permanently delete all quiz history
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {isDestructiveOperation && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700 font-medium">
                  ⚠️ Warning: You've selected destructive options that cannot be
                  undone!
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant={isDestructiveOperation ? "destructive" : "primary"}
                onClick={() => setShowConfirmation(true)}
                isLoading={isLoading}
              >
                Reset Analytics
              </Button>
            </div>
          </>
        )}

        {showConfirmation && (
          <>
            <div className="mb-6">
              <div className="text-center mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Are you sure?
                </h3>
                <p className="text-sm text-gray-600">
                  This action will reset analytics data and cannot be undone.
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded-md mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Operations to perform:
                </p>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Clear analytics cache</li>
                  <li>• Delete UserKnowledgeAnalytics records</li>
                  {options.resetStaffProgress && (
                    <li>• Reset staff quiz progress</li>
                  )}
                  {options.resetArchivedAnalytics && (
                    <li>• Delete archived analytics</li>
                  )}
                  {options.resetQuizAttempts && (
                    <li className="text-red-700 font-medium">
                      • Delete all quiz attempts
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowConfirmation(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                isLoading={isLoading}
              >
                Yes, Reset Analytics
              </Button>
            </div>
          </>
        )}

        {result && (
          <>
            <div className="mb-6">
              <div className="text-center mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <span className="text-2xl">✅</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Analytics Reset Complete
                </h3>
                <p className="text-sm text-gray-600">{result.message}</p>
              </div>

              {result.data && (
                <div className="bg-gray-50 p-3 rounded-md mb-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    Reset Summary:
                  </p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>
                      • Analytics records deleted:{" "}
                      {result.data.analyticsDeleted}
                    </li>
                    {result.data.snapshotsDeleted !== undefined && (
                      <li>
                        • Performance snapshots deleted:{" "}
                        {result.data.snapshotsDeleted}
                      </li>
                    )}
                    {result.data.progressResetCount !== undefined && (
                      <li>
                        • Staff progress reset: {result.data.progressResetCount}
                      </li>
                    )}
                    {result.data.archivedAnalyticsDeleted !== undefined && (
                      <li>
                        • Archived analytics deleted:{" "}
                        {result.data.archivedAnalyticsDeleted}
                      </li>
                    )}
                    {result.data.quizAttemptsDeleted !== undefined && (
                      <li>
                        • Quiz attempts deleted:{" "}
                        {result.data.quizAttemptsDeleted}
                      </li>
                    )}
                    <li>
                      • Cache cleared: {result.data.cacheCleared ? "Yes" : "No"}
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="primary" onClick={handleCancel}>
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetAnalyticsModal;
