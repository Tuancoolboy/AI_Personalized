import { NextResponse } from "next/server";
import { fetchModulesForRole } from "@/lib/learning-modules";

const VALID_ROLES = new Set([
  "kinh-doanh",
  "ke-toan",
  "marketing",
  "van-hanh",
  "khac",
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roleId = searchParams.get("role_id")?.trim() ?? "";
  const aiLevel = Number(searchParams.get("ai_level") ?? "0");

  if (!roleId || !VALID_ROLES.has(roleId)) {
    return NextResponse.json(
      { ok: false, error: "role_id không hợp lệ." },
      { status: 400 },
    );
  }

  const modules = await fetchModulesForRole(roleId, aiLevel);
  return NextResponse.json({ ok: true, modules, source: "learning_modules" });
}
