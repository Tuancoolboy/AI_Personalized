import { ROLES } from "@/lib/roles";
import type { RoleId } from "@/lib/openai";

export type LessonLink = {
  id: string;
  title: string;
  href: string;
};

const KEYWORD_MODULE_MAP: Array<{
  pattern: RegExp;
  roleId: RoleId;
  moduleIds: string[];
}> = [
  {
    pattern: /quảng cáo|ads|google|facebook|performance|cpc|cpa|chiến dịch/i,
    roleId: "marketing",
    moduleIds: ["marketing-m5", "marketing-m1"],
  },
  {
    pattern: /social media|facebook post|instagram|tiktok/i,
    roleId: "marketing",
    moduleIds: ["marketing-m2", "marketing-m5"],
  },
  {
    pattern: /email|content|caption|copywriting/i,
    roleId: "marketing",
    moduleIds: ["marketing-m2", "marketing-m6"],
  },
  {
    pattern:
      /(?:(?:slide|thuyết trình|report)\s+.*(?:quảng cáo|ads|campaign|social))|(?:(?:quảng cáo|ads|campaign|social).*(?:slide|thuyết trình|report))/i,
    roleId: "marketing",
    moduleIds: ["marketing-m5", "marketing-m4"],
  },
  {
    pattern: /bán hàng|email chốt|sale|khách hàng/i,
    roleId: "kinh-doanh",
    moduleIds: ["kinh-doanh-m1", "kinh-doanh-m2"],
  },
  {
    pattern: /hóa đơn|kế toán|sổ sách/i,
    roleId: "ke-toan",
    moduleIds: ["ke-toan-m1", "ke-toan-m2"],
  },
  {
    pattern: /chấm công|nghỉ phép|phép tồn|đi muộn|thiếu công/i,
    roleId: "van-hanh",
    moduleIds: ["van-hanh-m10", "van-hanh-m3"],
  },
  {
    pattern: /nhân sự|hr|hành chính|biên bản|email nội bộ|thông báo nội bộ/i,
    roleId: "van-hanh",
    moduleIds: ["van-hanh-m9", "van-hanh-m3"],
  },
];

export function pickRelatedLessonLinks(
  topicHint: string,
  scopeAnswer: string,
  roleId?: string | null,
): LessonLink[] {
  const haystack = `${topicHint} ${scopeAnswer}`.toLowerCase();
  const seen = new Set<string>();
  const links: LessonLink[] = [];

  function addModule(id: string, forceRoleId?: RoleId) {
    if (seen.has(id)) return;
    const roleKey = forceRoleId ?? roleId ?? inferRoleFromModuleId(id);
    const role = roleKey ? ROLES[roleKey] : null;
    const mod = role?.modules.find((m) => m.id === id);
    if (!mod) return;
    seen.add(id);
    links.push({
      id: mod.id,
      title: mod.title,
      href: `/lo-trinh/${mod.id}`,
    });
  }

  for (const rule of KEYWORD_MODULE_MAP) {
    if (rule.pattern.test(haystack)) {
      for (const moduleId of rule.moduleIds) {
        addModule(moduleId, rule.roleId);
      }
    }
  }

  if (links.length === 0 && roleId && ROLES[roleId as RoleId]) {
    for (const mod of ROLES[roleId as RoleId].modules.slice(0, 2)) {
      addModule(mod.id, roleId as RoleId);
    }
  }

  return links.slice(0, 3);
}

export function formatRelatedLessonLinksSection(links: LessonLink[]): string {
  if (links.length === 0) return "";
  const items = links
    .map((link) => `- [${link.title}](${link.href})`)
    .join("\n");
  return `\n\n**Bài học liên quan trên lộ trình:**\n${items}`;
}

function inferRoleFromModuleId(moduleId: string): RoleId | null {
  const prefix = moduleId.split("-m")[0];
  if (prefix && prefix in ROLES) return prefix as RoleId;
  return null;
}
