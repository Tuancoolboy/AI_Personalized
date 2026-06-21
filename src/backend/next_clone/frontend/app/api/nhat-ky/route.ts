import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return apiError("FORBIDDEN", "API nhật ký cần Supabase.");
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("time_logs")
    .select("id, hours_saved, usefulness, note, logged_at")
    .eq("user_id", session.userId)
    .order("logged_at", { ascending: false });

  if (error) {
    console.error("[nhat-ky-get]", error.message);
    return apiError("INTERNAL_ERROR", "Không đọc được nhật ký.");
  }

  const logs = (data ?? []).map((row) => ({
    id: row.id,
    hoursSaved: Number(row.hours_saved),
    usefulness: row.usefulness ?? undefined,
    note: row.note ?? undefined,
    loggedAt: row.logged_at,
  }));

  const totalHours = logs.reduce((sum, l) => sum + l.hoursSaved, 0);

  return apiOk({ logs, totalHours });
}

type NhatKyPayload = {
  hoursSaved?: unknown;
  usefulness?: unknown;
  note?: unknown;
};

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return apiError("FORBIDDEN", "API nhật ký cần Supabase.");
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  let body: NhatKyPayload;
  try {
    body = (await request.json()) as NhatKyPayload;
  } catch {
    return apiError("VALIDATION_ERROR", "JSON không hợp lệ.");
  }

  const hoursSaved =
    typeof body.hoursSaved === "number" ? body.hoursSaved : Number.NaN;
  const usefulness =
    typeof body.usefulness === "number" ? body.usefulness : undefined;
  const note = typeof body.note === "string" ? body.note.trim() : undefined;

  if (!Number.isFinite(hoursSaved) || hoursSaved <= 0 || hoursSaved > 24) {
    return apiError(
      "VALIDATION_ERROR",
      "Số giờ phải lớn hơn 0 và không quá 24.",
    );
  }
  if (
    usefulness !== undefined &&
    (!Number.isInteger(usefulness) || usefulness < 1 || usefulness > 10)
  ) {
    return apiError("VALIDATION_ERROR", "Mức hữu ích phải từ 1 đến 10.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("time_logs").insert({
    user_id: session.userId,
    hours_saved: hoursSaved,
    usefulness: usefulness ?? null,
    note: note || null,
  });

  if (error) {
    console.error("[nhat-ky-post]", error.message);
    return apiError("INTERNAL_ERROR", "Không ghi được nhật ký.");
  }

  const { data } = await supabase
    .from("time_logs")
    .select("id, hours_saved, usefulness, note, logged_at")
    .eq("user_id", session.userId)
    .order("logged_at", { ascending: false });

  const logs = (data ?? []).map((row) => ({
    id: row.id,
    hoursSaved: Number(row.hours_saved),
    usefulness: row.usefulness ?? undefined,
    note: row.note ?? undefined,
    loggedAt: row.logged_at,
  }));

  const totalHours = logs.reduce((sum, l) => sum + l.hoursSaved, 0);

  return apiOk({ logs, totalHours });
}
