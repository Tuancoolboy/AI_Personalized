import { describe, expect, it } from "vitest";
import { suggestToolForIndividual } from "./individual-tool-suggest";

describe("suggestToolForIndividual", () => {
  it("maps roles to leaning-appropriate tools", () => {
    expect(suggestToolForIndividual("marketing").tool).toBe("chatgpt");
    expect(suggestToolForIndividual("ke-toan").tool).toBe("copilot");
    expect(suggestToolForIndividual("kinh-doanh").tool).toBe("claude");
    expect(suggestToolForIndividual("van-hanh").tool).toBe("claude");
  });

  it("defaults to claude for unknown/empty role", () => {
    expect(suggestToolForIndividual(null).tool).toBe("claude");
    expect(suggestToolForIndividual("unknown").tool).toBe("claude");
  });
});
