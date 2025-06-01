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

import { UserIcon } from "@heroicons/react/24/outline";

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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center min-h-96">
                <LoadingSpinner message="Loading staff details..." />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 text-center">
                  <div className="p-3 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <UserIcon className="h-8 w-8 text-red-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-red-600 mb-4">
                    Error Loading Staff Details
                  </h1>
                  <ErrorMessage message={error} />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!staffDetails) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                  <div className="p-3 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <UserIcon className="h-8 w-8 text-slate-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-700 mb-4">
                    Staff Member Not Found
                  </h1>
                  <p className="text-slate-600">
                    The requested staff member could not be found.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="ml-16 lg:ml-64 transition-all duration-300 ease-in-out">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="space-y-8">
              {/* Header Section */}
              <div className="bg-emerald-50 rounded-2xl p-8 border border-emerald-100 shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-emerald-600 rounded-xl shadow-lg">
                    <UserIcon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                      {staffDetails.name}
                    </h1>
                    <p className="text-slate-600 mt-2">
                      Staff member details and performance overview
                    </p>
                  </div>
                </div>
              </div>

              {/* Staff Information */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">
                  Staff Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-slate-500">
                      Name:
                    </span>
                    <p className="text-slate-900">{staffDetails.name}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-500">
                      Email:
                    </span>
                    <p className="text-slate-900">{staffDetails.email}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-500">
                      Role:
                    </span>
                    <p className="text-slate-900">
                      {staffDetails.assignedRoleName || "No role assigned"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-500">
                      Average Score:
                    </span>
                    <p className="text-slate-900">
                      {staffDetails.averageScore !== null
                        ? `${staffDetails.averageScore}%`
                        : "No scores yet"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quiz Results */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Quiz Results
                  </h2>
                </div>
                <div className="p-6">
                  {staffDetails.aggregatedQuizPerformance.length > 0 ? (
                    <div className="space-y-4">
                      {staffDetails.aggregatedQuizPerformance.map((quizAgg) => (
                        <div
                          key={quizAgg.quizId}
                          className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <h3 className="font-medium text-slate-900">
                                {quizAgg.quizTitle}
                              </h3>
                              <p className="text-sm text-slate-600">
                                Score:{" "}
                                {quizAgg.averageScorePercent?.toFixed(1) ??
                                  "N/A"}
                                %
                              </p>
                              <p className="text-sm text-slate-500">
                                {quizAgg.lastCompletedAt
                                  ? formatDate(quizAgg.lastCompletedAt)
                                  : "N/A"}
                              </p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span
                                className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                  (quizAgg.averageScorePercent ?? 0) >= 70
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {quizAgg.averageScorePercent !== null
                                  ? (quizAgg.averageScorePercent >= 70
                                      ? "Passed"
                                      : "Failed") +
                                    ` (${quizAgg.averageScorePercent.toFixed(
                                      1
                                    )}%)`
                                  : "N/A"}
                              </span>
                              {quizAgg.attempts.length > 0 && (
                                <Button
                                  variant="secondary"
                                  onClick={() =>
                                    handleOpenAttemptModal(
                                      quizAgg.attempts[
                                        quizAgg.attempts.length - 1
                                      ]._id
                                    )
                                  }
                                  className="text-xs px-3 py-1"
                                >
                                  View Details
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <UserIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">
                        No quiz results yet
                      </h3>
                      <p className="text-slate-500">
                        This staff member hasn't completed any quizzes.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

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
        </div>
      </main>
    </div>
  );
};

export default StaffDetails;
