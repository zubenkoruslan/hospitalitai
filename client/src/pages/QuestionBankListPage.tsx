import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuestionBanks } from "../hooks/useQuestionBanks";
import {
  CreateQuestionBankData,
  IQuestionBank,
  CreateQuestionBankFromMenuClientData,
  MenuAiGenerationClientParams,
} from "../types/questionBankTypes";
import { IMenuClient, IMenuWithItemsClient } from "../types/menuTypes";
import {
  getRestaurantMenus,
  getMenuWithItems,
  createQuestionBankFromMenu,
} from "../services/api";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import LoadingSpinner from "../components/common/LoadingSpinner";
import CreateQuestionBankForm from "../components/questionBank/CreateQuestionBankForm";

// Simplified Item component for the list
const QuestionBankListItem: React.FC<{
  bank: IQuestionBank;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}> = ({ bank, onDelete, onEdit }) => {
  return (
    <Card title={bank.name} className="mb-4 flex flex-col">
      <div className="p-4 flex-grow">
        {bank.description && (
          <p className="text-sm text-gray-600 mb-2">{bank.description}</p>
        )}
        <p className="text-sm">
          Questions: {bank.questionCount || bank.questions.length}
        </p>
        {bank.categories && bank.categories.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Categories: {bank.categories.join(", ")}
          </p>
        )}
      </div>
      <div className="p-4 border-t border-gray-200 flex justify-end space-x-2 bg-gray-50 rounded-b-lg">
        <Button
          variant="secondary"
          onClick={() => onEdit(bank._id)}
          className="text-xs px-2 py-1"
        >
          Edit
        </Button>
        <Link to={`/question-banks/${bank._id}`}>
          <Button variant="secondary" className="text-xs px-2 py-1">
            View Details
          </Button>
        </Link>
        <Button
          variant="destructive"
          onClick={() => onDelete(bank._id)}
          className="text-xs px-2 py-1"
        >
          Delete
        </Button>
      </div>
    </Card>
  );
};

const QuestionBankListPage: React.FC = () => {
  const {
    questionBanks,
    isLoading: isLoadingBanks,
    error: banksError,
    fetchQuestionBanks,
    removeQuestionBank,
    clearError: clearBanksError,
  } = useQuestionBanks();

  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch initial question banks
  useEffect(() => {
    fetchQuestionBanks();
  }, [fetchQuestionBanks]);

  const handleBankCreated = useCallback(() => {
    fetchQuestionBanks(); // Re-fetch the list of banks
    setShowCreateForm(false); // Hide the form
  }, [fetchQuestionBanks]);

  const handleCancelCreate = useCallback(() => {
    setShowCreateForm(false);
  }, []);

  const handleDeleteBank = async (bankId: string) => {
    if (window.confirm("Are you sure you want to delete this question bank?")) {
      await removeQuestionBank(bankId);
      // fetchQuestionBanks() is likely called within useQuestionBanks hook after removal
    }
  };

  const handleEditBank = (bankId: string) => {
    console.log("Edit bank with ID:", bankId);
    alert(
      `Editing bank ${bankId} - functionality to be implemented. You might navigate to /question-banks/${bankId}/edit or use a modal.`
    );
  };

  if (isLoadingBanks && questionBanks.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (banksError) {
    return (
      <div className="text-red-500 p-4 text-center">
        <p>Error loading question banks: {banksError.message}</p>
        <Button
          onClick={() => {
            clearBanksError();
            fetchQuestionBanks();
          }}
          variant="secondary"
          className="mt-2"
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Question Banks</h1>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          variant={showCreateForm ? "secondary" : "primary"}
        >
          {showCreateForm ? "Cancel Create" : "Create New Bank"}
        </Button>
      </div>

      {showCreateForm && (
        <CreateQuestionBankForm
          onBankCreated={handleBankCreated}
          onCancel={handleCancelCreate}
        />
      )}

      {questionBanks.length === 0 && !isLoadingBanks && !showCreateForm && (
        <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No question banks
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new question bank.
          </p>
          <div className="mt-6">
            <Button onClick={() => setShowCreateForm(true)} variant="primary">
              Create New Bank
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {questionBanks.map((bank) => (
          <QuestionBankListItem
            key={bank._id}
            bank={bank}
            onDelete={handleDeleteBank}
            onEdit={handleEditBank}
          />
        ))}
      </div>
    </div>
  );
};

export default QuestionBankListPage;
