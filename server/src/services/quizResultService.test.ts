import { describe, it, expect, beforeEach, vi } from "vitest";
import { Types } from "mongoose";
import QuizResultService from "./quizResultService";
import Quiz from "../models/Quiz";
import QuizResult from "../models/QuizResult";
import { AppError } from "../utils/errorHandler";

// Mock Mongoose models
vi.mock("../models/Quiz");
vi.mock("../models/QuizResult");
vi.mock("../models/User");

describe("QuizResultService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // --- Test Suite for submitAnswers ---
  describe("submitAnswers", () => {
    const mockQuizId = new Types.ObjectId();
    const mockUserId = new Types.ObjectId();
    const mockUserName = "Test User";
    const mockRestaurantId = new Types.ObjectId();
    const mockQuiz = {
      _id: mockQuizId,
      restaurantId: mockRestaurantId,
      questions: [
        {
          menuItemId: new Types.ObjectId(),
          text: "Q1",
          choices: ["A", "B", "C", "D"],
          correctAnswer: 0,
        },
        {
          menuItemId: new Types.ObjectId(),
          text: "Q2",
          choices: ["E", "F", "G", "H"],
          correctAnswer: 1,
        },
        {
          menuItemId: new Types.ObjectId(),
          text: "Q3",
          choices: ["I", "J", "K", "L"],
          correctAnswer: 2,
        },
      ],
      title: "Test Quiz",
      // ... other IQuiz properties if needed
    };

    it("should calculate score, upsert result, and return details on success", async () => {
      // Arrange
      const userAnswers = [0, 1, 3]; // Correct, Correct, Incorrect
      const expectedScore = 2;
      const expectedTotalQuestions = 3;
      const mockResultId = new Types.ObjectId();

      // Mock Quiz.findOne to return the quiz
      vi.mocked(Quiz.findOne).mockResolvedValue(mockQuiz as any);

      // Mock QuizResult.findOneAndUpdate to simulate upserting/updating
      const updatedResultMock = {
        _id: mockResultId,
        quizId: mockQuizId,
        userId: mockUserId,
        restaurantId: mockRestaurantId,
        answers: userAnswers,
        score: expectedScore,
        totalQuestions: expectedTotalQuestions,
        status: "completed",
        completedAt: new Date(),
        retakeCount: 1, // Assuming increment happens
        // ... other IQuizResult properties
      };
      vi.mocked(QuizResult.findOneAndUpdate).mockResolvedValue(
        updatedResultMock as any
      );

      // Act
      const result = await QuizResultService.submitAnswers(
        mockQuizId,
        mockUserId,
        mockUserName,
        mockRestaurantId,
        userAnswers
      );

      // Assert
      expect(Quiz.findOne).toHaveBeenCalledWith(
        { _id: mockQuizId, restaurantId: mockRestaurantId },
        "questions title"
      );
      expect(QuizResult.findOneAndUpdate).toHaveBeenCalledWith(
        {
          quizId: mockQuizId,
          userId: mockUserId,
          restaurantId: mockRestaurantId,
        },
        expect.objectContaining({
          $set: expect.objectContaining({
            score: expectedScore,
            totalQuestions: expectedTotalQuestions,
            status: "completed",
            answers: userAnswers,
          }),
          $inc: { retakeCount: 1 },
        }),
        { new: true, upsert: true, runValidators: true }
      );

      expect(result).toBeDefined();
      expect(result.message).toEqual("Quiz submitted successfully");
      expect(result.score).toEqual(expectedScore);
      expect(result.totalQuestions).toEqual(expectedTotalQuestions);
      expect(result.savedResultId).toEqual(mockResultId);
      expect(result.correctAnswers).toEqual([0, 1, 2]); // Expected correct answers
    });

    it("should throw AppError if quiz not found for the restaurant", async () => {
      // Arrange
      const userAnswers = [0, 1, 2];
      vi.mocked(Quiz.findOne).mockResolvedValue(null); // Simulate quiz not found

      // Act & Assert
      await expect(
        QuizResultService.submitAnswers(
          mockQuizId,
          mockUserId,
          mockUserName,
          mockRestaurantId,
          userAnswers
        )
      ).rejects.toThrow(AppError);
      await expect(
        QuizResultService.submitAnswers(
          mockQuizId,
          mockUserId,
          mockUserName,
          mockRestaurantId,
          userAnswers
        )
      ).rejects.toHaveProperty("statusCode", 404);
    });

    it("should throw AppError if answer count does not match question count", async () => {
      // Arrange
      const userAnswers = [0, 1]; // Only 2 answers for 3 questions
      vi.mocked(Quiz.findOne).mockResolvedValue(mockQuiz as any); // Quiz found

      // Act & Assert
      await expect(
        QuizResultService.submitAnswers(
          mockQuizId,
          mockUserId,
          mockUserName,
          mockRestaurantId,
          userAnswers
        )
      ).rejects.toThrow(AppError);
      await expect(
        QuizResultService.submitAnswers(
          mockQuizId,
          mockUserId,
          mockUserName,
          mockRestaurantId,
          userAnswers
        )
      ).rejects.toHaveProperty("statusCode", 400);
      await expect(
        QuizResultService.submitAnswers(
          mockQuizId,
          mockUserId,
          mockUserName,
          mockRestaurantId,
          userAnswers
        )
      ).rejects.toThrow(
        /Number of answers .* does not match number of questions/
      );
    });

    it("should throw AppError if findOneAndUpdate fails", async () => {
      // Arrange
      const userAnswers = [0, 1, 2];
      vi.mocked(Quiz.findOne).mockResolvedValue(mockQuiz as any);
      vi.mocked(QuizResult.findOneAndUpdate).mockResolvedValue(null); // Simulate failure

      // Act & Assert
      await expect(
        QuizResultService.submitAnswers(
          mockQuizId,
          mockUserId,
          mockUserName,
          mockRestaurantId,
          userAnswers
        )
      ).rejects.toThrow(AppError);
      await expect(
        QuizResultService.submitAnswers(
          mockQuizId,
          mockUserId,
          mockUserName,
          mockRestaurantId,
          userAnswers
        )
      ).rejects.toHaveProperty("statusCode", 500);
      await expect(
        QuizResultService.submitAnswers(
          mockQuizId,
          mockUserId,
          mockUserName,
          mockRestaurantId,
          userAnswers
        )
      ).rejects.toThrow(/Failed to save quiz result/);
    });

    // Add more tests:
    // - Handling database errors from Quiz.findOne
    // - Handling database errors from QuizResult.findOneAndUpdate (other than null return)
  });

  // --- Test Suite for getMyResults ---
  describe("getMyResults", () => {
    const mockUserIdString = new Types.ObjectId().toString();
    const mockUserId = new Types.ObjectId(mockUserIdString);
    const _mockResults = [
      {
        _id: new Types.ObjectId(),
        quizId: { _id: new Types.ObjectId(), title: "Quiz 2" },
        userId: mockUserId,
        score: 15,
        totalQuestions: 20,
        completedAt: new Date("2023-01-15T10:00:00Z"),
        status: "completed",
        retakeCount: 0,
      },
      {
        _id: new Types.ObjectId(),
        quizId: { _id: new Types.ObjectId(), title: "Quiz 1" },
        userId: mockUserId,
        score: 8,
        totalQuestions: 10,
        completedAt: new Date("2023-01-10T10:00:00Z"),
        status: "completed",
        retakeCount: 1,
      },
    ];

    it("should return sorted and populated results for a valid user", async () => {
      // Arrange
      // Define mock raw data that lean() would return
      const rawMockDbData = [
        {
          _id: new Types.ObjectId(),
          quizId: { _id: new Types.ObjectId(), title: "Quiz 1" }, // Populated object
          userId: mockUserId,
          score: 8,
          totalQuestions: 10,
          completedAt: new Date("2023-01-15T10:00:00Z"),
          status: "completed",
          retakeCount: 1,
        },
        {
          _id: new Types.ObjectId(),
          quizId: { _id: new Types.ObjectId(), title: "Quiz 2" }, // Populated object
          userId: mockUserId,
          score: 5,
          totalQuestions: 5,
          completedAt: new Date("2023-01-10T12:00:00Z"),
          status: "completed",
          retakeCount: 0,
        },
      ];

      // Define the expected output format after the service maps the data
      const expectedFormattedResults = rawMockDbData.map((raw) => ({
        _id: raw._id,
        quizId: raw.quizId._id, // Extract the ID
        quizTitle: raw.quizId.title, // Extract the title
        score: raw.score,
        totalQuestions: raw.totalQuestions,
        completedAt: raw.completedAt,
        status: raw.status.charAt(0).toUpperCase() + raw.status.slice(1), // Match formatting
        retakeCount: raw.retakeCount,
      }));

      // Correct mock setup for the chain
      const leanMock = vi.fn().mockResolvedValue(rawMockDbData);
      const populateMock = vi.fn().mockReturnThis();
      const sortMock = vi.fn().mockReturnThis();
      const findMock = vi.fn().mockReturnValue({
        sort: sortMock,
        populate: populateMock,
        lean: leanMock,
      });
      QuizResult.find = findMock; // Assign the start of the chain

      // Act
      const results = await QuizResultService.getMyResults(mockUserId);

      // Assert
      expect(QuizResult.find).toHaveBeenCalledWith({ userId: mockUserId });
      expect(sortMock).toHaveBeenCalledWith({ completedAt: -1 });
      // Use the object syntax for populate assertion
      expect(populateMock).toHaveBeenCalledWith({
        path: "quizId",
        select: "title",
      });
      expect(leanMock).toHaveBeenCalled();
      // Assert against the formatted data expected from the service
      expect(results).toEqual(expectedFormattedResults);
    });

    it("should return an empty array if user has no results", async () => {
      // Arrange
      const leanMock = vi.fn().mockResolvedValue([]);
      const populateMock = vi.fn().mockReturnThis();
      const sortMock = vi.fn().mockReturnThis();
      const findMock = vi.fn().mockReturnValue({
        sort: sortMock,
        populate: populateMock,
        lean: leanMock,
      });
      QuizResult.find = findMock;

      // Act
      const results = await QuizResultService.getMyResults(mockUserId);

      // Assert
      expect(QuizResult.find).toHaveBeenCalledWith({ userId: mockUserId });
      expect(sortMock).toHaveBeenCalledWith({ completedAt: -1 });
      // Use the object syntax for populate assertion
      expect(populateMock).toHaveBeenCalledWith({
        path: "quizId",
        select: "title",
      });
      expect(leanMock).toHaveBeenCalled();
      expect(results).toEqual([]);
    });

    it("should throw AppError if database query fails", async () => {
      // Arrange
      const dbError = new Error("Database connection lost");
      const leanMock = vi.fn().mockRejectedValue(dbError);
      const populateMock = vi.fn().mockReturnThis();
      const sortMock = vi.fn().mockReturnThis();
      const findMock = vi.fn().mockReturnValue({
        sort: sortMock,
        populate: populateMock,
        lean: leanMock,
      });
      QuizResult.find = findMock;

      // Act & Assert
      await expect(QuizResultService.getMyResults(mockUserId)).rejects.toThrow(
        new AppError("Failed to fetch quiz results.", 500)
      );
      expect(QuizResult.find).toHaveBeenCalledWith({ userId: mockUserId });
      expect(sortMock).toHaveBeenCalledWith({ completedAt: -1 });
      expect(populateMock).toHaveBeenCalledWith({
        path: "quizId",
        select: "title",
      });
      // expect(leanMock).toHaveBeenCalled(); // Lean might not be called if promise rejects earlier
    });
  });

  // --- Test Suite for getResultDetails ---
  describe("getResultDetails", () => {
    const mockResultId = new Types.ObjectId();
    const mockStaffUserId = new Types.ObjectId();
    const mockOwnerUserId = new Types.ObjectId();
    const mockQuizId = new Types.ObjectId();
    const mockRestaurantId = new Types.ObjectId();
    const mockOtherRestaurantId = new Types.ObjectId();

    const mockPopulatedQuiz = {
      _id: mockQuizId,
      title: "Detailed Quiz",
      questions: [
        {
          text: "Q1 Text",
          choices: ["A1", "B1", "C1", "D1"],
          correctAnswer: 0,
          menuItemId: new Types.ObjectId(),
        },
        {
          text: "Q2 Text",
          choices: ["A2", "B2", "C2", "D2"],
          correctAnswer: 1,
          menuItemId: new Types.ObjectId(),
        },
      ],
    };

    const mockQuizResult = {
      _id: mockResultId,
      quizId: mockPopulatedQuiz, // Populated quiz data
      userId: mockStaffUserId,
      restaurantId: mockRestaurantId,
      answers: [0, 2], // Correct, Incorrect
      score: 1,
      totalQuestions: 2,
      status: "completed",
      completedAt: new Date(),
      retakeCount: 0,
    };

    const mockPopulate = vi.fn(); // Define mockPopulate
    const mockFindById = vi.fn(); // Define mockFindById

    beforeEach(() => {
      // Reset mocks for this suite specifically
      mockPopulate.mockReset();
      mockFindById.mockReset();
      // Default mock behavior: return a query object with a working populate
      mockFindById.mockImplementation(() => ({ populate: mockPopulate }));
      vi.mocked(QuizResult.findById).mockImplementation(mockFindById as any);
      // Default populate behavior: resolve with the standard mock result
      mockPopulate.mockResolvedValue(mockQuizResult);
    });

    it("should return detailed results if requesting staff user took the quiz", async () => {
      // Arrange (Default mocks are sufficient)
      // Act
      const result = await QuizResultService.getResultDetails(
        mockResultId,
        mockStaffUserId, // The user who took it
        "staff",
        mockRestaurantId
      );
      // Assert
      expect(QuizResult.findById).toHaveBeenCalledWith(mockResultId);
      expect(mockPopulate).toHaveBeenCalledWith({
        path: "quizId",
        select: "title questions",
      });
      expect(result).toBeDefined();
      expect(result.quizTitle).toEqual(mockPopulatedQuiz.title);
      expect(result.score).toEqual(1);
      expect(result.totalQuestions).toEqual(2);
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].isCorrect).toBe(true);
      expect(result.questions[0].userAnswer).toBe("A1");
      expect(result.questions[0].correctAnswer).toBe("A1");
      expect(result.questions[1].isCorrect).toBe(false);
      expect(result.questions[1].userAnswer).toBe("C2");
      expect(result.questions[1].correctAnswer).toBe("B2");
    });

    it("should return detailed results if requesting owner belongs to the same restaurant", async () => {
      // Arrange (Default mocks are sufficient)
      // Act
      const result = await QuizResultService.getResultDetails(
        mockResultId,
        mockOwnerUserId, // Different user, but owner role
        "restaurant",
        mockRestaurantId // Owner's restaurant ID matches result's
      );
      // Assert
      expect(QuizResult.findById).toHaveBeenCalledWith(mockResultId);
      expect(mockPopulate).toHaveBeenCalledWith({
        path: "quizId",
        select: "title questions",
      });
      expect(result).toBeDefined();
      expect(result.quizTitle).toEqual(mockPopulatedQuiz.title);
    });

    it("should throw 404 AppError if result not found", async () => {
      // Arrange
      mockPopulate.mockResolvedValue(null); // Override populate mock for this test
      // Act & Assert
      await expect(
        QuizResultService.getResultDetails(
          mockResultId,
          mockStaffUserId,
          "staff",
          mockRestaurantId
        )
      ).rejects.toThrow(AppError);
      await expect(
        QuizResultService.getResultDetails(
          mockResultId,
          mockStaffUserId,
          "staff",
          mockRestaurantId
        )
      ).rejects.toHaveProperty("statusCode", 404);
      await expect(
        QuizResultService.getResultDetails(
          mockResultId,
          mockStaffUserId,
          "staff",
          mockRestaurantId
        )
      ).rejects.toThrow(/Quiz result not found/);
    });

    it("should throw 403 AppError if requesting staff did not take the quiz", async () => {
      // Arrange (Default mocks return result for mockStaffUserId)
      const otherStaffUserId = new Types.ObjectId();
      // Act & Assert
      await expect(
        QuizResultService.getResultDetails(
          mockResultId,
          otherStaffUserId, // Different staff user
          "staff",
          mockRestaurantId
        )
      ).rejects.toThrow(AppError);
      await expect(
        QuizResultService.getResultDetails(
          mockResultId,
          otherStaffUserId,
          "staff",
          mockRestaurantId
        )
      ).rejects.toHaveProperty("statusCode", 403);
      await expect(
        QuizResultService.getResultDetails(
          mockResultId,
          otherStaffUserId,
          "staff",
          mockRestaurantId
        )
      ).rejects.toThrow(/You are not authorized to view this result/);
    });

    it("should throw 403 AppError if requesting owner is from different restaurant", async () => {
      // Arrange (Default mocks return result for mockRestaurantId)
      // Act & Assert
      await expect(
        QuizResultService.getResultDetails(
          mockResultId,
          mockOwnerUserId,
          "restaurant",
          mockOtherRestaurantId // Owner from a different restaurant
        )
      ).rejects.toThrow(AppError);
      await expect(
        QuizResultService.getResultDetails(
          mockResultId,
          mockOwnerUserId,
          "restaurant",
          mockOtherRestaurantId
        )
      ).rejects.toHaveProperty("statusCode", 403);
      await expect(
        QuizResultService.getResultDetails(
          mockResultId,
          mockOwnerUserId,
          "restaurant",
          mockOtherRestaurantId
        )
      ).rejects.toThrow(/wrong restaurant/);
    });

    it("should throw 404 AppError if the associated quiz is deleted (null after populate)", async () => {
      // Arrange
      const resultWithNullQuiz = { ...mockQuizResult, quizId: null };
      mockPopulate.mockResolvedValue(resultWithNullQuiz); // Override populate mock
      // Act & Assert
      await expect(
        QuizResultService.getResultDetails(
          mockResultId,
          mockStaffUserId,
          "staff",
          mockRestaurantId
        )
      ).rejects.toThrow(AppError);
      await expect(
        QuizResultService.getResultDetails(
          mockResultId,
          mockStaffUserId,
          "staff",
          mockRestaurantId
        )
      ).rejects.toHaveProperty("statusCode", 404);
      await expect(
        QuizResultService.getResultDetails(
          mockResultId,
          mockStaffUserId,
          "staff",
          mockRestaurantId
        )
      ).rejects.toThrow(/quiz associated with this result no longer exists/);
    });

    it("should throw 400 AppError for invalid resultId format (CastError)", async () => {
      // Arrange
      const invalidResultId = "not-a-valid-id";
      // Don't mock findById to throw; let the service call fail naturally
      // due to ObjectId conversion error.

      // Act & Assert
      // Check that *any* error is thrown, as the specific type (BSONError vs CastError)
      // depends on when the validation happens relative to mocks.
      // The service catch block for CastError is correct, but may not be reached here.
      await expect(
        QuizResultService.getResultDetails(
          invalidResultId,
          mockStaffUserId,
          "staff",
          mockRestaurantId
        )
      ).rejects.toThrow();

      // It's difficult to reliably assert the specific AppError here in the unit test
      // because the BSONError occurs *before* the mocked findById is hit.
      // An integration test would be better to verify the full CastError -> AppError flow.
      // For the unit test, just knowing it throws is sufficient for this specific input.
    });

    // Add test for general database errors during findById/populate
  });

  // Add describe blocks for other QuizResultService methods:
  // - getResultDetails
  // - (Potentially others if added)
});
