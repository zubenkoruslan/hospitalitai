import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import QuizModel, { IQuiz } from "./QuizModel"; // Adjust path as needed
import RestaurantModel, { IRestaurant } from "./Restaurant"; // Assuming Restaurant model exists

let expect: Chai.ExpectStatic;

let mongoServer: MongoMemoryServer;
let testRestaurant: IRestaurant;
let testRestaurantId: Types.ObjectId;

describe("Quiz Model Test", () => {
  before(async () => {
    const chai = await import("chai");
    expect = chai.expect;

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create a dummy restaurant for restaurantId reference
    testRestaurant = await RestaurantModel.create({
      name: "Test Restaurant for Quiz Tests",
      owner: new Types.ObjectId(), // Dummy owner
    });
    testRestaurantId = testRestaurant._id;
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await QuizModel.deleteMany({});
  });

  it("should create a quiz successfully with required fields", async () => {
    const quizData = {
      title: "My First Quiz",
      restaurantId: testRestaurantId,
      numberOfQuestionsPerAttempt: 5,
      totalUniqueQuestionsInSourceSnapshot: 10, // Though default is 0, let's provide it
    };
    const quiz = new QuizModel(quizData);
    const savedQuiz = await quiz.save();
    expect(savedQuiz._id).to.exist;
    expect(savedQuiz.title).to.equal(quizData.title);
    expect(savedQuiz.restaurantId.toString()).to.equal(
      testRestaurantId.toString()
    );
    expect(savedQuiz.numberOfQuestionsPerAttempt).to.equal(
      quizData.numberOfQuestionsPerAttempt
    );
    expect(savedQuiz.totalUniqueQuestionsInSourceSnapshot).to.equal(
      quizData.totalUniqueQuestionsInSourceSnapshot
    );
    expect(savedQuiz.isAvailable).to.be.true; // Default value
    expect(savedQuiz.targetRoles).to.be.an("array").that.is.empty; // Default value
    expect(savedQuiz.createdAt).to.exist;
    expect(savedQuiz.updatedAt).to.exist;
  });

  it("should fail to create a quiz without a title", async () => {
    const quizData = {
      // title: "Missing Title Quiz",
      restaurantId: testRestaurantId,
      numberOfQuestionsPerAttempt: 3,
    };
    const quiz = new QuizModel(quizData);
    let err: any;
    try {
      await quiz.save();
    } catch (error) {
      err = error;
    }
    expect(err).to.be.an.instanceOf(mongoose.Error.ValidationError);
    expect(err.errors.title).to.exist;
  });

  it("should fail to create a quiz without a restaurantId", async () => {
    const quizData = {
      title: "No Restaurant Quiz",
      // restaurantId: testRestaurantId,
      numberOfQuestionsPerAttempt: 2,
    };
    const quiz = new QuizModel(quizData);
    let err: any;
    try {
      await quiz.save();
    } catch (error) {
      err = error;
    }
    expect(err).to.be.an.instanceOf(mongoose.Error.ValidationError);
    expect(err.errors.restaurantId).to.exist;
  });

  it("should fail to create a quiz without numberOfQuestionsPerAttempt", async () => {
    const quizData = {
      title: "No Num Questions Quiz",
      restaurantId: testRestaurantId,
      // numberOfQuestionsPerAttempt: 1,
    };
    const quiz = new QuizModel(quizData);
    let err: any;
    try {
      await quiz.save();
    } catch (error) {
      err = error;
    }
    expect(err).to.be.an.instanceOf(mongoose.Error.ValidationError);
    expect(err.errors.numberOfQuestionsPerAttempt).to.exist;
  });

  it("should fail if numberOfQuestionsPerAttempt is less than 1", async () => {
    const quizData = {
      title: "Zero Questions Quiz",
      restaurantId: testRestaurantId,
      numberOfQuestionsPerAttempt: 0,
    };
    const quiz = new QuizModel(quizData);
    let err: any;
    try {
      await quiz.save();
    } catch (error) {
      err = error;
    }
    expect(err).to.be.an.instanceOf(mongoose.Error.ValidationError);
    expect(err.errors.numberOfQuestionsPerAttempt).to.exist;
    expect(err.errors.numberOfQuestionsPerAttempt.kind).to.equal("min");
  });

  it("should set default for totalUniqueQuestionsInSourceSnapshot if not provided", async () => {
    const quizData = {
      title: "Default Snapshot Quiz",
      restaurantId: testRestaurantId,
      numberOfQuestionsPerAttempt: 3,
    };
    const quiz = new QuizModel(quizData);
    const savedQuiz = await quiz.save();
    expect(savedQuiz.totalUniqueQuestionsInSourceSnapshot).to.equal(0);
  });

  it("should correctly store targetRoles and sourceQuestionBankIds as arrays of ObjectIds", async () => {
    const roleId1 = new Types.ObjectId();
    const roleId2 = new Types.ObjectId();
    const qBankId1 = new Types.ObjectId();

    const quizData = {
      title: "Roles and Banks Quiz",
      restaurantId: testRestaurantId,
      numberOfQuestionsPerAttempt: 2,
      targetRoles: [roleId1, roleId2],
      sourceQuestionBankIds: [qBankId1],
    };
    const quiz = new QuizModel(quizData);
    const savedQuiz = await quiz.save();

    expect(savedQuiz.targetRoles!).to.be.an("array").with.lengthOf(2);
    expect(savedQuiz.targetRoles![0].toString()).to.equal(roleId1.toString());
    expect(savedQuiz.targetRoles![1].toString()).to.equal(roleId2.toString());

    expect(savedQuiz.sourceQuestionBankIds).to.be.an("array").with.lengthOf(1);
    expect(savedQuiz.sourceQuestionBankIds[0].toString()).to.equal(
      qBankId1.toString()
    );
  });

  it("should trim title and description", async () => {
    const quizData = {
      title: "  Spaced Title   ",
      description: "  Spaced Description  ",
      restaurantId: testRestaurantId,
      numberOfQuestionsPerAttempt: 1,
    };
    const quiz = new QuizModel(quizData);
    const savedQuiz = await quiz.save();
    expect(savedQuiz.title).to.equal("Spaced Title");
    expect(savedQuiz.description).to.equal("Spaced Description");
  });
});
