import { describe, expect, it } from "vitest";
import { checkRateLimit, getClientIp } from "./rate-limit-memory";

describe("rate-limit-memory", () => {
  it("allows first request", () => {
    const key = `test-${Date.now()}-a`;
    const result = checkRateLimit(key, 3, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks after limit exceeded", () => {
    const key = `test-${Date.now()}-b`;
    checkRateLimit(key, 2, 60_000);
    checkRateLimit(key, 2, 60_000);
    const third = checkRateLimit(key, 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("getClientIp reads x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("203.0.113.1");
  });

  it("getClientIp falls back to unknown", () => {
    expect(getClientIp(new Request("http://localhost"))).toBe("unknown");
  });
});
