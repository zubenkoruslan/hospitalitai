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
  const [quizTitle, setQuizTitle] = useState<string>(""); // To store quiz title if needed from somewhere, or pass via route state
  const [questions, setQuestions] = useState<ClientQuestionForAttempt[]>([]); // New state for questions
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
    setCurrentQuestionIndex(0); // Reset index
    startTimeRef.current = Date.now();

    // const { quizTitleFromState } = (location.state as { quizTitleFromState?: string }) || {};
    // if (quizTitleFromState) setQuizTitle(quizTitleFromState);
    // else { /* Fetch quiz title if needed via another API call using quizId */ }

    try {
      const fetchedQuestions = await startQuizAttempt(quizId);
      if (fetchedQuestions && fetchedQuestions.length > 0) {
        setQuestions(fetchedQuestions);
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

  // --- Render Logic ---
  if (isLoading && !questions.length && !submissionResult)
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar
          isBlockingNavigation={isQuizInProgress}
          onAttemptBlockedNavigation={confirmNavigation}
        />
        <div className="flex-grow flex items-center justify-center">
          <LoadingSpinner message="Loading quiz..." />
        </div>
      </div>
    );
  if (isLoading && submissionResult === undefined)
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar
          isBlockingNavigation={isQuizInProgress}
          onAttemptBlockedNavigation={confirmNavigation}
        />
        <div className="flex-grow flex items-center justify-center">
          <LoadingSpinner message="Submitting answers..." />
        </div>
      </div>
    );
  if (error && !questions.length) return <ErrorMessage message={error} />;

  if (submissionResult) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center justify-center">
          <Card className="w-full max-w-xl text-center p-6 md:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Quiz Completed!
            </h1>
            <p className="text-xl text-gray-700 mb-2">
              Your Score: {submissionResult.score} /{" "}
              {submissionResult.totalQuestionsAttempted}
            </p>
            <p className="text-lg text-gray-600 mb-6">
              Thank you for completing the quiz.
            </p>
            {/* Detailed results can be shown here by mapping submissionResult.questions */}
            {submissionResult.questions &&
              submissionResult.questions.length > 0 && (
                <div className="mt-6 text-left">
                  <h3 className="text-xl font-semibold mb-3">
                    Review Your Answers:
                  </h3>
                  <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {submissionResult.questions.map((gradedQ, index) => {
                      const originalQuestion = questions.find(
                        (q) => q._id === gradedQ.questionId
                      );
                      return (
                        <li
                          key={gradedQ.questionId}
                          className={`p-3 rounded-md border ${
                            gradedQ.isCorrect
                              ? "bg-green-50 border-green-300"
                              : "bg-red-50 border-red-300"
                          }`}
                        >
                          <p className="font-semibold">
                            {index + 1}.{" "}
                            {originalQuestion?.questionText ||
                              "Question not found"}
                          </p>
                          <p className="text-sm">
                            Your answer:{" "}
                            {gradedQ.answerGiven === null ? (
                              <em className="text-gray-500">Not answered</em>
                            ) : (
                              JSON.stringify(gradedQ.answerGiven)
                            )}
                          </p>
                          {!gradedQ.isCorrect &&
                            gradedQ.correctAnswer !== undefined && (
                              <p className="text-sm text-green-700 font-medium">
                                Correct answer:{" "}
                                {JSON.stringify(gradedQ.correctAnswer)}
                              </p>
                            )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            <Button
              variant="primary"
              onClick={() => navigate("/staff/dashboard")}
              className="mt-8"
            >
              Back to Dashboard
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  // Add early return if questions are null
  if (!questions.length) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 flex justify-center items-start">
          <ErrorMessage message="Quiz data could not be loaded." />
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const allAnswered = Object.values(userAnswers).every(
    (ans) => ans !== undefined && ans !== null
  );

  if (!currentQuestion) {
    if (isLoading)
      return <LoadingSpinner message="Loading current question..." />;
    if (error) return <ErrorMessage message={error} />;
    return <ErrorMessage message="Could not load current question." />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar
        isBlockingNavigation={isQuizInProgress}
        onAttemptBlockedNavigation={confirmNavigation}
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0 flex justify-center">
          <Card className="shadow-xl w-full max-w-2xl overflow-hidden flex flex-col p-0">
            <div className="px-6 py-4 border-b">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-1">
                  {currentQuestion.questionText}
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Question Type: {currentQuestion.questionType}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 flex-1 space-y-3">
              {currentQuestion.options.map(
                (option: ClientQuestionOption, index: number) => {
                  const isSelected =
                    userAnswers[currentQuestion._id] === option.text;
                  return (
                    <div
                      key={option._id}
                      className={`flex items-center p-3 border rounded-md hover:bg-gray-100 cursor-pointer transition duration-150 ease-in-out ${
                        isSelected
                          ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200"
                          : "border-gray-300"
                      }`}
                      onClick={() =>
                        handleAnswerSelect(
                          currentQuestion._id,
                          option.text,
                          currentQuestion.questionType
                        )
                      }
                    >
                      <input
                        type={
                          currentQuestion.questionType ===
                          "multiple-choice-multiple"
                            ? "checkbox"
                            : "radio"
                        }
                        name={`question-${currentQuestion._id}${
                          currentQuestion.questionType !==
                          "multiple-choice-multiple"
                            ? ""
                            : "-" + option._id
                        }`}
                        value={option.text}
                        checked={isSelected}
                        onChange={() =>
                          handleAnswerSelect(
                            currentQuestion._id,
                            option.text,
                            currentQuestion.questionType
                          )
                        }
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-50 mr-3"
                        disabled={isSubmitting || !!submissionResult}
                      />
                      <span className="text-gray-700 flex-grow">
                        {option.text}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
            {submitError && (
              <div className="px-6 pb-4">
                <ErrorMessage
                  message={submitError}
                  onDismiss={() => setSubmitError(null)}
                />
              </div>
            )}
            <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-3">
                <Button
                  variant="secondary"
                  onClick={goToPreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </Button>

                <span className="text-sm text-gray-500">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>

                {isLastQuestion ? (
                  <Button
                    variant="success"
                    onClick={handleSubmit}
                    isLoading={isSubmitting}
                    disabled={!!submissionResult || isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Quiz"}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={goToNextQuestion}
                    disabled={isLastQuestion}
                  >
                    Next
                  </Button>
                )}
              </div>
              <div className="text-right">
                <Button
                  variant="destructive"
                  onClick={handleCancelQuiz}
                  disabled={isCancelling}
                  className="mb-1"
                >
                  {isCancelling ? "Cancelling..." : "Cancel Quiz"}
                </Button>
                <p className="text-xs text-gray-500">
                  (Cancelling saves attempt as is)
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default QuizTakingPage;
