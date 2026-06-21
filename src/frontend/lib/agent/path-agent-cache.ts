// Cache lộ trình + audit log (server-side, real mode). Demo mode cache ở client (localStorage).
// Cache key = (user_id, fingerprint). Audit log chỉ metadata — KHÔNG tên/email.

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { AgentFlowInput, AgentPathResult } from "./path-agent-types";

// Đọc lộ trình đã cache khớp fingerprint (chỉ real mode).
export async function readCachedPath(
  userId: string,
  fingerprint: string,
): Promise<AgentPathResult | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("generated_learning_paths")
      .select("result")
      .eq("user_id", userId)
      .eq("fingerprint", fingerprint)
      .maybeSingle();
    if (error || !data?.result) return null;
    return data.result as AgentPathResult;
  } catch {
    return null;
  }
}

// Lưu cache (upsert theo user_id) + ghi audit log. Lỗi không chặn response.
export async function writeCachedPath(
  userId: string,
  input: AgentFlowInput,
  result: AgentPathResult,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = createSupabaseServiceClient();

    await supabase.from("generated_learning_paths").upsert(
      {
        user_id: userId,
        fingerprint: result.fingerprint,
        flow: result.flow,
        source: result.source,
        result,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    // Audit log: metadata-only (eval / bằng chứng). KHÔNG PII.
    await supabase.from("agent_path_logs").insert({
      user_id: userId,
      input: {
        flow: input.flow,
        roleId: input.roleId,
        aiLevel: input.aiLevel,
        skillSlugs: input.skillSlugs,
        completedModuleIds: input.completedModuleIds,
      },
      output: {
        source: result.source,
        orderedModuleIds: result.orderedModuleIds,
        missingSkills: result.missingSkills,
        fingerprint: result.fingerprint,
      },
    });
  } catch (err) {
    console.error("[path-agent-cache]", err);
  }
}
