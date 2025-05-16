import mongoose, { Types } from "mongoose";
import RoleModel, { IRole } from "../models/RoleModel";
import { AppError } from "../utils/errorHandler";

export interface CreateRoleData {
  name: string;
  description?: string;
  restaurantId: Types.ObjectId;
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  // restaurantId should not be updatable for a role generally
}

export class RoleService {
  /**
   * Creates a new role for a specific restaurant.
   * @param data - Data for creating the role.
   * @returns The created role document.
   * @throws {AppError} If a role with the same name already exists for the restaurant (409),
   *                    or if there's a database save error (500).
   */
  static async createRole(data: CreateRoleData): Promise<IRole> {
    try {
      const newRole = await RoleModel.create(data);
      return newRole;
    } catch (error: any) {
      if (error.code === 11000) {
        // Duplicate key error
        throw new AppError(
          `A role with name "${data.name}" already exists for this restaurant.`,
          409
        );
      }
      // Log the original error for debugging if needed, then throw a generic one
      console.error("Error creating role in RoleService:", error);
      throw new AppError("Failed to create role.", 500);
    }
  }

  /**
   * Retrieves a role by its ID.
   * @param roleId - The ID of the role.
   * @param restaurantId - The ID of the restaurant to ensure the role belongs to it.
   * @returns The role document or null if not found.
   * @throws {AppError} If roleId is invalid or role not found for the restaurant (404).
   */
  static async getRoleById(
    roleId: string | Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<IRole | null> {
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      throw new AppError("Invalid role ID format.", 400);
    }
    const role = await RoleModel.findOne({
      _id: roleId,
      restaurantId: restaurantId,
    }).exec();
    if (!role) {
      // No AppError here, let controller decide if null is 404 or just means no data
      return null;
    }
    return role;
  }

  /**
   * Retrieves all roles for a specific restaurant.
   * @param restaurantId - The ID of the restaurant.
   * @returns An array of role documents.
   * @throws {AppError} If database query fails (500).
   */
  static async getRolesByRestaurant(
    restaurantId: Types.ObjectId
  ): Promise<IRole[]> {
    try {
      const roles = await RoleModel.find({ restaurantId: restaurantId })
        .sort({ name: 1 })
        .exec();
      return roles;
    } catch (error: any) {
      console.error(
        "Error fetching roles by restaurant in RoleService:",
        error
      );
      throw new AppError("Failed to retrieve roles.", 500);
    }
  }

  /**
   * Updates an existing role.
   * @param roleId - The ID of the role to update.
   * @param restaurantId - The ID of the restaurant the role belongs to.
   * @param updateData - Data to update the role with.
   * @returns The updated role document.
   * @throws {AppError} If role not found (404), update conflict (409), or DB error (500).
   */
  static async updateRole(
    roleId: string | Types.ObjectId,
    restaurantId: Types.ObjectId,
    updateData: UpdateRoleData
  ): Promise<IRole | null> {
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      throw new AppError("Invalid role ID format.", 400);
    }
    try {
      const updatedRole = await RoleModel.findOneAndUpdate(
        { _id: roleId, restaurantId: restaurantId },
        { $set: updateData },
        { new: true, runValidators: true }
      ).exec();

      // if (!updatedRole) {
      //   throw new AppError("Role not found or does not belong to this restaurant.", 404);
      // }
      return updatedRole; // Can be null if not found, controller handles 404
    } catch (error: any) {
      if (error.code === 11000) {
        // Handle potential duplicate name error on update if name is changed
        throw new AppError(
          `Failed to update role: A role with name "${updateData.name}" may already exist for this restaurant.`,
          409
        );
      }
      console.error("Error updating role in RoleService:", error);
      throw new AppError("Failed to update role.", 500);
    }
  }

  /**
   * Deletes a role.
   * Note: This does not currently handle cleaning up references in User or Quiz models.
   * That logic might be better suited in a higher-level service or transaction if needed.
   * @param roleId - The ID of the role to delete.
   * @param restaurantId - The ID of the restaurant the role belongs to.
   * @returns True if deleted, false if not found.
   * @throws {AppError} If database deletion fails (500).
   */
  static async deleteRole(
    roleId: string | Types.ObjectId,
    restaurantId: Types.ObjectId
  ): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      throw new AppError("Invalid role ID format.", 400);
    }
    try {
      const result = await RoleModel.deleteOne({
        _id: roleId,
        restaurantId: restaurantId,
      }).exec();
      return result.deletedCount > 0;
    } catch (error: any) {
      console.error("Error deleting role in RoleService:", error);
      throw new AppError("Failed to delete role.", 500);
    }
  }
}
