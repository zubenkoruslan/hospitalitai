import mongoose, { Types, Document } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import supertest from "supertest";
import app from "../server"; // Express app instance
import User, { IUser } from "../models/User";
import Restaurant, { IRestaurant } from "../models/Restaurant";
import QuestionBank, { IQuestionBank } from "../models/QuestionBankModel";
import Question, {
  IQuestion,
  QuestionType,
  IOption,
} from "../models/QuestionModel"; // Import QuestionType and IOption
import Quiz, { IQuiz } from "../models/Quiz";
import { expect } from "chai";
import { describe, it, beforeAll, afterAll, beforeEach, vi } from "vitest";
import jwt from "jsonwebtoken";

// Mock pdf-parse to prevent file access errors during tests unrelated to PDF parsing
vi.mock("pdf-parse", () => ({
  default: vi.fn().mockResolvedValue({
    numpages: 0,
    numrender: 0,
    info: null, // Using null as per typical structure if no info
    metadata: null, // Using null for metadata
    version: null, // Using null for version
    text: "", // Empty text string
  }),
}));

let mongoServer: MongoMemoryServer;
// Use supertest.Agent - this is a common way and might resolve type issues
let request: supertest.Agent;
let restaurantOwner: IUser;
let restaurant: IRestaurant;
let ownerToken: string;

// Mock the auth middleware
vi.mock("../middleware/authMiddleware", () => ({
  protect: vi.fn((req, res, next) => {
    // Simulate token verification and user attachment
    // For tests, assume restaurantOwner is the authenticated user
    req.user = restaurantOwner;
    next();
  }),
  restrictTo: (...roles: string[]) =>
    vi.fn((req, res, next) => {
      if (req.user && roles.includes(req.user.role)) {
        // Attach restaurantId to req.user if it's a restaurant owner, as controller expects it
        if (req.user.role === "restaurant" && restaurant && restaurant._id) {
          (req.user as IUser).restaurantId = restaurant._id as Types.ObjectId;
        }
        next();
      } else {
        res.status(403).json({ message: "Forbidden" });
      }
    }),
}));

describe("/api/quizzes/from-banks Routes", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    request = supertest.agent(app); // Use supertest.agent()

    const ownerData = {
      name: "Test Quiz Owner",
      email: `quiz.owner.${Date.now()}@test.com`,
      password: "password123",
      role: "restaurant" as "restaurant",
    };
    const createdOwner: IUser = await User.create(ownerData);
    if (!createdOwner)
      throw new Error("Failed to create restaurant owner for tests");
    restaurantOwner = createdOwner;

    const restaurantData = {
      name: "Test Quiz Restaurant",
      owner: createdOwner._id as Types.ObjectId,
      description: "A place for tasty quizzes",
    };
    const createdRestaurant: IRestaurant = await Restaurant.create(
      restaurantData
    );
    if (!createdRestaurant)
      throw new Error("Failed to create restaurant for tests");
    restaurant = createdRestaurant;

    if (restaurantOwner && createdRestaurant._id) {
      // Ensure restaurantOwner and restaurant._id exist
      restaurantOwner.restaurantId = createdRestaurant._id as Types.ObjectId;
      await restaurantOwner.save();
    }

    const secret = process.env.JWT_SECRET || "test-secret-for-quiz-routes";
    if (restaurantOwner?._id && restaurant?._id) {
      // Ensure IDs exist before signing token
      ownerToken = jwt.sign(
        {
          id: restaurantOwner._id.toString(),
          role: "restaurant",
          restaurantId: restaurant._id.toString(),
        },
        secret,
        { expiresIn: "1h" }
      );
    } else {
      throw new Error(
        "Cannot create token, owner or restaurant ID missing after setup."
      );
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Question.deleteMany({});
    await QuestionBank.deleteMany({});
    await Quiz.deleteMany({});
  });

  describe("POST /api/quizzes/from-banks", () => {
    it("should successfully generate a quiz from selected question banks", async () => {
      // Define options explicitly to satisfy IOption structure (text, isCorrect)
      // Mongoose will auto-generate _id for subdocuments
      const q1Options: Omit<IOption, "_id" | keyof Document>[] = [
        { text: "2", isCorrect: true },
        { text: "3", isCorrect: false },
      ];
      const q1Data: Partial<IQuestion> = {
        questionText: "What is 1+1?",
        questionType: "multiple-choice-single" as QuestionType, // Corrected type
        options: q1Options as Types.Array<IOption>, // Provide valid options
        categories: ["Math", "Easy"],
        restaurantId: restaurant._id as Types.ObjectId,
        createdBy: "manual", // Corrected type
      };
      const q1: IQuestion = (await Question.create(q1Data)) as IQuestion;

      const q2Options: Omit<IOption, "_id" | keyof Document>[] = [
        { text: "4", isCorrect: true },
        { text: "5", isCorrect: false },
      ];
      const q2Data: Partial<IQuestion> = {
        questionText: "What is 2+2?",
        questionType: "multiple-choice-single" as QuestionType, // Corrected type
        options: q2Options as Types.Array<IOption>,
        categories: ["Math", "Easy"],
        restaurantId: restaurant._id as Types.ObjectId,
        createdBy: "manual", // Corrected type
      };
      const q2: IQuestion = (await Question.create(q2Data)) as IQuestion;

      const q3Options: Omit<IOption, "_id" | keyof Document>[] = [
        { text: "Paris", isCorrect: true },
        { text: "London", isCorrect: false },
      ];
      const q3Data: Partial<IQuestion> = {
        questionText: "Capital of France?",
        questionType: "multiple-choice-single" as QuestionType, // Corrected type
        options: q3Options as Types.Array<IOption>,
        categories: ["Geography"],
        restaurantId: restaurant._id as Types.ObjectId,
        createdBy: "manual", // Corrected type
      };
      const q3: IQuestion = (await Question.create(q3Data)) as IQuestion;

      const bank1Data: Partial<IQuestionBank> = {
        name: "Math Bank Easy",
        restaurantId: restaurant._id as Types.ObjectId,
        questions: [q1._id as Types.ObjectId, q2._id as Types.ObjectId],
        categories: ["Math", "Easy"],
      };
      const bank1: IQuestionBank = (await QuestionBank.create(
        bank1Data
      )) as IQuestionBank;

      const bank2Data: Partial<IQuestionBank> = {
        name: "Geography Bank",
        restaurantId: restaurant._id as Types.ObjectId,
        questions: [q3._id as Types.ObjectId],
        categories: ["Geography"],
      };
      const bank2: IQuestionBank = (await QuestionBank.create(
        bank2Data
      )) as IQuestionBank;

      const quizData = {
        title: "Mixed Knowledge Quiz",
        description: "A quiz from Math and Geography banks.",
        questionBankIds: [
          (bank1._id as Types.ObjectId).toString(),
          (bank2._id as Types.ObjectId).toString(),
        ],
        numberOfQuestions: 3,
      };

      const res = await request
        .post("/api/quiz/from-banks")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send(quizData)
        .expect(201);

      expect(res.body.data).to.exist;
      const createdQuiz = res.body.data as IQuiz;
      expect(createdQuiz.title).to.equal(quizData.title);
      expect((createdQuiz.restaurantId as Types.ObjectId).toString()).to.equal(
        (restaurant._id as Types.ObjectId).toString()
      );
      expect(
        createdQuiz.sourceQuestionBankIds.map((id) =>
          (id as Types.ObjectId).toString()
        )
      ).to.deep.include.members(quizData.questionBankIds);
      expect(createdQuiz.questions.length).to.equal(quizData.numberOfQuestions);
      expect(createdQuiz.numberOfQuestions).to.equal(
        quizData.numberOfQuestions
      );

      const questionIdsInQuiz = createdQuiz.questions
        .map((q) =>
          (q as any)._id
            ? ((q as any)._id as Types.ObjectId).toString()
            : undefined
        )
        .filter(Boolean) as string[];
      const sourceQuestionIds = [
        (q1._id as Types.ObjectId).toString(),
        (q2._id as Types.ObjectId).toString(),
        (q3._id as Types.ObjectId).toString(),
      ];
      questionIdsInQuiz.forEach((id) =>
        expect(sourceQuestionIds).to.include(id)
      );
      expect(new Set(questionIdsInQuiz).size).to.equal(
        questionIdsInQuiz.length
      );
    });

    it("should return 400 if questionBankIds is empty", async () => {
      const quizData = {
        title: "Empty Bank Quiz",
        questionBankIds: [],
        numberOfQuestions: 5,
      };

      const res = await request
        .post("/api/quiz/from-banks")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send(quizData)
        .expect(400);

      expect(res.body.message).to.equal(
        "questionBankIds must be a non-empty array of strings."
      );
    });

    it("should return 400 if numberOfQuestions is zero or negative", async () => {
      const bankData: Partial<IQuestionBank> = {
        name: "Test Bank",
        restaurantId: restaurant._id as Types.ObjectId,
        questions: [],
      };
      const bank: IQuestionBank = (await QuestionBank.create(
        bankData
      )) as IQuestionBank;

      const quizData = {
        title: "No Questions Quiz",
        questionBankIds: [(bank._id as Types.ObjectId).toString()],
        numberOfQuestions: 0,
      };

      const res = await request
        .post("/api/quiz/from-banks")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send(quizData)
        .expect(400);

      expect(res.body.message).to.equal(
        "numberOfQuestions must be a positive number."
      );
    });

    // Add more tests:
    // - Not enough unique questions available across banks
    // - One or more bank IDs are invalid/not found
    // - Missing required fields (title, restaurantId, numberOfQuestions)
    // - User not authenticated (no token)
    // - User authenticated but not 'restaurant' role (if restrictTo mock is more nuanced)
    // - Question banks exist but have no questions
  });
});
