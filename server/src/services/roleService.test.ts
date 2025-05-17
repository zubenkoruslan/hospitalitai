import mongoose, { ConnectOptions, Types as MongooseTypes } from "mongoose"; // Renamed Types
import { MongoMemoryServer } from "mongodb-memory-server";
import sinon from "sinon";

import {
  RoleService,
  CreateRoleData,
  UpdateRoleData,
} from "../services/roleService";
import RoleModel, { IRole } from "../models/RoleModel";
import RestaurantModel, { IRestaurant } from "../models/Restaurant";
import { AppError } from "../utils/errorHandler";

let expect: Chai.ExpectStatic;
// chaiAsPromised will be applied in before hook

describe("Role Service Unit Tests", () => {
  let mongoServer: MongoMemoryServer;
  let restaurant: IRestaurant;
  let restaurant2: IRestaurant;

  before(async () => {
    const chaiImport = await import("chai");
    const chaiAsPromisedImport = await import("chai-as-promised");
    expect = chaiImport.expect;
    chaiImport.use(chaiAsPromisedImport.default);

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as ConnectOptions);

    // Ensure indexes are built for RoleModel
    await RoleModel.syncIndexes();

    restaurant = new RestaurantModel({
      _id: new MongooseTypes.ObjectId(),
      name: "Test Restaurant One",
      owner: new MongooseTypes.ObjectId(),
    });
    await restaurant.save();

    restaurant2 = new RestaurantModel({
      _id: new MongooseTypes.ObjectId(),
      name: "Test Restaurant Two",
      owner: new MongooseTypes.ObjectId(),
    });
    await restaurant2.save();
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    sinon.restore();
    await RoleModel.deleteMany({});
  });

  describe("createRole", () => {
    it("should create and return a new role", async () => {
      const roleData: CreateRoleData = {
        name: "Supervisor",
        description: "Supervises staff",
        restaurantId: restaurant._id,
      };
      const createdRole = await RoleService.createRole(roleData);
      expect(createdRole).to.exist;
      expect(createdRole.name).to.equal(roleData.name);
      expect(createdRole.description).to.equal(roleData.description);
      expect(createdRole.restaurantId.toString()).to.equal(
        restaurant._id.toString()
      );
      expect(createdRole._id).to.exist;
    });

    it("should throw AppError if role name already exists for the restaurant (via DB index)", async () => {
      const roleData: CreateRoleData = {
        name: "Clerk",
        restaurantId: restaurant._id,
      };
      await RoleService.createRole(roleData);
      await expect(RoleService.createRole(roleData)).to.be.rejectedWith(
        AppError,
        `A role with name "${roleData.name}" already exists for this restaurant.`
      );
    });
  });

  describe("getRolesByRestaurant", () => {
    it("should return an array of roles for a given restaurantId", async () => {
      await RoleService.createRole({
        name: "Chef",
        restaurantId: restaurant._id,
      });
      await RoleService.createRole({
        name: "Sommelier",
        restaurantId: restaurant._id,
      });
      await RoleService.createRole({
        name: "Manager",
        restaurantId: restaurant2._id,
      });

      const roles = await RoleService.getRolesByRestaurant(restaurant._id);
      expect(roles).to.be.an("array").with.lengthOf(2);
      expect(roles.some((r: IRole) => r.name === "Chef")).to.be.true;
      expect(roles.some((r: IRole) => r.name === "Sommelier")).to.be.true;
    });

    it("should return an empty array if no roles exist for the restaurant", async () => {
      const roles = await RoleService.getRolesByRestaurant(restaurant._id);
      expect(roles).to.be.an("array").that.is.empty;
    });
  });

  describe("getRoleById", () => {
    it("should return a role if found by ID and restaurantId", async () => {
      const newRole = await RoleService.createRole({
        name: "Host",
        restaurantId: restaurant._id,
      });
      const foundRole = await RoleService.getRoleById(
        newRole._id.toString(),
        restaurant._id
      );
      expect(foundRole).to.exist;
      expect(foundRole!._id.toString()).to.equal(newRole._id.toString());
      expect(foundRole!.name).to.equal("Host");
    });

    it("should return null if role belongs to a different restaurant", async () => {
      const newRole = await RoleService.createRole({
        name: "HostTemp",
        restaurantId: restaurant._id, // Use ObjectId
      });
      const foundRole = await RoleService.getRoleById(
        newRole._id.toString(),
        restaurant2._id
      ); // Different restaurantId (ObjectId)
      expect(foundRole).to.be.null;
    });

    it("should throw AppError if role ID format is invalid", async () => {
      await expect(
        RoleService.getRoleById("invalid-id", restaurant._id)
      ).to.be.rejectedWith(AppError, "Invalid role ID format."); // Use ObjectId
    });

    it("should return null if role not found by ID", async () => {
      const nonExistentId = new MongooseTypes.ObjectId().toString();
      const foundRole = await RoleService.getRoleById(
        nonExistentId,
        restaurant._id
      ); // Use ObjectId
      expect(foundRole).to.be.null;
    });
  });

  describe("updateRole", () => {
    it("should update and return the role", async () => {
      const newRole = await RoleService.createRole({
        name: "Bartender",
        description: "Serves drinks",
        restaurantId: restaurant._id,
      });
      const updates: UpdateRoleData = {
        name: "Mixologist",
        description: "Crafts fine cocktails",
      };
      const updatedRole = await RoleService.updateRole(
        newRole._id.toString(),
        restaurant._id,
        updates
      );

      expect(updatedRole).to.exist;
      expect(updatedRole!._id.toString()).to.equal(newRole._id.toString());
      expect(updatedRole!.name).to.equal(updates.name);
      expect(updatedRole!.description).to.equal(updates.description);
    });

    it("should throw AppError if updating to a name that already exists in the same restaurant (DB error)", async () => {
      await RoleService.createRole({
        name: "Existing Name",
        restaurantId: restaurant._id, // Use ObjectId
      });
      const roleToUpdate = await RoleService.createRole({
        name: "Old Name",
        restaurantId: restaurant._id, // Use ObjectId
      });

      await expect(
        RoleService.updateRole(roleToUpdate._id.toString(), restaurant._id, {
          name: "Existing Name",
        })
      ).to.be.rejectedWith(
        AppError,
        `Failed to update role: A role with name "Existing Name" may already exist for this restaurant.`
      );
    });

    it("should allow updating to a name that exists in a different restaurant", async () => {
      await RoleService.createRole({
        name: "Shared Name",
        restaurantId: restaurant2._id, // Use ObjectId
      });
      const roleToUpdate = await RoleService.createRole({
        name: "Original Name",
        restaurantId: restaurant._id, // Use ObjectId
      });

      const updatedRole = await RoleService.updateRole(
        roleToUpdate._id.toString(),
        restaurant._id,
        { name: "Shared Name" }
      ); // Use ObjectId
      expect(updatedRole).to.exist;
      expect(updatedRole!.name).to.equal("Shared Name");
    });

    it("should return null if role to update is not found or not in restaurant", async () => {
      const nonExistentId = new MongooseTypes.ObjectId().toString();
      let updatedRole = await RoleService.updateRole(
        nonExistentId,
        restaurant._id,
        { name: "New Name" }
      ); // Use ObjectId
      expect(updatedRole).to.be.null;

      const roleInOtherRestaurant = await RoleService.createRole({
        name: "Other",
        restaurantId: restaurant2._id, // Use ObjectId
      });
      updatedRole = await RoleService.updateRole(
        roleInOtherRestaurant._id.toString(),
        restaurant._id,
        { name: "Attempted Update" }
      ); // Use ObjectId
      expect(updatedRole).to.be.null;
    });
  });

  describe("deleteRole", () => {
    it("should delete the role and return true", async () => {
      const roleToDelete = await RoleService.createRole({
        name: "Security",
        restaurantId: restaurant._id,
      });
      const result = await RoleService.deleteRole(
        roleToDelete._id.toString(),
        restaurant._id
      );

      expect(result).to.be.true;
      const foundRole = await RoleService.getRoleById(
        roleToDelete._id.toString(),
        restaurant._id
      );
      expect(foundRole).to.be.null;
    });

    it("should return false if role to delete is not found or not in restaurant", async () => {
      const nonExistentId = new MongooseTypes.ObjectId().toString();
      let result = await RoleService.deleteRole(nonExistentId, restaurant._id); // Use ObjectId
      expect(result).to.be.false;

      const roleInOtherRestaurant = await RoleService.createRole({
        name: "OtherDel",
        restaurantId: restaurant2._id, // Use ObjectId
      });
      result = await RoleService.deleteRole(
        roleInOtherRestaurant._id.toString(),
        restaurant._id
      ); // Use ObjectId
      expect(result).to.be.false;
    });

    it("should throw AppError for invalid role ID format when deleting", async () => {
      await expect(
        RoleService.deleteRole("invalid-id", restaurant._id)
      ).to.be.rejectedWith(AppError, "Invalid role ID format.");
    });

    // TODO: Add test case for when a role cannot be deleted (e.g., if it's assigned to staff members and there's a restriction).
    // This depends on whether StaffService.updateStaffAssignedRole or other logic prevents role deletion if in use.
    // For now, RoleService.deleteRole doesn't seem to have such checks, it just deletes.
  });
});
