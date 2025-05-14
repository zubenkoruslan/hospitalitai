import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useQuestionBanks } from "../hooks/useQuestionBanks";
import {
  IQuestionBank,
  // CreateQuestionBankData, // No longer directly used here if form handles its own type
  // CreateQuestionBankFromMenuClientData, // No longer directly used here
  // MenuAiGenerationClientParams, // No longer directly used here
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

// Simplified Item component for the list
const QuestionBankListItem: React.FC<{
  bank: IQuestionBank;
  onDelete: (id: string) => void;
  onEdit: (bank: IQuestionBank) => void; // Changed to pass the full bank object
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
          onClick={() => onEdit(bank)} // Pass the full bank object
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

  const handleBankUpdatedInModal = (updatedBank: IQuestionBank) => {
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
      <main className="py-8">
        {isLoadingBanks && questionBanks.length === 0 && (
          <div className="flex justify-center items-center h-[calc(100vh-200px)]">
            <LoadingSpinner />
          </div>
        )}
        {banksError && (
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
        )}
        {!isLoadingBanks && !banksError && (
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold leading-tight text-gray-900">
                Question Banks
              </h1>
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
            {!showCreateForm && questionBanks.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg mt-6">
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
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    variant="primary"
                  >
                    Create New Bank
                  </Button>
                </div>
              </div>
            )}
            {!showCreateForm && questionBanks.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {questionBanks.map((bank) => (
                  <QuestionBankListItem
                    key={bank._id}
                    bank={bank}
                    onDelete={requestDeleteBank} // MODIFIED: Call requestDeleteBank
                    onEdit={handleOpenEditModal}
                  />
                ))}
              </div>
            )}
          </div>
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
      {/* ADDED Delete Confirmation Modal */}
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
