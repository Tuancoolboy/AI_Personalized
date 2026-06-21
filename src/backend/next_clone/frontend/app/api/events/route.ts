import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

const ALLOWED_EVENTS = new Set([
  "onboarding_complete",
  "lesson_view",
  "lesson_complete",
  "tutor_message_sent",
  "quiz_submitted",
  "quiz_passed",
  "journal_logged",
  "user_return",
  "landing_page_view",
  "lead_form_submit",
  "cta_click",
]);

type EventPayload = {
  eventName?: unknown;
  properties?: unknown;
};

export async function POST(request: Request) {
  let body: EventPayload;
  try {
    body = (await request.json()) as EventPayload;
  } catch {
    return apiError("VALIDATION_ERROR", "JSON không hợp lệ.");
  }

  const eventName =
    typeof body.eventName === "string" ? body.eventName.trim() : "";
  if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
    return apiError("VALIDATION_ERROR", "Tên sự kiện không hợp lệ.");
  }

  if (!isSupabaseConfigured()) {
    return apiOk({ persisted: false });
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  const properties =
    body.properties && typeof body.properties === "object"
      ? body.properties
      : {};

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("events").insert({
    user_id: session.userId,
    event_name: eventName,
    properties_json: properties,
  });

  if (error) {
    console.warn("[events-post]", error.message);
    return apiOk({ persisted: false });
  }

  return apiOk({ persisted: true });
}
