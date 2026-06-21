import type { ReasonCode } from "@/lib/agents/recommender";
import { formatReasonCodes } from "@/lib/agents/reason-codes";
import { getLearningModuleById } from "@/lib/learning-modules-data";
import { departmentIdToLabel, isDepartmentId } from "@/lib/team-data";

export type ManagerRecommendationItem = {
  moduleId: string;
  moduleTitle: string | null;
  score: number;
  reasonLabels: string[];
};

export type ManagerMemberRecommendations = {
  userId: string;
  employeeName: string;
  department: string | null;
  roleId: string | null;
  hasSnapshot: boolean;
  snapshotAt: string | null;
  engineVersion: string | null;
  topRecommendation: ManagerRecommendationItem | null;
  recommendations: ManagerRecommendationItem[];
  assignmentStatus: "none" | "active" | "completed";
};

type RecommendationRow = {
  user_id: string;
  candidate_module_id: string;
  score: number;
  reason_codes: string[] | null;
  engine_version: string;
  created_at: string;
};

const BATCH_WINDOW_MS = 3_000;

export function groupLatestRecommendationsByUser(
  rows: RecommendationRow[],
): Map<string, RecommendationRow[]> {
  const byUser = new Map<string, RecommendationRow[]>();
  for (const row of rows) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }

  const latestBatch = new Map<string, RecommendationRow[]>();
  for (const [userId, list] of byUser) {
    const sorted = [...list].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const anchor = new Date(sorted[0].created_at).getTime();
    const batch = sorted.filter(
      (row) => Math.abs(new Date(row.created_at).getTime() - anchor) <= BATCH_WINDOW_MS,
    );
    latestBatch.set(userId, batch.sort((a, b) => b.score - a.score));
  }
  return latestBatch;
}

export function mapRecommendationRows(
  rows: RecommendationRow[],
): ManagerRecommendationItem[] {
  return rows.map((row) => ({
    moduleId: row.candidate_module_id,
    moduleTitle: getLearningModuleById(row.candidate_module_id)?.title ?? null,
    score: row.score,
    reasonLabels: formatReasonCodes(
      (row.reason_codes ?? []) as ReasonCode[],
    ),
  }));
}

export function isMissingRecommendationsSchema(message: string): boolean {
  return /learning_recommendations|does not exist/i.test(message);
}

export const DEMO_MANAGER_RECOMMENDATIONS: ManagerMemberRecommendations[] = [
  {
    userId: "demo-user-1",
    employeeName: "Nguyễn Văn A",
    department: "Kinh doanh",
    roleId: "kinh-doanh",
    hasSnapshot: true,
    snapshotAt: new Date(Date.now() - 7200_000).toISOString(),
    engineVersion: "1.0.0",
    topRecommendation: {
      moduleId: "kinh-doanh-m2",
      moduleTitle: "Viết email chốt sale bằng AI",
      score: 88,
      reasonLabels: [
        "Phù hợp vai trò công việc của bạn",
        "Đúng mức độ AI hiện tại",
      ],
    },
    recommendations: [
      {
        moduleId: "kinh-doanh-m2",
        moduleTitle: "Viết email chốt sale bằng AI",
        score: 88,
        reasonLabels: [
          "Phù hợp vai trò công việc của bạn",
          "Đúng mức độ AI hiện tại",
        ],
      },
      {
        moduleId: "kinh-doanh-m3",
        moduleTitle: "Soạn kịch bản gọi điện / chat Zalo",
        score: 74,
        reasonLabels: ["Phù hợp vai trò công việc của bạn"],
      },
    ],
    assignmentStatus: "none",
  },
  {
    userId: "demo-user-2",
    employeeName: "Trần Thị B",
    department: "Marketing",
    roleId: "marketing",
    hasSnapshot: false,
    snapshotAt: null,
    engineVersion: null,
    topRecommendation: null,
    recommendations: [],
    assignmentStatus: "none",
  },
];

export function buildMemberRecommendationsView(input: {
  userId: string;
  employeeName: string;
  departmentId: string | null;
  roleId: string | null;
  recommendationRows: RecommendationRow[];
  assignmentStatus: "none" | "active" | "completed";
}): ManagerMemberRecommendations {
  const batchMap = groupLatestRecommendationsByUser(input.recommendationRows);
  const batch = batchMap.get(input.userId) ?? [];
  const recommendations = mapRecommendationRows(batch);
  const department =
    input.departmentId && isDepartmentId(input.departmentId)
      ? departmentIdToLabel(input.departmentId)
      : input.departmentId;

  return {
    userId: input.userId,
    employeeName: input.employeeName,
    department,
    roleId: input.roleId,
    hasSnapshot: recommendations.length > 0,
    snapshotAt: batch[0]?.created_at ?? null,
    engineVersion: batch[0]?.engine_version ?? null,
    topRecommendation: recommendations[0] ?? null,
    recommendations,
    assignmentStatus: input.assignmentStatus,
  };
}
