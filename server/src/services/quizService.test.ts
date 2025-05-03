import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import mongoose from "mongoose";
import QuizService from "./quizService";
import Quiz from "../models/Quiz";
import MenuItem from "../models/MenuItem";
import QuizResult from "../models/QuizResult";
import User from "../models/User";
import { AppError } from "../utils/errorHandler";

// Mock Mongoose models using vi.mock
// Adjust the path based on your actual model locations
vi.mock("../models/Quiz");
vi.mock("../models/MenuItem");
vi.mock("../models/QuizResult");
vi.mock("../models/User");

describe("QuizService", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
  });

  // --- Test Suite for generateQuizQuestions ---
  describe("generateQuizQuestions", () => {
    const mockRestaurantId = new mongoose.Types.ObjectId();
    const mockMenuItems = [
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Burger",
        description: "A juicy burger",
        price: 10,
        itemType: "food",
        category: "main",
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Fries",
        description: "Crispy fries",
        price: 4,
        itemType: "food",
        category: "side",
      },
    ];

    // Helper to create a mock query object with a chainable .lean()
    const createMockLeanQuery = (resolveValue: any) => ({
      lean: vi.fn().mockResolvedValue(resolveValue),
      // Add other chainable methods if needed by the service code
      // sort: vi.fn().mockReturnThis(),
      // populate: vi.fn().mockReturnThis(),
    });

    it("should successfully generate quiz questions for valid menu IDs", async () => {
      // Arrange
      const mockTitle = "Menu Quiz 1";
      const mockMenuIds = mockMenuItems.map((item) => item._id.toString());

      // Mock MenuItem.find to return a query object with .lean()
      const mockQuery = createMockLeanQuery(mockMenuItems);
      vi.mocked(MenuItem.find).mockReturnValue(mockQuery as any);

      // Act
      const result = await QuizService.generateQuizQuestions(
        mockTitle,
        mockMenuIds,
        mockRestaurantId
      );

      // Assert
      expect(MenuItem.find).toHaveBeenCalledWith({
        menuId: {
          $in: mockMenuIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
        restaurantId: mockRestaurantId,
      });
      // Verify .lean() was called on the query object returned by find()
      expect(mockQuery.lean).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.title).toEqual(mockTitle);
      expect(result.restaurantId).toEqual(mockRestaurantId);
      // Use the actual mockMenuItems for comparison length
      expect(result.menuItemIds).toHaveLength(mockMenuItems.length);
      expect(result.questions).toBeInstanceOf(Array);
      expect(result.questions.length).toBeGreaterThan(0);
      // Example more specific assertion: Check if the first question relates to the first mock item
      expect(result.questions[0].menuItemId.toString()).toEqual(
        mockMenuItems[0]._id.toString()
      );
      expect(result.questions[0].text).toContain(mockMenuItems[0].name);
    });

    it("should throw an AppError if no menu items are found", async () => {
      // Arrange
      const mockTitle = "Empty Menu Quiz";
      const mockMenuIds = [new mongoose.Types.ObjectId().toString()];

      // Mock MenuItem.find to return a query object with .lean() that resolves empty
      const mockQuery = createMockLeanQuery([]); // Resolves empty array
      vi.mocked(MenuItem.find).mockReturnValue(mockQuery as any);

      // Act & Assert
      await expect(
        QuizService.generateQuizQuestions(
          mockTitle,
          mockMenuIds,
          mockRestaurantId
        )
      ).rejects.toThrow(AppError); // Expect AppError first

      await expect(
        // Then check status code
        QuizService.generateQuizQuestions(
          mockTitle,
          mockMenuIds,
          mockRestaurantId
        )
      ).rejects.toHaveProperty("statusCode", 404);
    });

    it("should throw an error if menuIds array is empty", async () => {
      // Arrange
      const mockTitle = "No Menus Quiz";
      const mockMenuIds: string[] = []; // Empty array

      // Even with empty IDs, find is called. Mock it to return a leanable query resolving empty.
      const mockQuery = createMockLeanQuery([]);
      vi.mocked(MenuItem.find).mockReturnValue(mockQuery as any);

      // Act & Assert
      // Service proceeds with find, gets empty, throws 404, not 400.
      await expect(
        QuizService.generateQuizQuestions(
          mockTitle,
          mockMenuIds,
          mockRestaurantId
        )
      ).rejects.toThrow(AppError);

      // Expect 404 because the service throws 'No menu items found'
      await expect(
        QuizService.generateQuizQuestions(
          mockTitle,
          mockMenuIds,
          mockRestaurantId
        )
      ).rejects.toHaveProperty("statusCode", 404);
    });

    // Add more tests for edge cases:
    // - Invalid menu IDs format
    // - Database errors during MenuItem.find
  });

  // --- Test Suite for createQuiz ---
  describe("createQuiz", () => {
    const mockRestaurantId = new mongoose.Types.ObjectId();
    const mockMenuItemId1 = new mongoose.Types.ObjectId();
    const mockMenuItemId2 = new mongoose.Types.ObjectId();

    it("should successfully create and save a quiz", async () => {
      // Arrange
      const mockQuizData = {
        title: "My New Quiz",
        menuItemIds: [mockMenuItemId1, mockMenuItemId2],
        questions: [
          {
            text: "What is this?",
            choices: ["A", "B", "C", "D"],
            correctAnswer: 0,
            menuItemId: mockMenuItemId1,
          },
          {
            text: "What is that?",
            choices: ["E", "F", "G", "H"],
            correctAnswer: 1,
            menuItemId: mockMenuItemId2,
          },
        ],
        restaurantId: mockRestaurantId,
      };

      // Create the object that the mocked 'save' should resolve with
      const savedQuizData = {
        ...mockQuizData,
        _id: new mongoose.Types.ObjectId(),
        isAssigned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the Quiz constructor to return an object with a mock save method
      const mockSave = vi.fn().mockResolvedValue(savedQuizData);
      vi.mocked(Quiz as any).mockImplementation(() => ({
        ...mockQuizData, // Include initial data
        save: mockSave, // Attach the mock save
        // Add other methods if the service uses them after save (like toObject)
        toObject: vi.fn().mockReturnValue(savedQuizData),
      }));

      // Act
      const result = await QuizService.createQuiz(mockQuizData as any);

      // Assert
      // Check if constructor was called with the initial data
      expect(Quiz).toHaveBeenCalledWith(
        expect.objectContaining({
          title: mockQuizData.title,
          restaurantId: mockQuizData.restaurantId,
          // ... other fields if needed
        })
      );
      // Check if save was called on the instance
      expect(mockSave).toHaveBeenCalled();
      // Check the returned result (should be the object returned by save/toObject)
      expect(result).toBeDefined();
      // Assert against the 'savedQuizData' which mockSave resolved with
      expect(result.title).toEqual(savedQuizData.title);
      expect(result.isAssigned).toBe(savedQuizData.isAssigned);
      expect(result._id).toBe(savedQuizData._id);
    });

    it("should throw validation error if quiz data is invalid", async () => {
      // Arrange
      const invalidQuizData = {
        restaurantId: mockRestaurantId /* Missing required title etc */,
      };
      // Use undefined instead of null for the ValidationError constructor
      const validationError = new mongoose.Error.ValidationError(undefined);
      validationError.errors = {
        title: new mongoose.Error.ValidatorError({
          message: "Title is required",
        }),
      };

      // Mock the constructor to return an object with a save method that rejects
      const mockSaveReject = vi.fn().mockRejectedValue(validationError);
      vi.mocked(Quiz as any).mockImplementation(() => ({
        save: mockSaveReject,
      }));

      // Act & Assert
      // Check that it throws AppError (because the service catches ValidationError)
      await expect(
        QuizService.createQuiz(invalidQuizData as any)
      ).rejects.toThrow(AppError);

      // Also check the specific status code of the AppError
      await expect(
        QuizService.createQuiz(invalidQuizData as any)
      ).rejects.toHaveProperty("statusCode", 400);
    });

    // Add more tests for:
    // - Edge cases in questions data
    // - Database errors during save
  });

  // Add more describe blocks for other QuizService methods:
  // - updateQuiz
  // - deleteQuiz
  // - getAllQuizzesForRestaurant
  // - countQuizzes
  // - getAvailableQuizzesForStaff
  // - getQuizForTaking
});
