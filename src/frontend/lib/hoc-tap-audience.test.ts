import { describe, expect, it } from "vitest";
import { parseHocTapAudience } from "@/lib/hoc-tap-audience";

describe("hoc-tap audience", () => {
  it("parses a community audience without creating membership", () => {
    expect(
      parseHocTapAudience({
        organization_id: "community-org",
        organization_name: "Cộng đồng AI Trợ Lý",
        audience_type: "community",
        department_id: "marketing",
      }),
    ).toEqual({
      organizationId: "community-org",
      organizationName: "Cộng đồng AI Trợ Lý",
      type: "community",
      departmentId: "marketing",
    });
  });

  it("parses an invited company audience", () => {
    expect(
      parseHocTapAudience({
        organization_id: "company-a",
        organization_name: "Công ty A",
        audience_type: "company",
        department_id: "kinh-doanh",
      }),
    ).toMatchObject({
      organizationId: "company-a",
      type: "company",
    });
  });

  it("rejects malformed RPC data", () => {
    expect(() => parseHocTapAudience(null)).toThrow(
      "Không xác định được không gian Học tập.",
    );
    expect(() =>
      parseHocTapAudience({
        organization_id: "",
        organization_name: "Cộng đồng",
        audience_type: "community",
      }),
    ).toThrow("Không xác định được không gian Học tập.");
  });
});
