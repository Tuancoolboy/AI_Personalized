// Phân quyền 3 tầng SaaS (handoff §0.2). Server-side helpers + hằng vai trò.
// platform_admin: nhà vận hành nền tảng (vượt RLS qua is_platform_admin()).
// org_admin/manager: admin trong tổ chức. member: nhân viên/người học.
// Nguyên tắc: least-privilege, mặc định từ chối; kiểm tra ở CẢ server lẫn RLS.

import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type PlatformRole = "platform_admin" | "org_admin" | "manager" | "member";

export type AccountType = "company" | "individual";

// Thứ bậc quyền — số lớn hơn = quyền cao hơn. Dùng để so sánh least-privilege.
const ROLE_RANK: Record<PlatformRole, number> = {
  member: 0,
  manager: 1,
  org_admin: 2,
  platform_admin: 3,
};

// Pure: role A có đủ quyền của role tối thiểu B không? (test được, không I/O)
export function roleSatisfies(role: PlatformRole, required: PlatformRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

// Pure: chuẩn hóa account_type, mặc định 'company' nếu không hợp lệ.
export function normalizeAccountType(value: string | null | undefined): AccountType {
  return value === "individual" ? "individual" : "company";
}

// Server: user có phải platform_admin không (đọc bảng platform_admins qua service role).
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

// Server: đọc account_type của user (mặc định 'company').
export async function getAccountType(userId: string): Promise<AccountType> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("id", userId)
      .maybeSingle();
    return normalizeAccountType(data?.account_type);
  } catch {
    return "company";
  }
}
