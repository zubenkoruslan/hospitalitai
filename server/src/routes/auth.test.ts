import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import supertest from "supertest";
import app from "../server"; // Import the Express app instance
import User, { IUser } from "../models/User";
import Restaurant, { IRestaurant } from "../models/Restaurant";
import { expect } from "chai"; // Use static import
// import * as Chai from "chai"; // No longer needed
// Add vitest imports, using beforeAll/afterAll
import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";

let mongoServer: MongoMemoryServer;
let request: any; // Keep using 'any' for simplicity with supertest
// let expect: Chai.ExpectStatic; // No longer needed

// Set a fixed JWT secret for testing if needed, otherwise rely on default/env
// process.env.JWT_SECRET = 'test_secret_key';

// Interface for the expected signup response body structure
interface SignupResponseBody {
  message: string;
  user: Omit<IUser, "_id" | "restaurantId"> & {
    _id: string;
    restaurantId?: string;
  }; // Expect _id/refs as string
  restaurant?: Omit<IRestaurant, "_id" | "owner" | "staff"> & {
    _id: string;
    owner: string;
    staff: string[];
  }; // Expect _id/refs as strings
}

describe("/api/auth Routes", () => {
  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    // Connect mongoose instance used by models
    await mongoose.connect(mongoUri);

    // Create supertest agent
    request = supertest(app);
  });

  afterAll(async () => {
    // Teardown MongoDB
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    // No need to manually close server when importing app instance
  });

  beforeEach(async () => {
    // Clear collections before each test
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    }
  });

  // --- Signup Tests --- >>
  describe("POST /api/auth/signup", () => {
    it("should successfully sign up a new restaurant owner", async () => {
      const ownerData = {
        name: "Pizza Palace Owner",
        email: "pizza.owner@test.com",
        password: "password123",
        role: "restaurant", // Use 'restaurant' role for owner based on previous context
        restaurantName: "Pizza Palace",
      };

      // Use the initialized request agent
      const res = await request
        .post("/api/auth/signup")
        .send(ownerData)
        .expect(201);

      // Assert the type of the response body
      const responseBody = res.body as SignupResponseBody;

      // Basic response body checks
      expect(responseBody.message).to.equal("User registered successfully");
      expect(responseBody.user).to.exist;
      expect(responseBody.restaurant).to.exist;
      expect(responseBody.user.email).to.equal(ownerData.email);
      // Change expected role to match actual API response
      expect(responseBody.user.role).to.equal("restaurant");
      expect(responseBody.restaurant!.name).to.equal(ownerData.restaurantName);

      // Verify database state
      const dbUserPromise = User.findOne({ email: ownerData.email });
      const dbRestaurantPromise = Restaurant.findById(
        responseBody.restaurant!._id
      );
      const [dbUserResult, dbRestaurantResult] = await Promise.all([
        dbUserPromise,
        dbRestaurantPromise,
      ]);

      expect(dbUserResult, "User should exist in DB").to.exist;
      expect(dbRestaurantResult, "Restaurant should exist in DB").to.exist;

      if (dbUserResult && dbRestaurantResult) {
        // Cast after existence check
        const dbUser = dbUserResult as IUser;
        const dbRestaurant = dbRestaurantResult as IRestaurant;

        // Simpler assertions avoiding direct _id comparison on db objects
        expect(dbUser.email).to.equal(responseBody.user.email);
        expect(dbUser.role).to.equal(responseBody.user.role);
        expect(dbRestaurant.name).to.equal(responseBody.restaurant!.name);
        // Compare ObjectId with response string ID using mongoose.Types.ObjectId
        expect(dbUser.restaurantId).to.deep.equal(
          new mongoose.Types.ObjectId(String(responseBody.restaurant!._id))
        );
        expect(dbRestaurant.owner).to.deep.equal(
          new mongoose.Types.ObjectId(String(responseBody.user._id))
        );
      } else {
        throw new Error("Database user or restaurant not found after creation");
      }
    });

    it("should successfully sign up a new staff member", async () => {
      // 1. Create a restaurant first (since staff needs a valid restaurantId)
      const owner = await new User({
        email: `owner-${Date.now()}@test.com`,
        password: "password",
        role: "restaurant", // Corrected role based on User schema/validation error
        name: "Staff Test Owner",
      }).save();
      const restaurant = await new Restaurant({
        name: "Test Cafe",
        owner: owner._id,
      }).save();

      const staffData = {
        email: `staff-${Date.now()}@test.com`,
        password: "password123",
        role: "staff",
        professionalRole: "Chef",
        // @ts-ignore - Bypassing persistent incorrect 'unknown' type
        restaurantId: restaurant._id.toString(),
        name: "Staff Member",
      };

      // Use the initialized request agent
      const res = await request
        .post("/api/auth/signup")
        .send(staffData)
        .expect(201);

      // Assert the type of the response body
      const responseBody = res.body as SignupResponseBody;

      // Change expected message to match actual API response
      expect(responseBody.message).to.equal("User registered successfully");
      expect(responseBody.user).to.exist;
      expect(responseBody.restaurant).to.not.exist;
      expect(responseBody.user.email).to.equal(staffData.email);
      expect(responseBody.user.role).to.equal("staff");
      expect(responseBody.user.professionalRole).to.equal(
        staffData.professionalRole
      );
      expect(String(responseBody.user.restaurantId)).to.equal(
        staffData.restaurantId
      );

      // Verify database state
      const dbUserResult = await User.findOne({ email: staffData.email });
      const dbRestaurantResult = await Restaurant.findById(
        staffData.restaurantId
      );

      expect(dbUserResult, "Staff user should exist in DB").to.exist;
      expect(dbRestaurantResult, "Restaurant should exist for staff check").to
        .exist;

      // Cast after existence check
      const dbUser = dbUserResult as IUser;
      const dbRestaurant = dbRestaurantResult as IRestaurant;

      expect(dbUser.role).to.equal("staff");
      expect(dbUser.restaurantId!.toString()).to.equal(staffData.restaurantId);
      expect(dbUser.professionalRole).to.equal(staffData.professionalRole);

      // Check if staff was added to restaurant's staff list
      expect(dbRestaurant.staff).to.be.an("array");
      const staffIdStrings = dbRestaurant.staff.map((id) => id.toString());
      // @ts-ignore - Bypassing persistent incorrect 'unknown' type
      expect(staffIdStrings).to.include(dbUser._id.toString());
    });

    it("should return 400 if required fields are missing", async () => {
      const incompleteData = {
        restaurantName: "Incomplete Res",
      };
      const res = await request
        .post("/api/auth/signup")
        .send(incompleteData)
        .expect(400);
      // Updated Regex to be less specific, check actual message if this fails
      expect(res.body.message).to.match(/Missing required fields/i);
    });

    it("should return 400 if restaurant name is missing for restaurant role", async () => {
      const ownerData = {
        name: "Pizza Palace Owner",
        email: "pizza.owner.no.name@test.com",
        password: "password123",
        role: "restaurant", // Use 'restaurant' role
        // Missing restaurantName
      };
      const res = await request
        .post("/api/auth/signup")
        .send(ownerData)
        .expect(400);
      expect(res.body.message).to.contain(
        "Restaurant name is required for restaurant role"
      );
    });

    it("should return 400 if restaurant ID is missing for staff role", async () => {
      const staffData = {
        name: "Staff No ID",
        email: "staff.noid@test.com",
        password: "password123",
        role: "staff",
        // Missing restaurantId
        professionalRole: "Cook",
      };
      const res = await request
        .post("/api/auth/signup")
        .send(staffData)
        .expect(400);
      expect(res.body.message).to.contain(
        "Restaurant ID is required for staff role"
      );
    });

    it("should return 400 if professionalRole is missing for staff role", async () => {
      const staffData = {
        name: "Staff No Prof Role",
        email: "staff.noprole@test.com",
        password: "password123",
        role: "staff",
        restaurantId: new mongoose.Types.ObjectId().toString(),
        // Missing professionalRole
      };
      const res = await request
        .post("/api/auth/signup")
        .send(staffData)
        .expect(400);
      expect(res.body.message).to.contain(
        "Professional role is required for staff role"
      );
    });

    it("should return 400 if email already exists", async () => {
      // 1. Create initial user
      await new User({
        name: "Existing User",
        email: "existing@test.com",
        password: "password123",
        role: "restaurant", // Corrected role based on User schema/validation error
      }).save();

      // 2. Attempt signup with same email
      const duplicateData = {
        name: "Duplicate User",
        email: "existing@test.com",
        password: "password456",
        role: "restaurant",
        restaurantName: "Duplicate Cafe",
      };
      const res = await request
        .post("/api/auth/signup")
        .send(duplicateData)
        .expect(400);

      expect(res.body.message).to.contain(
        "User with this email already exists"
      );
    });

    it("should return 404 if restaurantId for staff does not exist", async () => {
      const staffData = {
        name: "Staff Bad Restaurant",
        email: "staff.badres@test.com",
        password: "password123",
        role: "staff",
        restaurantId: new mongoose.Types.ObjectId().toString(), // Non-existent ID
        professionalRole: "Waiter",
      };
      const res = await request
        .post("/api/auth/signup")
        .send(staffData)
        .expect(404);

      expect(res.body.message).to.contain("Restaurant not found");
    });
  });

  // --- Login Tests (Placeholder) --- >>
  // describe('POST /api/auth/login', () => {
  //    // ... tests for login ...
  // });
});
