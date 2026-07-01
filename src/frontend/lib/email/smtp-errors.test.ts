import { describe, expect, it } from "vitest";
import {
  formatSmtpErrorMessage,
  getSmtpFailureReason,
} from "@/lib/email/smtp-errors";

describe("smtp-errors", () => {
  it("maps Gmail app password errors to actionable guidance", () => {
    const error = new Error(
      "Invalid login: 534-5.7.9 Application-specific password required. For more information, go to https://support.google.com/mail/?p=InvalidSecondFactor",
    );

    expect(getSmtpFailureReason(error)).toBe("gmail_app_password_required");
    expect(formatSmtpErrorMessage(error)).toContain("App Password");
  });

  it("maps generic auth failures", () => {
    const error = new Error("Invalid login: 535 Authentication failed");

    expect(getSmtpFailureReason(error)).toBe("smtp_auth_failed");
    expect(formatSmtpErrorMessage(error)).toContain("SMTP xác thực thất bại");
  });
});
