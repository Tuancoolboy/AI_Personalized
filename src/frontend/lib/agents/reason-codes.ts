import type { ReasonCode } from "@/lib/agents/recommender";

/** Nhãn tiếng Việt cho reason codes — không dùng LLM. */
export const REASON_CODE_LABELS: Record<ReasonCode, string> = {
  "role-match": "Phù hợp vai trò công việc của bạn",
  "assessment-gap": "Bù khoảng trống từ bài đánh giá đầu vào",
  "goal-alignment": "Khớp mục tiêu học tập bạn chọn",
  "level-fit": "Đúng mức độ AI hiện tại",
  "manager-priority": "Quản lý ưu tiên module này",
  "prerequisite-ready": "Đã hoàn thành bài tiên quyết",
  "common-foundation": "Nền tảng chung cho mọi nhân viên",
};

export function formatReasonCodes(codes: ReasonCode[]): string[] {
  return codes.map((code) => REASON_CODE_LABELS[code] ?? code);
}
