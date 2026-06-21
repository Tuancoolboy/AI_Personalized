"use client";

// Tab "Theo cá nhân": wizard chọn 1 nhân viên + vị trí → tick kỹ năng →
// AI gợi ý lộ trình (composePathFromSkills) → chỉnh +/− → gán. Giữ như cũ.

import { useMemo, useState } from "react";
import {
  composePathFromSkills,
  getAvailableSkills,
  type ComposedModule,
} from "@/lib/roles";
import {
  addDemoAssignment,
  getDemoPositions,
  type DemoJobPosition,
} from "@/lib/demo-paths";
import { TEAM_MEMBERS, type TeamMember } from "@/lib/team-data";

type Stage = "setup" | "skills" | "review" | "done";

export function MemberPathWizard() {
  const positions = useMemo<DemoJobPosition[]>(() => getDemoPositions(), []);
  const allSkills = useMemo(() => getAvailableSkills(), []);

  const [stage, setStage] = useState<Stage>("setup");
  const [memberId, setMemberId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [suggested, setSuggested] = useState<ComposedModule[]>([]);
  const [keptIds, setKeptIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");

  const position = positions.find((p) => p.id === positionId);
  const member = TEAM_MEMBERS.find((x) => x.id === memberId);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  function toSkills() {
    if (!member || !positionId) {
      showToast("Chọn nhân viên và vị trí chính trước.");
      return;
    }
    setSelectedSkills(position?.skills ?? []);
    setStage("skills");
  }

  function toggleSkill(slug: string) {
    setSelectedSkills((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  function suggestPath() {
    if (selectedSkills.length === 0) {
      showToast("Tick ít nhất 1 kỹ năng để AI gợi ý.");
      return;
    }
    const modules = composePathFromSkills(selectedSkills);
    setSuggested(modules);
    setKeptIds(new Set(modules.map((m) => m.id)));
    setStage("review");
  }

  function toggleModule(id: string) {
    setKeptIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function assign() {
    if (!member || !position) return;
    const moduleIds = suggested.filter((m) => keptIds.has(m.id)).map((m) => m.id);
    if (moduleIds.length === 0) {
      showToast("Giữ lại ít nhất 1 bài trước khi gán.");
      return;
    }
    addDemoAssignment({
      memberId: member.id,
      memberName: member.fullName,
      positionId: position.id,
      positionName: position.name,
      moduleIds,
    });
    setStage("done");
  }

  function reset() {
    setStage("setup");
    setMemberId("");
    setPositionId("");
    setSelectedSkills([]);
    setSuggested([]);
    setKeptIds(new Set());
  }

  return (
    <>
      <StepBar stage={stage} />

      {stage === "setup" && (
        <section className="mt-6 space-y-5 rounded-2xl border border-line bg-card p-5 shadow-sm">
          <div>
            <label className="text-sm font-semibold text-ink">Nhân viên</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border-2 border-line bg-card px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
            >
              <option value="">— Chọn nhân viên —</option>
              {TEAM_MEMBERS.map((m: TeamMember) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} · {m.department}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-ink">
              Vị trí chính (học trọn vẹn)
            </label>
            <select
              value={positionId}
              onChange={(e) => setPositionId(e.target.value)}
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
          <button
            type="button"
            onClick={toSkills}
            className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2"
          >
            Tiếp tục →
          </button>
        </section>
      )}

      {stage === "skills" && (
        <section className="mt-6 space-y-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
          <p className="text-sm text-ink-2">
            Tick <b>kỹ năng mong muốn</b> (đã chọn sẵn theo vị trí{" "}
            <b>{position?.name}</b>):
          </p>
          <div className="flex flex-wrap gap-2">
            {allSkills.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => toggleSkill(s.slug)}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                  selectedSkills.includes(s.slug)
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-line bg-card text-ink-2 hover:border-brand"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={suggestPath}
              className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              ✨ AI gợi ý lộ trình từ các kỹ năng này
            </button>
            <button
              type="button"
              onClick={() => setStage("setup")}
              className="inline-flex items-center justify-center rounded-full border-2 border-line bg-card px-5 py-2.5 text-sm font-semibold text-ink-2 transition hover:border-brand"
            >
              ← Quay lại
            </button>
          </div>
        </section>
      )}

      {stage === "review" && (
        <section className="mt-6 space-y-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
          <p className="text-sm text-ink-2">
            AI gợi ý <b>{suggested.length}</b> bài (tự sắp theo cấp độ). Bỏ tick
            bài không cần — giữ lại <b>{keptIds.size}</b> bài.
          </p>
          <ul className="space-y-2">
            {suggested.map((m, i) => (
              <li
                key={m.id}
                className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                  keptIds.has(m.id)
                    ? "border-brand/30 bg-brand-soft"
                    : "border-line bg-secondary/30 opacity-60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={keptIds.has(m.id)}
                  onChange={() => toggleModule(m.id)}
                  className="mt-1 h-4 w-4 accent-brand"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {i + 1}. {m.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ${
                        m.source.type === "foundation"
                          ? "bg-accent/15 text-accent"
                          : "bg-brand/15 text-brand"
                      }`}
                    >
                      {m.source.label}
                    </span>
                    <span className="text-ink-3">
                      {m.durationMin} phút · Cấp {m.level}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={assign}
              className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2"
            >
              Gán lộ trình cho {member?.fullName}
            </button>
            <button
              type="button"
              onClick={() => setStage("skills")}
              className="inline-flex items-center justify-center rounded-full border-2 border-line bg-card px-5 py-2.5 text-sm font-semibold text-ink-2 transition hover:border-brand"
            >
              ← Sửa kỹ năng
            </button>
          </div>
        </section>
      )}

      {stage === "done" && (
        <section className="mt-6 space-y-4 rounded-2xl border border-brand/25 bg-brand-soft p-6 text-center shadow-sm">
          <p className="text-4xl">✅</p>
          <h2 className="font-display text-xl font-bold text-ink">
            Đã gán lộ trình cho {member?.fullName}
          </h2>
          <p className="text-sm text-ink-2">
            Vị trí <b>{position?.name}</b> · {keptIds.size} bài học.
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2"
          >
            Thiết kế lộ trình khác
          </button>
        </section>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-brand-foreground shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}

function StepBar({ stage }: { stage: Stage }) {
  const steps = [
    { key: "setup", label: "Vị trí" },
    { key: "skills", label: "Kỹ năng" },
    { key: "review", label: "Chỉnh & gán" },
  ];
  const order = ["setup", "skills", "review", "done"];
  const currentIdx = order.indexOf(stage);
  return (
    <div className="mt-6 flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex flex-1 items-center gap-2">
          <div
            className={`grid h-8 w-8 flex-none place-items-center rounded-full text-sm font-bold ${
              currentIdx >= i
                ? "bg-brand text-brand-foreground"
                : "bg-secondary text-ink-3"
            }`}
          >
            {i + 1}
          </div>
          <span className="text-xs font-semibold text-ink-2">{s.label}</span>
          {i < steps.length - 1 && (
            <span className="hidden h-0.5 flex-1 bg-line sm:block" />
          )}
        </div>
      ))}
    </div>
  );
}
