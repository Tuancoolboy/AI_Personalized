"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  fetchPathRecommendations,
  type PathRecommendationItem,
} from "@/lib/client-api";
import { buildRecommendationSummary } from "@/lib/recommender-context";
import { rankModules } from "@/lib/agents/recommender";
import {
  buildGlobalModuleCatalog,
  inferAssessmentGapModuleIds,
} from "@/lib/training-modules-adapter";
import { formatReasonCodes } from "@/lib/agents/reason-codes";
import { InlinePanelSkeleton } from "@/components/skeletons/page-skeletons";
import { getLearningModuleById } from "@/lib/learning-modules-data";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { RoleId } from "@/lib/openai";

type PathRecommendationsPanelProps = {
  roleId: RoleId;
  aiLevel: number;
  masteredModuleIds: string[];
  goalTags?: string[];
  onRecommendationsLoaded?: (items: PathRecommendationItem[]) => void;
};

export function PathRecommendationsPanel({
  roleId,
  aiLevel,
  masteredModuleIds,
  goalTags = [],
  onRecommendationsLoaded,
}: PathRecommendationsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<PathRecommendationItem[]>([]);
  const [engineVersion, setEngineVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (forcePersist = false) => {
      setRefreshing(true);
      try {
        if (isSupabaseConfigured()) {
          const res = await fetchPathRecommendations({
            limit: 5,
            persist: true,
            forcePersist,
          });
          setItems(res.recommendations);
          setEngineVersion(res.engineVersion);
          onRecommendationsLoaded?.(res.recommendations);
          return;
        }

        const ranked = rankModules({
          organizationId: null,
          roleId,
          aiLevel,
          skipBasicModules: aiLevel >= 5,
          masteredModuleIds,
          assessmentGapModuleIds: inferAssessmentGapModuleIds(roleId, aiLevel),
          goalTags,
          modules: buildGlobalModuleCatalog(),
          limit: 5,
        });

        const mapped = ranked.map((item) => {
          const reasonLabels = formatReasonCodes(item.reasonCodes);
          const title =
            getLearningModuleById(item.moduleId)?.title ?? item.moduleId;
          return {
            ...item,
            reasonLabels,
            summary: buildRecommendationSummary(title, reasonLabels),
          };
        });
        setEngineVersion("1.0.0");
        setItems(mapped);
        onRecommendationsLoaded?.(mapped);
      } catch (err) {
        console.warn("[path-recommendations]", err);
        setItems([]);
        onRecommendationsLoaded?.([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      roleId,
      aiLevel,
      masteredModuleIds,
      goalTags,
      onRecommendationsLoaded,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await load(false);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-sm">
        <InlinePanelSkeleton className="h-16 rounded-xl" />
      </div>
    );
  }

  if (items.length === 0) return null;

  const top = items[0];
  const topModule = top ? getLearningModuleById(top.moduleId) : null;

  return (
    <div className="mt-6 rounded-2xl border border-brand/20 bg-brand-soft/40 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
            Gợi ý lộ trình
          </p>
          <h2 className="mt-1 font-display text-lg font-bold text-ink">
            {topModule
              ? `Tiếp theo nên học: ${topModule.title}`
              : "Lộ trình được cá nhân hóa cho bạn"}
          </h2>
          {top?.summary && (
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              {top.summary}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {topModule && (
            <Link
              href={`/lo-trinh/${top.moduleId}`}
              className="inline-flex h-9 items-center rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2"
            >
              Bắt đầu học →
            </Link>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex h-9 items-center rounded-full border border-brand/30 bg-card px-4 text-sm font-semibold text-brand transition hover:bg-brand-soft"
          >
            {expanded ? "Thu gọn" : "Tại sao lộ trình này?"}
          </button>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void load(true)}
            className="inline-flex h-9 items-center rounded-full border border-line bg-card px-3 text-xs font-semibold text-ink-2 transition hover:border-brand/40 disabled:opacity-50"
            title="Tính lại gợi ý và lưu snapshot mới"
          >
            {refreshing ? "Đang tính…" : "Làm mới"}
          </button>
        </div>
      </div>

      {expanded && (
        <ul className="mt-4 space-y-3 border-t border-brand/15 pt-4">
          {items.map((item) => {
            const mod = getLearningModuleById(item.moduleId);
            return (
              <li
                key={item.moduleId}
                className="rounded-xl border border-line bg-card p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/lo-trinh/${item.moduleId}`}
                    className="font-semibold text-brand hover:underline"
                  >
                    {mod?.title ?? item.moduleId}
                  </Link>
                  <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand">
                    {item.score} điểm phù hợp
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
            );
          })}
          {engineVersion && (
            <p className="text-xs text-ink-3">
              Engine {engineVersion} — quy tắc cố định, không dùng LLM.
            </p>
          )}
        </ul>
      )}
    </div>
  );
}

export function recommendedModuleIds(
  items: PathRecommendationItem[],
): Set<string> {
  return new Set(items.map((item) => item.moduleId));
}

export function recommendationRankMap(
  items: PathRecommendationItem[],
): Map<string, number> {
  return new Map(items.map((item, index) => [item.moduleId, index]));
}

export function sortModulesByRecommendation<T extends { id: string }>(
  modules: T[],
  rank: Map<string, number>,
  progress: Record<string, string | undefined>,
): T[] {
  return [...modules].sort((a, b) => {
    const aDone = progress[a.id] === "hoan-thanh";
    const bDone = progress[b.id] === "hoan-thanh";
    if (aDone !== bDone) return aDone ? 1 : -1;

    const aRank = rank.get(a.id);
    const bRank = rank.get(b.id);
    if (aRank !== undefined && bRank !== undefined) return aRank - bRank;
    if (aRank !== undefined) return -1;
    if (bRank !== undefined) return 1;
    return 0;
  });
}
