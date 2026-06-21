// Audit log (handoff §0.2): ghi hành động nhạy cảm vào bảng events (0005).
// Đổi quyền, mời/xóa thành viên, đổi tool, gán lộ trình → ghi 1 dòng sự kiện.
// Chưa cần dashboard giám sát; chỉ cần dữ liệu được ghi để sau bật lên.
// Dùng service role (server) để ghi cho đúng user_id, không phụ thuộc RLS insert.

import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type AuditAction =
  | "org.ai_tool.update"
  | "department.ai_tool.update"
  | "member.invite"
  | "member.role.update"
  | "path.assign"
  | "platform_admin.action";

// Ghi 1 sự kiện audit. Không chặn luồng chính nếu lỗi (best-effort).
// KHÔNG log nội dung nhạy cảm (đáp án học viên, dữ liệu cá nhân) vào properties.
export async function logAuditEvent(
  userId: string,
  action: AuditAction,
  properties: Record<string, unknown> = {},
): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient();
    await supabase.from("events").insert({
      user_id: userId,
      event_name: `audit:${action}`,
      properties_json: properties,
    });
  } catch (err) {
    console.error("[audit-log]", action, err);
  }
}
