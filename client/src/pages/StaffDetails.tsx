import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getQuizAttemptDetails } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import ViewIncorrectAnswersModal from "../components/quiz/ViewIncorrectAnswersModal";
import SuccessNotification from "../components/common/SuccessNotification";
import { formatDate } from "../utils/helpers";
import { useStaffDetails } from "../hooks/useStaffDetails";
import { ClientQuizAttemptDetails } from "../types/quizTypes";
import Button from "../components/common/Button";
import Card from "../components/common/Card";

// --- Main Component ---
const StaffDetails: React.FC = () => {
  const { id: staffId } = useParams<{ id: string }>();
  useAuth(); // Called for auth context, but user object not directly used here
  const navigate = useNavigate();

  // Use the custom hook - removed fetchStaffDetails as it's not used for manual refresh here
  const { staffDetails, loading, error } = useStaffDetails(staffId);

  // State specific to this page (modals, notifications)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDataForIncorrectAnswers, setModalDataForIncorrectAnswers] =
    useState<ClientQuizAttemptDetails | null>(null);
  const [loadingModalDetails, setLoadingModalDetails] = useState(false); // Renamed for clarity
  const [modalError, setModalError] = useState<string | null>(null); // Renamed for clarity
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Removed useEffect related to setEditedRole as professionalRole editing is removed

  // --- Handlers ---
  const handleOpenAttemptModal = useCallback(
    async (attemptId: string) => {
      setLoadingModalDetails(true);
      setModalError(null);
      setModalDataForIncorrectAnswers(null);

      try {
        const attemptDetailsData = await getQuizAttemptDetails(attemptId);
        if (attemptDetailsData) {
          setModalDataForIncorrectAnswers(attemptDetailsData);
        } else {
          setModalError("Could not load attempt details.");
        }
      } catch (err: any) {
        console.error("Error fetching attempt details:", err);
        setModalError(
          err.message || "Failed to load details for this attempt."
        );
      } finally {
        setLoadingModalDetails(false);
        setIsModalOpen(true);
      }
    },
    [] // Dependencies: state setters are stable
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setModalDataForIncorrectAnswers(null);
    setModalError(null);
  }, []); // Dependencies: state setters are stable

  // --- Render Logic ---
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <LoadingSpinner message="Loading staff details..." />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="max-w-4xl mx-auto py-6 px-4">
          <ErrorMessage message={error} />
        </main>
      </div>
    );
  }

  if (!staffDetails) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="max-w-4xl mx-auto py-6 px-4">
          <ErrorMessage message="Staff member not found." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
        <div className="mb-4">
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            className="text-sm"
          >
            &larr; Back
          </Button>
        </div>

        {successMessage && (
          <div className="mb-4">
            <SuccessNotification
              message={successMessage}
              onDismiss={() => setSuccessMessage(null)}
            />
          </div>
        )}
        {/* Removed commented out roleErrorText display */}

        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            {staffDetails.name}
          </h1>
        </div>

        <Card className="bg-white shadow-lg rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Contact & Employment
              </h2>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Email:</span>{" "}
                  {staffDetails.email}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Joined:</span>{" "}
                  {formatDate(staffDetails.createdAt)}
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Role & Performance Summary
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-medium text-gray-700 mb-1">
                    Assigned Role {/* Changed label */}
                  </h3>
                  <p className="text-sm text-gray-800 bg-gray-100 px-3 py-1.5 rounded-md inline-block">
                    {staffDetails.assignedRoleName || "Not Set"}{" "}
                    {/* Changed field */}
                  </p>
                </div>
                <div>
                  <h3 className="text-base font-medium text-gray-700 mb-1">
                    Overall Average Score
                  </h3>
                  <p
                    className={`text-2xl font-bold ${
                      staffDetails.averageScore === null
                        ? "text-gray-500"
                        : staffDetails.averageScore >= 70
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {staffDetails.averageScore !== null
                      ? `${staffDetails.averageScore.toFixed(1)}%`
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-8">
          Quiz Performance
        </h2>
        {/* Display loading spinner here only if a refresh action triggers loading, not the initial page load covered above */}
        {/* {loading && <LoadingSpinner message="Refreshing details..." />} */}
        {staffDetails.aggregatedQuizPerformance.length === 0 && !loading && (
          <Card className="p-4 text-center text-gray-500">
            No quiz performance data available for this staff member.
          </Card>
        )}
        <div className="space-y-6">
          {staffDetails.aggregatedQuizPerformance.map((quizAgg) => (
            <Card
              key={quizAgg.quizId}
              className="p-4 shadow-md rounded-lg bg-white"
            >
              <h3 className="text-xl font-semibold text-gray-700 mb-3">
                {quizAgg.quizTitle}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 text-sm">
                <div>
                  <span className="font-medium text-gray-600">
                    Average Score:{" "}
                  </span>
                  <span
                    className={`font-bold ${
                      (quizAgg.averageScorePercent ?? 0) >= 70
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {quizAgg.averageScorePercent?.toFixed(1) ?? "N/A"}%
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Attempts: </span>
                  {quizAgg.numberOfAttempts}
                </div>
                <div>
                  <span className="font-medium text-gray-600">
                    Last Attempt:{" "}
                  </span>
                  {quizAgg.lastCompletedAt
                    ? formatDate(quizAgg.lastCompletedAt)
                    : "N/A"}
                </div>
              </div>

              {quizAgg.attempts && quizAgg.attempts.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <h4 className="text-md font-semibold text-gray-600 mb-2">
                    All Attempts:
                  </h4>
                  <ul className="space-y-2 max-h-60 overflow-y-auto">
                    {quizAgg.attempts.map((attempt, index) => (
                      <li
                        key={attempt._id}
                        className="text-sm p-3 bg-gray-50 hover:bg-gray-100 rounded-md flex flex-col sm:flex-row justify-between sm:items-center"
                      >
                        <div className="mb-2 sm:mb-0">
                          <span className="font-medium">
                            Attempt {quizAgg.attempts.length - index}
                          </span>
                          <span className="text-gray-500 ml-2">
                            (
                            {new Date(attempt.attemptDate).toLocaleDateString()}{" "}
                            {new Date(attempt.attemptDate).toLocaleTimeString()}
                            )
                          </span>
                          <span
                            className={`font-semibold ml-3 ${
                              attempt.score >= attempt.totalQuestions * 0.7
                                ? "text-green-600"
                                : "text-red-500"
                            }`}
                          >
                            Score: {attempt.score}/{attempt.totalQuestions}
                          </span>
                        </div>
                        {attempt.hasIncorrectAnswers && (
                          <Button
                            variant="secondary"
                            className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700 hover:underline bg-transparent border-none shadow-none focus:outline-none focus:ring-0 self-start sm:self-center whitespace-nowrap"
                            onClick={() => handleOpenAttemptModal(attempt._id)}
                          >
                            View Incorrect Answers
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ))}
        </div>
      </main>

      {isModalOpen &&
        modalDataForIncorrectAnswers && ( // Added check for modalDataForIncorrectAnswers
          <ViewIncorrectAnswersModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            attemptDetails={modalDataForIncorrectAnswers}
            // Pass loadingModalDetails and modalError if ViewIncorrectAnswersModal needs them
            // loading={loadingModalDetails}
            // error={modalError}
          />
        )}
    </div>
  );
};

export default StaffDetails;
