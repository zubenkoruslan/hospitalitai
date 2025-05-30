import dotenv from "dotenv";
import { EmailService } from "../services/emailService";

// Load environment variables
dotenv.config();

async function testEmailService() {
  console.log("🧪 Testing Email Service...\n");

  // Check if required environment variables are set
  const requiredVars = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "FROM_EMAIL",
  ];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error("❌ Missing required environment variables:");
    missingVars.forEach((varName) => console.error(`   - ${varName}`));
    console.error("\nPlease check your .env file configuration.");
    process.exit(1);
  }

  console.log("✅ Environment variables configured");
  console.log(`📧 SMTP Host: ${process.env.SMTP_HOST}`);
  console.log(`📬 From Email: ${process.env.FROM_EMAIL}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}\n`);

  try {
    const emailService = new EmailService();

    // Test SMTP connection
    console.log("🔌 Testing SMTP connection...");
    await emailService.verifyConnection();
    console.log("✅ SMTP connection successful!\n");

    // Test sending invitation email
    console.log("📤 Sending test invitation email...");
    const testEmail = process.env.SMTP_USER; // Send to yourself for testing
    const testToken = "test-token-123456789abcdef"; // Dummy token for testing

    await emailService.sendStaffInvitation(
      testEmail!,
      "Test Restaurant",
      "System Administrator",
      testToken,
      "Test Staff Member"
    );

    console.log(`✅ Test invitation email sent to ${testEmail}`);
    console.log("📮 Please check your inbox for the invitation email.\n");

    console.log("🎉 Email service is working correctly!");
    console.log("🔗 The invitation link would be:");
    console.log(
      `   ${process.env.FRONTEND_URL}/staff/accept-invitation/${testToken}`
    );
  } catch (error: any) {
    console.error("❌ Email service test failed:");
    console.error(`   ${error.message}`);

    if (error.code === "EAUTH") {
      console.error("\n💡 Authentication failed. Please check:");
      console.error("   - Your Gmail address is correct");
      console.error(
        "   - You're using an App Password (not your regular password)"
      );
      console.error(
        "   - 2-Factor Authentication is enabled on your Gmail account"
      );
    } else if (error.code === "ENOTFOUND") {
      console.error("\n💡 Network/DNS error. Please check:");
      console.error("   - Your internet connection");
      console.error("   - SMTP host configuration");
    }

    process.exit(1);
  }
}

// Run the test
testEmailService();
