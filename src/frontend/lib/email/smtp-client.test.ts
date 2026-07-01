import { describe, expect, it } from "vitest";
import { formatEmailFrom } from "@/lib/email/smtp-client";

describe("formatEmailFrom", () => {
  it("returns address only when name is missing", () => {
    expect(formatEmailFrom("noreply@example.com")).toBe("noreply@example.com");
    expect(formatEmailFrom("noreply@example.com", "  ")).toBe("noreply@example.com");
  });

  it("returns name + address for nodemailer when name is set", () => {
    expect(formatEmailFrom("noreply@example.com", "AI Trợ Lý")).toEqual({
      name: "AI Trợ Lý",
      address: "noreply@example.com",
    });
  });
});
