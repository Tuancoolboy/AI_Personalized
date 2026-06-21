import { describe, expect, it } from "vitest";
import {
  buildCoachAddresses,
  buildFriendlyAddress,
  buildGreetingAddress,
  extractGivenName,
  resolveFullDisplayName,
} from "@/lib/display-name";

describe("display-name", () => {
  it("resolveFullDisplayName prefers profile then metadata then email", () => {
    expect(
      resolveFullDisplayName({
        profileFullName: "Đặng Minh Hải",
        metadataFullName: "Meta Name",
        email: "minhhai@example.com",
      }),
    ).toBe("Đặng Minh Hải");

    expect(
      resolveFullDisplayName({
        profileFullName: null,
        metadataFullName: "Đặng Minh Hải",
        email: "minhhai@example.com",
      }),
    ).toBe("Đặng Minh Hải");

    expect(
      resolveFullDisplayName({
        profileFullName: null,
        metadataFullName: null,
        email: "minhhai@example.com",
      }),
    ).toBe("minhhai");
  });

  it("extractGivenName uses last token", () => {
    expect(extractGivenName("Đặng Minh Hải")).toBe("Hải");
  });

  it("buildGreetingAddress uses given name for neutral preference", () => {
    expect(buildGreetingAddress("Đặng Minh Hải")).toBe("Hải");
    expect(buildGreetingAddress("Nguyễn Thị Lan", "chi")).toBe("chị Lan");
    expect(buildGreetingAddress(null)).toBe("bạn");
  });

  it("buildCoachAddresses separates named greeting and casual body", () => {
    expect(buildCoachAddresses("Đặng Minh Hải")).toEqual({
      named: "bạn",
      casual: "bạn",
    });
    expect(buildCoachAddresses("Nguyễn Thị Lan", "chi")).toEqual({
      named: "chị Lan",
      casual: "chị",
    });
    expect(buildFriendlyAddress("Đặng Minh Hải")).toBe("bạn");
  });
});
