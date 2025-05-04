import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Navbar from "../components/Navbar";

// --- Interfaces ---
// Interface for a question received from the /take endpoint (no correctAnswer)
interface QuizQuestion {
  _id: string; // Question ID (might be needed for result tracking)
  text: string;
  choices: string[];
  menuItemId: string; // Keep for context if needed
}

// Interface for the Quiz data received from the /take endpoint
interface QuizForTaking {
  _id: string;
  title: string;
  questions: QuizQuestion[];
  // Add other fields if needed (e.g., menu item names if populated)
}

// Interface for the result received after submission
interface QuizSubmissionResult {
  message: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number[]; // Array of correct answer indices (for review AFTER submission)
}

// --- Helper Components ---
// Assuming LoadingSpinner, ErrorMessage exist
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

// --- Main Component ---
const QuizTakingPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quizData, setQuizData] = useState<QuizForTaking | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<(number | undefined | null)[]>(
    []
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] =
    useState<QuizSubmissionResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // --- Refs to track state for cleanup function ---
  const quizIdRef = useRef(quizId);
  const userAnswersRef = useRef(userAnswers);
  const isSubmittingRef = useRef(isSubmitting);
  const isCancellingRef = useRef(isCancelling);
  const submissionResultRef = useRef(submissionResult);

  // Keep refs updated with the latest state
  useEffect(() => {
    quizIdRef.current = quizId;
    userAnswersRef.current = userAnswers;
    isSubmittingRef.current = isSubmitting;
    isCancellingRef.current = isCancelling;
    submissionResultRef.current = submissionResult;
  }); // Runs on every render to keep refs fresh

  // Fetch the specific quiz data (without answers)
  const fetchQuizForTaking = useCallback(async () => {
    if (!quizId) {
      setError("Quiz ID not found in URL.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{ quiz: QuizForTaking }>(
        `/quiz/${quizId}/take`
      );
      setQuizData(response.data.quiz);
      // Initialize answers array based on fetched questions
      setUserAnswers(
        new Array(response.data.quiz.questions.length).fill(undefined)
      );
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load quiz.");
      setQuizData(null);
    } finally {
      setIsLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    fetchQuizForTaking();
  }, [fetchQuizForTaking]);

  // --- Function to submit cancelled quiz (no state updates/navigation) ---
  const submitQuizInBackground = useCallback(async () => {
    const currentQuizId = quizIdRef.current;
    const currentAnswers = userAnswersRef.current;

    if (!currentQuizId || !currentAnswers) {
      console.error("[QuizTakingPage] Missing data for background submission.");
      return;
    }

    console.log(
      "[QuizTakingPage] Attempting background cancellation submission..."
    );

    try {
      await api.post<QuizSubmissionResult>(`/quiz/${currentQuizId}/submit`, {
        answers: currentAnswers,
        cancelled: true,
      });
      console.log(
        "[QuizTakingPage] Background cancellation submission successful."
      );
    } catch (err: any) {
      // Log error, but don't attempt state updates as component is unmounting
      console.error(
        "[QuizTakingPage] Error during background cancellation submission:",
        err.response?.data?.message || err.message || err
      );
    }
  }, []); // No dependencies needed as it reads refs

  // --- Effect for handling unmount ---
  useEffect(() => {
    // Return cleanup function
    return () => {
      // Check refs to see if we need to submit automatically
      if (
        !submissionResultRef.current && // Not already submitted
        !isSubmittingRef.current && // Not currently submitting
        !isCancellingRef.current // Not currently cancelling explicitly
      ) {
        console.log(
          "[QuizTakingPage] Unmounting, triggering background cancellation."
        );
        submitQuizInBackground();
      } else {
        console.log(
          "[QuizTakingPage] Unmounting, no background submission needed."
        );
      }
    };
  }, [submitQuizInBackground]); // Dependency on the submit function itself

  // --- Effect for warning on page unload/navigation ---
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Check refs to see if quiz is in progress
      if (
        !submissionResultRef.current && // Not submitted
        !isSubmittingRef.current && // Not submitting
        !isCancellingRef.current // Not cancelling
      ) {
        // Standard way to trigger the browser's generic confirmation dialog
        event.preventDefault();
        event.returnValue = ""; // Required for Chrome
        return ""; // Required for older browsers
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup function to remove the listener when the component unmounts
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []); // Empty dependency array: refs are updated via their own effect, listener logic depends on refs

  // --- Confirmation function for navigation attempts ---
  const confirmNavigation = (): boolean => {
    // Use the same confirmation message
    return window.confirm(
      "Are you sure you want to leave? Unanswered questions will be marked incorrect and the attempt saved."
    );
  };

  // --- Answer Handling ---
  const handleAnswerSelect = (choiceIndex: number) => {
    if (userAnswers.length === 0 && quizData) {
      setUserAnswers(new Array(quizData.questions.length).fill(undefined));
    }
    setUserAnswers((prev) => {
      const newAnswers = prev ? [...prev] : [];
      if (currentQuestionIndex < newAnswers.length) {
        newAnswers[currentQuestionIndex] = choiceIndex;
      } else {
        console.error("Attempted to set answer for out-of-bounds index.");
      }
      return newAnswers;
    });
  };

  const goToNextQuestion = () => {
    if (quizData && currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // --- Submission Handling ---
  const handleSubmit = async () => {
    if (!quizData || !quizId) return;

    if (userAnswers.some((ans) => ans === undefined || ans === null)) {
      setSubmitError("Please answer all questions before submitting.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      const response = await api.post<QuizSubmissionResult>(
        `/quiz/${quizId}/submit`,
        {
          answers: userAnswers,
          cancelled: false,
        }
      );
      setSubmissionResult(response.data);
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || "Failed to submit quiz.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Cancellation Handling (Explicit Button Click) ---
  const handleCancelQuiz = async () => {
    if (!quizData || !quizId || isSubmitting || isCancelling) return;

    const confirmation = window.confirm(
      "Are you sure you want to cancel? Unanswered questions will be marked incorrect."
    );
    if (!confirmation) return;

    setSubmitError(null);
    setIsCancelling(true);
    setSubmissionResult(null);

    try {
      await api.post<QuizSubmissionResult>(`/quiz/${quizId}/submit`, {
        answers: userAnswers,
        cancelled: true,
      });
      navigate("/staff/dashboard");
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || "Failed to cancel quiz.");
      setIsCancelling(false);
    }
  };

  // Determine if quiz is actively in progress for blocking purposes
  const isQuizInProgress =
    !submissionResultRef.current &&
    !isSubmittingRef.current &&
    !isCancellingRef.current;

  // --- Render Logic ---
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!quizData)
    return <ErrorMessage message="Quiz data could not be loaded." />;

  if (submissionResult) {
    // Calculate percentage for styling
    const score = submissionResult.score;
    const total = submissionResult.totalQuestions;
    const percentage = total > 0 ? (score / total) * 100 : 0;

    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8 max-w-md w-full text-center mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Quiz Submitted!
            </h1>
            <p className="text-lg text-gray-600 mb-4">Your score:</p>
            <div
              className={`mb-6 font-extrabold ${
                percentage >= 70 ? "text-green-600" : "text-red-600"
              }`}
            >
              <p className="text-4xl">
                {score} / {total}
              </p>
              <p className="text-sm font-semibold mt-1">
                ({percentage.toFixed(0)}%)
              </p>
            </div>
            <Link
              to="/staff/dashboard"
              className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const totalQuestions = quizData.questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const allAnswered = userAnswers.every(
    (ans) => ans !== undefined && ans !== null
  );

  if (!currentQuestion) {
    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={error} />;
    return <ErrorMessage message="Could not load current question." />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar
        isBlockingNavigation={isQuizInProgress}
        onAttemptBlockedNavigation={confirmNavigation}
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-auto overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b">
              <p className="text-sm font-medium text-gray-500">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {currentQuestion.text}
              </p>
            </div>
            <div className="px-6 py-4 flex-1 space-y-3">
              {currentQuestion.choices.map((choice, index) => (
                <label
                  key={index}
                  className={`flex items-center p-3 border rounded-md hover:bg-gray-100 cursor-pointer transition duration-150 ease-in-out ${
                    userAnswers[currentQuestionIndex] === index
                      ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200"
                      : "border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestionIndex}`}
                    value={index}
                    checked={userAnswers[currentQuestionIndex] === index}
                    onChange={() => handleAnswerSelect(index)}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-50"
                    disabled={isSubmitting || isCancelling}
                  />
                  <span className="ml-3 text-sm text-gray-800">{choice}</span>
                </label>
              ))}
            </div>
            {submitError && (
              <div className="px-6 pb-4">
                <ErrorMessage message={submitError} />
              </div>
            )}
            <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
              <button
                type="button"
                onClick={handleCancelQuiz}
                disabled={isSubmitting || isCancelling}
                className="px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition duration-150 ease-in-out"
              >
                {isCancelling ? "Cancelling..." : "Cancel Quiz"}
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={goToPreviousQuestion}
                  disabled={
                    currentQuestionIndex === 0 || isSubmitting || isCancelling
                  }
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Previous
                </button>

                {isLastQuestion ? (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!allAnswered || isSubmitting || isCancelling}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:bg-green-300"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Quiz"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={goToNextQuestion}
                    disabled={
                      userAnswers[currentQuestionIndex] === undefined ||
                      userAnswers[currentQuestionIndex] === null ||
                      isSubmitting ||
                      isCancelling
                    }
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-blue-300"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default QuizTakingPage;
