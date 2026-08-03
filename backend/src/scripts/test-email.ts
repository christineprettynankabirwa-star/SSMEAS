// Sends a real, one-off SMTP test message using the settings in backend/.env.
import dotenv from "dotenv";

dotenv.config();

const run = async (): Promise<void> => {
  const recipient = process.argv[2] ?? process.env.TEST_EMAIL_TO;
  if (!recipient) {
    throw new Error("Provide a recipient: npm run test-email -- recipient@example.com");
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  if (!process.env.SMTP_HOST) throw new Error("SMTP_HOST is not configured in .env.");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be an integer between 1 and 65535.");
  }
  if (process.env.SMTP_USER && !process.env.SMTP_PASSWORD) {
    throw new Error("SMTP_PASSWORD is required when SMTP_USER is configured.");
  }

  // Import after dotenv so this script also works when invoked outside the HTTP server.
  const { sendAlertEmail } = await import("../services/notification-providers");
  console.info("Sending SSMEAS SMTP test", {
    recipient,
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true",
    authenticated: Boolean(process.env.SMTP_USER),
    from: process.env.EMAIL_FROM ?? "alerts@ssmeas.local",
  });

  await sendAlertEmail({
    notificationId: "test",
    recipient,
    subject: "SSMEAS alert email test",
    message: [
      "This is a direct SSMEAS email-delivery test.",
      "Test status: WARNING",
      `Sent at: ${new Date().toISOString()}`,
    ].join("\n"),
    tankName: "SMTP test tank",
  });

  console.info("SMTP server accepted the SSMEAS test email. Check the recipient inbox and spam folder.");
};

run().catch((error: unknown) => {
  console.error("SSMEAS email test failed:", error);
  process.exitCode = 1;
});
