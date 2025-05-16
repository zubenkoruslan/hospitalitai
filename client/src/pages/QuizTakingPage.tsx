import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Link,
  useParams,
  useNavigate /*, useLocation*/,
} from "react-router-dom"; // useLocation might be used for quizTitle
import { useAuth } from "../context/AuthContext";
import {
  ClientQuestionForAttempt,
  ClientQuizAttemptSubmitData,
  ClientSubmitAttemptResponse,
  startQuizAttempt,
  submitQuizAttempt,
  ClientAnswerForSubmission,
  ClientQuestionOption,
} from "../services/api";
import Navbar from "../components/Navbar";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";

// --- Interfaces ---
// Old QuizQuestion and QuizForTaking interfaces are no longer needed
/*
interface QuizQuestion {
  _id: string; 
  text: string;
  choices: string[];
  menuItemId: string; 
}
interface QuizForTaking {
  _id: string;
  title: string;
  questions: QuizQuestion[];
}
*/

// Old QuizSubmissionResult interface is replaced by ClientSubmitAttemptResponse
/*
interface QuizSubmissionResult {
  message: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number[];
}
*/

// --- Main Component ---
const QuizTakingPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  // const location = useLocation(); // Potentially for quizTitle

  // const [quizData, setQuizData] = useState<QuizForTaking | null>(null); // Old
  const [quizTitle, setQuizTitle] = useState<string>("Quiz Attempt"); // Default title
  const [questions, setQuestions] = useState<ClientQuestionForAttempt[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  // Store answers as a map: { questionId: answerGiven }
  // answerGiven can be string (for TF/MC-Single option._id) or string[] (for MC-Multiple option._id array)
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // const [submissionResult, setSubmissionResult] = useState<QuizSubmissionResult | null>(null); // Old
  const [submissionResult, setSubmissionResult] =
    useState<ClientSubmitAttemptResponse | null>(null); // New type
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false); // Keep cancellation logic if desired

  const startTimeRef = useRef<number | null>(null); // For duration

  // --- Refs to track state for cleanup function (update as needed) ---
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
  });

  // Fetch questions by calling startQuizAttempt service
  const loadQuizQuestions = useCallback(async () => {
    if (!quizId) {
      setError("Quiz ID not found in URL.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setQuestions([]);
    setUserAnswers({});
    setSubmissionResult(null);
    setCurrentQuestionIndex(0);
    startTimeRef.current = Date.now();
    // Reset title to default before fetching new questions
    setQuizTitle("Quiz Attempt");

    try {
      const fetchedQuestions = await startQuizAttempt(quizId);
      if (fetchedQuestions && fetchedQuestions.length > 0) {
        setQuestions(fetchedQuestions);
        // Derive quizTitle from the first question's category
        if (
          fetchedQuestions[0].categories &&
          fetchedQuestions[0].categories.length > 0
        ) {
          setQuizTitle(`${fetchedQuestions[0].categories[0]} Quiz`);
        } else {
          // Fallback if no category, or fetch quiz details separately for a more generic title
          // For now, "Quiz Attempt" is fine if no specific category, or could try fetching quiz title
          // If you have an endpoint like /api/quizzes/:quizId/details, you could fetch it here.
          // const quizDetails = await api.get(`/quizzes/${quizId}/details`);
          // if(quizDetails.data.title) setQuizTitle(quizDetails.data.title)
        }
      } else {
        setError("No questions available for this quiz attempt.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load quiz questions.");
    } finally {
      setIsLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    loadQuizQuestions();
  }, [loadQuizQuestions]);

  // --- Function to submit cancelled quiz (needs update) ---
  const submitQuizInBackground = useCallback(async () => {
    const currentQuizId = quizIdRef.current;
    const currentAnswersMap = userAnswersRef.current;
    const currentQuestions = questions; // Closure will capture questions state at time of definition

    if (!currentQuizId) return;
    if (
      currentQuestions.length === 0 &&
      Object.keys(currentAnswersMap).length === 0
    )
      return;

    const answersToSubmit: ClientAnswerForSubmission[] = currentQuestions.map(
      (q) => ({
        questionId: q._id,
        answerGiven: currentAnswersMap[q._id],
      })
    );
    const duration = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0;
    const submissionData: ClientQuizAttemptSubmitData = {
      questions: answersToSubmit,
      durationInSeconds: duration,
    };
    try {
      await submitQuizAttempt(currentQuizId, submissionData);
    } catch (err: any) {
      console.error("Error during background answers submission:", err);
    }
  }, [questions]); // Added questions to dependency array

  useEffect(() => {
    return () => {
      if (
        !submissionResultRef.current &&
        !isSubmittingRef.current &&
        !isCancellingRef.current
      ) {
        submitQuizInBackground();
      }
    };
  }, [submitQuizInBackground]);

  // --- Effect for warning on page unload/navigation ---
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (
        !submissionResultRef.current &&
        !isSubmittingRef.current &&
        !isCancellingRef.current
      ) {
        event.preventDefault();
        event.returnValue = "";
        return "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // --- Confirmation function for navigation attempts ---
  const confirmNavigation = (): boolean => {
    // Use the same confirmation message
    return window.confirm(
      "Are you sure you want to leave? Unanswered questions will be marked incorrect and the attempt saved."
    );
  };

  // --- Answer Handling ---
  const handleAnswerSelect = (
    questionId: string,
    selectedValue: string,
    questionType: string
  ) => {
    setUserAnswers((prevAnswers) => {
      const newAnswers = { ...prevAnswers };
      if (questionType === "multiple-choice-multiple") {
        const currentSelection = (newAnswers[questionId] as string[]) || [];
        if (currentSelection.includes(selectedValue)) {
          newAnswers[questionId] = currentSelection.filter(
            (item) => item !== selectedValue
          );
        } else {
          newAnswers[questionId] = [...currentSelection, selectedValue];
        }
      } else {
        // For single-select types like mc-single, true-false
        newAnswers[questionId] = selectedValue;
      }
      return newAnswers;
    });
  };

  const goToNextQuestion = () => {
    if (questions.length > 0 && currentQuestionIndex < questions.length - 1) {
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
    if (questions.length === 0 || !quizId) return;

    const answeredQuestionsCount = questions.filter(
      (q) =>
        userAnswers[q._id] !== undefined &&
        (Array.isArray(userAnswers[q._id])
          ? userAnswers[q._id].length > 0
          : true)
    ).length;

    if (answeredQuestionsCount < questions.length) {
      const confirmSubmit = window.confirm(
        "You have unanswered questions. Are you sure you want to submit?"
      );
      if (!confirmSubmit) return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    setSubmissionResult(null);

    const answersToSubmit: ClientAnswerForSubmission[] = questions.map((q) => ({
      questionId: q._id,
      answerGiven: userAnswers[q._id] === undefined ? null : userAnswers[q._id], // Send null for unanswered
    }));

    const durationInSeconds = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0;

    const submissionData: ClientQuizAttemptSubmitData = {
      questions: answersToSubmit,
      durationInSeconds,
    };

    try {
      const result = await submitQuizAttempt(quizId, submissionData);
      setSubmissionResult(result);
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message ||
          "Failed to submit quiz. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Cancellation Handling (Explicit Button Click) ---
  const handleCancelQuiz = () => {
    if (isSubmitting || isCancelling) return;
    const confirmation = window.confirm(
      "Are you sure you want to cancel and leave this quiz? Your attempt will be recorded with current answers."
    );
    if (confirmation) {
      setIsCancelling(true); // Set flag to prevent double submission from unmount
      // submitQuizInBackground(); // This will be called by unmount logic if not submitted
      navigate("/staff/dashboard");
    }
  };

  // Determine if quiz is actively in progress for blocking purposes
  const isQuizInProgress = !submissionResult && !isSubmitting && !isCancelling;

  // --- Helper function to determine if an option is selected ---
  const isSelected = (
    questionId: string,
    optionId: string,
    questionType: string
  ): boolean => {
    const currentAnswer = userAnswers[questionId];
    if (questionType === "multiple-choice-multiple") {
      return (currentAnswer as string[])?.includes(optionId) || false;
    }
    return currentAnswer === optionId;
  };

  // --- Helper function to render answer text for review screen ---
  const renderAnswer = (
    answerData: any,
    options: ClientQuestionOption[],
    isCorrectAnswerDisplay = false // Flag to indicate if we are displaying the correct answer
  ): string => {
    if (answerData === null || answerData === undefined) {
      return isCorrectAnswerDisplay ? "Not specified" : "Not answered";
    }
    if (Array.isArray(answerData)) {
      // For multiple-choice-multiple
      if (answerData.length === 0)
        return isCorrectAnswerDisplay ? "None" : "No selection";
      return answerData
        .map((id) => options.find((opt) => opt._id === id)?.text || id)
        .join(", ");
    }
    // For single-choice (MC-single, True/False)
    return (
      options.find((opt) => opt._id === answerData)?.text || String(answerData)
    );
  };

  // --- Main Render ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center max-w-4xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
          <LoadingSpinner message="Loading quiz questions..." />
        </main>
      </div>
    );
  }

  // Error state after loading
  if (error && !submissionResult) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Navbar />
        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8 w-full flex-grow">
          <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Error Loading Quiz
            </h1>
          </div>
          <Card className="bg-white shadow-lg rounded-xl p-6 sm:p-8">
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
            <div className="mt-8 text-center">
              <Button
                onClick={() => navigate("/staff/dashboard")}
                variant="secondary"
              >
                Back to Dashboard
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // --- Submission Result Screen ---
  if (submissionResult) {
    const {
      score,
      totalQuestionsAttempted,
      questions: gradedQuestions,
    } = submissionResult;
    const percentage =
      totalQuestionsAttempted > 0 ? (score / totalQuestionsAttempted) * 100 : 0;

    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Navbar />
        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8 w-full flex-grow">
          <div className="bg-white shadow-lg rounded-xl p-6 mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-green-600">
              Quiz Completed!
            </h1>
            <p className="mt-2 text-xl text-gray-700">
              Your Score: {score} / {totalQuestionsAttempted} (
              {percentage.toFixed(1)}%)
            </p>
          </div>

          <Card className="bg-white shadow-lg rounded-xl p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              Review Your Answers
            </h2>
            {gradedQuestions && gradedQuestions.length > 0 ? (
              <div className="space-y-4">
                {gradedQuestions.map((q, index) => (
                  <div
                    key={q.questionId}
                    className={`p-4 rounded-lg shadow-sm ${
                      q.isCorrect
                        ? "bg-green-50 border-l-4 border-green-400"
                        : "bg-red-50 border-l-4 border-red-400"
                    }`}
                  >
                    <p className="font-semibold text-gray-800 mb-1">
                      Question {index + 1}:{" "}
                      {questions.find((origQ) => origQ._id === q.questionId)
                        ?.questionText || "Question text not found"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Your answer:{" "}
                      {renderAnswer(
                        q.answerGiven,
                        questions.find((origQ) => origQ._id === q.questionId)
                          ?.options || []
                      )}
                    </p>
                    {!q.isCorrect && (
                      <p className="text-sm text-red-600 font-medium">
                        Correct answer:{" "}
                        {renderAnswer(
                          q.correctAnswer,
                          questions.find((origQ) => origQ._id === q.questionId)
                            ?.options || [],
                          true
                        )}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">
                No graded questions to display.
              </p>
            )}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <Button
                onClick={() => navigate("/staff/dashboard")}
                variant="primary"
              >
                Back to Dashboard
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // --- Current Question Display ---
  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Navbar />
        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8 w-full flex-grow">
          <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Loading Question...
            </h1>
          </div>
          <Card className="bg-white shadow-lg rounded-xl p-6 sm:p-8 text-center">
            <LoadingSpinner message="Preparing question..." />
            <p className="mt-4 text-gray-600">
              If this persists, please try returning to the dashboard.
            </p>
            <div className="mt-8 text-center">
              <Button
                onClick={() => navigate("/staff/dashboard")}
                variant="secondary"
              >
                Back to Dashboard
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  const totalQuestions = questions.length;
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const allAnswered = Object.values(userAnswers).every(
    (ans) => ans !== undefined && ans !== null
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar
        isBlockingNavigation={isQuizInProgress}
        onAttemptBlockedNavigation={confirmNavigation}
      />

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8 w-full flex-grow">
        {/* Page Title Header */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {quizTitle}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div>
              <Button
                onClick={handleCancelQuiz}
                variant="secondary"
                className="text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-300"
                disabled={isCancelling || isSubmitting}
              >
                {isCancelling ? "Cancelling..." : "Cancel & Exit"}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Quiz Content Card */}
        <Card className="bg-white shadow-lg rounded-xl p-6 sm:p-8">
          {submitError && (
            <div className="mb-6">
              <ErrorMessage
                message={submitError}
                onDismiss={() => setSubmitError(null)}
              />
            </div>
          )}

          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              {currentQuestion.questionText}
            </h2>
            <div className="space-y-4 mb-8">
              {currentQuestion.options.map((option) => (
                <label
                  key={option._id}
                  className={`flex items-center p-4 rounded-lg border transition-all duration-150 cursor-pointer 
                              ${
                                isSelected(
                                  currentQuestion._id,
                                  option._id,
                                  currentQuestion.questionType
                                )
                                  ? "bg-blue-50 border-blue-500 ring-2 ring-blue-400 shadow-md"
                                  : "bg-gray-50 border-gray-300 hover:border-gray-400 hover:bg-gray-100"
                              }`}
                >
                  <input
                    type={
                      currentQuestion.questionType ===
                      "multiple-choice-multiple"
                        ? "checkbox"
                        : "radio"
                    }
                    name={`question-${currentQuestion._id}`}
                    value={option._id}
                    checked={isSelected(
                      currentQuestion._id,
                      option._id,
                      currentQuestion.questionType
                    )}
                    onChange={() =>
                      handleAnswerSelect(
                        currentQuestion._id,
                        option._id,
                        currentQuestion.questionType
                      )
                    }
                    className={`form-radio h-5 w-5 text-blue-600 mr-4 focus:ring-blue-500 focus:ring-offset-2 ${
                      isSelected(
                        currentQuestion._id,
                        option._id,
                        currentQuestion.questionType
                      )
                        ? "border-blue-500"
                        : "border-gray-400"
                    }`}
                  />
                  <span className="text-gray-800 text-md">{option.text}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-gray-300 flex justify-between items-center">
            <Button
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0 || isSubmitting}
              variant="secondary"
              className="py-2 px-4 text-sm"
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            {currentQuestionIndex === questions.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                variant="primary"
                className="py-2 px-4 text-sm"
              >
                {isSubmitting ? "Submitting..." : "Submit Answers"}
              </Button>
            ) : (
              <Button
                onClick={goToNextQuestion}
                disabled={isSubmitting}
                variant="primary"
                className="py-2 px-4 text-sm"
              >
                Next
              </Button>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default QuizTakingPage;
