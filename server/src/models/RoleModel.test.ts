import mongoose, { ConnectOptions, Types as MongooseTypes } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import RoleModel, { IRole } from "./RoleModel"; // Adjust path if RoleModel is elsewhere
import RestaurantModel, { IRestaurant } from "./Restaurant"; // Corrected import path and model name

let expect: Chai.ExpectStatic;

describe("Role Model Unit Tests", () => {
  let mongoServer: MongoMemoryServer;
  let restaurant: IRestaurant;

  before(async () => {
    const chaiImport = await import("chai");
    expect = chaiImport.expect;

    // Disconnect if already connected by the main app
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as ConnectOptions);

    // Ensure indexes are built for RoleModel
    await RoleModel.syncIndexes();

    // Create a dummy restaurant for testing role's restaurantId
    restaurant = new RestaurantModel({
      _id: new MongooseTypes.ObjectId(),
      name: "Test Restaurant for Roles",
      owner: new MongooseTypes.ObjectId(),
      // Add other required fields for RestaurantModel if any
    });
    await restaurant.save();
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clean up database after each test
    await RoleModel.deleteMany({});
    // Consider if RestaurantModel needs cleanup if not done globally or if it impacts tests
  });

  describe("Creating a Role", () => {
    it("should create a new role successfully with valid data", async () => {
      const roleData: Partial<IRole> = {
        name: "Manager",
        description: "Manages restaurant operations",
        restaurantId: restaurant._id,
      };
      const role = new RoleModel(roleData);
      const savedRole = await role.save();

      expect(savedRole._id).to.exist;
      expect(savedRole.name).to.equal(roleData.name);
      expect(savedRole.description).to.equal(roleData.description);
      expect(savedRole.restaurantId.toString()).to.equal(
        restaurant._id.toString()
      );
      expect(savedRole.createdAt).to.exist;
      expect(savedRole.updatedAt).to.exist;
    });

    it("should fail to create a role without a name", async () => {
      const roleData: Partial<IRole> = {
        description: "A role without a name",
        restaurantId: restaurant._id,
      };
      const role = new RoleModel(roleData);
      try {
        await role.save();
        // Should not reach here
        expect.fail("Role saved without a name, but it should have failed.");
      } catch (error: any) {
        expect(error).to.be.instanceOf(mongoose.Error.ValidationError);
        expect(error.errors.name).to.exist;
        expect(error.errors.name.kind).to.equal("required");
      }
    });

    it("should fail to create a role without a restaurantId", async () => {
      const roleData: Partial<IRole> = {
        name: "Waiter",
        description: "Serves customers",
      };
      const role = new RoleModel(roleData);
      try {
        await role.save();
        expect.fail(
          "Role saved without a restaurantId, but it should have failed."
        );
      } catch (error: any) {
        expect(error).to.be.instanceOf(mongoose.Error.ValidationError);
        expect(error.errors.restaurantId).to.exist;
        expect(error.errors.restaurantId.kind).to.equal("required");
      }
    });
  });

  describe("Schema Validation", () => {
    it("should have timestamps (createdAt, updatedAt) by default", async () => {
      const role = new RoleModel({
        name: "Cashier",
        restaurantId: restaurant._id,
      });
      const savedRole = await role.save();
      expect(savedRole.createdAt).to.be.a("date");
      expect(savedRole.updatedAt).to.be.a("date");
    });

    // Test for uniqueness of name per restaurantId
    // The schema defines `name: { type: String, required: true, unique: true, trim: true }`
    // This `unique: true` applies globally. A compound index `(name, restaurantId)` is needed for per-restaurant uniqueness.
    // Mongoose `unique` option alone doesn't fully handle compound uniqueness validation before save without a DB index error.
    // This test will check for duplicate names if the DB enforces it or Mongoose catches it due to an index.
    it("should fail to create a role with a duplicate name for the same restaurant", async () => {
      const roleData1: Partial<IRole> = {
        name: "UniqueRoleName",
        restaurantId: restaurant._id,
      };
      await new RoleModel(roleData1).save();

      const roleData2: Partial<IRole> = {
        name: "UniqueRoleName", // Same name
        restaurantId: restaurant._id, // Same restaurant
      };
      const duplicateRole = new RoleModel(roleData2);
      try {
        await duplicateRole.save();
        // If it saves, the compound uniqueness might not be strictly enforced by Mongoose validation alone or index isn't hit yet
        // Or, the unique constraint is only on 'name' field without considering restaurantId at Mongoose level (which is likely the case based on typical simple unique:true)
        // We expect a MongoDB E11000 duplicate key error if the index (name, restaurantId) exists and is unique.
        // Mongoose's built-in unique validator is more for single fields and not compound uniqueness before hitting the DB.
        expect.fail(
          "Duplicate role name for the same restaurant was saved, but should have failed."
        );
      } catch (error: any) {
        // For MongoDB duplicate key error
        expect(error.code).to.equal(11000);
        // Or if Mongoose validation catches it (less likely for compound without explicit pre-save hook)
        // expect(error).to.be.instanceOf(mongoose.Error.ValidationError);
      }
    });

    it("should allow creating roles with the same name for different restaurants", async () => {
      // Create another dummy restaurant
      const anotherRestaurant = new RestaurantModel({
        _id: new MongooseTypes.ObjectId(),
        name: "Another Test Restaurant",
        owner: new MongooseTypes.ObjectId(),
      });
      await anotherRestaurant.save();

      const roleData1: Partial<IRole> = {
        name: "CommonRoleName",
        restaurantId: restaurant._id,
      };
      await new RoleModel(roleData1).save();

      const roleData2: Partial<IRole> = {
        name: "CommonRoleName", // Same name
        restaurantId: anotherRestaurant._id, // Different restaurant
      };
      const roleForOtherRestaurant = new RoleModel(roleData2);

      // This should save without error
      const savedRole2 = await roleForOtherRestaurant.save();
      expect(savedRole2._id).to.exist;
      expect(savedRole2.name).to.equal(roleData2.name);
      expect(savedRole2.restaurantId.toString()).to.equal(
        anotherRestaurant._id.toString()
      );

      // Clean up the other restaurant if necessary or do it in afterEach/All
      await RestaurantModel.findByIdAndDelete(anotherRestaurant._id);
    });

    it("should trim the name field", async () => {
      const roleData: Partial<IRole> = {
        name: "  Spaced Role   ",
        restaurantId: restaurant._id,
      };
      const role = new RoleModel(roleData);
      const savedRole = await role.save();
      expect(savedRole.name).to.equal("Spaced Role");
    });
  });
});
