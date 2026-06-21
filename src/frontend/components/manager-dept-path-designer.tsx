"use client";

// Tab "Theo phòng ban" — PHÂN CẤP DỌC:
// 1) Chọn phòng ban + vị trí chính. 2) Kỹ năng áp cho CẢ phòng (mặc định).
// 3) Danh sách thành viên dọc: kỹ năng đang có (mặc định phòng) + nút "Tùy chỉnh".
// 4) Bung panel chỉnh kỹ năng riêng (override) → nhãn "đã chỉnh riêng".
// 5) Lưu: override cấp member + mặc định cấp department + gán lộ trình từng người.

import { useMemo, useState } from "react";
import { composePathFromSkills, getAvailableSkills } from "@/lib/roles";
import { getLearningModuleById } from "@/lib/learning-modules-data";
import {
  addDemoAssignment,
  getDemoDeptDesign,
  getDemoPositions,
  saveDemoDeptDesign,
  type DemoJobPosition,
} from "@/lib/demo-paths";
import {
  DEPARTMENT_OPTIONS,
  initialsOf,
  TEAM_MEMBERS,
} from "@/lib/team-data";

type SuggestedPath = {
  modules: { id: string; title: string }[];
  source: "agent" | "fallback";
};

// Cache preview client theo (phòng + danh sách kỹ năng) — khỏi gọi lại mỗi lần.
const PREVIEW_CACHE_KEY = "ai_troly_dept_path_preview";
const PREVIEW_CACHE_MAX_ENTRIES = 24;
const PREVIEW_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type PreviewCacheEntry = {
  value: SuggestedPath;
  savedAt: number;
};

function previewCacheKey(deptId: string, skills: string[]): string {
  return `${deptId}|${[...skills].sort().join(",")}`;
}

function readPreviewCacheStore(): Record<string, PreviewCacheEntry> {
  try {
    const raw = window.localStorage.getItem(PREVIEW_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PreviewCacheEntry | SuggestedPath>;
    const now = Date.now();
    const normalized: Record<string, PreviewCacheEntry> = {};

    for (const [key, entry] of Object.entries(parsed)) {
      if (entry && typeof entry === "object" && "value" in entry && "savedAt" in entry) {
        const row = entry as PreviewCacheEntry;
        if (now - row.savedAt < PREVIEW_CACHE_TTL_MS) {
          normalized[key] = row;
        }
        continue;
      }
      // Migrate entry cũ (chỉ SuggestedPath, không có savedAt)
      normalized[key] = {
        value: entry as SuggestedPath,
        savedAt: now,
      };
    }

    return normalized;
  } catch {
    return {};
  }
}

function prunePreviewCache(
  all: Record<string, PreviewCacheEntry>,
): Record<string, PreviewCacheEntry> {
  const now = Date.now();
  const fresh = Object.fromEntries(
    Object.entries(all).filter(([, row]) => now - row.savedAt < PREVIEW_CACHE_TTL_MS),
  );
  const sorted = Object.entries(fresh).sort((a, b) => b[1].savedAt - a[1].savedAt);
  return Object.fromEntries(sorted.slice(0, PREVIEW_CACHE_MAX_ENTRIES));
}

function readPreviewCache(key: string): SuggestedPath | null {
  try {
    const all = readPreviewCacheStore();
    const entry = all[key];
    if (!entry) return null;
    if (Date.now() - entry.savedAt >= PREVIEW_CACHE_TTL_MS) return null;
    return entry.value;
  } catch {
    return null;
  }
}

function writePreviewCache(key: string, value: SuggestedPath): void {
  try {
    const all = prunePreviewCache(readPreviewCacheStore());
    all[key] = { value, savedAt: Date.now() };
    window.localStorage.setItem(
      PREVIEW_CACHE_KEY,
      JSON.stringify(prunePreviewCache(all)),
    );
  } catch {
    // QuotaExceeded — xóa cache cũ rồi thử lại một lần
    try {
      window.localStorage.removeItem(PREVIEW_CACHE_KEY);
      window.localStorage.setItem(
        PREVIEW_CACHE_KEY,
        JSON.stringify({ [key]: { value, savedAt: Date.now() } }),
      );
    } catch {
      // bỏ qua — preview vẫn hiển thị, chỉ không cache
    }
  }
}

// Map id bài → {id,title} (loại id không có trong kho).
function idsToModules(ids: string[]): { id: string; title: string }[] {
  return ids
    .map((id) => {
      const m = getLearningModuleById(id);
      return m ? { id, title: m.title } : null;
    })
    .filter((x): x is { id: string; title: string } => x !== null);
}

// Fallback rule-based khi Agent lỗi/không key.
function fallbackPath(skills: string[]): SuggestedPath {
  return {
    modules: composePathFromSkills(skills).map((m) => ({
      id: m.id,
      title: m.title,
    })),
    source: "fallback",
  };
}

function sameSkills(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((s) => sb.has(s));
}

export function DepartmentPathDesigner() {
  const positions = useMemo<DemoJobPosition[]>(() => getDemoPositions(), []);
  const allSkills = useMemo(() => getAvailableSkills(), []);
  const skillLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of allSkills) m.set(s.slug, s.label);
    return m;
  }, [allSkills]);

  const [deptId, setDeptId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [deptSkills, setDeptSkills] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<SuggestedPath | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [toast, setToast] = useState("");

  const position = positions.find((p) => p.id === positionId);
  const deptLabel = DEPARTMENT_OPTIONS.find((d) => d.id === deptId)?.label ?? "";
  const members = useMemo(
    () => TEAM_MEMBERS.filter((m) => m.department === deptLabel),
    [deptLabel],
  );

  // Đổi phòng → nạp thiết kế đã lưu (nếu có), reset trạng thái.
  function handleDeptChange(id: string) {
    setDeptId(id);
    const saved = id ? getDemoDeptDesign(id) : null;
    if (saved) {
      setPositionId(saved.positionId);
      setDeptSkills(saved.deptSkills);
      setOverrides(saved.overrides);
    } else {
      setPositionId("");
      setDeptSkills([]);
      setOverrides({});
    }
    setExpandedId(null);
    setSuggested(null);
  }

  // Chọn vị trí → gợi ý sẵn kỹ năng vị trí cho phòng (nếu chưa tick gì).
  function handlePositionChange(id: string) {
    setPositionId(id);
    const pos = positions.find((p) => p.id === id);
    if (pos && deptSkills.length === 0) setDeptSkills(pos.skills ?? []);
    setSuggested(null);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function effectiveSkills(memberId: string): string[] {
    return overrides[memberId] ?? deptSkills;
  }

  function toggleDeptSkill(slug: string) {
    setDeptSkills((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
    setSuggested(null);
  }

  function toggleMemberSkill(memberId: string, slug: string) {
    setOverrides((prev) => {
      const base = prev[memberId] ?? deptSkills;
      const next = base.includes(slug)
        ? base.filter((s) => s !== slug)
        : [...base, slug];
      return { ...prev, [memberId]: next };
    });
  }

  function clearOverride(memberId: string) {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
  }

  // Gọi Agent thật (skill list phòng) → có key sinh OpenAI, lỗi/không key fallback.
  async function suggestPath() {
    if (deptSkills.length === 0) {
      showToast("Tick ít nhất 1 kỹ năng cho phòng để AI gợi ý.");
      return;
    }
    const cacheKey = previewCacheKey(deptId, deptSkills);
    const cached = readPreviewCache(cacheKey);
    if (cached) {
      setSuggested(cached);
      return;
    }
    setSuggesting(true);
    try {
      const res = await fetch("/api/agent/lo-trinh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillSlugs: deptSkills,
          roleId: deptId,
          aiLevel: 1,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        path: { orderedModuleIds: string[]; source: "agent" | "fallback" };
      };
      const result: SuggestedPath = {
        modules: idsToModules(data.path.orderedModuleIds),
        source: data.path.source,
      };
      if (result.modules.length === 0) throw new Error("empty");
      setSuggested(result);
      writePreviewCache(cacheKey, result);
    } catch {
      const fb = fallbackPath(deptSkills);
      setSuggested(fb);
      writePreviewCache(cacheKey, fb);
    } finally {
      setSuggesting(false);
    }
  }

  function saveAll() {
    if (!deptId || !position) {
      showToast("Chọn phòng ban và vị trí chính trước.");
      return;
    }
    if (deptSkills.length === 0) {
      showToast("Tick ít nhất 1 kỹ năng cho phòng.");
      return;
    }
    saveDemoDeptDesign({ deptId, positionId, deptSkills, overrides });
    // Gán lộ trình cho từng thành viên theo kỹ năng hiệu lực (override ?? phòng).
    for (const m of members) {
      const modules = composePathFromSkills(effectiveSkills(m.id));
      addDemoAssignment({
        memberId: m.id,
        memberName: m.fullName,
        positionId: position.id,
        positionName: position.name,
        moduleIds: modules.map((x) => x.id),
      });
    }
    showToast(`Đã lưu & gán cho ${members.length} thành viên phòng ${deptLabel}.`);
  }

  return (
    <div className="mt-6 space-y-5">
      {/* 1. Phòng ban + vị trí chính */}
      <section className="space-y-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-ink">Phòng ban</label>
            <select
              value={deptId}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="mt-1.5 w-full rounded-xl border-2 border-line bg-card px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
            >
              <option value="">— Chọn phòng ban —</option>
              {DEPARTMENT_OPTIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-ink">
              Vị trí chính
            </label>
            <select
              value={positionId}
              onChange={(e) => handlePositionChange(e.target.value)}
              className="mt-1.5 w-full rounded-xl border-2 border-line bg-card px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
            >
              <option value="">— Chọn vị trí —</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {deptId && positionId && (
        <>
          {/* 2. Kỹ năng áp cho cả phòng */}
          <section className="space-y-3 rounded-2xl border border-brand/30 bg-brand-soft p-5 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-ink">
                Kỹ năng áp cho CẢ phòng {deptLabel}
              </h2>
              <p className="text-xs text-ink-3">
                Mặc định cho mọi thành viên. Ai cần khác thì tùy chỉnh riêng bên
                dưới.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {allSkills.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => toggleDeptSkill(s.slug)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                    deptSkills.includes(s.slug)
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-line bg-card text-ink-2 hover:border-brand"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          {/* 3+4. Danh sách thành viên dọc + panel chỉnh riêng */}
          <section className="space-y-2 rounded-2xl border border-line bg-card p-5 shadow-sm">
            <h2 className="text-sm font-bold text-ink">
              Thành viên phòng ({members.length})
            </h2>
            {members.length === 0 && (
              <p className="text-sm text-ink-3">Phòng này chưa có thành viên.</p>
            )}
            <ul className="divide-y divide-line">
              {members.map((m) => {
                const eff = effectiveSkills(m.id);
                const overridden =
                  m.id in overrides && !sameSkills(overrides[m.id], deptSkills);
                const open = expandedId === m.id;
                return (
                  <li key={m.id} className="py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-brand/15 text-xs font-bold text-brand">
                        {initialsOf(m.fullName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-ink">
                            {m.fullName}
                          </span>
                          {overridden && (
                            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
                              đã chỉnh riêng
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {eff.length === 0 ? (
                            <span className="text-xs text-ink-3">
                              (chưa có kỹ năng)
                            </span>
                          ) : (
                            eff.map((slug) => (
                              <span
                                key={slug}
                                className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-ink-2"
                              >
                                {skillLabel.get(slug) ?? slug}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedId(open ? null : m.id)}
                        className="flex-none rounded-full border-2 border-line px-3 py-1.5 text-xs font-semibold text-ink-2 transition hover:border-brand"
                      >
                        {open ? "Đóng" : "Tùy chỉnh"}
                      </button>
                    </div>

                    {open && (
                      <div className="mt-3 rounded-xl border border-line bg-secondary/30 p-3">
                        <p className="mb-2 text-xs text-ink-2">
                          Kỹ năng riêng cho <b>{m.fullName}</b> (ghi đè mặc định
                          phòng):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {allSkills.map((s) => {
                            const on = eff.includes(s.slug);
                            return (
                              <button
                                key={s.slug}
                                type="button"
                                onClick={() => toggleMemberSkill(m.id, s.slug)}
                                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                  on
                                    ? "border-brand bg-brand text-brand-foreground"
                                    : "border-line bg-card text-ink-2 hover:border-brand"
                                }`}
                              >
                                {on ? "✓ " : ""}
                                {s.label}
                              </button>
                            );
                          })}
                        </div>
                        {overridden && (
                          <button
                            type="button"
                            onClick={() => clearOverride(m.id)}
                            className="mt-3 text-xs font-semibold text-ink-3 underline hover:text-brand"
                          >
                            Bỏ chỉnh riêng — theo kỹ năng phòng
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* 5. AI gợi ý + Lưu & gán */}
          <section className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void suggestPath()}
                disabled={suggesting}
                className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {suggesting ? "Đang gợi ý…" : "✨ AI gợi ý lộ trình"}
              </button>
              <button
                type="button"
                onClick={saveAll}
                className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2"
              >
                Lưu &amp; gán cho cả phòng
              </button>
            </div>

            {suggested && (
              <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-sm text-ink-2">
                    Lộ trình mặc định phòng (<b>{suggested.modules.length}</b>{" "}
                    bài):
                  </p>
                  <span
                    className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-brand"
                    title={
                      suggested.source === "agent"
                        ? "Do Agent AI sắp xếp"
                        : "Sắp xếp theo quy tắc (chưa bật AI)"
                    }
                  >
                    {suggested.source === "agent" ? "AI" : "Quy tắc"}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {suggested.modules.map((m, i) => (
                    <li key={m.id} className="flex items-center gap-2 text-sm">
                      <span className="text-ink-3">{i + 1}.</span>
                      <span className="font-medium text-ink">{m.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-brand-foreground shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
