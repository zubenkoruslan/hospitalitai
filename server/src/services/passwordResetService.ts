import crypto from "crypto";
import bcrypt from "bcryptjs";
import PasswordReset from "../models/PasswordReset";
import User from "../models/User";
import { EmailService } from "./emailService";
import { AppError } from "../utils/errorHandler";

export class PasswordResetService {
  private emailService = new EmailService();

  /**
   * Request password reset - sends email with reset link
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      // Don't reveal whether email exists or not for security
      return {
        message:
          "If an account with that email exists, you will receive a password reset link shortly.",
      };
    }

    // Check for existing unused reset token
    const existingReset = await PasswordReset.findOne({
      userId: user._id,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (existingReset) {
      // Token already exists and is valid, resend the same email
      await this.emailService.sendPasswordResetEmail(
        user.email,
        user.name,
        existingReset.token,
        user.role
      );

      return {
        message:
          "If an account with that email exists, you will receive a password reset link shortly.",
      };
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Set expiration to 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Create password reset record
    await PasswordReset.create({
      email: user.email,
      userId: user._id,
      token: resetToken,
      expiresAt,
    });

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.name,
      resetToken,
      user.role
    );

    return {
      message:
        "If an account with that email exists, you will receive a password reset link shortly.",
    };
  }

  /**
   * Verify reset token validity
   */
  async verifyResetToken(token: string): Promise<{
    valid: boolean;
    email?: string;
    userName?: string;
  }> {
    const resetRecord = await PasswordReset.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() },
    }).populate("userId");

    if (!resetRecord || !resetRecord.userId) {
      return { valid: false };
    }

    const user = resetRecord.userId as any;

    return {
      valid: true,
      email: user.email,
      userName: user.name,
    };
  }

  /**
   * Reset password using token
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
    // Find and validate reset record
    const resetRecord = await PasswordReset.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() },
    }).populate("userId");

    if (!resetRecord || !resetRecord.userId) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    const user = resetRecord.userId as any;

    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      updatedAt: new Date(),
    });

    // Mark reset token as used
    await PasswordReset.findByIdAndUpdate(resetRecord._id, {
      used: true,
      updatedAt: new Date(),
    });

    return {
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    };
  }

  /**
   * Clean up expired tokens (can be called periodically)
   */
  async cleanupExpiredTokens(): Promise<{ deletedCount: number }> {
    const result = await PasswordReset.deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } },
        {
          used: true,
          createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }, // Used tokens older than 24h
      ],
    });

    return { deletedCount: result.deletedCount || 0 };
  }
}
