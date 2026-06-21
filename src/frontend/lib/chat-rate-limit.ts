import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRateLimitPerDay } from "@/lib/openai";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export type ChatRateLimitResult = {
  allowed: boolean;
  used: number;
  limit: number;
  resetAt: string;
};

export async function checkChatRateLimit(
  userId: string,
): Promise<ChatRateLimitResult> {
  const limit = getRateLimitPerDay();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const resetAt = new Date(Date.now() + WINDOW_MS).toISOString();

  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("chat_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("used_at", since);

  if (error) {
    console.error("[chat-rate-limit]", error.message);
    return { allowed: true, used: 0, limit, resetAt };
  }

  const used = count ?? 0;
  return {
    allowed: used < limit,
    used,
    limit,
    resetAt,
  };
}

export async function recordChatUsage(userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("chat_usage").insert({ user_id: userId });
  if (error) {
    console.error("[chat-usage-insert]", error.message);
  }
}
