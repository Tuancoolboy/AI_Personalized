import { describe, expect, it } from "vitest";
import {
  getPostAuthPath,
  isEmployeeAppPath,
  isManagerEmail,
  sanitizeNextPath,
} from "./post-auth-redirect";

describe("post-auth-redirect", () => {
  it("routes manager to quan-ly", () => {
    expect(getPostAuthPath(null, "quanly@congty.vn")).toBe("/quan-ly");
  });

  it("routes real-mode manager from membership to quan-ly", () => {
    expect(getPostAuthPath(null, "nv@congty.vn", "manager")).toBe("/quan-ly");
  });

  it("does not use email pattern when real-mode userType is employee", () => {
    expect(getPostAuthPath(null, "manager@congty.vn", "employee")).toBe(
      "/onboarding",
    );
  });

  it("routes platform admin to van-hanh", () => {
    expect(getPostAuthPath(null, "admin@c2-app-009.io.vn", "employee", true)).toBe(
      "/van-hanh",
    );
  });

  it("routes pending learner to cho-kich-hoat", () => {
    expect(getPostAuthPath("kinh-doanh", "nv@congty.vn", "employee", false, false)).toBe(
      "/cho-kich-hoat",
    );
  });

  it("routes onboarded employee to lo-trinh", () => {
    expect(getPostAuthPath("kinh-doanh", "nv@congty.vn")).toBe("/lo-trinh");
  });

  it("routes new employee to onboarding", () => {
    expect(getPostAuthPath(null, "nv@congty.vn")).toBe("/onboarding");
  });

  it("detects employee app paths", () => {
    expect(isEmployeeAppPath("/lo-trinh")).toBe(true);
    expect(isEmployeeAppPath("/quan-ly")).toBe(false);
  });

  it("detects manager email", () => {
    expect(isManagerEmail("manager@x.com")).toBe(true);
    expect(isManagerEmail("nv@x.com")).toBe(false);
  });

  it("sanitizes next paths", () => {
    expect(sanitizeNextPath("/moi/abc/accept")).toBe("/moi/abc/accept");
    expect(sanitizeNextPath("//evil.example")).toBeNull();
    expect(sanitizeNextPath("https://evil.example")).toBeNull();
  });
});
