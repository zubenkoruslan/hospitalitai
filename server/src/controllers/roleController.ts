import { Request, Response, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import {
  RoleService,
  CreateRoleData,
  UpdateRoleData,
} from "../services/roleService";
import { AppError } from "../utils/errorHandler";

export const createRoleController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description } = req.body;
    if (!req.user?.restaurantId) {
      return next(new AppError("Restaurant ID not found for user.", 400));
    }
    const restaurantId = new Types.ObjectId(req.user.restaurantId);

    const roleData: CreateRoleData = { name, description, restaurantId };
    const newRole = await RoleService.createRole(roleData);
    res.status(201).json({ status: "success", data: { role: newRole } });
  } catch (error) {
    next(error);
  }
};

export const getRoleByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { roleId } = req.params;
    if (!req.user?.restaurantId) {
      return next(new AppError("Restaurant ID not found for user.", 400));
    }
    const restaurantId = new Types.ObjectId(req.user.restaurantId);

    const role = await RoleService.getRoleById(roleId, restaurantId);
    if (!role) {
      return next(new AppError("Role not found.", 404));
    }
    res.status(200).json({ status: "success", data: { role } });
  } catch (error) {
    next(error);
  }
};

export const getRolesByRestaurantController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.restaurantId) {
      return next(new AppError("Restaurant ID not found for user.", 400));
    }
    const restaurantId = new Types.ObjectId(req.user.restaurantId);
    // An admin might want to get roles for a restaurantId passed in query param for super admin features
    // For now, strictly using user's restaurantId
    const roles = await RoleService.getRolesByRestaurant(restaurantId);
    res
      .status(200)
      .json({ status: "success", results: roles.length, data: { roles } });
  } catch (error) {
    next(error);
  }
};

export const updateRoleController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { roleId } = req.params;
    const { name, description } = req.body;
    if (!req.user?.restaurantId) {
      return next(new AppError("Restaurant ID not found for user.", 400));
    }
    const restaurantId = new Types.ObjectId(req.user.restaurantId);

    const updateData: UpdateRoleData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    if (Object.keys(updateData).length === 0) {
      return next(new AppError("No update data provided.", 400));
    }

    const updatedRole = await RoleService.updateRole(
      roleId,
      restaurantId,
      updateData
    );
    if (!updatedRole) {
      return next(new AppError("Role not found or no changes made.", 404));
    }
    res.status(200).json({ status: "success", data: { role: updatedRole } });
  } catch (error) {
    next(error);
  }
};

export const deleteRoleController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { roleId } = req.params;
    if (!req.user?.restaurantId) {
      return next(new AppError("Restaurant ID not found for user.", 400));
    }
    const restaurantId = new Types.ObjectId(req.user.restaurantId);

    const success = await RoleService.deleteRole(roleId, restaurantId);
    if (!success) {
      return next(new AppError("Role not found.", 404));
    }
    res.status(204).json({ status: "success", data: null });
  } catch (error) {
    next(error);
  }
};
