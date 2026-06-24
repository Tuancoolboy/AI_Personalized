import { describe, expect, it } from "vitest";
import { buildAvatarOptions, buildAvatarUrl } from "@/lib/app-avatar";

describe("app avatar", () => {
  it("loads the full Alohe avatar catalog from grouped CDN ids", () => {
    const options = buildAvatarOptions("demo user");
    const aloheOptions = options.filter((option) => option.provider === "alohe");

    expect(aloheOptions).toHaveLength(133);
    expect(aloheOptions[0]).toMatchObject({
      id: "vibrent_1",
      label: "Vibrent 1",
    });
    expect(aloheOptions.at(-1)).toMatchObject({
      id: "upstream_22",
      label: "Upstream 22",
    });
  });

  it("builds Alohe CDN URLs for newly available avatars", () => {
    expect(buildAvatarUrl({ provider: "alohe", id: "upstream_22" })).toBe(
      "https://cdn.jsdelivr.net/gh/alohe/avatars/png/upstream_22.png",
    );
  });
});
