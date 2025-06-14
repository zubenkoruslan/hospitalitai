import { renderHook, act } from "@testing-library/react";
import { useQuestionBanks } from "./useQuestionBanks";
import * as api from "../services/api"; // To mock API calls
import { AuthContext, AuthContextType } from "../context/AuthContext"; // To mock AuthContext
import {
  IQuestionBank,
  CreateQuestionBankData,
  UpdateQuestionBankData,
} from "../types/questionBankTypes";
import { ClientUserMinimal } from "../types/user"; // Changed from IUser

// Mock API module
jest.mock("../services/api");

const mockApi = api as jest.Mocked<typeof api>;

const mockUser: ClientUserMinimal = {
  _id: "user123",
  name: "Test User",
  email: "test@example.com",
  restaurantId: "rest123",
};

const mockAuthContextValue: AuthContextType = {
  user: mockUser,
  token: "fake-token",
  login: jest.fn(),
  logout: jest.fn(),
  isLoading: false,
  error: null,
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthContext.Provider value={mockAuthContextValue}>
    {children}
  </AuthContext.Provider>
);

describe("useQuestionBanks Hook", () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    const { result } = renderHook(() => useQuestionBanks(), { wrapper });
    expect(result.current).toBeDefined();
  });

  // Test initial state
  it("should initialize with correct initial state", () => {
    const { result } = renderHook(() => useQuestionBanks(), { wrapper });
    expect(result.current.questionBanks).toEqual([]);
    expect(result.current.currentQuestionBank).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // Test fetchQuestionBanks
  describe("fetchQuestionBanks", () => {
    const mockBanks: IQuestionBank[] = [
      {
        _id: "qb1",
        name: "Bank 1",
        description: "Desc 1",
        questions: [],
        restaurantId: "rest123",
        createdBy: "user123",
        categories: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questionCount: 0,
      },
      {
        _id: "qb2",
        name: "Bank 2",
        description: "Desc 2",
        questions: [],
        restaurantId: "rest123",
        createdBy: "user123",
        categories: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questionCount: 0,
      },
    ];

    it("should fetch and set question banks on successful API call", async () => {
      mockApi.getQuestionBanks.mockResolvedValueOnce(mockBanks);
      const { result } = renderHook(() => useQuestionBanks(), { wrapper });

      await act(async () => {
        await result.current.fetchQuestionBanks();
      });

      expect(mockApi.getQuestionBanks).toHaveBeenCalledTimes(1);
      expect(result.current.questionBanks).toEqual(mockBanks);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should set error state on API call failure", async () => {
      const errorMessage = "Failed to fetch";
      mockApi.getQuestionBanks.mockRejectedValueOnce(new Error(errorMessage));
      const { result } = renderHook(() => useQuestionBanks(), { wrapper });

      await act(async () => {
        await result.current.fetchQuestionBanks();
      });

      expect(result.current.error).toEqual(new Error(errorMessage));
      expect(result.current.isLoading).toBe(false);
      expect(result.current.questionBanks).toEqual([]);
    });
  });

  // Test fetchQuestionBankById
  describe("fetchQuestionBankById", () => {
    const mockBank: IQuestionBank = {
      _id: "qb1",
      name: "Bank 1",
      description: "Desc 1",
      questions: [],
      restaurantId: "rest123",
      createdBy: "user123",
      categories: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questionCount: 0,
    };

    it("should fetch and set the current question bank on successful API call", async () => {
      mockApi.getQuestionBankById.mockResolvedValueOnce(mockBank);
      const { result } = renderHook(() => useQuestionBanks(), { wrapper });

      await act(async () => {
        await result.current.fetchQuestionBankById("qb1");
      });

      expect(mockApi.getQuestionBankById).toHaveBeenCalledWith("qb1");
      expect(result.current.currentQuestionBank).toEqual(mockBank);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should set error state if fetching by ID fails", async () => {
      const errorMessage = "Fetch by ID failed";
      mockApi.getQuestionBankById.mockRejectedValueOnce(
        new Error(errorMessage)
      );
      const { result } = renderHook(() => useQuestionBanks(), { wrapper });

      await act(async () => {
        await result.current.fetchQuestionBankById("qb1");
      });

      expect(result.current.error).toEqual(new Error(errorMessage));
      expect(result.current.isLoading).toBe(false);
      expect(result.current.currentQuestionBank).toBeNull();
    });
  });

  // Test addQuestionBank
  describe("addQuestionBank", () => {
    const createData: CreateQuestionBankData = {
      name: "New Bank",
      description: "New Desc",
    };
    const _newBankMatcher = expect.objectContaining({
      ...createData,
      _id: "qb3",
      questions: [],
      createdBy: "user123",
      restaurantId: "rest123",
      categories: [],
      questionCount: 0,
    });
    const newBankReturned: IQuestionBank = {
      ...createData,
      _id: "qb3",
      questions: [],
      createdBy: "user123",
      restaurantId: "rest123",
      categories: [],
      questionCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("should add a question bank and update state", async () => {
      mockApi.createQuestionBank.mockResolvedValueOnce(newBankReturned);
      const { result } = renderHook(() => useQuestionBanks(), { wrapper });

      let addedBank;
      await act(async () => {
        addedBank = await result.current.addQuestionBank(createData);
      });

      expect(addedBank).toEqual(newBankReturned);
      expect(mockApi.createQuestionBank).toHaveBeenCalledWith(createData);
      expect(result.current.questionBanks).toContainEqual(newBankReturned);
      expect(result.current.isLoading).toBe(false);
    });

    it("should set error if adding fails", async () => {
      const errorMessage = "Failed to create";
      mockApi.createQuestionBank.mockRejectedValueOnce(new Error(errorMessage));
      const { result } = renderHook(() => useQuestionBanks(), { wrapper });

      let returnedBank;
      await act(async () => {
        returnedBank = await result.current.addQuestionBank(createData);
      });

      expect(returnedBank).toBeUndefined();
      expect(result.current.error).toEqual(new Error(errorMessage));
      expect(result.current.isLoading).toBe(false);
    });
  });

  // Test editQuestionBank
  describe("editQuestionBank", () => {
    const bankIdToEdit = "qb1";
    const initialBanks: IQuestionBank[] = [
      {
        _id: "qb1",
        name: "Bank 1 Old",
        description: "Desc 1 Old",
        questions: [],
        restaurantId: "rest123",
        createdBy: "user123",
        categories: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questionCount: 0,
      },
      {
        _id: "qb2",
        name: "Bank 2",
        description: "Desc 2",
        questions: [],
        restaurantId: "rest123",
        createdBy: "user123",
        categories: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questionCount: 0,
      },
    ];
    const updateData: UpdateQuestionBankData = {
      name: "Bank 1 New",
      description: "Desc 1 New",
    };
    const updatedBank: IQuestionBank = {
      ...initialBanks[0],
      ...updateData,
      questionCount: 0,
      updatedAt: new Date().toISOString(),
    };

    it("should edit a question bank and update lists", async () => {
      mockApi.updateQuestionBank.mockResolvedValueOnce(updatedBank);
      const { result } = renderHook(() => useQuestionBanks(), { wrapper });

      act(() => {
        result.current.questionBanks = initialBanks;
        result.current.currentQuestionBank = initialBanks[0];
      });

      let returnedBank;
      await act(async () => {
        returnedBank = await result.current.editQuestionBank(
          bankIdToEdit,
          updateData
        );
      });

      expect(returnedBank).toEqual(updatedBank);
      expect(mockApi.updateQuestionBank).toHaveBeenCalledWith(
        bankIdToEdit,
        updateData
      );
      expect(
        result.current.questionBanks.find((b) => b._id === bankIdToEdit)
      ).toEqual(updatedBank);
      expect(result.current.currentQuestionBank).toEqual(updatedBank);
      expect(result.current.isLoading).toBe(false);
    });

    it("should not change currentQuestionBank if a different bank is edited", async () => {
      const otherBank = { ...initialBanks[1] };
      mockApi.updateQuestionBank.mockResolvedValueOnce(updatedBank);
      const { result } = renderHook(() => useQuestionBanks(), { wrapper });

      act(() => {
        result.current.questionBanks = initialBanks;
        result.current.currentQuestionBank = otherBank;
      });

      await act(async () => {
        await result.current.editQuestionBank(bankIdToEdit, updateData);
      });

      expect(result.current.currentQuestionBank).toEqual(otherBank);
      expect(
        result.current.questionBanks.find((b) => b._id === bankIdToEdit)
      ).toEqual(updatedBank);
    });

    it("should set error if editing fails", async () => {
      const errorMessage = "Failed to update";
      mockApi.updateQuestionBank.mockRejectedValueOnce(new Error(errorMessage));
      const { result } = renderHook(() => useQuestionBanks(), { wrapper });

      act(() => {
        result.current.questionBanks = initialBanks;
        result.current.currentQuestionBank = initialBanks[0];
      });

      let returnedBank;
      await act(async () => {
        returnedBank = await result.current.editQuestionBank(
          bankIdToEdit,
          updateData
        );
      });

      expect(returnedBank).toBeUndefined();
      expect(result.current.error).toEqual(new Error(errorMessage));
      expect(
        result.current.questionBanks.find((b) => b._id === bankIdToEdit)?.name
      ).toBe("Bank 1 Old");
      expect(result.current.currentQuestionBank?.name).toBe("Bank 1 Old");
      expect(result.current.isLoading).toBe(false);
    });
  });

  // Test removeQuestionBank
  describe("removeQuestionBank", () => {
    const bankIdToRemove = "qb1";
    const initialBanks: IQuestionBank[] = [
      {
        _id: "qb1",
        name: "Bank 1",
        questions: [],
        restaurantId: "rest123",
        createdBy: "user123",
        categories: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: "Test",
        questionCount: 0,
      },
      {
        _id: "qb2",
        name: "Bank 2",
        questions: [],
        restaurantId: "rest123",
        createdBy: "user123",
        categories: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: "Test 2",
        questionCount: 0,
      },
    ];

    it("should remove a question bank and update lists", async () => {
      mockApi.deleteQuestionBank.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useQuestionBanks(), { wrapper });

      act(() => {
        result.current.questionBanks = initialBanks;
        result.current.currentQuestionBank = initialBanks[0];
      });

      await act(async () => {
        await result.current.removeQuestionBank(bankIdToRemove);
      });

      expect(mockApi.deleteQuestionBank).toHaveBeenCalledWith(bankIdToRemove);
      expect(
        result.current.questionBanks.find((b) => b._id === bankIdToRemove)
      ).toBeUndefined();
      expect(result.current.questionBanks.length).toBe(initialBanks.length - 1);
      expect(result.current.currentQuestionBank).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it("should set error if removal fails", async () => {
      const errorMessage = "Failed to delete";
      mockApi.deleteQuestionBank.mockRejectedValueOnce(new Error(errorMessage));
      const { result } = renderHook(() => useQuestionBanks(), { wrapper });

      act(() => {
        result.current.questionBanks = initialBanks;
      });

      await act(async () => {
        await result.current.removeQuestionBank(bankIdToRemove);
      });

      expect(result.current.error).toEqual(new Error(errorMessage));
      expect(result.current.questionBanks.length).toBe(initialBanks.length);
      expect(result.current.currentQuestionBank).toEqual(initialBanks[0]);
      expect(result.current.isLoading).toBe(false);
    });
  });

  // Test addQuestionToCurrentBank
  describe("addQuestionToCurrentBank", () => {
    const currentBank: IQuestionBank = {
      _id: "qb1",
      name: "Current Bank",
      questions: ["qOld"],
      restaurantId: "rest123",
      createdBy: "user123",
      categories: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: "Test",
      questionCount: 1,
    };
    const questionIdToAdd = "qNew";
    const updatedBankAfterAdd: IQuestionBank = {
      ...currentBank,
      questions: ["qOld", questionIdToAdd],
      questionCount: 2,
      updatedAt: new Date().toISOString(),
    };

    it("should add question to current bank and update it", async () => {
      mockApi.addQuestionToBank.mockResolvedValueOnce(updatedBankAfterAdd);
      const { result } = renderHook(() => useQuestionBanks(), { wrapper });

      act(() => {
        result.current.currentQuestionBank = currentBank;
        result.current.questionBanks = [
          currentBank,
          {
            _id: "qb2",
            name: "Other Bank",
            questions: [],
            restaurantId: "rest123",
            createdBy: "user123",
            categories: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            description: "Test 2",
            questionCount: 0,
          },
        ];
      });

      await act(async () => {
        await result.current.addQuestionToCurrentBank(questionIdToAdd);
      });

      expect(mockApi.addQuestionToBank).toHaveBeenCalledWith(
        currentBank._id,
        questionIdToAdd
      );
      expect(result.current.currentQuestionBank).toEqual(updatedBankAfterAdd);
      expect(
        result.current.questionBanks.find((qb) => qb._id === currentBank._id)
      ).toEqual(updatedBankAfterAdd);
      expect(result.current.isLoading).toBe(false);
    });

    it("should set error if adding question fails", async () => {
      const errorMessage = "Failed to add question";
      mockApi.addQuestionToBank.mockRejectedValueOnce(new Error(errorMessage));
      const { result } = renderHook(() => useQuestionBanks(), { wrapper });

      act(() => {
        result.current.currentQuestionBank = currentBank;
      });

      await act(async () => {
        await result.current.addQuestionToCurrentBank(questionIdToAdd);
      });

      expect(result.current.error).toEqual(new Error(errorMessage));
      expect(result.current.currentQuestionBank?.questions).toEqual(["qOld"]);
      expect(result.current.isLoading).toBe(false);
    });

    it("should not attempt to add if no current bank", async () => {
      const { result } = renderHook(() => useQuestionBanks(), { wrapper });

      await act(async () => {
        await result.current.addQuestionToCurrentBank(questionIdToAdd);
      });

      expect(mockApi.addQuestionToBank).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  // Test removeQuestionFromCurrentBank
  describe("removeQuestionFromCurrentBank", () => {
    const questionIdToRemove = "qToRemove";
    const initialCurrentBank: IQuestionBank = {
      _id: "qb1",
      name: "Current Bank",
      questions: ["qKeep", questionIdToRemove],
      restaurantId: "rest123",
      createdBy: "user123",
      categories: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: "Test",
      questionCount: 2,
    };
    const updatedBankAfterRemove: IQuestionBank = {
      ...initialCurrentBank,
      questions: ["qKeep"],
      questionCount: 1,
      updatedAt: new Date().toISOString(),
    };

    it("should remove question from current bank and update it", async () => {
      mockApi.removeQuestionFromBank.mockResolvedValueOnce(
        updatedBankAfterRemove
      );
      const { result } = renderHook(() => useQuestionBanks(), { wrapper });

      act(() => {
        result.current.currentQuestionBank = initialCurrentBank;
        result.current.questionBanks = [
          initialCurrentBank,
          {
            _id: "qb2",
            name: "Other Bank",
            questions: [],
            restaurantId: "rest123",
            createdBy: "user123",
            categories: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            description: "Test 2",
            questionCount: 0,
          },
        ];
      });

      await act(async () => {
        await result.current.removeQuestionFromCurrentBank(questionIdToRemove);
      });

      expect(mockApi.removeQuestionFromBank).toHaveBeenCalledWith(
        initialCurrentBank._id,
        questionIdToRemove
      );
      expect(result.current.currentQuestionBank).toEqual(
        updatedBankAfterRemove
      );
      expect(
        result.current.questionBanks.find(
          (qb) => qb._id === initialCurrentBank._id
        )
      ).toEqual(updatedBankAfterRemove);
      expect(result.current.isLoading).toBe(false);
    });

    it("should set error if removing question fails", async () => {
      const errorMessage = "Failed to remove question";
      mockApi.removeQuestionFromBank.mockRejectedValueOnce(
        new Error(errorMessage)
      );
      const { result } = renderHook(() => useQuestionBanks(), { wrapper });

      act(() => {
        result.current.currentQuestionBank = initialCurrentBank;
      });

      await act(async () => {
        await result.current.removeQuestionFromCurrentBank(questionIdToRemove);
      });

      expect(result.current.error).toEqual(new Error(errorMessage));
      expect(result.current.currentQuestionBank?.questions).toEqual([
        "qKeep",
        questionIdToRemove,
      ]);
      expect(result.current.isLoading).toBe(false);
    });

    it("should not attempt to remove if no current bank", async () => {
      const { result } = renderHook(() => useQuestionBanks(), { wrapper });

      await act(async () => {
        await result.current.removeQuestionFromCurrentBank(questionIdToRemove);
      });

      expect(mockApi.removeQuestionFromBank).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  // Test clearError
  it("clearError should reset the error state to null", () => {
    const { result } = renderHook(() => useQuestionBanks(), { wrapper });

    act(() => {
      result.current.error = new Error("Test Error");
    });
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();
  });

  // Test behavior when user is not authenticated
  describe("when user is not authenticated", () => {
    const unauthenticatedAuthContextValue: AuthContextType = {
      ...mockAuthContextValue,
      user: null,
      token: null,
    };
    const unauthenticatedWrapper = ({
      children,
    }: {
      children: React.ReactNode;
    }) => (
      <AuthContext.Provider value={unauthenticatedAuthContextValue}>
        {children}
      </AuthContext.Provider>
    );

    it("fetchQuestionBanks should not call API if user is null", async () => {
      const { result } = renderHook(() => useQuestionBanks(), {
        wrapper: unauthenticatedWrapper,
      });
      await act(async () => {
        await result.current.fetchQuestionBanks();
      });
      expect(mockApi.getQuestionBanks).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("addQuestionBank should not call API and return undefined if user is null", async () => {
      const { result } = renderHook(() => useQuestionBanks(), {
        wrapper: unauthenticatedWrapper,
      });
      let returnedBank;
      const createData: CreateQuestionBankData = {
        name: "New Bank",
        description: "New Desc",
      };
      await act(async () => {
        returnedBank = await result.current.addQuestionBank(createData);
      });
      expect(mockApi.createQuestionBank).not.toHaveBeenCalled();
      expect(returnedBank).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });

    it("editQuestionBank should not call API and return undefined if user is null", async () => {
      const { result } = renderHook(() => useQuestionBanks(), {
        wrapper: unauthenticatedWrapper,
      });
      let returnedBank;
      const updateData: UpdateQuestionBankData = { name: "Updated Name" };
      await act(async () => {
        returnedBank = await result.current.editQuestionBank(
          "some-id",
          updateData
        );
      });
      expect(mockApi.updateQuestionBank).not.toHaveBeenCalled();
      expect(returnedBank).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });

    it("removeQuestionBank should not call API if user is null", async () => {
      const { result } = renderHook(() => useQuestionBanks(), {
        wrapper: unauthenticatedWrapper,
      });
      await act(async () => {
        await result.current.removeQuestionBank("some-id");
      });
      expect(mockApi.deleteQuestionBank).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("fetchQuestionBankById should not call API if user is null", async () => {
      const { result } = renderHook(() => useQuestionBanks(), {
        wrapper: unauthenticatedWrapper,
      });
      await act(async () => {
        await result.current.fetchQuestionBankById("some-id");
      });
      expect(mockApi.getQuestionBankById).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    // Add similar tests for editQuestionBank, removeQuestionBank, fetchQuestionBankById,
    // addQuestionToCurrentBank, removeQuestionFromCurrentBank
  });
});
