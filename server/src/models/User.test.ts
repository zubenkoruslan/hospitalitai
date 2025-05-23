import mongoose, { Types as MongooseTypes } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
// Removed static: import { expect } from "chai";
// Removed: import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import User, { IUser } from "./User";

let mongoServer: MongoMemoryServer;
let expect: Chai.ExpectStatic; // Declare expect

describe("User Model Test", () => {
  before(async () => {
    // Changed from beforeAll for Mocha, assuming global describe/it
    const chai = await import("chai"); // Dynamic import chai
    expect = chai.expect; // Assign expect

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    // Added ConnectOptions for consistency with other test files
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions);
  });

  after(async () => {
    // Changed from afterAll for Mocha
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({});
    }
  });

  // ... (rest of the tests, ensuring they use the dynamically imported expect)
  // Example adjustment if any test relied on vitest-specific features, otherwise should be fine.

  it("should create & save a restaurant user successfully", async () => {
    const validUserData = {
      name: "Test Restaurant Owner",
      email: "owner@test.com",
      password: "password123",
      role: "restaurant",
    };
    const userData = new User(validUserData);
    const savedUser = await userData.save();

    expect(savedUser._id).to.exist;
    expect(savedUser.name).to.equal(validUserData.name);
    expect(savedUser.email).to.equal(validUserData.email);
    expect(savedUser.role).to.equal(validUserData.role);
    expect(savedUser.password).to.not.equal(validUserData.password); // Password should be hashed
    expect(savedUser.restaurantId).to.be.undefined;
    expect(savedUser.professionalRole).to.be.undefined;
  });

  it("should create & save a staff user successfully with restaurantId and professionalRole", async () => {
    const restaurantId = new MongooseTypes.ObjectId(); // Use MongooseTypes
    const validStaffData = {
      name: "Test Staff Member",
      email: "staff@test.com",
      password: "password456",
      role: "staff",
      restaurantId: restaurantId,
      professionalRole: "Chef",
    };
    const staffData = new User(validStaffData);
    const savedStaff = await staffData.save();

    expect(savedStaff._id).to.exist;
    expect(savedStaff.name).to.equal(validStaffData.name);
    expect(savedStaff.email).to.equal(validStaffData.email);
    expect(savedStaff.role).to.equal(validStaffData.role);
    expect(savedStaff.password).to.not.equal(validStaffData.password);
    expect(savedStaff.restaurantId).to.equal(validStaffData.restaurantId);
    expect(savedStaff.professionalRole).to.equal(
      validStaffData.professionalRole
    );
  });

  // Example test for required field (email)
  it("should fail if required field (email) is missing", async () => {
    const userDataWithoutEmail = {
      name: "Missing Email",
      password: "password123",
      role: "restaurant",
    };
    const userData = new User(userDataWithoutEmail);
    let err: any;
    try {
      await userData.save();
    } catch (error) {
      err = error;
    }
    expect(err).to.be.instanceOf(mongoose.Error.ValidationError);
    expect(err.errors.email).to.exist;
  });

  // Add more tests for other validations (duplicate email, password length, role enum, required fields for staff, etc.)

  it("should fail if email format is invalid", async () => {
    const invalidEmailData = {
      name: "Invalid Email User",
      email: "invalid-email",
      password: "password123",
      role: "restaurant",
    };
    const userData = new User(invalidEmailData);
    let err: any;
    try {
      await userData.save();
    } catch (error) {
      err = error;
    }
    expect(err).to.be.instanceOf(mongoose.Error.ValidationError);
    expect(err.errors.email).to.exist;
    expect(err.errors.email.message).to.contain(
      "Please provide a valid email address"
    );
  });

  it("should fail if password is too short", async () => {
    const shortPasswordData = {
      name: "Short Pass User",
      email: "shortpass@test.com",
      password: "123",
      role: "restaurant",
    };
    const userData = new User(shortPasswordData);
    let err: any;
    try {
      await userData.save();
    } catch (error) {
      err = error;
    }
    expect(err).to.be.instanceOf(mongoose.Error.ValidationError);
    expect(err.errors.password).to.exist;
    expect(err.errors.password.message).to.contain(
      "Password must be at least 6 characters long"
    );
  });

  it("should fail if role is not supported", async () => {
    const invalidRoleData = {
      name: "Invalid Role User",
      email: "invalidrole@test.com",
      password: "password123",
      role: "admin", // Invalid role
    };
    const userData = new User(invalidRoleData);
    let err: any;
    try {
      await userData.save();
    } catch (error) {
      err = error;
    }
    expect(err).to.be.instanceOf(mongoose.Error.ValidationError);
    expect(err.errors.role).to.exist;
    expect(err.errors.role.message).to.contain("is not a supported role");
  });

  it("should fail for staff user if restaurantId is missing", async () => {
    const staffWithoutRestaurant = {
      name: "Staff No Restaurant",
      email: "staffnor@test.com",
      password: "password123",
      role: "staff",
      professionalRole: "Waiter",
      // restaurantId is missing
    };
    const userData = new User(staffWithoutRestaurant);
    let err: any;
    try {
      await userData.save();
    } catch (error) {
      err = error;
    }
    expect(err).to.be.instanceOf(mongoose.Error.ValidationError);
    expect(err.errors.restaurantId).to.exist;
  });

  it("should fail for staff user if professionalRole is missing", async () => {
    const staffWithoutProfRole = {
      name: "Staff No Prof Role",
      email: "staffnoprof@test.com",
      password: "password123",
      role: "staff",
      restaurantId: new MongooseTypes.ObjectId(), // Use MongooseTypes
      // professionalRole is missing
    };
    const userData = new User(staffWithoutProfRole);
    let err: any;
    try {
      await userData.save();
    } catch (error) {
      err = error;
    }
    expect(err).to.be.instanceOf(mongoose.Error.ValidationError);
    expect(err.errors.professionalRole).to.exist;
  });

  it("should hash the password before saving", async () => {
    const rawPassword = "plainPassword123";
    const userData = new User({
      name: "Hashing Test User",
      email: "hash@test.com",
      password: rawPassword,
      role: "restaurant",
    });
    const savedUser = await userData.save();
    expect(savedUser.password).to.exist;
    expect(savedUser.password).to.not.equal(rawPassword);
  });

  it("comparePassword method should work correctly", async () => {
    const rawPassword = "compareMe123";
    const userData = new User({
      name: "Compare Pass User",
      email: "compare@test.com",
      password: rawPassword,
      role: "restaurant", // Changed from 'owner'
    });
    await userData.save(); // Save the user to hash the password

    // Find the user again, explicitly selecting the password field
    // @ts-ignore
    const foundUser = (await User.findById(userData._id).select(
      "+password"
    )) as IUser | null;
    expect(foundUser).to.exist;
    // @ts-ignore - Bypassing potential password type issue
    expect(foundUser!.password).to.exist; // Add a check that password field is actually present

    const isMatch = await foundUser!.comparePassword(rawPassword);
    expect(isMatch).to.be.true;

    const isNotMatch = await foundUser!.comparePassword("wrongPassword");
    expect(isNotMatch).to.be.false;
  });

  it("should fail on duplicate email", async () => {
    const userData1 = {
      name: "Duplicate User 1",
      email: "duplicate@test.com",
      password: "password123",
      role: "restaurant",
    };
    await new User(userData1).save();

    const userData2 = {
      name: "Duplicate User 2",
      email: "duplicate@test.com",
      password: "password456",
      role: "staff",
      restaurantId: new MongooseTypes.ObjectId(),
      professionalRole: "Manager",
    };
    const user2 = new User(userData2);
    let err: any;
    try {
      await user2.save();
    } catch (error) {
      err = error;
    }
    expect(err).to.exist;
    // MongoDB duplicate key error code is 11000
    expect(err.code).to.equal(11000);
  });
});
