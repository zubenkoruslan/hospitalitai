import React from "react";

// --- Interfaces ---
// TODO: Move to shared types file
interface Question {
  _id?: string;
  text: string;
  choices: string[];
  correctAnswer: number;
  menuItemId: string;
}

interface QuizData {
  _id?: string;
  title: string;
  menuItemIds: string[] | { _id: string; name: string }[];
  questions: Question[];
  restaurantId: string;
  isAssigned?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface QuizResultDisplay {
  score: number;
  totalQuestions: number;
  correctAnswers: (number | undefined)[];
  userAnswers: (number | undefined)[];
  quizData: QuizData;
}

// --- Component Props ---
interface QuizResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: QuizResultDisplay | null;
}

// --- Component ---
const QuizResultsModal: React.FC<QuizResultsModalProps> = ({
  isOpen,
  onClose,
  results,
}) => {
  if (!isOpen || !results) {
    return null;
  }

  const scorePercentage =
    results.totalQuestions > 0
      ? ((results.score / results.totalQuestions) * 100).toFixed(0)
      : 0;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-gray-600 bg-opacity-75 flex items-center justify-center">
      {/* Increased z-index slightly just in case */}
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl mx-4 my-8">
        <h2 className="text-xl font-semibold mb-2 text-gray-800">
          Preview Results: {results.quizData.title}
        </h2>
        <p className="text-lg font-medium mb-4 text-gray-700">
          Score: {results.score} / {results.totalQuestions} ({scorePercentage}%)
        </p>

        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
          {results.quizData.questions.map((q, index) => {
            const userAnswerIndex = results.userAnswers[index];
            const correctAnswerIndex = results.correctAnswers[index]; // Should always be defined
            const isCorrect = userAnswerIndex === correctAnswerIndex;

            return (
              <div
                key={`result-${index}`}
                className={`p-4 border rounded-md ${
                  isCorrect
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <p className="font-medium mb-2">
                  {index + 1}. {q.text}
                </p>
                <ul className="space-y-1 list-none mb-2 pl-1">
                  {q.choices.map((choice, choiceIndex) => {
                    const isChoiceCorrect = choiceIndex === correctAnswerIndex;
                    const isChoiceSelected = choiceIndex === userAnswerIndex;

                    let choiceStyle = "text-gray-700";
                    let indicator = "";

                    if (isChoiceCorrect) {
                      choiceStyle = "text-green-700 font-semibold";
                      indicator = "(Correct Answer)";
                    }
                    if (isChoiceSelected && !isChoiceCorrect) {
                      choiceStyle = "text-red-700";
                      indicator = "(Your Answer)";
                    }
                    if (isChoiceSelected && isChoiceCorrect) {
                      indicator = "(Correct)";
                    }

                    return (
                      <li
                        key={choiceIndex}
                        className={`flex items-center ${choiceStyle}`}
                      >
                        <span
                          className={`mr-2 ${
                            isChoiceSelected ? "font-bold" : ""
                          }`}
                        >
                          -
                        </span>
                        <span>{choice}</span>
                        {indicator && (
                          <span className="ml-2 text-xs">{indicator}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close Results
          </button>
          {/* Save button intentionally removed - saving happens from the editor */}
        </div>
      </div>
    </div>
  );
};

export default QuizResultsModal;
