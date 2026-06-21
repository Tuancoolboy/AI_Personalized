"use client";

// Panel hiển thị lộ trình do Agent sinh (2 luồng). Gọi /api/agent/lo-trinh 1 lần,
// cache client (demo) để không gọi lại mỗi lần mở trang; nút "Cập nhật lộ trình"
// ép sinh lại. Real mode: server tự cache theo fingerprint.

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDemoProfile, getDemoProgress } from "@/lib/demo-storage";
import { getLearningModuleById } from "@/lib/learning-modules-data";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { AgentPathResult } from "@/lib/agent/path-agent-types";

const CACHE_KEY = "ai_troly_agent_path_v1";

type Hints = {
  roleId: string;
  aiLevel: number;
  completedModuleIds: string[];
  dailyTasks: string[];
};

// Chữ ký client để biết khi nào cần gọi lại (demo). role|level|completed.
function signature(h: Hints): string {
  return `${h.roleId}|${h.aiLevel}|${[...h.completedModuleIds].sort().join(",")}`;
}

function readDemoHints(): Hints {
  const prof = getDemoProfile();
  const prog = getDemoProgress();
  const completed = Object.entries(prog)
    .filter(([, s]) => s === "hoan-thanh")
    .map(([id]) => id);
  return {
    roleId: prof?.roleId ?? "khac",
    aiLevel: prof?.assessment?.aiLevel ?? 0,
    completedModuleIds: completed,
    dailyTasks: prof?.dailyTasks ?? [],
  };
}

function readCache(sig: string): AgentPathResult | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { sig: string; path: AgentPathResult };
    return parsed.sig === sig ? parsed.path : null;
  } catch {
    return null;
  }
}

function writeCache(sig: string, path: AgentPathResult): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ sig, path }));
  } catch {
    // ignore quota
  }
}

// Gọi API (đọc cache demo trước). Trả AgentPathResult hoặc null nếu dùng cache.
// Throw khi lỗi mạng/API để component hiển thị thông báo.
async function requestPath(force: boolean): Promise<AgentPathResult> {
  const hints = readDemoHints();
  const sig = signature(hints);

  if (!force && !isSupabaseConfigured()) {
    const cached = readCache(sig);
    if (cached) return cached;
  }

  const res = await fetch("/api/agent/lo-trinh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...hints, forceRefresh: force }),
  });
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as { path: AgentPathResult };
  if (!isSupabaseConfigured()) writeCache(sig, data.path);
  return data.path;
}

export function AgentPathPanel() {
  const [path, setPath] = useState<AgentPathResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await requestPath(false);
        if (!cancelled) setPath(result);
      } catch {
        if (!cancelled) {
          setError(
            "Chưa tạo được lộ trình AI. Bạn vẫn xem được lộ trình bên dưới.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRefresh() {
    setLoading(true);
    setError("");
    try {
      const result = await requestPath(true);
      setPath(result);
    } catch {
      setError("Chưa tạo được lộ trình AI. Bạn vẫn xem được lộ trình bên dưới.");
    } finally {
      setLoading(false);
    }
  }

  if (!path && !loading && !error) return null;

  return (
    <section className="rounded-2xl border border-orange-200 bg-orange-50/60 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-orange-900">
            Lộ trình AI gợi ý cho bạn
          </h2>
          {path && (
            <span
              className="rounded-full bg-orange-200 px-2 py-0.5 text-xs font-medium text-orange-800"
              title={
                path.source === "agent"
                  ? "Do Agent AI sắp xếp"
                  : "Sắp xếp theo quy tắc (chưa bật AI)"
              }
            >
              {path.source === "agent" ? "AI" : "Quy tắc"}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={loading}
          className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-60"
        >
          {loading ? "Đang tạo…" : "Cập nhật lộ trình"}
        </button>
      </div>

      {error && <p className="mb-2 text-sm text-orange-700">{error}</p>}

      {path && (
        <>
          {path.summary && (
            <p className="mb-3 text-sm text-stone-700">{path.summary}</p>
          )}
          <ol className="space-y-3">
            {path.groups.map((g, gi) => (
              <li key={`${g.title}-${gi}`}>
                <p className="text-sm font-semibold text-stone-800">{g.title}</p>
                {g.reason && (
                  <p className="mb-1 text-xs text-stone-500">{g.reason}</p>
                )}
                <ul className="space-y-1">
                  {g.moduleIds.map((id) => {
                    const mod = getLearningModuleById(id);
                    return (
                      <li key={id}>
                        <Link
                          href={`/lo-trinh/${id}`}
                          className="text-sm text-orange-700 hover:underline"
                        >
                          {mod?.title ?? id}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>

          {path.missingSkills.length > 0 && (
            <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-800">
              Chưa có bài cho: {path.missingSkills.join(", ")}.
            </p>
          )}
        </>
      )}
    </section>
  );
}
