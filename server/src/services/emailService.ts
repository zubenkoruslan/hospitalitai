import nodemailer from "nodemailer";

export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
    } catch (error) {
      throw new Error(`SMTP connection failed: ${error}`);
    }
  }

  /**
   * Send staff invitation email
   */
  async sendStaffInvitation(
    email: string,
    restaurantName: string,
    invitedByName: string,
    invitationToken: string,
    staffName?: string
  ): Promise<void> {
    const invitationUrl = `${process.env.FRONTEND_URL}/staff/accept-invitation/${invitationToken}`;

    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: email,
      subject: `Invitation to join ${restaurantName} team`,
      html: this.getInvitationTemplate(
        restaurantName,
        invitedByName,
        invitationUrl,
        staffName
      ),
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      throw new Error(`Failed to send invitation email: ${error}`);
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    userName: string,
    resetToken: string,
    userRole: "restaurant" | "staff"
  ): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Reset Your HospitalityAI Password",
      html: this.getPasswordResetTemplate(email, userName, resetUrl, userRole),
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      throw new Error(`Failed to send password reset email: ${error}`);
    }
  }

  private getInvitationTemplate(
    restaurantName: string,
    invitedByName: string,
    invitationUrl: string,
    staffName?: string
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 16px; margin-bottom: 20px;">
          <h2 style="color: #2563eb; margin: 0 0 16px 0; font-size: 24px;">
            You're invited to join ${restaurantName}!
          </h2>
          
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0;">
            Hi${staffName ? ` ${staffName}` : ""},
          </p>
          
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 16px 0;">
            <strong>${invitedByName}</strong> has invited you to join the team at 
            <strong>${restaurantName}</strong> on HospitalityAI.
          </p>
        </div>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="${invitationUrl}" 
             style="background-color: #2563eb; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">
            Accept Invitation
          </a>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; margin: 30px 0;">
          <p style="color: #64748b; font-size: 14px; margin: 0; line-height: 1.5;">
            <strong>What happens next?</strong><br>
            Click the button above to complete your registration and set up your account. 
            You'll be able to access training materials, take quizzes, and stay updated with restaurant operations.
          </p>
        </div>
        
        <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 20px 0;">
          This invitation will expire in 7 days. If you have any questions, please contact ${invitedByName}.
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
        
        <div style="text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            HospitalityAI - Restaurant Staff Management Platform
          </p>
        </div>
      </div>
    `;
  }

  private getPasswordResetTemplate(
    email: string,
    userName: string,
    resetUrl: string,
    userRole: "restaurant" | "staff"
  ): string {
    const roleTitle =
      userRole === "restaurant" ? "Restaurant Owner" : "Staff Member";

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #fef2f2; padding: 30px; border-radius: 16px; margin-bottom: 20px; border-left: 4px solid #ef4444;">
          <h2 style="color: #dc2626; margin: 0 0 16px 0; font-size: 24px;">
            🔐 Password Reset Request
          </h2>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0;">
            Hi ${userName},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 16px 0;">
            We received a request to reset the password for your ${roleTitle} account 
            (<strong>${email}</strong>) on HospitalityAI.
          </p>
        </div>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="${resetUrl}" 
             style="background-color: #dc2626; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.2);">
            Reset Password
          </a>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; margin: 30px 0;">
          <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0; line-height: 1.5;">
            <strong>Security Notice:</strong>
          </p>
          <ul style="color: #64748b; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.5;">
            <li>This link will expire in 1 hour for security</li>
            <li>If you didn't request this reset, please ignore this email</li>
            <li>Your password won't change until you click the link above</li>
          </ul>
        </div>
        
        <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 20px 0;">
          If you're having trouble clicking the button, copy and paste this link into your browser:<br>
          <span style="word-break: break-all; color: #3b82f6;">${resetUrl}</span>
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
        
        <div style="text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            HospitalityAI - Restaurant Staff Management Platform<br>
            This is an automated message, please do not reply.
          </p>
        </div>
      </div>
    `;
  }
}
