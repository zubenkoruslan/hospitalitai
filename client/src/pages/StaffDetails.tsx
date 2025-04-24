import React, { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

// --- Interfaces ---
interface IncorrectQuestionDetail {
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
}

interface QuizResultDetails {
  _id: string;
  quizId: string;
  quizTitle: string;
  completedAt?: string;
  score: number;
  totalQuestions: number;
  retakeCount: number;
  incorrectQuestions: IncorrectQuestionDetail[];
}

interface StaffDetailsData {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  quizResults: QuizResultDetails[];
}

// --- Helper Components ---
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-8">
    <svg
      className="animate-spin h-8 w-8 text-blue-600"
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
);

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div
    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4"
    role="alert"
  >
    <strong className="font-bold">Error: </strong>
    <span className="block sm:inline">{message}</span>
  </div>
);

// --- Modal Component (Inline for simplicity, can be extracted) ---
interface IncorrectAnswersModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizResult: QuizResultDetails | null;
}

const IncorrectAnswersModal: React.FC<IncorrectAnswersModalProps> = ({
  isOpen,
  onClose,
  quizResult,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Focus management could be added here
    } else {
      document.removeEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Close modal if clicking outside the modal content
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !quizResult) return null;

  const incorrectQuestions = quizResult.incorrectQuestions || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300 ease-in-out"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-fade-in-scale"
      >
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h3 id="modal-title" className="text-lg font-semibold text-gray-900">
            Incorrect Answers for {quizResult.quizTitle}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full"
            aria-label="Close modal"
          >
            {/* Simple X icon */}
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        {incorrectQuestions.length > 0 ? (
          <ul className="list-disc pl-5 space-y-4 text-sm">
            {incorrectQuestions.map((q, index) => (
              <li key={index}>
                <p className="font-medium text-gray-800 mb-1">
                  {q.questionText}
                </p>
                <p className="text-red-600">Your Answer: {q.userAnswer}</p>
                <p className="text-green-600">
                  Correct Answer: {q.correctAnswer}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-500 italic py-4">
            All answers were correct for this quiz.
          </p>
        )}

        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
      {/* Basic animation style */}
      <style>{`
        @keyframes fadeInScale {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in-scale {
          animation: fadeInScale 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

// --- Main Component ---
const StaffDetails: React.FC = () => {
  const [staffDetails, setStaffDetails] = useState<StaffDetailsData | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { id: staffId } = useParams<{ id: string }>(); // Get staff ID from URL
  const { user } = useAuth();
  const navigate = useNavigate();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuizResult, setSelectedQuizResult] =
    useState<QuizResultDetails | null>(null);

  useEffect(() => {
    const fetchStaffDetails = async () => {
      if (!staffId) {
        setError("Staff ID not provided in URL.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<{ staff: StaffDetailsData }>(
          `/staff/${staffId}`
        );
        setStaffDetails(response.data.staff);
      } catch (err: any) {
        console.error("Error fetching staff details:", err);
        setError(
          err.response?.data?.message || "Failed to load staff details."
        );
      } finally {
        setLoading(false);
      }
    };

    // Check if user is restaurant owner before fetching
    if (user && user.role === "restaurant") {
      fetchStaffDetails();
    } else if (user) {
      setError("Access Denied.");
      setLoading(false);
    } // If no user, AuthContext usually handles redirection
  }, [staffId, user]);

  const formatDate = (dateString?: string, includeTime: boolean = false) => {
    if (!dateString) return "N/A";
    try {
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short",
        day: "numeric",
      };
      if (includeTime) {
        options.hour = "2-digit";
        options.minute = "2-digit";
      }
      return new Date(dateString).toLocaleDateString("en-US", options);
    } catch (e) {
      return "Invalid Date";
    }
  };

  // --- Modal Handlers ---
  const handleOpenModal = (quizResult: QuizResultDetails) => {
    setSelectedQuizResult(quizResult);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedQuizResult(null);
  };

  // --- Render Logic ---
  if (loading) return <LoadingSpinner />;
  // Keep Navbar consistent even on error/no data

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Use the Navbar component */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => navigate(-1)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              <svg
                className="h-4 w-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                ></path>
              </svg>
              Back
            </button>
          </div>

          {error && <ErrorMessage message={error} />}

          {!loading && !error && staffDetails && (
            <div className="space-y-8">
              {/* Staff Info Header */}
              <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {staffDetails.name}
                </h2>
                <p className="text-sm text-gray-500">
                  Email: {staffDetails.email}
                </p>
                <p className="text-sm text-gray-500">
                  Joined: {formatDate(staffDetails.createdAt)}
                </p>
              </div>

              {/* Quiz Results Section */}
              <section className="bg-white shadow-md rounded-lg overflow-hidden">
                <h3 className="text-lg font-semibold text-gray-800 p-4 border-b">
                  Tests Taken
                </h3>
                {staffDetails.quizResults.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                          <th
                            scope="col"
                            className="px-4 py-2 text-left font-medium tracking-wider"
                          >
                            Quiz Title
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-2 text-left font-medium tracking-wider"
                          >
                            Completed
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-2 text-left font-medium tracking-wider"
                          >
                            Score
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-2 text-left font-medium tracking-wider"
                          >
                            Retakes
                          </th>
                          <th scope="col" className="relative px-4 py-2">
                            <span className="sr-only">View Incorrect</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 text-sm">
                        {staffDetails.quizResults.map((result) => (
                          <tr key={result._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {result.quizTitle}
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {formatDate(result.completedAt, true)}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {result.score}/{result.totalQuestions}
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {result.retakeCount > 0
                                ? result.retakeCount - 1
                                : 0}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleOpenModal(result)}
                                className="text-indigo-600 hover:text-indigo-900 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={
                                  result.incorrectQuestions.length === 0
                                }
                                aria-label={`View incorrect answers for ${result.quizTitle}`}
                              >
                                {result.incorrectQuestions.length > 0
                                  ? "View Incorrect"
                                  : "All Correct"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 p-6">
                    No quizzes have been completed by this staff member.
                  </p>
                )}
              </section>
            </div>
          )}
        </div>
      </main>

      {/* Modal Render */}
      <IncorrectAnswersModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        quizResult={selectedQuizResult}
      />
    </div>
  );
};

export default StaffDetails;
