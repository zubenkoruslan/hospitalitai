import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  // Link, // Removed Link
  useParams,
  useNavigate /*, useLocation*/,
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
  const { user: _user } = useAuth(); // Prefixed user
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

      const fetchedQuestions = await startQuizAttempt(quizId); // Now directly returns ClientQuestionForAttempt[]
      // const newAttemptId = response.attemptId; // No longer returned here

      // setCurrentAttemptId(newAttemptId); // Attempt ID will be set on submit
      setCurrentAttemptId(null); // Ensure it's null when starting/restarting an attempt viewing

      if (fetchedQuestions && fetchedQuestions.length > 0) {
        setQuestions(fetchedQuestions);
        // Derive quizTitle from the first question's category
        if (
          fetchedQuestions[0].categories &&
          fetchedQuestions[0].categories.length > 0
        ) {
          setQuizTitle(`${fetchedQuestions[0].categories[0]} Quiz`);
        } else {
          // Fallback if no category
          setQuizTitle("Quiz Attempt");
        }
      } else {
        setError("No questions available for this quiz attempt.");
        setQuestions([]); // Ensure questions is empty
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
                    {q.explanation && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          <span className="font-semibold">Explanation:</span>{" "}
                          {q.explanation}
                        </p>
                      </div>
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
