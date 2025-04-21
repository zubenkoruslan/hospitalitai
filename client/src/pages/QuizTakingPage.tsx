import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [quizData, setQuizData] = useState<QuizForTaking | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  // Store answers as an array of selected choice indices (or undefined)
  const [userAnswers, setUserAnswers] = useState<(number | undefined)[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] =
    useState<QuizSubmissionResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  // --- Answer Handling ---
  const handleAnswerSelect = (choiceIndex: number) => {
    setUserAnswers((prev) => {
      const newAnswers = [...prev];
      newAnswers[currentQuestionIndex] = choiceIndex;
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

    // Check if all questions have been answered
    if (userAnswers.some((ans) => ans === undefined)) {
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
          answers: userAnswers, // Send the array of answer indices
        }
      );
      setSubmissionResult(response.data);
      // Optionally navigate away or show results directly
      // navigate('/staff-dashboard');
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || "Failed to submit quiz.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render Logic ---
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!quizData)
    return <ErrorMessage message="Quiz data could not be loaded." />;

  // If submitted, show results
  if (submissionResult) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Quiz Submitted!
          </h1>
          <p className="text-lg text-gray-600 mb-4">Your score:</p>
          <p className="text-4xl font-extrabold text-blue-600 mb-6">
            {submissionResult.score} / {submissionResult.totalQuestions}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            (
            {(
              (submissionResult.score / submissionResult.totalQuestions) *
              100
            ).toFixed(0)}
            %)
          </p>
          {/* Optional: Add a button to review answers if needed, passing result data */}
          {/* <Link to={`/staff/quiz/${quizId}/review`} state={{ result: submissionResult }}> Review Answers </Link> */}
          <Link
            to="/staff/quizzes"
            className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Quiz List
          </Link>
        </div>
      </div>
    );
  }

  // If not submitted, show the quiz questions
  const currentQuestion = quizData.questions[currentQuestionIndex];
  const totalQuestions = quizData.questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const allAnswered = userAnswers.every((ans) => ans !== undefined);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Basic Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                to="/staff/quizzes"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                &larr; Back to Quiz List
              </Link>
            </div>
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-gray-800 truncate">
                {quizData.title}
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={logout}
                className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Quiz Area */}
      <main className="flex-1 flex items-center justify-center p-4">
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
                  disabled={isSubmitting}
                />
                <span className="ml-3 text-sm text-gray-800">{choice}</span>
              </label>
            ))}
          </div>
          {/* Submission Error */}
          {submitError && (
            <div className="px-6 pb-4">
              <ErrorMessage message={submitError} />
            </div>
          )}
          <div className="bg-gray-50 px-6 py-3 flex justify-between items-center">
            <button
              type="button"
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0 || isSubmitting}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {isLastQuestion ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!allAnswered || isSubmitting}
                className="px-5 py-2 bg-green-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? <LoadingSpinner /> : "Submit Quiz"}
              </button>
            ) : (
              <button
                type="button"
                onClick={goToNextQuestion}
                disabled={
                  userAnswers[currentQuestionIndex] === undefined ||
                  isSubmitting
                } // Disable next if current not answered
                className="px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default QuizTakingPage;
