import { describe, expect, it } from "vitest";
import {
  buildInviteAcceptPath,
  buildInvitePath,
  buildInviteUrl,
  generateInviteToken,
  isInviteTokenShape,
} from "@/lib/company-invite-links";

describe("company-invite-links", () => {
  it("generates URL-safe bearer tokens", () => {
    const token = generateInviteToken();

    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(isInviteTokenShape(token)).toBe(true);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("builds token-only invite paths", () => {
    const token = "abcDEF_123-safeTOKEN4567890abcdef";

    expect(buildInvitePath(token)).toBe(`/moi/${token}`);
    expect(buildInviteAcceptPath(token)).toBe(`/moi/${token}/accept`);
    expect(buildInviteUrl("https://ai-tro-ly.example", token)).toBe(
      `https://ai-tro-ly.example/moi/${token}`,
    );
  });

  it("rejects short or non-url-safe tokens", () => {
    expect(isInviteTokenShape("short")).toBe(false);
    expect(isInviteTokenShape("abc.def.ghi.that.is.long.enough")).toBe(false);
  });
});
