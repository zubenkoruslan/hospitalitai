import mongoose from "mongoose";
import User, { IUser } from "../models/User";
import Restaurant, { IRestaurant } from "../models/Restaurant";
import { AppError } from "../utils/errorHandler";

// Interface for data passed to signup methods
interface SignupData {
  email: string;
  password?: string;
  role: "restaurant" | "staff";
  name: string;
  restaurantName?: string;
  restaurantId?: string; // For staff role
  professionalRole?: string; // For staff role
}

// Interface for the return value of loginUser
interface LoginResponse {
  user: Omit<IUser, "password">;
  restaurantName?: string;
  professionalRole?: string;
}

class AuthService {
  /**
   * Registers a new restaurant owner and their associated restaurant.
   *
   * @param data - The signup data containing owner and restaurant details.
   * @returns A promise resolving to an object containing the created user and restaurant documents.
   * @throws {AppError} If the role is invalid, restaurant name is missing, user/restaurant creation fails,
   *                    or any other validation/database error occurs.
   */
  static async registerOwner(
    data: SignupData
  ): Promise<{ user: IUser; restaurant: IRestaurant }> {
    const { email, password, role, name, restaurantName } = data;

    if (role !== "restaurant") {
      throw new AppError("Invalid role for owner registration.", 400);
    }
    if (!restaurantName) {
      throw new AppError(
        "Restaurant name is required for owner registration.",
        400
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Create the User (owner)
      const newUser = new User({
        email,
        password, // Hashing handled by pre-save hook
        role,
        name,
      });
      await newUser.save({ session });

      // 2. Create the Restaurant
      const newRestaurant = new Restaurant({
        name: restaurantName,
        owner: newUser._id as mongoose.Types.ObjectId,
      });
      await newRestaurant.save({ session });

      // 3. Update the User with the Restaurant ID
      newUser.restaurantId = newRestaurant._id as mongoose.Types.ObjectId;
      await newUser.save({ session });

      await session.commitTransaction();
      return { user: newUser, restaurant: newRestaurant };
    } catch (error: any) {
      await session.abortTransaction();
      console.error("Error during owner/restaurant registration:", error);
      if (error instanceof AppError) throw error;
      if (error.name === "ValidationError") {
        throw new AppError(`Validation failed: ${error.message}`, 400);
      }
      throw new AppError("Failed to register owner and restaurant.", 500);
    } finally {
      session.endSession();
    }
  }

  /**
   * Registers a new staff member, links them to a restaurant.
   *
   * @param data - The signup data containing staff details and restaurant ID.
   * @returns A promise resolving to an object containing the created user document and the restaurant ID.
   * @throws {AppError} If the role is invalid, restaurant ID is missing/invalid, restaurant not found,
   *                    user creation fails (e.g., duplicate email), or any other validation/database error occurs.
   */
  static async registerStaff(data: SignupData): Promise<{
    user: IUser;
    restaurantId: mongoose.Types.ObjectId;
    restaurantName: string | undefined;
  }> {
    const { email, password, role, name, restaurantId, professionalRole } =
      data;

    if (role !== "staff") {
      throw new AppError("Invalid role for staff registration.", 400);
    }
    if (!restaurantId) {
      throw new AppError("Restaurant ID is required for staff role.", 400);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Find the target restaurant - this read operation can be outside or inside the transaction
      // For simplicity and since it's a read, keeping it before trying to write.
      // However, if strict serializability is needed or if the restaurant's existence is critical
      // for the transaction's validity from the start, it could be moved inside.
      let targetRestaurant: IRestaurant | null;
      try {
        // Finding restaurant can stay outside or be part of the transaction.
        // If it's part of the transaction, it would use { session }.
        // For now, assuming it's acceptable to validate restaurant existence before starting writes.
        targetRestaurant = await Restaurant.findById(restaurantId).session(
          session
        ); // Added session here for consistency
      } catch (findError: any) {
        await session.abortTransaction(); // Abort if findById itself fails due to bad ID format before query
        session.endSession();
        console.error("Error finding restaurant by ID:", findError);
        throw new AppError(
          "Invalid Restaurant ID format or error during lookup.",
          400
        );
      }

      if (!targetRestaurant) {
        await session.abortTransaction();
        session.endSession();
        throw new AppError("Restaurant not found with the provided ID.", 404);
      }
      const finalRestaurantId = targetRestaurant._id as mongoose.Types.ObjectId;
      const restaurantName = targetRestaurant.name;

      // 2. Create the staff user
      const newUser = new User({
        email,
        password, // Hashing handled by pre-save hook
        role,
        name,
        restaurantId: finalRestaurantId,
        professionalRole,
      });
      await newUser.save({ session }); // Pass session here

      await session.commitTransaction();
      return { user: newUser, restaurantId: finalRestaurantId, restaurantName };
    } catch (error: any) {
      await session.abortTransaction();
      console.error("Error during staff registration:", error);
      if (error instanceof AppError) throw error;
      if (error.code === 11000) {
        throw new AppError("User with this email already exists.", 409);
      }
      if (error.name === "ValidationError") {
        throw new AppError(`Validation failed: ${error.message}`, 400);
      }
      throw new AppError("Failed to register staff member.", 500);
    } finally {
      session.endSession();
    }
  }

  /**
   * Authenticates a user by email and password.
   *
   * @param email - The user's email address.
   * @param passwordInput - The plain text password provided by the user.
   * @returns A promise resolving to an object containing the authenticated user's details (excluding password), their restaurant's name (if applicable), and their professional role (if applicable).
   * @throws {AppError} If authentication fails (invalid email/password) (401), or if an unexpected database error occurs (500).
   */
  static async loginUser(
    email: string,
    passwordInput: string
  ): Promise<LoginResponse> {
    try {
      // Find user by email, ensure professionalRole is selected
      const user = await User.findOne({ email }).select(
        "+password name role restaurantId email createdAt updatedAt professionalRole"
      );

      if (!user) {
        throw new AppError("Invalid credentials", 401);
      }

      // Compare password
      const isMatch = await user.comparePassword(passwordInput);
      if (!isMatch) {
        throw new AppError("Invalid credentials", 401);
      }

      // Fetch restaurant name
      let restaurantName: string | undefined = undefined;
      if (user.restaurantId) {
        const restaurant = await Restaurant.findById(user.restaurantId).lean();
        if (restaurant) {
          restaurantName = restaurant.name;
        } else {
          console.warn(
            `User ${user.email} (ID: ${user._id}) linked to non-existent restaurant ID: ${user.restaurantId}`
          );
        }
      }

      const { password: _password, ...userObject } = user.toObject();

      // Return all necessary fields
      return {
        user: userObject as unknown as Omit<IUser, "password">,
        restaurantName,
        professionalRole: user.professionalRole,
      };
    } catch (error: any) {
      console.error("Error during login:", error);
      if (error instanceof AppError) throw error; // Re-throw specific AppErrors (e.g., 401)
      throw new AppError("An unexpected error occurred during login.", 500); // Catch-all
    }
  }

  /**
   * Retrieves the details for a specific user, excluding the password.
   *
   * @param userId - The ID of the user to retrieve.
   * @returns A promise resolving to the user's details (excluding password).
   * @throws {AppError} If the user is not found (404) or if an unexpected database error occurs (500).
   */
  static async getCurrentUserDetails(
    userId: string | mongoose.Types.ObjectId
  ): Promise<Omit<IUser, "password">> {
    try {
      const user = await User.findById(userId).select("-password");

      if (!user) {
        throw new AppError("User not found", 404);
      }

      return user.toObject() as unknown as Omit<IUser, "password">;
    } catch (error: any) {
      console.error(`Error fetching user details for ID ${userId}:`, error);
      if (error instanceof AppError) throw error; // Re-throw specific AppErrors (e.g., 404)
      // Handle potential CastError for invalid ObjectId format
      if (error.name === "CastError") {
        throw new AppError("Invalid user ID format.", 400);
      }
      throw new AppError(
        "An unexpected error occurred while fetching user details.",
        500
      );
    }
  }

  // Potential future methods:
  // static async loginUser(...)
  // static async validateToken(...)
  // static async changePassword(...)
}

export default AuthService;
