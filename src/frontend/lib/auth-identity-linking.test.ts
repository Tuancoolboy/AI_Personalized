import { describe, expect, it } from "vitest";
import {
  countIdentitiesForEmail,
  expectSingleUserPerEmail,
  normalizeAuthEmail,
  roundTripOAuthNextPath,
  shouldReuseExistingAccount,
} from "./auth-identity-linking";

describe("auth-identity-linking", () => {
  it("normalizes email for identity match", () => {
    expect(normalizeAuthEmail("  User@Example.COM ")).toBe("user@example.com");
    expect(normalizeAuthEmail("invalid")).toBeNull();
  });

  it("should reuse account when verified email matches", () => {
    expect(
      shouldReuseExistingAccount("nv@congty.vn", "NV@congty.vn"),
    ).toBe(true);
    expect(
      shouldReuseExistingAccount("nv@congty.vn", "other@congty.vn"),
    ).toBe(false);
  });

  it("preserves invite next through OAuth callback round-trip", () => {
    expect(
      roundTripOAuthNextPath("https://c2-app-009.vercel.app", "/moi/abc123"),
    ).toBe("/moi/abc123");
    expect(
      roundTripOAuthNextPath(
        "https://c2-app-009.vercel.app",
        "/c/acme-corp",
      ),
    ).toBe("/c/acme-corp");
  });

  it("sanitizes unsafe next on OAuth round-trip", () => {
    expect(
      roundTripOAuthNextPath("http://localhost:3000", "//evil.example"),
    ).toBe("/onboarding");
    expect(roundTripOAuthNextPath("http://localhost:3000", null)).toBe(
      "/onboarding",
    );
  });

  it("counts identities sharing the same email", () => {
    const identities = [
      { provider: "email", identity_data: { email: "a@test.local" } },
      { provider: "google", identity_data: { email: "a@test.local" } },
    ];
    expect(countIdentitiesForEmail(identities, "A@test.local")).toBe(2);
  });

  it("detects duplicate email registration errors", () => {
    expect(expectSingleUserPerEmail("User already registered")).toBe(true);
    expect(expectSingleUserPerEmail(null)).toBe(true);
    expect(expectSingleUserPerEmail("Invalid password")).toBe(false);
  });
});
