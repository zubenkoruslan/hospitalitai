import chai from "chai";
import sinon from "sinon";
import AiQuestionService from "./AiQuestionService";
import MenuModel from "../models/MenuModel"; // Mock needed
import MenuItemModel from "../models/MenuItemModel"; // Mock needed
import mongoose from "mongoose";

const expect = chai.expect;

describe("AiQuestionService", () => {
  describe("generateRawQuestionsFromMenuContent", () => {
    let menuFindByIdStub: sinon.SinonStub;
    // let menuItemFindStub: sinon.SinonStub; // For when we mock MenuItemModel.find

    beforeEach(() => {
      // Stub MenuModel.findById to return a mock menu
      menuFindByIdStub = sinon.stub(MenuModel, "findById").returns({
        lean: sinon.stub().resolves({
          _id: new mongoose.Types.ObjectId().toHexString(),
          name: "Test Menu",
          // other menu properties...
        }),
      } as any);

      // Placeholder for MenuItemModel.find stub when it's actively used
      // menuItemFindStub = sinon.stub(MenuItemModel, 'find').returns({
      //   lean: sinon.stub().resolves([
      //     // mock menu items...
      //   ])
      // } as any);
    });

    afterEach(() => {
      sinon.restore(); // Restore all stubs
    });

    it("should return an array of raw questions when given valid parameters", async () => {
      const params = {
        menuId: new mongoose.Types.ObjectId().toHexString(),
        categories: ["Appetizers", "Main Courses"],
        questionFocusAreas: ["Ingredients", "Description"],
        targetQuestionCount: 4,
        questionTypes: ["multiple-choice-single", "true-false"],
        difficulty: "medium",
        restaurantId: new mongoose.Types.ObjectId().toHexString(),
      };
      const result =
        await AiQuestionService.generateRawQuestionsFromMenuContent(params);
      expect(result).to.be.an("array");
      expect(result.length).to.be.at.most(params.targetQuestionCount);
      // Further checks on question structure, content based on mock AI response in service
      if (result.length > 0) {
        result.forEach((q) => {
          expect(q).to.have.property("questionText");
          expect(q).to.have.property("questionType");
          expect(q).to.have.property("options").that.is.an("array");
          expect(q).to.have.property("category");
          expect(q).to.have.property("difficulty");
        });
      }
    });

    it("should return an empty array if targetQuestionCount is 0", async () => {
      const params = {
        menuId: new mongoose.Types.ObjectId().toHexString(),
        categories: ["Appetizers"],
        questionFocusAreas: ["Ingredients"],
        targetQuestionCount: 0,
        questionTypes: ["multiple-choice-single"],
        difficulty: "easy",
        restaurantId: new mongoose.Types.ObjectId().toHexString(),
      };
      const result =
        await AiQuestionService.generateRawQuestionsFromMenuContent(params);
      expect(result).to.be.an("array").that.is.empty;
    });

    it("should return an empty array if no categories are provided", async () => {
      const params = {
        menuId: new mongoose.Types.ObjectId().toHexString(),
        categories: [],
        questionFocusAreas: ["Ingredients"],
        targetQuestionCount: 5,
        questionTypes: ["multiple-choice-single"],
        difficulty: "easy",
        restaurantId: new mongoose.Types.ObjectId().toHexString(),
      };
      const result =
        await AiQuestionService.generateRawQuestionsFromMenuContent(params);
      expect(result).to.be.an("array").that.is.empty;
    });

    it("should throw an error if MenuModel.findById returns null (menu not found)", async () => {
      menuFindByIdStub.returns({ lean: sinon.stub().resolves(null) } as any); // Override stub for this test
      const params = {
        menuId: "invalidMenuId",
        categories: ["Appetizers"],
        questionFocusAreas: ["Ingredients"],
        targetQuestionCount: 1,
        questionTypes: ["multiple-choice-single"],
        difficulty: "easy",
        restaurantId: new mongoose.Types.ObjectId().toHexString(),
      };
      try {
        await AiQuestionService.generateRawQuestionsFromMenuContent(params);
        expect.fail(
          "Expected generateRawQuestionsFromMenuContent to throw an error"
        );
      } catch (error: any) {
        expect(error.message).to.equal(
          `Menu with ID ${params.menuId} not found.`
        );
      }
    });

    // TODO: Add more tests:
    // - Correct distribution of questions (might need to inspect console.log or mock LLM more granularly)
    // - Correct promptPayload construction (verify the content passed to the mocked LLM)
    // - Handling of empty menuItemsInCategory (should skip and continue)
    // - Error handling for AI response parsing (JSON.parse failure)
  });

  // describe('saveGeneratedQuestionsAsPendingReview', () => { ... });
});
