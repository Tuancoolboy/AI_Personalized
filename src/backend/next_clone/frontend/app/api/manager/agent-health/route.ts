import { apiError, apiOk } from "@/lib/api-error";
import {
  buildDemoAgentHealthReport,
  loadAgentHealthReport,
} from "@/lib/agent-health";
import { requireManagerContext } from "@/lib/manager-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export async function GET() {
  const context = await requireManagerContext();
  if (!context) {
    return apiError("FORBIDDEN", "Chỉ quản lý mới xem được trạng thái agent.");
  }

  if (!isSupabaseConfigured() || context.membership.organizationId === "demo") {
    return apiOk(buildDemoAgentHealthReport(context.membership));
  }

  try {
    const supabase = createSupabaseServiceClient();
    const report = await loadAgentHealthReport(supabase, context.membership);
    return apiOk(report);
  } catch (err) {
    console.error("[manager/agent-health]", err);
    return apiError(
      "INTERNAL_ERROR",
      "Không tải được báo cáo agent. Thử lại sau.",
    );
  }
}
