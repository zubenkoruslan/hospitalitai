import { useState, useCallback, useEffect } from "react";
import {
  getQuestionBanks as apiGetQuestionBanks,
  createQuestionBank as apiCreateQuestionBank,
  updateQuestionBank as apiUpdateQuestionBank,
  deleteQuestionBank as apiDeleteQuestionBank,
  getQuestionBankById as apiGetQuestionBankById,
  addQuestionToBank as apiAddQuestionToBank,
  removeQuestionFromBank as apiRemoveQuestionFromBank,
} from "../services/api";
import {
  IQuestionBank,
  CreateQuestionBankData,
  UpdateQuestionBankData,
} from "../types/questionBankTypes";
import { useAuth } from "../context/AuthContext"; // To ensure user is authenticated

interface UseQuestionBanksReturn {
  questionBanks: IQuestionBank[];
  currentQuestionBank: IQuestionBank | null;
  isLoading: boolean;
  error: Error | null;
  fetchQuestionBanks: () => Promise<void>;
  fetchQuestionBankById: (bankId: string) => Promise<void>;
  addQuestionBank: (
    data: CreateQuestionBankData
  ) => Promise<IQuestionBank | undefined>;
  editQuestionBank: (
    bankId: string,
    data: UpdateQuestionBankData
  ) => Promise<IQuestionBank | undefined>;
  removeQuestionBank: (bankId: string) => Promise<void>;
  addQuestionToCurrentBank: (questionId: string) => Promise<void>;
  removeQuestionFromCurrentBank: (questionId: string) => Promise<void>;
  clearError: () => void;
}

export const useQuestionBanks = (): UseQuestionBanksReturn => {
  const { user } = useAuth(); // Access user, primarily to ensure authenticated session
  const [questionBanks, setQuestionBanks] = useState<IQuestionBank[]>([]);
  const [currentQuestionBank, setCurrentQuestionBank] =
    useState<IQuestionBank | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const fetchQuestionBanks = useCallback(async () => {
    if (!user) return; // Or handle unauthenticated state more explicitly
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGetQuestionBanks();
      setQuestionBanks(data);
    } catch (err) {
      console.error("Failed to fetch question banks:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchQuestionBankById = useCallback(
    async (bankId: string) => {
      if (!user) return;
      setIsLoading(true);
      setError(null);
      setCurrentQuestionBank(null);
      try {
        const data = await apiGetQuestionBankById(bankId);
        setCurrentQuestionBank(data);
      } catch (err) {
        console.error(`Failed to fetch question bank ${bankId}:`, err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  const addQuestionBank = useCallback(
    async (
      data: CreateQuestionBankData
    ): Promise<IQuestionBank | undefined> => {
      if (!user) return;
      setIsLoading(true);
      setError(null);
      try {
        const newBank = await apiCreateQuestionBank(data);
        setQuestionBanks((prev) => [...prev, newBank]);
        return newBank;
      } catch (err) {
        console.error("Failed to create question bank:", err);
        setError(err as Error);
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  const editQuestionBank = useCallback(
    async (
      bankId: string,
      data: UpdateQuestionBankData
    ): Promise<IQuestionBank | undefined> => {
      if (!user) return;
      setIsLoading(true);
      setError(null);
      try {
        const updatedBank = await apiUpdateQuestionBank(bankId, data);
        setQuestionBanks((prev) =>
          prev.map((bank) => (bank._id === bankId ? updatedBank : bank))
        );
        if (currentQuestionBank?._id === bankId) {
          setCurrentQuestionBank(updatedBank);
        }
        return updatedBank;
      } catch (err) {
        console.error(`Failed to update question bank ${bankId}:`, err);
        setError(err as Error);
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [user, currentQuestionBank]
  );

  const removeQuestionBank = useCallback(
    async (bankId: string) => {
      if (!user) return;
      setIsLoading(true);
      setError(null);
      try {
        await apiDeleteQuestionBank(bankId);
        setQuestionBanks((prev) => prev.filter((bank) => bank._id !== bankId));
        if (currentQuestionBank?._id === bankId) {
          setCurrentQuestionBank(null);
        }
      } catch (err) {
        console.error(`Failed to delete question bank ${bankId}:`, err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [user, currentQuestionBank]
  );

  // Function to add a question to the currently loaded question bank
  const addQuestionToCurrentBank = useCallback(
    async (questionId: string) => {
      if (!user || !currentQuestionBank) return;
      setIsLoading(true);
      setError(null);
      try {
        const updatedBank = await apiAddQuestionToBank(
          currentQuestionBank._id,
          questionId
        );
        setCurrentQuestionBank(updatedBank);
        // Optionally, update the bank in the main questionBanks list if needed
        setQuestionBanks((prev) =>
          prev.map((qb) => (qb._id === updatedBank._id ? updatedBank : qb))
        );
      } catch (err) {
        console.error(
          `Failed to add question ${questionId} to bank ${currentQuestionBank._id}:`,
          err
        );
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [user, currentQuestionBank, apiAddQuestionToBank]
  ); // Added apiAddQuestionToBank to dependencies

  // Function to remove a question from the currently loaded question bank
  const removeQuestionFromCurrentBank = useCallback(
    async (questionId: string) => {
      if (!user || !currentQuestionBank) return;
      setIsLoading(true);
      setError(null);
      try {
        const updatedBank = await apiRemoveQuestionFromBank(
          currentQuestionBank._id,
          questionId
        );
        setCurrentQuestionBank(updatedBank);
        // Optionally, update the bank in the main questionBanks list
        setQuestionBanks((prev) =>
          prev.map((qb) => (qb._id === updatedBank._id ? updatedBank : qb))
        );
      } catch (err) {
        console.error(
          `Failed to remove question ${questionId} from bank ${currentQuestionBank._id}:`,
          err
        );
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [user, currentQuestionBank, apiRemoveQuestionFromBank]
  ); // Added apiRemoveQuestionFromBank to dependencies

  // Optionally, fetch question banks when the hook is first used and user is available
  // useEffect(() => {
  //   if (user) {
  //     fetchQuestionBanks();
  //   }
  // }, [user, fetchQuestionBanks]);

  return {
    questionBanks,
    currentQuestionBank,
    isLoading,
    error,
    fetchQuestionBanks,
    fetchQuestionBankById,
    addQuestionBank,
    editQuestionBank,
    removeQuestionBank,
    addQuestionToCurrentBank,
    removeQuestionFromCurrentBank,
    clearError,
  };
};
