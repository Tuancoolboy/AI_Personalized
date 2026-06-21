import { describe, expect, it } from "vitest";
import {
  assertScoreInBand,
  loadGradingBenchmarkFixture,
  validateBenchmarkFixture,
} from "./grading-benchmark";

describe("grading benchmark fixture (P2-EVAL-01 scaffold)", () => {
  const fixture = loadGradingBenchmarkFixture();

  it("loads valid Vietnamese benchmark cases", () => {
    expect(validateBenchmarkFixture(fixture)).toEqual([]);
    expect(fixture.cases.length).toBeGreaterThanOrEqual(3);
  });

  it("assertScoreInBand respects tolerance", () => {
    const passCase = fixture.cases.find((c) => c.id === "kinh-doanh-email-pass");
    expect(passCase).toBeDefined();
    if (!passCase) return;

    expect(assertScoreInBand(80, passCase, fixture.tolerancePoints)).toBe(true);
    expect(assertScoreInBand(50, passCase, fixture.tolerancePoints)).toBe(false);
  });

  it("borderline case spans near pass threshold", () => {
    const borderline = fixture.cases.find(
      (c) => c.id === "kinh-doanh-email-borderline",
    );
    expect(borderline).toBeDefined();
    if (!borderline) return;

    expect(borderline.expectedScoreMin).toBeLessThan(70);
    expect(borderline.expectedScoreMax).toBeGreaterThanOrEqual(65);
  });
});
