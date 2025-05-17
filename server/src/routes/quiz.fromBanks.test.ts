import mongoose, { Types, Document, Types as MongooseTypes } from "mongoose";
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
import QuizModel, { IQuiz } from "../models/QuizModel";
import jwt from "jsonwebtoken";

let expect: Chai.ExpectStatic;
// vi related imports and mocks are commented out for Mocha compatibility attempt

/*
// import { describe, it, beforeAll, afterAll, beforeEach, vi } from "vitest"; // Vitest specific
// Mock pdf-parse 
vi.mock("pdf-parse", () => ({
  default: vi.fn().mockResolvedValue({
    numpages: 0,
    numrender: 0,
    info: null, 
    metadata: null, 
    version: null, 
    text: "", 
  }),
}));
*/

let mongoServer: MongoMemoryServer;
// Use supertest.Agent - this is a common way and might resolve type issues
let request: supertest.Agent;
let restaurantOwner: IUser;
let restaurant: IRestaurant;
let ownerToken: string;

/*
// Mock the auth middleware (Vitest specific)
vi.mock("../middleware/authMiddleware", () => ({
  protect: vi.fn((req, res, next) => {
    req.user = restaurantOwner;
    next();
  }),
  restrictTo: (...roles: string[]) =>
    vi.fn((req, res, next) => {
      if (req.user && roles.includes(req.user.role)) {
        if (req.user.role === "restaurant" && restaurant && restaurant._id) {
          (req.user as IUser).restaurantId = restaurant._id as Types.ObjectId;
        }
        next();
      } else {
        res.status(403).json({ message: "Forbidden" });
      }
    }),
}));
*/

describe("/api/quizzes/from-banks Routes", function () {
  // Use function to access Mocha context
  this.timeout(10000); // Set timeout for the whole suite, can be adjusted

  before(async () => {
    // Changed from beforeAll
    const chaiImport = await import("chai");
    expect = chaiImport.expect;
    // Initialize other Vitest specific things if they were used, or adapt to Sinon/Mocha.

    // Disconnect if already connected by the main app
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions);
    request = supertest.agent(app);

    const ownerData = {
      name: "Test Quiz Owner",
      email: `quiz.owner.${Date.now()}@test.com`,
      password: "password123",
      role: "restaurant" as "restaurant",
    };
    restaurantOwner = await User.create(ownerData);
    if (!restaurantOwner)
      throw new Error("Failed to create restaurant owner for tests");

    const restaurantData = {
      name: "Test Quiz Restaurant",
      owner: restaurantOwner._id as MongooseTypes.ObjectId,
      description: "A place for tasty quizzes",
    };
    restaurant = await Restaurant.create(restaurantData);
    if (!restaurant) throw new Error("Failed to create restaurant for tests");

    if (restaurantOwner && restaurant._id) {
      restaurantOwner.restaurantId = restaurant._id as MongooseTypes.ObjectId;
      await restaurantOwner.save();
    }

    // Align fallback secret with authMiddleware.ts
    const secret = process.env.JWT_SECRET || "your_very_secret_key_change_me";
    if (restaurantOwner?._id && restaurant?._id) {
      // Ensure IDs exist before signing token
      ownerToken = jwt.sign(
        {
          userId: restaurantOwner._id.toString(),
          role: "restaurant",
          name: restaurantOwner.name,
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

  after(async () => {
    // Changed from afterAll
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Question.deleteMany({}); // Use Mongoose model for questions
    await QuestionBank.deleteMany({});
    await QuizModel.deleteMany({});
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
        restaurantId: restaurant._id as MongooseTypes.ObjectId,
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
        restaurantId: restaurant._id as MongooseTypes.ObjectId,
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
        restaurantId: restaurant._id as MongooseTypes.ObjectId,
        createdBy: "manual", // Corrected type
      };
      const q3: IQuestion = (await Question.create(q3Data)) as IQuestion;

      const bank1Data: Partial<IQuestionBank> = {
        name: "Math Bank Easy",
        restaurantId: restaurant._id as MongooseTypes.ObjectId,
        questions: [
          q1._id as MongooseTypes.ObjectId,
          q2._id as MongooseTypes.ObjectId,
        ],
        categories: ["Math", "Easy"],
      };
      const bank1: IQuestionBank = (await QuestionBank.create(
        bank1Data
      )) as IQuestionBank;

      const bank2Data: Partial<IQuestionBank> = {
        name: "Geography Bank",
        restaurantId: restaurant._id as MongooseTypes.ObjectId,
        questions: [q3._id as MongooseTypes.ObjectId],
        categories: ["Geography"],
      };
      const bank2: IQuestionBank = (await QuestionBank.create(
        bank2Data
      )) as IQuestionBank;

      const quizData = {
        title: "Mixed Knowledge Quiz",
        description: "A quiz from Math and Geography banks.",
        questionBankIds: [
          (bank1._id as MongooseTypes.ObjectId).toString(),
          (bank2._id as MongooseTypes.ObjectId).toString(),
        ],
        numberOfQuestionsPerAttempt: 2,
      };

      const res = await request
        .post("/api/quizzes/from-banks")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send(quizData)
        .expect(201);

      const createdQuiz = res.body.quiz as IQuiz;
      expect(createdQuiz).to.exist;
      expect(createdQuiz.title).to.equal(quizData.title);
      expect(createdQuiz.numberOfQuestionsPerAttempt).to.equal(
        quizData.numberOfQuestionsPerAttempt
      );
      expect(createdQuiz.sourceQuestionBankIds).to.have.lengthOf(
        quizData.questionBankIds.length
      );
      // Type for id in map
      const sentBankIds = quizData.questionBankIds.sort();
      const receivedBankIds = createdQuiz.sourceQuestionBankIds
        .map((id: Types.ObjectId | string) => id.toString())
        .sort();
      expect(receivedBankIds).to.deep.equal(sentBankIds);

      // Check totalUniqueQuestionsInSourceSnapshot if it's relevant and populated.
      if (createdQuiz.totalUniqueQuestionsInSourceSnapshot !== undefined) {
        expect(createdQuiz.totalUniqueQuestionsInSourceSnapshot).to.be.a(
          "number"
        );
        // Potentially assert its value if known, e.g., based on q1,q2,q3 unique questions
        // For this test, banks have q1,q2 (bank1) and q3 (bank2). Total unique = 3.
        expect(createdQuiz.totalUniqueQuestionsInSourceSnapshot).to.equal(3);
      }
    });

    it("should return 400 if questionBankIds is empty", async () => {
      const quizData = {
        title: "Empty Bank Quiz",
        questionBankIds: [],
        numberOfQuestionsPerAttempt: 5,
      };

      const res = await request
        .post("/api/quizzes/from-banks")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send(quizData)
        .expect(400);

      expect(res.body.message).to.equal("Validation failed");
      expect(res.body.errors).to.be.an("array").that.is.not.empty;
      expect(res.body.errors[0].msg).to.equal(
        "At least one question bank ID must be provided in the array."
      );
    });

    it("should return 400 if numberOfQuestionsPerAttempt is zero or negative", async () => {
      const bankData: Partial<IQuestionBank> = {
        name: "Test Bank",
        restaurantId: restaurant._id as MongooseTypes.ObjectId,
        questions: [],
      };
      const bank: IQuestionBank = (await QuestionBank.create(
        bankData
      )) as IQuestionBank;

      const quizData = {
        title: "No Questions Quiz",
        questionBankIds: [(bank._id as MongooseTypes.ObjectId).toString()],
        numberOfQuestionsPerAttempt: 0,
      };

      const res = await request
        .post("/api/quizzes/from-banks")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send(quizData)
        .expect(400);

      expect(res.body.message).to.equal("Validation failed");
      expect(res.body.errors).to.be.an("array").that.is.not.empty;
      expect(res.body.errors[0].msg).to.equal(
        "numberOfQuestionsPerAttempt is required and must be a positive integer"
      );
    });

    // Add more tests:
    // - Not enough unique questions available across banks
    // - One or more bank IDs are invalid/not found
    // - Missing required fields (title, restaurantId, numberOfQuestionsPerAttempt)
    // - User not authenticated (no token)
    // - User authenticated but not 'restaurant' role (if restrictTo mock is more nuanced)
    // - Question banks exist but have no questions
  });
});
