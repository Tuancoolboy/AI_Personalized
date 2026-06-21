import { describe, expect, it } from "vitest";
import {
  buildCompanyEntryPath,
  dedupeOrganizationSlug,
  isValidOrganizationSlug,
  slugifyOrganizationName,
} from "@/lib/organization-slug";

describe("organization-slug", () => {
  it("slugifies Vietnamese organization names", () => {
    expect(slugifyOrganizationName("Công ty ABC")).toBe("cong-ty-abc");
    expect(slugifyOrganizationName("  VinUni AI  ")).toBe("vinuni-ai");
  });

  it("validates slug shape", () => {
    expect(isValidOrganizationSlug("cong-ty-abc")).toBe(true);
    expect(isValidOrganizationSlug("A")).toBe(false);
    expect(isValidOrganizationSlug("bad_slug")).toBe(false);
  });

  it("dedupes taken slugs with numeric suffix", () => {
    const taken = new Set(["cong-ty-abc", "cong-ty-abc-2"]);
    expect(dedupeOrganizationSlug("cong-ty-abc", taken)).toBe("cong-ty-abc-3");
  });

  it("builds company entry paths", () => {
    expect(buildCompanyEntryPath("vinuni-ai")).toBe("/c/vinuni-ai");
  });
});
