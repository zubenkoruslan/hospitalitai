import mongoose from "mongoose";
import User, { IUser } from "../models/User";
import Restaurant, { IRestaurant } from "../models/Restaurant";
import { AppError } from "../utils/errorHandler";
import { Types } from "mongoose";
import {
  UserProfileUpdateData,
  UserAPIResponse,
  PasswordChangeData,
} from "../types/authTypes";
import NotificationService from "./notificationService";

// Interface for data passed to signup methods
interface SignupData {
  email: string;
  password?: string;
  role: "restaurant" | "staff";
  name: string;
  restaurantName?: string;
  restaurantId?: string; // For staff role
  assignedRoleId?: string; // CHANGED: For single role assignment
}

// Interface for the return value of loginUser
interface LoginResponse {
  user: UserAPIResponse;
  restaurantName?: string;
  // professionalRole?: string; // Ensure this is removed or commented
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
    const { email, password, role, name, restaurantId, assignedRoleId } = data;

    if (role !== "staff") {
      throw new AppError("Invalid role for staff registration.", 400);
    }
    if (!restaurantId) {
      throw new AppError("Restaurant ID is required for staff role.", 400);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let targetRestaurant: IRestaurant | null;
      try {
        targetRestaurant = await Restaurant.findById(restaurantId).session(
          session
        );
      } catch (findError: any) {
        await session.abortTransaction();
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

      const newUser = new User({
        email,
        password,
        role,
        name,
        restaurantId: finalRestaurantId,
        assignedRoleId: assignedRoleId
          ? new Types.ObjectId(assignedRoleId)
          : null,
      });
      await newUser.save({ session });

      await session.commitTransaction();

      // Create notifications after successful registration
      try {
        // Notify restaurant managers about new staff member
        const restaurantManagers = await User.find({
          restaurantId: finalRestaurantId,
          role: { $in: ["restaurant", "restaurantAdmin", "manager"] },
        })
          .select("_id")
          .lean();

        if (restaurantManagers.length > 0) {
          const managerNotifications = restaurantManagers.map((manager) => ({
            type: "new_staff" as const,
            content: `New staff member "${newUser.name}" has joined your restaurant`,
            userId: manager._id,
            restaurantId: finalRestaurantId,
            relatedId: newUser._id,
            metadata: { staffId: newUser._id, staffName: newUser.name },
          }));

          await NotificationService.createBulkNotifications(
            managerNotifications
          );
          console.log(
            `Created ${managerNotifications.length} notifications for new staff member: ${newUser.name}`
          );
        }

        // Create welcome notification for the new staff member
        await NotificationService.createNotification({
          type: "new_assignment" as const,
          content: `Welcome to ${restaurantName}! You can now start taking training quizzes and assignments`,
          userId: newUser._id,
          restaurantId: finalRestaurantId,
          metadata: { welcomeMessage: true },
        });

        console.log(
          `Created welcome notification for new staff member: ${newUser.name}`
        );
      } catch (notificationError) {
        console.error(
          "Error creating staff registration notifications:",
          notificationError
        );
        // Don't fail the registration if notifications fail
      }

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
   * @returns A promise resolving to an object containing the authenticated user's details (excluding password), their restaurant's name (if applicable).
   * @throws {AppError} If authentication fails (invalid email/password) (401), or if an unexpected database error occurs (500).
   */
  static async loginUser(
    email: string,
    passwordInput: string
  ): Promise<LoginResponse> {
    try {
      const userDoc = await User.findOne({ email }).select(
        "+password name role restaurantId email createdAt updatedAt assignedRoleId"
      );

      if (!userDoc) {
        throw new AppError("Invalid credentials", 401);
      }

      const isMatch = await userDoc.comparePassword(passwordInput);
      if (!isMatch) {
        throw new AppError("Invalid credentials", 401);
      }

      let restaurantName: string | undefined = undefined;
      if (userDoc.restaurantId) {
        const restaurant = await Restaurant.findById(
          userDoc.restaurantId
        ).lean();
        if (restaurant) {
          restaurantName = restaurant.name;
        }
      }

      const { password: _password, ...userObject } = userDoc.toObject();

      const responseUser: UserAPIResponse = {
        ...userObject,
        _id: userObject._id.toString(),
        restaurantId: userObject.restaurantId?.toString(),
        assignedRoleId: userObject.assignedRoleId?.toString(),
        restaurantName: restaurantName,
        // professionalRole is intentionally omitted here
      };

      return {
        user: responseUser,
        restaurantName: responseUser.restaurantName,
        // professionalRole is intentionally omitted here
      };
    } catch (error: any) {
      console.error("Error during login:", error);
      if (error instanceof AppError) throw error;
      throw new AppError("An unexpected error occurred during login.", 500);
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
  ): Promise<UserAPIResponse> {
    try {
      const user = await User.findById(userId).lean();
      if (!user) {
        throw new AppError("User not found", 404);
      }

      let restaurantNameStr: string | undefined;
      if (user.restaurantId) {
        const restaurant = await Restaurant.findById(user.restaurantId).lean();
        if (restaurant) {
          restaurantNameStr = restaurant.name;
        }
      }

      const { password, __v, ...userWithoutSensitiveFields } = user;
      return {
        ...userWithoutSensitiveFields,
        _id: userWithoutSensitiveFields._id.toString(),
        restaurantId: userWithoutSensitiveFields.restaurantId?.toString(),
        assignedRoleId: userWithoutSensitiveFields.assignedRoleId?.toString(),
        restaurantName: restaurantNameStr,
      };
    } catch (error: any) {
      console.error("Error fetching user details:", error);
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to fetch user details.", 500);
    }
  }

  static async updateUserProfile(
    userId: string | mongoose.Types.ObjectId,
    profileData: UserProfileUpdateData
  ): Promise<UserAPIResponse> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new AppError("User not found to update.", 404);
      }

      // Update basic user fields
      if (profileData.name) {
        user.name = profileData.name;
      }
      if (profileData.email) {
        if (profileData.email !== user.email) {
          const existingUserWithNewEmail = await User.findOne({
            email: profileData.email,
          }).session(session);
          if (
            existingUserWithNewEmail &&
            existingUserWithNewEmail._id.toString() !== userId.toString()
          ) {
            throw new AppError("This email address is already in use.", 409);
          }
        }
        user.email = profileData.email;
      }

      let restaurantNameUpdated: string | undefined = undefined;
      if (
        user.role === "restaurant" &&
        profileData.restaurantName &&
        user.restaurantId
      ) {
        const restaurant = await Restaurant.findById(user.restaurantId).session(
          session
        );
        if (restaurant) {
          if (restaurant.name !== profileData.restaurantName) {
            restaurant.name = profileData.restaurantName;
            await restaurant.save({ session });
          }
          restaurantNameUpdated = restaurant.name;
        }
      }

      await user.save({ session });
      await session.commitTransaction();

      const { password, __v, ...userObject } = user.toObject();

      if (!restaurantNameUpdated && user.restaurantId) {
        const restaurant = await Restaurant.findById(user.restaurantId).lean();
        if (restaurant) restaurantNameUpdated = restaurant.name;
      }

      return {
        ...userObject,
        _id: userObject._id.toString(),
        restaurantId: userObject.restaurantId?.toString(),
        assignedRoleId: userObject.assignedRoleId?.toString(),
        restaurantName: restaurantNameUpdated,
      };
    } catch (error: any) {
      await session.abortTransaction();
      console.error("Error updating user profile:", error);
      if (error instanceof AppError) throw error;
      if (error.code === 11000 && error.keyPattern?.email) {
        throw new AppError("This email address is already in use.", 409);
      }
      throw new AppError("Failed to update user profile.", 500);
    } finally {
      session.endSession();
    }
  }

  static async changeUserPassword(
    userId: string | mongoose.Types.ObjectId,
    currentPasswordInput: string,
    newPasswordInput: string
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Fetch user and select password field explicitly as it's normally excluded.
      const user = await User.findById(userId)
        .select("+password")
        .session(session);
      if (!user) {
        throw new AppError("User not found.", 404);
      }

      // Verify current password
      const isMatch = await user.comparePassword(currentPasswordInput);
      if (!isMatch) {
        throw new AppError("Incorrect current password.", 401); // 401 Unauthorized or 400 Bad Request
      }

      // Set new password (pre-save hook will hash it)
      user.password = newPasswordInput;
      await user.save({ session });

      await session.commitTransaction();
    } catch (error: any) {
      await session.abortTransaction();
      console.error("Error changing user password:", error);
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to change password.", 500);
    } finally {
      session.endSession();
    }
  }

  /**
   * Deletes a user's account.
   * If the user is a restaurant owner, deletion might be restricted or have cascading effects.
   * @param userId The ID of the user to delete.
   * @param userRole The role of the user.
   * @param userRestaurantId The restaurantId of the user, if any.
   */
  static async deleteUserAccount(
    userId: string | mongoose.Types.ObjectId,
    userRole?: string, // from req.user.role
    userRestaurantId?: string | mongoose.Types.ObjectId // from req.user.restaurantId
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new AppError("User not found.", 404);
      }

      if (user.role === "restaurant") {
        // For MVP, prevent restaurant owner from deleting their user account directly.
        // They should delete their restaurant first, which might handle user cleanup or re-assignment.
        // Or, this method could be expanded to handle restaurant/staff cleanup.
        const restaurantCount = await Restaurant.countDocuments({
          owner: userId,
        }).session(session);
        if (restaurantCount > 0) {
          throw new AppError(
            "Restaurant owner cannot delete account directly. Please delete your restaurant(s) first or transfer ownership.",
            403 // Forbidden
          );
        }
        // If they own no restaurants (e.g. restaurant was deleted separately), they can delete their user record.
      }

      // If user is staff, or an owner with no restaurants, proceed with deletion.
      // Additional logic could be: remove staff from their restaurant's staff list if applicable (though User.restaurantId is the main link)
      // For now, just deleting the user document.
      await User.findByIdAndDelete(userId).session(session);

      // TODO: Add more sophisticated cleanup if needed:
      // - Invalidate JWT tokens
      // - Remove from any other associated collections (e.g., quiz attempts, if not cascaded by schema)
      // - If staff, notify restaurant owner (optional)

      await session.commitTransaction();
    } catch (error: any) {
      await session.abortTransaction();
      console.error("Error deleting user account:", error);
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to delete user account.", 500);
    } finally {
      session.endSession();
    }
  }

  // Potential future methods:
  // static async loginUser(...)
  // static async validateToken(...)
  // static async changePassword(...)
}

export default AuthService;
