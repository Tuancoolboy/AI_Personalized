import { describe, expect, it } from "vitest";
import {
  buildActivationEmail,
  resolveActivationRoleLabel,
} from "@/lib/email/templates/activation-email";

describe("activation-email template", () => {
  it("resolves known role ids to Vietnamese labels", () => {
    expect(resolveActivationRoleLabel("kinh-doanh")).toBe(
      "Nhân viên kinh doanh / bán hàng",
    );
    expect(resolveActivationRoleLabel(null)).toBeNull();
  });

  it("includes role label in html and text output", () => {
    const mail = buildActivationEmail({
      fullName: "Đặng Minh Hải",
      appUrl: "http://localhost:3000",
      roleLabel: "Nhân viên kinh doanh / bán hàng",
    });

    expect(mail.text).toContain("Vai trò: Nhân viên kinh doanh / bán hàng");
    expect(mail.html).toContain("Vai trò của bạn:");
    expect(mail.html).toContain("Nhân viên kinh doanh / bán hàng");
  });

  it("omits role block when role label is missing", () => {
    const mail = buildActivationEmail({
      fullName: "Đặng Minh Hải",
      appUrl: "http://localhost:3000",
    });

    expect(mail.text).not.toContain("Vai trò:");
    expect(mail.html).not.toContain("Vai trò của bạn:");
  });
});
