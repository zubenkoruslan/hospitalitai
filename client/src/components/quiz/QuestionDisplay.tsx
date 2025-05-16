import React from "react";
import Button from "../common/Button";

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
      className="bg-white p-4 rounded-lg shadow-md mb-4 border border-slate-200"
    >
      {isEditing ? (
        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Question {index + 1} Text
          </label>
          <input
            type="text"
            value={question.text}
            onChange={handleTextChange}
            className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>
      ) : (
        <p className="text-lg font-medium text-slate-800 mb-4">
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
                  className="h-4 w-4 text-sky-600 border-slate-300 mr-3 focus:ring-sky-500 focus:ring-offset-1 transition-colors"
                />
                <input
                  type="text"
                  value={choice}
                  onChange={(e) =>
                    handleChoiceChange(choiceIndex, e.target.value)
                  }
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition duration-150 ease-in-out disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder={`Option ${choiceIndex + 1}`}
                />
              </>
            ) : (
              <label
                className={`flex items-center w-full p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors duration-150 ease-in-out ${
                  userAnswer === choiceIndex
                    ? "bg-sky-50 border-sky-400 ring-2 ring-sky-300"
                    : "border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${index}`}
                  value={choiceIndex}
                  checked={userAnswer === choiceIndex}
                  onChange={() => onAnswerSelect(index, choiceIndex)}
                  className="h-4 w-4 text-sky-600 border-slate-300 focus:ring-sky-500 focus:ring-offset-1 transition-colors"
                />
                <span className="ml-3 text-sm text-slate-700">{choice}</span>
              </label>
            )}
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="destructive"
            onClick={() => onQuestionDelete(index)}
            aria-label={`Delete question ${index + 1}`}
          >
            Delete
          </Button>
        </div>
      )}
    </div>
  );
};

export default QuestionDisplay;
