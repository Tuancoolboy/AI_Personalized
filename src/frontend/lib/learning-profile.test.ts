import { describe, expect, it } from "vitest";
import {
  parsePreferredAddress,
  preferredAddressLabel,
} from "./learning-profile";

describe("learning-profile", () => {
  it("defaults invalid address to neutral", () => {
    expect(parsePreferredAddress("invalid")).toBe("neutral");
    expect(preferredAddressLabel("neutral")).toBe("anh/chị");
    expect(preferredAddressLabel("chi")).toBe("chị");
  });
});
