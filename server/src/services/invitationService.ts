import crypto from "crypto";
import StaffInvitation from "../models/StaffInvitation";
import Restaurant from "../models/Restaurant";
import User from "../models/User";
import { EmailService } from "./emailService";
import { AppError } from "../utils/errorHandler";

export class InvitationService {
  private emailService = new EmailService();

  async createStaffInvitation(
    restaurantId: string,
    invitedByUserId: string,
    email: string,
    options?: {
      name?: string;
      assignedRoleId?: string;
    }
  ) {
    // Verify restaurant and inviting user
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new AppError("Restaurant not found", 404);
    }

    const invitingUser = await User.findById(invitedByUserId);
    if (
      !invitingUser ||
      invitingUser.restaurantId?.toString() !== restaurantId
    ) {
      throw new AppError("Unauthorized to invite to this restaurant", 403);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.restaurantId?.toString() === restaurantId) {
        throw new AppError("User is already a member of this restaurant", 409);
      }
      throw new AppError(
        "User is already registered with another restaurant",
        409
      );
    }

    // Check for existing pending invitation
    const existingInvitation = await StaffInvitation.findOne({
      email,
      restaurantId,
      status: "pending",
    });

    if (existingInvitation) {
      throw new AppError("Invitation already sent to this email", 409);
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation
    const invitation = new StaffInvitation({
      email,
      restaurantId,
      invitedBy: invitedByUserId,
      token,
      name: options?.name,
      assignedRoleId: options?.assignedRoleId,
      expiresAt,
    });

    await invitation.save();

    // Send email
    await this.emailService.sendStaffInvitation(
      email,
      restaurant.name,
      invitingUser.name,
      token,
      options?.name
    );

    return {
      message: `Invitation sent successfully to ${email}`,
      invitationId: invitation._id,
    };
  }

  async acceptInvitation(
    token: string,
    userData: {
      password: string;
      name?: string;
    }
  ) {
    const invitation = await StaffInvitation.findOne({
      token,
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).populate("restaurantId");

    if (!invitation) {
      throw new AppError("Invalid or expired invitation", 400);
    }

    // Create user account
    const user = new User({
      email: invitation.email,
      password: userData.password,
      name: userData.name || invitation.name || "Staff Member",
      role: "staff",
      restaurantId: invitation.restaurantId,
      assignedRoleId: invitation.assignedRoleId,
    });

    await user.save();

    // Update invitation status
    invitation.status = "completed";
    await invitation.save();

    return {
      user,
      restaurant: invitation.restaurantId,
    };
  }

  async getInvitationByToken(token: string) {
    const invitation = await StaffInvitation.findOne({
      token,
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).populate("restaurantId");

    if (!invitation) {
      throw new AppError("Invalid or expired invitation", 400);
    }

    return {
      email: invitation.email,
      restaurantName: (invitation.restaurantId as any).name,
      name: invitation.name,
    };
  }

  async getRestaurantInvitations(restaurantId: string) {
    const invitations = await StaffInvitation.find({
      restaurantId,
      status: "pending",
      expiresAt: { $gt: new Date() },
    })
      .populate("invitedBy", "name email")
      .sort({ createdAt: -1 });

    return invitations;
  }

  async cancelInvitation(invitationId: string, restaurantId: string) {
    const invitation = await StaffInvitation.findOne({
      _id: invitationId,
      restaurantId,
      status: "pending",
    });

    if (!invitation) {
      throw new AppError("Invitation not found", 404);
    }

    invitation.status = "expired";
    await invitation.save();

    return {
      message: "Invitation cancelled successfully",
    };
  }
}
