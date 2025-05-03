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

// --- Component Props ---
interface QuestionDisplayProps {
  question: Question;
  index: number;
  userAnswer: number | undefined;
  isEditing: boolean;
  onAnswerSelect: (questionIndex: number, choiceIndex: number) => void;
  onQuestionChange: (index: number, updatedQuestion: Question) => void;
  onQuestionDelete: (index: number) => void;
}

// --- Component ---
const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  index,
  userAnswer,
  isEditing,
  onAnswerSelect,
  onQuestionChange,
  onQuestionDelete,
}) => {
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onQuestionChange(index, { ...question, text: e.target.value });
  };

  const handleChoiceChange = (choiceIndex: number, value: string) => {
    const newChoices = [...question.choices];
    newChoices[choiceIndex] = value;
    onQuestionChange(index, { ...question, choices: newChoices });
  };

  const handleCorrectAnswerChange = (choiceIndex: number) => {
    onQuestionChange(index, { ...question, correctAnswer: choiceIndex });
  };

  return (
    <div
      key={`q-${index}`}
      className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200"
    >
      {isEditing ? (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Question {index + 1} Text
          </label>
          <input
            type="text"
            value={question.text}
            onChange={handleTextChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
      ) : (
        <p className="text-lg font-medium text-gray-900 mb-4">
          {index + 1}. {question.text}
        </p>
      )}

      <div className="space-y-3">
        {question.choices.map((choice, choiceIndex) => (
          <div key={choiceIndex} className="flex items-center">
            {isEditing ? (
              <>
                <input
                  type="radio"
                  name={`correct-answer-${index}`}
                  checked={question.correctAnswer === choiceIndex}
                  onChange={() => handleCorrectAnswerChange(choiceIndex)}
                  className="h-4 w-4 text-blue-600 border-gray-300 mr-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={choice}
                  onChange={(e) =>
                    handleChoiceChange(choiceIndex, e.target.value)
                  }
                  className="flex-1 p-2 border border-gray-300 rounded-md"
                  placeholder={`Option ${choiceIndex + 1}`}
                />
              </>
            ) : (
              <label
                className={`flex items-center w-full p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors duration-150 ease-in-out ${
                  userAnswer === choiceIndex
                    ? "bg-blue-50 border-blue-300 ring-1 ring-blue-300"
                    : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${index}`}
                  value={choiceIndex}
                  checked={userAnswer === choiceIndex}
                  onChange={() => onAnswerSelect(index, choiceIndex)}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm text-gray-700">{choice}</span>
              </label>
            )}
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => onQuestionDelete(index)}
            className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200 border border-red-200"
            aria-label={`Delete question ${index + 1}`}
          >
            Delete Question
          </button>
        </div>
      )}
    </div>
  );
};

export default QuestionDisplay;
