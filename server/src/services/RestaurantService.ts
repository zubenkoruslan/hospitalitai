import mongoose from "mongoose";
import Restaurant, { IRestaurant } from "../models/Restaurant";
import User from "../models/User";
import { AppError } from "../utils/errorHandler";

export interface RestaurantProfileUpdateData {
  name?: string;
  contactEmail?: string; // Assuming restaurant has a contactEmail field
  // Add other updatable restaurant-specific fields here
}

class RestaurantService {
  /**
   * Updates a restaurant's profile information.
   * Only the owner of the restaurant can update its profile.
   * @param restaurantId The ID of the restaurant to update.
   * @param userId The ID of the user attempting the update (must be the owner).
   * @param updateData The data to update.
   * @returns The updated restaurant document.
   * @throws AppError if restaurant not found, user is not owner, or update fails.
   */
  static async updateRestaurantProfile(
    restaurantId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
    updateData: RestaurantProfileUpdateData
  ): Promise<IRestaurant> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const restaurant = await Restaurant.findById(restaurantId).session(
        session
      );
      if (!restaurant) {
        throw new AppError("Restaurant not found.", 404);
      }

      // Verify that the user performing the update is the owner of the restaurant
      if (restaurant.owner.toString() !== userId.toString()) {
        throw new AppError(
          "User is not authorized to update this restaurant.",
          403
        );
      }

      // Update fields
      if (updateData.name) {
        restaurant.name = updateData.name;
        // If restaurant name changes, update it in the owner's User document as well for consistency in JWT/display
        const ownerUser = await User.findById(userId).session(session);
        if (ownerUser && ownerUser.role === "restaurant") {
          // Assuming User model has a restaurantName field or similar to store this denormalized info
          // For now, this part is conceptual. Direct update to User.restaurantName might not be standard
          // if User.restaurantName in JWT comes from AuthPayload which itself is derived from Restaurant model name at login/signup.
          // However, if a User object *stores* restaurantName directly, it should be updated.
          // Let's assume for now direct update of restaurant.name is sufficient, and JWT gets fresh name on next login.
        }
      }
      if (updateData.contactEmail) {
        // Assuming IRestaurant has a contactEmail field
        restaurant.contactEmail = updateData.contactEmail;
        // For this example, I will assume contactEmail is not yet on the model and will add it.
        // console.warn("Attempting to update contactEmail, ensure IRestaurant model has this field.");
        // restaurant.set('contactEmail', updateData.contactEmail); // Mongoose general way to set potentially new path
      }

      // Add other fields as necessary
      // e.g., if (updateData.address) restaurant.address = updateData.address;

      await restaurant.save({ session });
      await session.commitTransaction();
      return restaurant;
    } catch (error: any) {
      await session.abortTransaction();
      console.error("Error updating restaurant profile:", error);
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to update restaurant profile.", 500);
    } finally {
      session.endSession();
    }
  }

  /**
   * Invites a staff member to a restaurant.
   * @param restaurantId The ID of the restaurant.
   * @param invitingUserId The ID of the user sending the invite (must be owner).
   * @param staffEmailToInvite The email of the staff member to invite.
   * @param staffDetails Optional details for new staff user (e.g., name, professionalRole).
   * @throws AppError for various reasons (not found, not authorized, user exists, etc.)
   */
  static async inviteStaffToRestaurant(
    restaurantId: string | mongoose.Types.ObjectId,
    invitingUserId: string | mongoose.Types.ObjectId,
    staffEmailToInvite: string,
    staffDetails?: { name?: string; professionalRole?: string } // Placeholder for now
  ): Promise<void> {
    // Returns void, or could return created/linked user
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const restaurant = await Restaurant.findById(restaurantId).session(
        session
      );
      if (!restaurant) {
        throw new AppError("Restaurant not found.", 404);
      }

      if (restaurant.owner.toString() !== invitingUserId.toString()) {
        throw new AppError(
          "User is not authorized to invite staff to this restaurant.",
          403
        );
      }

      let existingUser = await User.findOne({
        email: staffEmailToInvite,
      }).session(session);

      if (existingUser) {
        // User already exists. Handle different scenarios:
        if (
          existingUser.restaurantId &&
          existingUser.restaurantId.toString() === restaurantId.toString()
        ) {
          throw new AppError(
            "This user is already a staff member of this restaurant.",
            409
          ); // 409 Conflict
        } else if (existingUser.restaurantId) {
          // Already belongs to another restaurant. Policy decision needed.
          // For now, let's prevent inviting users already in another restaurant.
          throw new AppError(
            "This user is already a staff member of another restaurant.",
            409
          );
        } else {
          // User exists but is not associated with any restaurant. Link them.
          existingUser.restaurantId = new mongoose.Types.ObjectId(
            restaurantId.toString()
          );
          existingUser.role = "staff"; // Ensure role is staff
          if (staffDetails?.professionalRole)
            existingUser.professionalRole = staffDetails.professionalRole;
          // Update name if provided and different, or if user has no name
          if (staffDetails?.name && existingUser.name !== staffDetails.name)
            existingUser.name = staffDetails.name;
          else if (!existingUser.name && staffDetails?.name)
            existingUser.name = staffDetails.name;

          await existingUser.save({ session });
          // TODO: Potentially send a notification/email that they've been added.
          console.log(
            `Existing user ${staffEmailToInvite} linked to restaurant ${restaurant.name}`
          );
        }
      } else {
        // User does not exist. Create a new staff user.
        // For a real invite system, you might create a user with a pending status or an invite token.
        // For now, creating an active user directly.
        const newStaffUser = new User({
          email: staffEmailToInvite,
          name: staffDetails?.name || "Invited Staff", // Default name or from input
          role: "staff",
          restaurantId: new mongoose.Types.ObjectId(restaurantId.toString()),
          professionalRole: staffDetails?.professionalRole || "Staff", // Default role or from input
          // Password would typically be set by the user via an invite link.
          // For now, we might leave it unset or set a temporary one (not recommended for production).
          // Password will be hashed by pre-save hook if provided.
        });
        await newStaffUser.save({ session });
        console.log(
          `New staff user ${staffEmailToInvite} created and linked to restaurant ${restaurant.name}`
        );
        // TODO: Send invitation email with a link to set password and complete profile.
      }

      await session.commitTransaction();
      // Actual email sending logic would go here, outside the transaction ideally
    } catch (error: any) {
      await session.abortTransaction();
      console.error("Error inviting staff to restaurant:", error);
      if (error instanceof AppError) throw error;
      if (error.code === 11000 && error.keyPattern?.email) {
        // Duplicate key error for email
        throw new AppError(
          "An error occurred with email duplication, this should have been handled.",
          500
        ); // Should be caught above
      }
      throw new AppError("Failed to invite staff to restaurant.", 500);
    } finally {
      session.endSession();
    }
  }

  /**
   * Deletes a restaurant and orphans its staff members.
   * @param restaurantId The ID of the restaurant to delete.
   * @param userId The ID of the user attempting deletion (must be owner).
   */
  static async deleteRestaurant(
    restaurantId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const restaurant = await Restaurant.findById(restaurantId).session(
        session
      );
      if (!restaurant) {
        throw new AppError("Restaurant not found.", 404);
      }

      if (restaurant.owner.toString() !== userId.toString()) {
        throw new AppError(
          "User is not authorized to delete this restaurant.",
          403
        );
      }

      // Orphan staff members: set their restaurantId to null
      // This assumes staff are primarily identified by User.restaurantId
      await User.updateMany(
        { restaurantId: restaurant._id },
        { $set: { restaurantId: null, professionalRole: "Unassigned" } } // Also clear professionalRole or set to a default
      ).session(session);

      // TODO: Consider deleting associated Menus, Items, Quizzes, QuestionBanks, etc.
      // This would require importing those models and services, and careful cascading logic.
      // For MVP, we are just deleting the restaurant and orphaning staff.
      // Example: await Menu.deleteMany({ restaurantId: restaurant._id }).session(session);

      // Delete the restaurant itself
      await Restaurant.findByIdAndDelete(restaurant._id).session(session);

      await session.commitTransaction();
    } catch (error: any) {
      await session.abortTransaction();
      console.error("Error deleting restaurant:", error);
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to delete restaurant.", 500);
    } finally {
      session.endSession();
    }
  }

  // ... other restaurant service methods can be added here ...
  // e.g., getRestaurantDetails, deleteRestaurant (handle cascading deletes carefully)
}

export default RestaurantService;
