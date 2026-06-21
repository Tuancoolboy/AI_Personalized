import { describe, expect, it } from "vitest";
import {
  buildOAuthCallbackUrl,
  resolveOAuthNextPath,
} from "./google-oauth";

describe("google-oauth", () => {
  it("builds callback URL with invite next path", () => {
    const url = buildOAuthCallbackUrl(
      "http://localhost:3000",
      "/moi/abc123",
    );
    expect(url).toBe(
      "http://localhost:3000/auth/callback?next=%2Fmoi%2Fabc123",
    );
  });

  it("builds callback URL with company entry next path", () => {
    const url = buildOAuthCallbackUrl(
      "https://app.example.com",
      "/c/acme-corp",
    );
    expect(url).toBe(
      "https://app.example.com/auth/callback?next=%2Fc%2Facme-corp",
    );
  });

  it("defaults unsafe next to onboarding", () => {
    expect(resolveOAuthNextPath("//evil.example")).toBe("/onboarding");
    const url = buildOAuthCallbackUrl("http://localhost:3000", "//evil");
    expect(url).toBe(
      "http://localhost:3000/auth/callback?next=%2Fonboarding",
    );
  });
});
