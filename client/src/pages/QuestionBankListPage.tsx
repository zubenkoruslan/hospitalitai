import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useQuestionBanks } from "../hooks/useQuestionBanks";
import {
  IQuestionBank,
  // CreateQuestionBankData, // No longer directly used here if form handles its own type
  // CreateQuestionBankFromMenuClientData, // No longer directly used here
  // MenuAiGenerationClientParams, // No longer used here
} from "../types/questionBankTypes";
// import { IMenuClient, IMenuWithItemsClient } from "../types/menuTypes"; // No longer used
// import {
//   getRestaurantMenus,
//   getMenuWithItems,
//   createQuestionBankFromMenu,
// } from "../services/api"; // No longer used here
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import LoadingSpinner from "../components/common/LoadingSpinner";
import CreateQuestionBankForm from "../components/questionBank/CreateQuestionBankForm";
import Modal from "../components/common/Modal"; // Added Modal import
import EditQuestionBankForm from "../components/questionBank/EditQuestionBankForm"; // Added EditQuestionBankForm import
import ConfirmationModalContent from "../components/common/ConfirmationModalContent"; // ADDED ConfirmationModalContent import
import ErrorMessage from "../components/common/ErrorMessage";

// Simplified Item component for the list
const QuestionBankListItem: React.FC<{
  bank: IQuestionBank;
  onDelete: (id: string) => void;
  onEdit: (bank: IQuestionBank) => void;
}> = ({ bank, onDelete, onEdit }) => {
  return (
    <Card className="bg-white shadow-lg rounded-xl mb-4 flex flex-col hover:shadow-xl transition-shadow duration-300">
      <div className="p-4 flex-grow">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">
          {bank.name}
        </h3>
        {bank.description && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {bank.description}
          </p>
        )}
        <p className="text-sm text-gray-500">
          Questions:{" "}
          {bank.questionCount !== undefined
            ? bank.questionCount
            : (bank.questions && bank.questions.length) || 0}
        </p>
        {bank.categories && bank.categories.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Categories: {bank.categories.join(", ")}
          </p>
        )}
      </div>
      <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
        <Button
          variant="secondary"
          onClick={() => onEdit(bank)}
          className="text-xs px-3 py-1.5"
        >
          Edit Details
        </Button>
        <Link to={`/question-banks/${bank._id}`} className="block">
          <Button variant="secondary" className="text-xs px-3 py-1.5 w-full">
            Manage Questions
          </Button>
        </Link>
        <Button
          variant="destructive"
          onClick={() => onDelete(bank._id)}
          className="text-xs px-3 py-1.5"
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
    // We might need updateQuestionBank directly if EditForm doesn't use the hook
  } = useQuestionBanks();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<IQuestionBank | null>(null);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] =
    useState(false); // ADDED state for delete confirmation
  const [bankToDeleteId, setBankToDeleteId] = useState<string | null>(null); // ADDED state for bank ID to delete

  useEffect(() => {
    fetchQuestionBanks();
  }, [fetchQuestionBanks]);

  const handleBankCreated = useCallback(() => {
    fetchQuestionBanks();
    setShowCreateForm(false);
  }, [fetchQuestionBanks]);

  const handleCancelCreate = useCallback(() => {
    setShowCreateForm(false);
  }, []);

  // Renamed from handleDeleteBank to initiate the delete process
  const requestDeleteBank = (bankId: string) => {
    setBankToDeleteId(bankId);
    setIsConfirmDeleteModalOpen(true);
  };

  const handleCancelDelete = () => {
    setIsConfirmDeleteModalOpen(false);
    setBankToDeleteId(null);
  };

  // This function executes the actual deletion
  const executeDeleteBank = async () => {
    if (bankToDeleteId) {
      await removeQuestionBank(bankToDeleteId);
      // fetchQuestionBanks(); // Re-fetch is good practice, or rely on hook if it auto-updates
      setIsConfirmDeleteModalOpen(false);
      setBankToDeleteId(null);
    }
  };

  const handleOpenEditModal = (bank: IQuestionBank) => {
    setEditingBank(bank);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingBank(null);
  };

  const handleBankUpdatedInModal = (_updatedBank: IQuestionBank) => {
    // Option 1: Optimistically update the list (if API doesn't return the full updated list)
    // const updatedBanks = questionBanks.map(b => b._id === updatedBank._id ? updatedBank : b);
    // setQuestionBanks(updatedBanks); // If useQuestionBanks hook doesn't manage state internally on update

    // Option 2: Re-fetch (simpler, relies on hook to refresh)
    fetchQuestionBanks();
    handleCloseEditModal();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
        {isLoadingBanks && questionBanks.length === 0 && (
          <div className="flex justify-center items-center h-[calc(100vh-200px)]">
            <LoadingSpinner message="Loading question banks..." />
          </div>
        )}
        {banksError && (
          <div className="bg-white shadow-lg rounded-xl p-6 text-center">
            <ErrorMessage
              message={banksError.message || "Failed to load question banks."}
            />
            <Button
              onClick={() => {
                clearBanksError();
                fetchQuestionBanks();
              }}
              variant="secondary"
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        )}
        {!isLoadingBanks && !banksError && (
          <>
            <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-center">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                  Question Banks
                </h1>
                <div className="mt-4 sm:mt-0">
                  <Button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    variant={showCreateForm ? "secondary" : "primary"}
                  >
                    {showCreateForm ? "Cancel Create" : "Create New Bank"}
                  </Button>
                </div>
              </div>
            </div>
            {showCreateForm && (
              <Card className="bg-white shadow-lg rounded-xl p-4 sm:p-6 mb-6">
                <CreateQuestionBankForm
                  onBankCreated={handleBankCreated}
                  onCancel={handleCancelCreate}
                />
              </Card>
            )}
            {!showCreateForm && questionBanks.length === 0 && (
              <Card className="bg-white shadow-lg rounded-xl p-6 text-center">
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
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0l-3-3m-10 3l-3-3m10 0l-4 4m-2 0l-4-4"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No question banks created yet.
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating a new question bank.
                </p>
              </Card>
            )}
            {!showCreateForm && questionBanks.length > 0 && (
              <div className="space-y-6">
                {questionBanks.map((bank) => (
                  <QuestionBankListItem
                    key={bank._id}
                    bank={bank}
                    onDelete={requestDeleteBank}
                    onEdit={handleOpenEditModal}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
      {editingBank && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          title={`Edit Bank: ${editingBank.name}`}
        >
          <EditQuestionBankForm
            bankToEdit={editingBank}
            onBankUpdated={handleBankUpdatedInModal}
            onCancel={handleCloseEditModal}
          />
        </Modal>
      )}
      {isConfirmDeleteModalOpen && bankToDeleteId && (
        <Modal
          isOpen={isConfirmDeleteModalOpen}
          onClose={handleCancelDelete}
          title="Confirm Deletion"
        >
          <ConfirmationModalContent
            message={`Are you sure you want to delete the question bank: ${
              questionBanks.find((b) => b._id === bankToDeleteId)?.name ||
              "this bank"
            }? This action cannot be undone.`}
            onConfirm={executeDeleteBank}
            onCancel={handleCancelDelete}
            confirmText="Delete"
            confirmButtonVariant="destructive"
          />
        </Modal>
      )}
    </div>
  );
};

export default QuestionBankListPage;
