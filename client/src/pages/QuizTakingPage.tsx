import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { startQuizAttempt, submitQuizAttempt } from "../services/api";
import {
  ClientQuizAttemptSubmitData,
  ClientSubmitAttemptResponse,
  ClientAnswerForSubmission,
} from "../types/quizTypes";
import {
  ClientQuestionForAttempt,
  ClientQuestionOption,
} from "../types/questionTypes";

import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import MobileQuizInterface from "../components/quiz/MobileQuizInterface";
import QuizResultsDisplay from "../components/quiz/QuizResultsDisplay";
import ViewIncorrectAnswersModal from "../components/quiz/ViewIncorrectAnswersModal";

const LOCAL_STORAGE_QUIZ_ANSWERS_PREFIX = "quizUserAnswers_";

const getLocalStorageKey = (quizId: string | undefined) => {
  if (!quizId) return null;
  return `${LOCAL_STORAGE_QUIZ_ANSWERS_PREFIX}${quizId}`;
};

interface QuizTakingPageProps {
  isPracticeMode?: boolean;
}

const QuizTakingPage: React.FC<QuizTakingPageProps> = ({
  isPracticeMode = false,
}) => {
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Quiz state
  const [quizTitle, setQuizTitle] = useState<string>("Quiz");
  const [questions, setQuestions] = useState<ClientQuestionForAttempt[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Progress state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<
    Record<string, string | string[]>
  >({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Results state
  const [submissionResult, setSubmissionResult] =
    useState<ClientSubmitAttemptResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showIncorrectAnswersModal, setShowIncorrectAnswersModal] =
    useState(false);

  // Timing
  const startTimeRef = useRef<number | null>(null);

  // Refs for cleanup
  const quizIdRef = useRef(quizId);
  const userAnswersRef = useRef(userAnswers);
  const isSubmittingRef = useRef(isSubmitting);
  const submissionResultRef = useRef(submissionResult);
  const manualSubmissionCompletedRef = useRef(false);

  // Keep refs updated
  useEffect(() => {
    quizIdRef.current = quizId;
    userAnswersRef.current = userAnswers;
    isSubmittingRef.current = isSubmitting;
    submissionResultRef.current = submissionResult;
  });

  // Auto-save answers to localStorage
  useEffect(() => {
    if (!quizId) return;

    const storageKey = getLocalStorageKey(quizId);
    if (storageKey && Object.keys(userAnswers).length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(userAnswers));
      } catch (e) {
        console.error("Error saving answers to localStorage:", e);
      }
    }
  }, [userAnswers, quizId]);

  // Load quiz questions
  const loadQuizQuestions = useCallback(async () => {
    if (!quizId) {
      setError("Quiz ID not found.");
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
    manualSubmissionCompletedRef.current = false;
    setQuizTitle("Quiz");

    try {
      // Load saved answers from localStorage if available
      const storageKey = getLocalStorageKey(quizId);
      let initialAnswers = {};
      if (storageKey) {
        try {
          const storedAnswers = localStorage.getItem(storageKey);
          if (storedAnswers) {
            initialAnswers = JSON.parse(storedAnswers);
          }
        } catch (e) {
          console.error("Error reading answers from localStorage:", e);
          if (storageKey) localStorage.removeItem(storageKey);
        }
      }

      setUserAnswers(initialAnswers);
      userAnswersRef.current = initialAnswers;

      const result = await startQuizAttempt(quizId);

      if (result && result.questions && result.questions.length > 0) {
        setQuestions(result.questions);
        setQuizTitle(result.quizTitle);
      } else {
        setError("No questions available for this quiz.");
        setQuestions([]);
      }
    } catch (err: any) {
      console.error("Error loading quiz:", err);

      if (err.response && err.response.status === 403) {
        const nextAvailableAt =
          err.response.data?.additionalDetails?.nextAvailableAt;
        if (nextAvailableAt) {
          const nextAvailableDate = new Date(nextAvailableAt);
          const formattedTime = nextAvailableDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          setError(
            `This quiz is on cooldown. You can retake it at ${formattedTime}.`
          );
        } else {
          setError(
            "You cannot take this quiz right now. Please try again later."
          );
        }
      } else {
        setError("Failed to load quiz. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    loadQuizQuestions();
  }, [loadQuizQuestions]);

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (
        !manualSubmissionCompletedRef.current &&
        !isSubmittingRef.current &&
        !submissionResultRef.current &&
        Object.keys(userAnswersRef.current).length > 0
      ) {
        event.preventDefault();
        event.returnValue = ""; // Modern browsers require this
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Handle answer selection
  const handleAnswerSelect = (
    questionId: string,
    selectedValue: string,
    questionType: string
  ) => {
    setUserAnswers((prev) => {
      if (questionType === "multiple-choice-multiple") {
        const currentAnswers = Array.isArray(prev[questionId])
          ? (prev[questionId] as string[])
          : [];
        const newAnswers = currentAnswers.includes(selectedValue)
          ? currentAnswers.filter((id) => id !== selectedValue)
          : [...currentAnswers, selectedValue];

        return {
          ...prev,
          [questionId]: newAnswers.length > 0 ? newAnswers : undefined,
        };
      } else {
        return {
          ...prev,
          [questionId]: selectedValue,
        };
      }
    });
  };

  // Navigation handlers
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  // Submit quiz
  const handleSubmit = async () => {
    if (!quizId) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const answersArray: ClientAnswerForSubmission[] = Object.entries(
        userAnswers
      )
        .filter(([_, answer]) => answer !== undefined)
        .map(([questionId, answer]) => {
          // Find the question to determine its type
          const question = questions.find((q) => q._id === questionId);
          const questionType = question?.questionType;

          // For multiple-choice-multiple, keep as array
          // For all other types (true-false, multiple-choice-single), send as single value
          let answerGiven: any;
          if (questionType === "multiple-choice-multiple") {
            answerGiven = Array.isArray(answer) ? answer : [answer];
          } else {
            answerGiven = Array.isArray(answer) ? answer[0] : answer;
          }

          return {
            questionId,
            answerGiven,
          };
        });

      const submitData: ClientQuizAttemptSubmitData = {
        questions: answersArray,
        isPracticeMode,
      };

      const result = await submitQuizAttempt(quizId, submitData);
      setSubmissionResult(result);
      manualSubmissionCompletedRef.current = true;

      // Clear localStorage
      const storageKey = getLocalStorageKey(quizId);
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    } catch (err: any) {
      console.error("Error submitting quiz:", err);
      setSubmitError(
        err.response?.data?.message ||
          "Failed to submit quiz. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel quiz
  const handleCancel = () => {
    const hasAnswers = Object.keys(userAnswers).length > 0;

    if (hasAnswers) {
      const confirmed = window.confirm(
        "Are you sure you want to leave? Your progress will be saved and you can continue later."
      );
      if (!confirmed) return;
    }

    navigate("/staff/dashboard");
  };

  // Navigation controls
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion
    ? userAnswers[currentQuestion._id]
    : undefined;
  const canGoNext = currentQuestionIndex < questions.length - 1;
  const canGoPrevious = currentQuestionIndex > 0;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Guard clauses
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-slate-600 font-medium">
            Loading your {isPracticeMode ? "practice " : ""}quiz... 📚
          </p>
          {isPracticeMode && (
            <div className="mt-4 bg-green-100 border border-green-300 rounded-lg p-3">
              <p className="text-green-700 text-sm font-medium">
                🎯 Practice Mode - Results won't count towards your analytics
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl p-6 shadow-lg text-center">
          <div className="text-6xl mb-4">😔</div>
          <ErrorMessage message={error} />
          <button
            onClick={() => navigate("/staff/dashboard")}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl p-6 shadow-lg text-center">
          <div className="text-6xl mb-4">🤷‍♂️</div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            No Questions Available
          </h2>
          <p className="text-slate-600 mb-4">
            This quiz doesn't have any questions yet.
          </p>
          <button
            onClick={() => navigate("/staff/dashboard")}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show results if quiz is completed
  if (submissionResult && !submitError) {
    const completionTime = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : undefined;

    return (
      <>
        <QuizResultsDisplay
          score={submissionResult.score}
          totalQuestions={submissionResult.totalQuestionsAttempted}
          quizTitle={isPracticeMode ? `${quizTitle} (Practice)` : quizTitle}
          completionTime={completionTime}
          incorrectAnswers={
            submissionResult.questions?.filter((q) => !q.isCorrect) || []
          }
          onViewIncorrectAnswers={
            submissionResult.questions?.some((q) => !q.isCorrect)
              ? () => setShowIncorrectAnswersModal(true)
              : undefined
          }
          onRetakeQuiz={() => {
            setSubmissionResult(null);
            setUserAnswers({});
            setCurrentQuestionIndex(0);
            loadQuizQuestions();
          }}
          onBackToDashboard={() => navigate("/staff/dashboard")}
          isPracticeMode={isPracticeMode}
        />

        {showIncorrectAnswersModal && submissionResult.questions && (
          <ViewIncorrectAnswersModal
            isOpen={showIncorrectAnswersModal}
            onClose={() => setShowIncorrectAnswersModal(false)}
            attemptDetails={{
              _id: submissionResult.attemptId,
              quizId: quizId || "",
              quizTitle: quizTitle,
              staffUserId: user?._id || "",
              score: submissionResult.score,
              totalQuestions: submissionResult.totalQuestionsAttempted,
              attemptDate: new Date().toISOString(),
              incorrectQuestions: submissionResult.questions
                .filter((q) => !q.isCorrect)
                .map((q) => {
                  // Helper function to get option text by ID
                  const getOptionText = (optionId: string): string => {
                    const option = q.options?.find(
                      (opt) => opt._id === optionId
                    );
                    return option?.text || optionId;
                  };

                  // Convert user answer (option IDs) to readable text
                  let userAnswerText: string;
                  if (Array.isArray(q.answerGiven)) {
                    userAnswerText = q.answerGiven
                      .map(getOptionText)
                      .join(", ");
                  } else if (q.answerGiven) {
                    userAnswerText = getOptionText(q.answerGiven.toString());
                  } else {
                    userAnswerText = "No answer";
                  }

                  // Convert correct answer to readable text
                  let correctAnswerText: string;
                  if (q.correctAnswer?.texts) {
                    correctAnswerText = q.correctAnswer.texts.join(", ");
                  } else if (q.correctAnswer?.text) {
                    correctAnswerText = q.correctAnswer.text;
                  } else if (q.correctAnswer?.optionIds) {
                    correctAnswerText = q.correctAnswer.optionIds
                      .map(getOptionText)
                      .join(", ");
                  } else if (q.correctAnswer?.optionId) {
                    correctAnswerText = getOptionText(q.correctAnswer.optionId);
                  } else {
                    correctAnswerText = "Unknown";
                  }

                  return {
                    questionText: q.questionText || "Question",
                    userAnswer: userAnswerText,
                    correctAnswer: correctAnswerText,
                    explanation: q.explanation,
                  };
                }),
            }}
          />
        )}
      </>
    );
  }

  // Show quiz interface
  return (
    <MobileQuizInterface
      question={currentQuestion}
      questionIndex={currentQuestionIndex}
      totalQuestions={questions.length}
      userAnswer={currentAnswer}
      onAnswerSelect={handleAnswerSelect}
      onNext={goToNextQuestion}
      onPrevious={goToPreviousQuestion}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isLastQuestion={isLastQuestion}
      canGoNext={canGoNext}
      canGoPrevious={canGoPrevious}
      isSubmitting={isSubmitting}
    />
  );
};

export default QuizTakingPage;
