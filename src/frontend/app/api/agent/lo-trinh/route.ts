// Route Agent sinh lộ trình cá nhân hóa (2 luồng). OpenAI server-side, KHÔNG lộ key.
// Cache theo fingerprint: không gọi OpenAI khi mở lại trang; chỉ sinh lại khi
// fingerprint đổi hoặc forceRefresh ("Cập nhật lộ trình").

import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import {
  buildDeptPreviewInput,
  computeFingerprint,
  resolveFlowInput,
  type AgentInputHints,
} from "@/lib/agent/path-agent-input";
import { generatePath } from "@/lib/agent/path-agent";
import { readCachedPath, writeCachedPath } from "@/lib/agent/path-agent-cache";
import { canAccessLearning, loadLearningActivationRecord } from "@/lib/learning-activation";

export const runtime = "nodejs";

type Payload = AgentInputHints & {
  forceRefresh?: unknown;
  // Preview phòng ban (quản lý): truyền skill list trực tiếp.
  skillSlugs?: unknown;
  primaryTool?: unknown;
};

export async function POST(request: Request) {
  const session = await resolveApiSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập để tạo lộ trình.");
  }
  if (session.mode === "supabase") {
    const access = await loadLearningActivationRecord(session.userId);
    if (!canAccessLearning(access)) {
      return apiError("FORBIDDEN", "ACCOUNT_NOT_ACTIVATED");
    }
  }

  let body: Payload = {};
  try {
    body = (await request.json()) as Payload;
  } catch {
    // Body rỗng vẫn hợp lệ (supabase mode tự resolve từ DB).
  }

  const forceRefresh = body.forceRefresh === true;

  // Nhánh PREVIEW PHÒNG BAN: có skillSlugs → dựng input công ty trực tiếp, KHÔNG
  // đọc DB, KHÔNG ghi cache cá nhân (tránh ghi đè lộ trình riêng của quản lý).
  const previewSkills = Array.isArray(body.skillSlugs)
    ? body.skillSlugs.filter((x): x is string => typeof x === "string")
    : [];
  if (previewSkills.length > 0) {
    try {
      const input = buildDeptPreviewInput({
        skillSlugs: previewSkills,
        roleId: typeof body.roleId === "string" ? body.roleId : undefined,
        aiLevel: typeof body.aiLevel === "number" ? body.aiLevel : undefined,
        primaryTool:
          typeof body.primaryTool === "string" ? body.primaryTool : undefined,
      });
      const result = await generatePath(input, computeFingerprint(input));
      return apiOk({ path: result, cached: false });
    } catch (err) {
      console.error("[agent-lo-trinh:preview]", err);
      return apiError("INTERNAL_ERROR", "Không tạo được lộ trình. Thử lại sau.");
    }
  }

  try {
    const input = await resolveFlowInput(session, {
      roleId: body.roleId,
      aiLevel: body.aiLevel,
      completedModuleIds: body.completedModuleIds,
      dailyTasks: body.dailyTasks,
    });
    const fingerprint = computeFingerprint(input);

    // Cache hit (real mode) + không ép sinh lại → trả ngay, KHÔNG gọi OpenAI.
    if (!forceRefresh && session.mode === "supabase") {
      const cached = await readCachedPath(session.userId, fingerprint);
      if (cached && cached.fingerprint === fingerprint) {
        return apiOk({ path: cached, cached: true });
      }
    }

    const result = await generatePath(input, fingerprint);

    if (session.mode === "supabase") {
      await writeCachedPath(session.userId, input, result);
    }

    return apiOk({ path: result, cached: false });
  } catch (err) {
    console.error("[agent-lo-trinh]", err);
    return apiError("INTERNAL_ERROR", "Không tạo được lộ trình. Thử lại sau.");
  }
}
