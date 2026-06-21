"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchManagerRecommendations,
  isSupabaseBackend,
  type ManagerMemberRecommendations,
} from "@/lib/client-api";
import { CardListSkeleton } from "@/components/skeletons/page-skeletons";

function formatSnapshotDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function assignmentLabel(status: ManagerMemberRecommendations["assignmentStatus"]) {
  if (status === "active") return "Đang giao lộ trình";
  if (status === "completed") return "Đã hoàn thành lộ trình";
  return "Chưa giao lộ trình";
}

function MemberRecommendationCard({
  member,
}: {
  member: ManagerMemberRecommendations;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">{member.employeeName}</p>
          <p className="mt-0.5 text-xs text-ink-3">
            {member.department ?? "Chưa có phòng ban"}
            {member.roleId ? ` · ${member.roleId}` : ""}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
            member.assignmentStatus === "active"
              ? "bg-brand/10 text-brand"
              : member.hasSnapshot
                ? "bg-accent/10 text-accent"
                : "bg-secondary text-ink-3"
          }`}
        >
          {member.hasSnapshot
            ? assignmentLabel(member.assignmentStatus)
            : "Chưa có gợi ý"}
        </span>
      </div>

      {member.topRecommendation ? (
        <div className="mt-4 rounded-xl border border-brand/20 bg-brand-soft/40 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-brand">
            Gợi ý tiếp theo
          </p>
          <p className="mt-1 font-display text-lg font-bold text-ink">
            {member.topRecommendation.moduleTitle ??
              member.topRecommendation.moduleId}
          </p>
          <p className="mt-1 text-sm text-ink-2">
            {member.topRecommendation.score} điểm phù hợp ·{" "}
            {member.topRecommendation.reasonLabels.slice(0, 2).join(" · ")}
          </p>
          {member.snapshotAt && (
            <p className="mt-2 text-xs text-ink-3">
              Snapshot {formatSnapshotDate(member.snapshotAt)}
              {member.engineVersion ? ` · engine ${member.engineVersion}` : ""}
            </p>
          )}
          {member.recommendations.length > 1 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 text-sm font-semibold text-brand hover:underline"
            >
              {expanded ? "Thu gọn" : "Tại sao lộ trình này?"}
            </button>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-line bg-secondary/30 px-4 py-3 text-sm text-ink-3">
          Nhân viên chưa mở <strong className="text-ink-2">/lo-trinh</strong>{" "}
          sau khi bật Supabase — gợi ý sẽ lưu khi họ xem lộ trình cá nhân.
        </p>
      )}

      {expanded && member.recommendations.length > 0 && (
        <ul className="mt-4 space-y-3 border-t border-line pt-4">
          {member.recommendations.map((item) => (
            <li
              key={item.moduleId}
              className="rounded-xl border border-line bg-secondary/20 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink">
                  {item.moduleTitle ?? item.moduleId}
                </p>
                <span className="text-xs font-bold text-brand">
                  {item.score} điểm
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-ink-2">
                {item.reasonLabels.map((label) => (
                  <li key={label} className="flex gap-2">
                    <span className="text-brand">•</span>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function ManagerPathAssignments() {
  const useDemo = !isSupabaseBackend();
  const [members, setMembers] = useState<ManagerMemberRecommendations[]>([]);
  const [persisted, setPersisted] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchManagerRecommendations()
      .then((res) => {
        if (cancelled) return;
        setMembers(res.members);
        setPersisted(Boolean(res.persisted));
        setMessage(res.message ?? "");
      })
      .catch(() => {
        if (cancelled) return;
        setMembers([]);
        setMessage(
          useDemo
            ? "Không tải được gợi ý demo."
            : "Không tải được gợi ý lộ trình.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [useDemo]);

  const withSnapshot = members.filter((m) => m.hasSnapshot).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/quan-ly"
            className="text-xs font-semibold text-ink-3 hover:text-brand"
          >
            ← Về dashboard
          </Link>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-accent">
            Phân công lộ trình
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Gợi ý lộ trình theo nhân viên
          </h1>
          <p className="mt-1.5 text-sm text-ink-2">
            Xem module gợi ý cho từng người và lý do — trước khi giao
            lộ trình chính thức (Phase 2.3).
          </p>
          <p className="mt-1 text-xs font-medium text-ink-3">
            {persisted
              ? `${withSnapshot}/${members.length} nhân viên có snapshot gợi ý`
              : useDemo
                ? "Dữ liệu demo"
                : message || "Chưa có dữ liệu gợi ý"}
          </p>
        </div>
      </div>

      {loading ? (
        <CardListSkeleton count={3} />
      ) : members.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line bg-card p-10 text-center">
          <p className="font-display text-lg font-semibold text-ink">
            Chưa có nhân viên
          </p>
          <p className="mt-1 text-sm text-ink-3">
            {message || "Mời nhân viên qua link công ty trước."}
          </p>
          <Link
            href="/quan-ly/nhan-vien"
            className="mt-4 inline-flex h-10 items-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground"
          >
            Quản lý nhân viên →
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {members.map((member) => (
            <MemberRecommendationCard key={member.userId} member={member} />
          ))}
        </ul>
      )}

      <p className="mt-8 rounded-xl border border-line bg-secondary/30 px-4 py-3 text-xs text-ink-3">
        Giao lộ trình chính thức (`learning_assignments`) sẽ có ở Phase 2.3.
        Hiện tại trang này giúp quản lý review gợi ý lộ trình và lý do trước khi
        quyết định phân công.
      </p>
    </div>
  );
}
