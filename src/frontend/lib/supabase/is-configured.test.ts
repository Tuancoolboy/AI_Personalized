import { describe, expect, it, afterEach } from "vitest";
import {
  detectUserTypeFromEmail,
  isSupabaseConfigured,
} from "./is-configured";

describe("is-configured", () => {
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const origPublishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  afterEach(() => {
    if (origUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    if (origKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origKey;
    if (origPublishable === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = origPublishable;
    }
  });

  it("isSupabaseConfigured false when env missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("isSupabaseConfigured true when url + anon key set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("isSupabaseConfigured true when url + publishable key set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("detectUserTypeFromEmail manager patterns", () => {
    expect(detectUserTypeFromEmail("quanly@congty.vn")).toBe("manager");
    expect(detectUserTypeFromEmail("hr@company.com")).toBe("manager");
    expect(detectUserTypeFromEmail("nhanvien@congty.vn")).toBe("employee");
  });
});
