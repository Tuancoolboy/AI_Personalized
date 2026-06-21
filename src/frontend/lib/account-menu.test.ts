import { describe, expect, it } from "vitest";
import { getAccountInitials, getAccountMenuItems } from "@/lib/account-menu";

describe("account menu", () => {
  it("returns employee learning items without manager links", () => {
    const labels = getAccountMenuItems("employee").map((item) => item.label);

    expect(labels).toEqual([
      "Thông tin cá nhân",
      "Đổi thông tin",
      "Đổi mật khẩu",
      "Cập nhật email",
      "Lộ trình của tôi",
      "Kết quả học tập",
      "Đăng xuất",
    ]);
    expect(labels).not.toContain("Quản lý nhân viên");
  });

  it("adds manager management items", () => {
    const labels = getAccountMenuItems("manager").map((item) => item.label);

    expect(labels).toContain("Quản lý nhân viên");
    expect(labels).toContain("Quản lý phòng ban");
    expect(labels).toContain("Quản lý lộ trình");
    expect(labels).toContain("Báo cáo tiến độ");
    expect(labels).not.toContain("Lộ trình của tôi");
  });

  it("builds avatar initials from name and email fallback", () => {
    expect(getAccountInitials("Nguyễn Văn A", "a@example.com")).toBe("NA");
    expect(getAccountInitials("", "demo.user@example.com")).toBe("DE");
  });
});
