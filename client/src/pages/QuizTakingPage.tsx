import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  // Link, // Removed Link
  useParams,
  useNavigate /*, useLocation*/,
  Navigate,
} from "react-router-dom"; // useLocation might be used for quizTitle
import { useAuth } from "../context/AuthContext";
import {
  // ClientQuestionForAttempt, // To be moved
  // ClientQuizAttemptSubmitData, // To be moved
  // ClientSubmitAttemptResponse, // To be moved
  startQuizAttempt,
  submitQuizAttempt,
  // ClientAnswerForSubmission, // To be moved
  // ClientQuestionOption, // To be moved
} from "../services/api";

import {
  ClientQuizAttemptSubmitData,
  ClientSubmitAttemptResponse,
  ClientAnswerForSubmission,
} from "../types/quizTypes"; // Correct import path
import {
  ClientQuestionForAttempt,
  ClientQuestionOption,
} from "../types/questionTypes"; // Correct import path

import Navbar from "../components/Navbar";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import ViewIncorrectAnswersModal from "../components/quiz/ViewIncorrectAnswersModal";
import {
  AcademicCapIcon,
  ClockIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

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

const LOCAL_STORAGE_QUIZ_ANSWERS_PREFIX = "quizUserAnswers_";

const getLocalStorageKey = (quizId: string | undefined) => {
  if (!quizId) return null;
  return `${LOCAL_STORAGE_QUIZ_ANSWERS_PREFIX}${quizId}`;
};

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
  const [_currentAttemptId, setCurrentAttemptId] = useState<string | null>(
    null
  ); // Prefixed currentAttemptId

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  // Store answers as a map: { questionId: answerGiven }
  // answerGiven can be string (for TF/MC-Single option._id) or string[] (for MC-Multiple option._id array)
  const [userAnswers, setUserAnswers] = useState<
    Record<string, string | string[]>
  >({});
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
  const manualSubmissionCompletedRef = useRef(false);

  // Keep refs updated with the latest state
  useEffect(() => {
    quizIdRef.current = quizId;
    userAnswersRef.current = userAnswers;
    isSubmittingRef.current = isSubmitting;
    isCancellingRef.current = isCancelling;
    submissionResultRef.current = submissionResult;
    // manualSubmissionCompletedRef is updated directly, not via state
  });

  // Fetch questions by calling startQuizAttempt service
  const loadQuizQuestions = useCallback(async () => {
    if (!quizId) {
      setError("Quiz ID not found in URL.");
      setIsLoading(false);
      return;
    }

    // Clear any stale answers from localStorage for this quiz when a new attempt starts
    const storageKey = getLocalStorageKey(quizId);
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
        console.error("Error removing item from localStorage:", e);
      }
    }

    setIsLoading(true);
    setError(null);
    setQuestions([]);
    setUserAnswers({});
    setSubmissionResult(null);
    setCurrentQuestionIndex(0);
    startTimeRef.current = Date.now();
    manualSubmissionCompletedRef.current = false;
    setQuizTitle("Quiz Attempt");

    try {
      // Attempt to load answers from localStorage first, in case of a page refresh mid-attempt
      let initialAnswers = {};
      if (storageKey) {
        try {
          const storedAnswers = localStorage.getItem(storageKey);
          if (storedAnswers) {
            initialAnswers = JSON.parse(storedAnswers);
          }
        } catch (e) {
          console.error(
            "Error reading/parsing answers from localStorage on init:",
            e
          );
          // If error, start with empty answers and remove potentially corrupted item
          localStorage.removeItem(storageKey);
        }
      }
      setUserAnswers(initialAnswers); // Initialize with localStorage data or empty
      userAnswersRef.current = initialAnswers; // Sync ref too

      const result = await startQuizAttempt(quizId);
      // const newAttemptId = response.attemptId; // No longer returned here

      // setCurrentAttemptId(newAttemptId); // Attempt ID will be set on submit
      setCurrentAttemptId(null); // Ensure it's null when starting/restarting an attempt viewing

      if (result && result.questions && result.questions.length > 0) {
        setQuestions(result.questions);
        // Use the actual quiz title from the backend
        setQuizTitle(result.quizTitle);
      } else {
        setError("No questions available for this quiz attempt.");
        setQuestions([]); // Ensure questions is empty
      }
    } catch (err: any) {
      if (
        err.response &&
        err.response.status === 403 &&
        err.response.data?.additionalDetails?.nextAvailableAt
      ) {
        // Specific handling for quiz cooldown error
        const nextAvailableDate = new Date(
          err.response.data.additionalDetails.nextAvailableAt
        );
        const formattedTime = nextAvailableDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const formattedDate = nextAvailableDate.toLocaleDateString();
        setError(
          `${err.response.data.message} You can try again after ${formattedDate} at ${formattedTime}.`
        );
        setQuestions([]); // Ensure no questions are displayed
      } else {
        // Generic error handling
        setError(
          err.response?.data?.message || "Failed to load quiz questions."
        );
      }
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
    let answersFromStorage = null;
    const storageKey = getLocalStorageKey(currentQuizId);

    if (storageKey) {
      try {
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
          answersFromStorage = JSON.parse(storedData);
        }
      } catch (e) {
        console.error(
          "[QuizTakingPage] submitQuizInBackground - Error reading/parsing from localStorage:",
          e
        );
        // Potentially corrupted data, remove it
        localStorage.removeItem(storageKey);
      }
    }

    const answersToUse = answersFromStorage || userAnswersRef.current;
    const currentQuestions = questions; // Closure will capture questions state

    if (!currentQuizId) {
      return;
    }
    // If there are no questions in the quiz attempt OR if there are no actual answers given, don't submit.
    if (
      currentQuestions.length === 0 ||
      Object.keys(answersToUse).length === 0
    ) {
      return;
    }

    const answersToSubmit: ClientAnswerForSubmission[] = currentQuestions.map(
      (q) => ({
        questionId: q._id,
        answerGiven: answersToUse[q._id], // Use the determined answers (localStorage or ref)
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
      console.error(
        "[QuizTakingPage] Error during background answers submission:",
        err
      );
    }
  }, [questions]);

  useEffect(() => {
    return () => {
      const hasAnswers = Object.keys(userAnswersRef.current).length > 0;
      const shouldSubmitInBackground =
        !manualSubmissionCompletedRef.current &&
        !submissionResultRef.current &&
        !isSubmittingRef.current &&
        !isCancellingRef.current &&
        hasAnswers;

      if (shouldSubmitInBackground) {
        submitQuizInBackground();
      } else {
        const storageKey = getLocalStorageKey(quizIdRef.current);
        if (storageKey) {
          try {
            localStorage.removeItem(storageKey);
          } catch (e) {
            console.error(
              "Error removing item from localStorage during final cleanup:",
              e
            );
          }
        }
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
    const updatedAnswersForRef = { ...userAnswersRef.current }; // Start with current ref's value
    if (questionType === "multiple-choice-multiple") {
      const currentSelection =
        (updatedAnswersForRef[questionId] as string[]) || [];
      if (currentSelection.includes(selectedValue)) {
        updatedAnswersForRef[questionId] = currentSelection.filter(
          (item) => item !== selectedValue
        );
      } else {
        updatedAnswersForRef[questionId] = [...currentSelection, selectedValue];
      }
    } else {
      updatedAnswersForRef[questionId] = selectedValue;
    }
    userAnswersRef.current = updatedAnswersForRef; // Directly update the ref

    // Save to localStorage after every selection
    const storageKey = getLocalStorageKey(quizId);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedAnswersForRef));
      } catch (e) {
        console.error("Error saving answers to localStorage:", e);
      }
    }

    setUserAnswers((prevAnswers) => {
      const newAnswers = { ...prevAnswers }; // Use prevAnswers from React state for the new state
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
    manualSubmissionCompletedRef.current = false; // Reset at start of manual attempt

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
      answerGiven: userAnswers[q._id] || null, // Send null if no answer
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
      manualSubmissionCompletedRef.current = true;

      // Clear localStorage for this quiz upon successful submission
      const storageKey = getLocalStorageKey(quizId);
      if (storageKey) {
        try {
          localStorage.removeItem(storageKey);
        } catch (e) {
          console.error("Error clearing localStorage post-submit:", e);
        }
      }
    } catch (err: any) {
      console.error("Error submitting quiz attempt:", err);
      setSubmitError(
        err.response?.data?.message || "Failed to submit quiz attempt."
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
    answerData: any, // This will be the user's answer (ID or ID[]) or the correctAnswerDetails object
    options: ClientQuestionOption[],
    isCorrectAnswerDisplay = false
  ): string => {
    if (answerData === null || answerData === undefined) {
      return isCorrectAnswerDisplay ? "Not specified" : "Not answered";
    }

    if (isCorrectAnswerDisplay) {
      // answerData is the correctAnswerDetails object from ClientGradedQuestion
      // It has a shape like: { text?: string, texts?: string[], optionId?: string, optionIds?: string[] }
      // We prioritize .text or .texts for display.
      if (typeof answerData.text === "string" && answerData.text) {
        return answerData.text;
      }
      if (Array.isArray(answerData.texts) && answerData.texts.length > 0) {
        return answerData.texts.join(", ");
      }
      // Fallback if text/texts are not directly available, though backend should populate them.
      // This part might indicate an issue if reached often, as backend's correctAnswerDetails should have text/texts.
      return "Correct answer not available in expected format";
    }

    // Logic for user's answer (answerData is optionId or optionId[])
    if (Array.isArray(answerData)) {
      // For multiple-choice-multiple user answer
      if (answerData.length === 0) return "No selection";
      return answerData
        .map((id) => options.find((opt) => opt._id === id)?.text || `ID: ${id}`)
        .join(", ");
    }
    // For single-choice (MC-single, True/False) user answer, or potentially short answer string
    return (
      options.find((opt) => opt._id === answerData)?.text || String(answerData)
    );
  };

  // Derived states for navigation and UI
  const currentQuestion = questions[currentQuestionIndex];
  const _isFirstQuestion = currentQuestionIndex === 0; // Prefixed
  const _isLastQuestion = currentQuestionIndex === questions.length - 1; // Prefixed
  const _allAnswered =
    questions.length > 0 &&
    questions.every((q) => userAnswers[q._id] !== undefined); // Prefixed

  const _totalQuestions = questions.length; // Prefixed totalQuestions
  const _isFirstQuestionLocal = _isFirstQuestion; // Prefixed isFirstQuestion, and renamed to avoid conflict with line 633
  const _isLastQuestionLocal = _isLastQuestion; // Prefixed isLastQuestion, and renamed to avoid conflict with line 634
  const _allAnsweredLocal = _allAnswered; // Prefixed allAnswered, and renamed to avoid conflict with line 635

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
        <Navbar hidden={true} />
        <main className="flex-grow flex items-center justify-center px-4 py-8">
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-12 text-center max-w-md w-full">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AcademicCapIcon className="h-8 w-8 text-white" />
            </div>
            <LoadingSpinner message="Loading quiz questions..." />
            <p className="text-slate-600 mt-4 font-light">
              Preparing your personalized quiz experience
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Redirect to /dashboard if user is not authorized (not staff)
  if (!user || user.role !== "staff") {
    return <Navigate to="/dashboard" replace />;
  }

  // Show quiz not found error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center px-4 py-8">
          <div className="bg-white rounded-3xl shadow-lg border border-red-200 p-8 sm:p-12 text-center max-w-2xl w-full">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <XMarkIcon className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-light text-slate-900 mb-4">
              Quiz Not Available
            </h1>
            <div className="bg-red-50 rounded-2xl p-6 mb-8">
              <ErrorMessage message={error} />
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate("/staff/dashboard")}
              className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-8 py-3 rounded-full font-medium transition-all duration-200"
            >
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Show quiz results
  if (submissionResult) {
    const {
      score,
      totalQuestionsAttempted,
      questions: gradedQuestions,
    } = submissionResult;
    const percentage =
      totalQuestionsAttempted > 0 ? (score / totalQuestionsAttempted) * 100 : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
        <Navbar hidden={true} />
        <main className="flex-grow px-4 py-8 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Results Header */}
            <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 sm:p-12 mb-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <CheckCircleIcon className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-light text-slate-900 mb-6">
                  Quiz Complete!
                </h1>
                <div className="bg-gradient-to-r from-slate-50 to-white rounded-2xl p-8 border border-slate-200 max-w-md mx-auto">
                  <div className="text-4xl font-light text-slate-900 mb-2">
                    {score}/{totalQuestionsAttempted}
                  </div>
                  <div className="text-2xl font-medium text-blue-600 mb-4">
                    {percentage.toFixed(1)}%
                  </div>
                  <p className="text-slate-600 font-light">
                    {percentage >= 70
                      ? "🎉 Congratulations! You passed the quiz."
                      : "📚 Keep studying and try again."}
                  </p>
                </div>
              </div>
            </div>

            {/* Review Section */}
            <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-light text-slate-900 mb-8 text-center">
                Review Your Answers
              </h2>
              {gradedQuestions && gradedQuestions.length > 0 ? (
                <div className="space-y-6">
                  {gradedQuestions.map((q, index) => (
                    <div
                      key={q.questionId}
                      className={`rounded-2xl border p-6 transition-all duration-200 ${
                        q.isCorrect
                          ? "bg-gradient-to-r from-green-50 to-green-100 border-green-200"
                          : "bg-gradient-to-r from-red-50 to-red-100 border-red-200"
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            q.isCorrect
                              ? "bg-green-500 text-white"
                              : "bg-red-500 text-white"
                          }`}
                        >
                          <span className="text-sm font-medium">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-slate-900 mb-3 leading-relaxed">
                            {questions.find(
                              (origQ) => origQ._id === q.questionId
                            )?.questionText || "Question text not found"}
                          </h3>
                          <div className="space-y-2">
                            <p className="text-sm text-slate-600">
                              <span className="font-medium">Your answer:</span>{" "}
                              {renderAnswer(
                                q.answerGiven,
                                questions.find(
                                  (origQ) => origQ._id === q.questionId
                                )?.options || []
                              )}
                            </p>
                            {!q.isCorrect && (
                              <p className="text-sm text-red-700 font-medium">
                                <span className="font-medium">
                                  Correct answer:
                                </span>{" "}
                                {renderAnswer(
                                  q.correctAnswer,
                                  questions.find(
                                    (origQ) => origQ._id === q.questionId
                                  )?.options || [],
                                  true
                                )}
                              </p>
                            )}
                          </div>
                          {!q.isCorrect && q.explanation && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                              <div className="flex items-start space-x-3">
                                <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-blue-700 mb-1">
                                    Explanation:
                                  </p>
                                  <p className="text-sm text-slate-700 leading-relaxed">
                                    {q.explanation}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-500 font-light">
                    No review data available.
                  </p>
                </div>
              )}

              <div className="flex justify-center mt-12">
                <Button
                  variant="primary"
                  onClick={() => navigate("/staff/dashboard")}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-full font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- Current Question Display ---
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
        <Navbar hidden={true} />
        <main className="flex-grow flex items-center justify-center px-4 py-8">
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 sm:p-12 text-center max-w-md w-full">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AcademicCapIcon className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-light text-slate-900 mb-4">
              Loading Question...
            </h1>
            <LoadingSpinner message="Preparing question..." />
            <p className="mt-6 text-slate-600 font-light">
              If this persists, please try returning to the dashboard.
            </p>
            <div className="mt-8">
              <Button
                onClick={() => navigate("/staff/dashboard")}
                variant="secondary"
                className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-6 py-3 rounded-full font-medium transition-all duration-200"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      <Navbar
        hidden={true}
        isBlockingNavigation={isQuizInProgress}
        onAttemptBlockedNavigation={confirmNavigation}
      />
      <main className="flex-grow px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-3xl p-6 sm:p-8 border border-blue-200 shadow-lg mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
                  <AcademicCapIcon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-light text-slate-900 leading-tight">
                    {quizTitle}
                  </h1>
                  <div className="flex items-center space-x-4 mt-2">
                    <p className="text-slate-600 font-light">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </p>
                    <div className="flex-1 bg-blue-200 rounded-full h-2 max-w-32">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-blue-700 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            ((currentQuestionIndex + 1) / questions.length) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Exit Quiz Button */}
              <Button
                variant="secondary"
                onClick={handleCancelQuiz}
                className="bg-white/80 hover:bg-white border-slate-300 text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md self-start sm:self-auto"
                disabled={isSubmitting || isCancelling}
              >
                <span className="hidden sm:inline">Exit Quiz</span>
                <span className="sm:hidden">Exit</span>
              </Button>
            </div>
          </div>

          {/* Main Quiz Content Card */}
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-8">
            {submitError && (
              <div className="mb-6 bg-red-50 rounded-2xl p-4 border border-red-200">
                <ErrorMessage
                  message={submitError}
                  onDismiss={() => setSubmitError(null)}
                />
              </div>
            )}

            <div>
              <h2 className="text-xl sm:text-2xl font-medium text-slate-900 mb-8 leading-relaxed">
                {currentQuestion.questionText}
              </h2>
              <div className="space-y-3 mb-8">
                {currentQuestion.options.map((option, index) => (
                  <label
                    key={option._id}
                    className={`flex items-center p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer group ${
                      isSelected(
                        currentQuestion._id,
                        option._id,
                        currentQuestion.questionType
                      )
                        ? "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 ring-2 ring-blue-400 shadow-md"
                        : "bg-gradient-to-r from-slate-50 to-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
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
                      className="form-radio h-5 w-5 text-blue-600 mr-4 focus:ring-blue-500 focus:ring-offset-2 border-slate-400"
                    />
                    <div className="flex items-center space-x-3 flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-200 ${
                          isSelected(
                            currentQuestion._id,
                            option._id,
                            currentQuestion.questionType
                          )
                            ? "bg-blue-600 text-white"
                            : "bg-slate-200 text-slate-600 group-hover:bg-slate-300"
                        }`}
                      >
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="text-slate-800 font-light leading-relaxed">
                        {option.text}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <Button
                onClick={goToPreviousQuestion}
                disabled={currentQuestionIndex === 0 || isSubmitting}
                variant="secondary"
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-700 px-6 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                <span>Previous</span>
              </Button>

              <div className="text-center">
                <span className="text-sm text-slate-500 font-light">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
              </div>

              {currentQuestionIndex === questions.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  variant="primary"
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner message="" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4" />
                      <span>Submit Answers</span>
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={goToNextQuestion}
                  disabled={isSubmitting}
                  variant="primary"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <span>Next</span>
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default QuizTakingPage;
