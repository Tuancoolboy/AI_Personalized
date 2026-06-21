import { describe, expect, it } from "vitest";
import { getAuthLinkErrorContent } from "./auth-link-errors";

describe("auth-link-errors", () => {
  it("maps otp_expired", () => {
    const msg = getAuthLinkErrorContent(
      "otp_expired",
      "access_denied",
      "Email+link+is+invalid+or+has+expired",
    );
    expect(msg.title).toContain("hết hạn");
  });

  it("maps access_denied with expired description", () => {
    const msg = getAuthLinkErrorContent(
      null,
      "access_denied",
      "Email link is invalid or has expired",
    );
    expect(msg.title).toContain("hết hạn");
  });
});
