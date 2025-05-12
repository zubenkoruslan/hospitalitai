import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuestionBanks } from "../hooks/useQuestionBanks";
import {
  IQuestion,
  IQuestionBank,
  NewQuestionClientData,
  AiGenerationClientParams,
} from "../types/questionBankTypes";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import LoadingSpinner from "../components/common/LoadingSpinner";
import AddManualQuestionForm from "../components/questionBank/AddManualQuestionForm";
import GenerateAiQuestionsForm from "../components/questionBank/GenerateAiQuestionsForm";
import {
  createQuestion as apiCreateQuestion,
  generateAiQuestions as apiGenerateAiQuestions,
} from "../services/api";

// Simple component to display a single question - to be expanded
const QuestionListItem: React.FC<{
  question: IQuestion;
  onRemove: (questionId: string) => void;
}> = ({ question, onRemove }) => {
  return (
    <div className="p-3 border rounded-md mb-3 bg-white shadow-sm">
      <p className="font-medium text-gray-800">{question.questionText}</p>
      <p className="text-xs text-gray-500">
        Type: {question.questionType} | Difficulty:{" "}
        {question.difficulty || "N/A"}
      </p>
      <p className="text-xs text-gray-500">
        Categories: {question.categories.join(", ")}
      </p>
      {/* Add more details like options if needed, or a link to view/edit the question fully */}
      <div className="mt-2 text-right">
        <Button
          variant="destructive"
          onClick={() => onRemove(question._id)}
          className="text-xs px-2 py-1"
        >
          Remove from Bank
        </Button>
      </div>
    </div>
  );
};

const QuestionBankDetailPage: React.FC = () => {
  const { bankId } = useParams<{ bankId: string }>();
  const navigate = useNavigate();
  const {
    currentQuestionBank,
    isLoading,
    error,
    fetchQuestionBankById,
    removeQuestionFromCurrentBank,
    addQuestionToCurrentBank,
  } = useQuestionBanks();

  // Local state for managing modals or forms for adding questions
  const [showAddManualQuestionModal, setShowAddManualQuestionModal] =
    useState(false);
  const [showGenerateAiQuestionsModal, setShowGenerateAiQuestionsModal] =
    useState(false);

  useEffect(() => {
    if (bankId) {
      fetchQuestionBankById(bankId);
    }
  }, [bankId, fetchQuestionBankById]);

  const handleRemoveQuestion = async (questionId: string) => {
    if (!bankId || !currentQuestionBank) return;
    if (
      window.confirm(
        "Are you sure you want to remove this question from the bank?"
      )
    ) {
      await removeQuestionFromCurrentBank(questionId);
    }
  };

  const handleManualQuestionSubmit = async (data: NewQuestionClientData) => {
    if (!currentQuestionBank) {
      console.error("No current question bank to add to.");
      return;
    }
    try {
      const newQuestion = await apiCreateQuestion(data);
      if (newQuestion && newQuestion._id) {
        await addQuestionToCurrentBank(newQuestion._id);
        setShowAddManualQuestionModal(false);
      } else {
        throw new Error("Failed to create question or question ID missing.");
      }
    } catch (err) {
      console.error("Error creating or adding manual question:", err);
      alert(
        `Error: ${
          err instanceof Error ? err.message : "Failed to save question."
        }`
      );
    }
  };

  const handleAiQuestionSubmit = async (data: AiGenerationClientParams) => {
    if (!currentQuestionBank) {
      console.error("No current question bank to add to.");
      alert("Error: No active question bank selected.");
      return;
    }
    try {
      const generatedQuestions = await apiGenerateAiQuestions(data);
      if (generatedQuestions && generatedQuestions.length > 0) {
        for (const q of generatedQuestions) {
          if (q && q._id) {
            await addQuestionToCurrentBank(q._id);
          }
        }
        setShowGenerateAiQuestionsModal(false);
        alert(
          `${generatedQuestions.length} questions generated and added to the bank.`
        );
      } else {
        alert("AI did not generate any questions, or there was an error.");
      }
    } catch (err) {
      console.error("Error generating or adding AI questions:", err);
      alert(
        `Error: ${
          err instanceof Error ? err.message : "Failed to generate questions."
        }`
      );
    }
  };

  if (isLoading && !currentQuestionBank) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 text-center">
        <p>Error loading question bank: {error.message}</p>
        <Link to="/question-banks">
          <Button variant="secondary" className="mt-2">
            Back to List
          </Button>
        </Link>
      </div>
    );
  }

  if (!currentQuestionBank) {
    return (
      <div className="text-center p-10">
        <p className="text-xl text-gray-600">Question bank not found.</p>
        <Link to="/question-banks">
          <Button variant="primary" className="mt-4">
            Back to Question Banks
          </Button>
        </Link>
      </div>
    );
  }

  // Ensure questions are IQuestion objects
  const questions = (currentQuestionBank.questions as IQuestion[]).filter(
    (q) => typeof q === "object" && q._id
  );

  return (
    <div className="container mx-auto p-4">
      <Button
        onClick={() => navigate("/question-banks")}
        variant="secondary"
        className="mb-4"
      >
        &larr; Back to Question Banks
      </Button>

      <Card title={currentQuestionBank.name} className="mb-6">
        <div className="p-4">
          {currentQuestionBank.description && (
            <p className="text-gray-700 mb-4">
              {currentQuestionBank.description}
            </p>
          )}
          <p className="text-sm text-gray-500">
            Total Questions: {questions.length}
          </p>
          {currentQuestionBank.categories &&
            currentQuestionBank.categories.length > 0 && (
              <p className="text-sm text-gray-500">
                Bank Categories: {currentQuestionBank.categories.join(", ")}
              </p>
            )}
        </div>
      </Card>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Questions in this Bank
        </h2>
        <div className="flex space-x-2 mb-4">
          <Button
            variant="primary"
            onClick={() => setShowAddManualQuestionModal(true)}
          >
            Add Question Manually
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowGenerateAiQuestionsModal(true)}
          >
            Generate Questions (AI)
          </Button>
        </div>

        {questions.length === 0 ? (
          <p className="text-gray-600">
            No questions have been added to this bank yet.
          </p>
        ) : (
          <div className="space-y-3">
            {questions.map((question) => (
              <QuestionListItem
                key={question._id}
                question={question}
                onRemove={handleRemoveQuestion}
              />
            ))}
          </div>
        )}
      </div>

      {showAddManualQuestionModal && (
        <AddManualQuestionForm
          onSubmit={handleManualQuestionSubmit}
          onClose={() => setShowAddManualQuestionModal(false)}
          isLoading={isLoading}
        />
      )}
      {showGenerateAiQuestionsModal && (
        <GenerateAiQuestionsForm
          onSubmit={handleAiQuestionSubmit}
          onClose={() => setShowGenerateAiQuestionsModal(false)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default QuestionBankDetailPage;
