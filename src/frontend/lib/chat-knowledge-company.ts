import { AI_TOOLS, isPrimaryTool } from "@/lib/ai-tools-config";
import { getLearningModuleById } from "@/lib/learning-modules-data";
import { getRole, getFoundationModules } from "@/lib/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type RoleId } from "@/lib/openai";

const FOUNDATION_MODULE_IDS = new Set(
  getFoundationModules().map((mod) => mod.id),
);

function isMissingTableError(message: string): boolean {
  return /does not exist|learning_assignments|learning_path_modules|organization_members/i.test(
    message,
  );
}

export type AssignedPathModuleHint = {
  id: string;
  title: string;
  level: 1 | 2 | 3;
  isFoundation: boolean;
  isRequired: boolean;
};

export type OrganizationLearningContext = {
  organizationName: string | null;
  departmentId: RoleId | null;
  departmentLabel: string | null;
  companyTool: string | null;
  assignedPathTitle: string | null;
  assignedPathModules: AssignedPathModuleHint[];
};

const EMPTY_CONTEXT: OrganizationLearningContext = {
  organizationName: null,
  departmentId: null,
  departmentLabel: null,
  companyTool: null,
  assignedPathTitle: null,
  assignedPathModules: [],
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readLevel(value: unknown): 1 | 2 | 3 {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (n >= 3) return 3;
  if (n >= 2) return 2;
  return 1;
}

function firstRelation(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const [first] = value;
    return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
  }
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function formatAssignedModuleHint(mod: AssignedPathModuleHint): string {
  const levelLabel = mod.level === 1 ? "Nhập môn" : mod.level === 2 ? "Trung cấp" : "Nâng cao";
  const source = getLearningModuleById(mod.id)?.title ?? mod.title;
  const requiredLabel = mod.isRequired ? " | bắt buộc" : "";
  return `- [${levelLabel}] ${source} (${mod.id})${requiredLabel}`;
}

function mergeAssignedPathModules(
  current: AssignedPathModuleHint[],
  incoming: AssignedPathModuleHint[],
): AssignedPathModuleHint[] {
  const byId = new Map(current.map((mod) => [mod.id, mod]));
  for (const mod of incoming) {
    byId.set(mod.id, mod);
  }
  return [...byId.values()];
}

type PathModuleRow = {
  learning_path_id?: string | null;
  legacy_module_id?: string | null;
  sort_order?: number | null;
  is_required?: boolean | null;
  training_modules?: unknown;
};

function pathModuleRowsToHints(rows: PathModuleRow[]): AssignedPathModuleHint[] {
  const modules: AssignedPathModuleHint[] = [];
  for (const row of rows) {
    const trainingModule = firstRelation(row.training_modules);
    const legacyId =
      readString(row.legacy_module_id) ??
      readString(trainingModule?.legacy_module_id);
    if (!legacyId) continue;

    const title =
      readString(trainingModule?.title) ??
      getLearningModuleById(legacyId)?.title ??
      legacyId;
    modules.push({
      id: legacyId,
      title,
      level: readLevel(trainingModule?.level),
      isFoundation: FOUNDATION_MODULE_IDS.has(legacyId),
      isRequired: Boolean(row.is_required),
    });
  }
  return modules;
}

export function buildAssignedPathContext(
  assignmentRows: Array<{
    learning_path_id?: string | null;
    learning_paths?: unknown;
  }>,
  modulesByPathId: Map<string, PathModuleRow[]>,
): Pick<OrganizationLearningContext, "assignedPathTitle" | "assignedPathModules"> {
  const assignedPathTitles: string[] = [];
  const assignedPathModules: AssignedPathModuleHint[] = [];

  for (const currentAssignment of assignmentRows) {
    const path = firstRelation(currentAssignment?.learning_paths);
    const assignedPathTitle = readString(path?.title);
    if (assignedPathTitle) {
      assignedPathTitles.push(assignedPathTitle);
    }

    const pathId = readString(currentAssignment?.learning_path_id);
    if (!pathId) continue;

    assignedPathModules.push(
      ...pathModuleRowsToHints(modulesByPathId.get(pathId) ?? []),
    );
  }

  const assignedPathTitle =
    assignedPathTitles.length === 0
      ? null
      : assignedPathTitles.length === 1
        ? assignedPathTitles[0] ?? null
        : `${assignedPathTitles[0]} (+${assignedPathTitles.length - 1} lộ trình khác)`;

  return {
    assignedPathTitle,
    assignedPathModules: mergeAssignedPathModules([], assignedPathModules),
  };
}

function groupPathModuleRows(rows: PathModuleRow[]): Map<string, PathModuleRow[]> {
  const modulesByPathId = new Map<string, PathModuleRow[]>();
  for (const row of rows) {
    const pathId = readString(row.learning_path_id);
    if (!pathId) continue;
    const list = modulesByPathId.get(pathId) ?? [];
    list.push(row);
    modulesByPathId.set(pathId, list);
  }
  return modulesByPathId;
}

export function formatOrganizationLearningContext(
  input: OrganizationLearningContext,
): string {
  const lines: string[] = [];

  if (input.organizationName) {
    lines.push(`- Công ty: ${input.organizationName}`);
  }
  if (input.departmentLabel) {
    lines.push(`- Phòng ban: ${input.departmentLabel}`);
  }
  if (input.companyTool) {
    const tool = isPrimaryTool(input.companyTool)
      ? AI_TOOLS[input.companyTool]?.name ?? input.companyTool
      : input.companyTool;
    lines.push(`- Tool chính của công ty: ${tool}`);
  }
  if (input.assignedPathTitle) {
    lines.push(`- Lộ trình đang giao: ${input.assignedPathTitle}`);
  }
  if (input.assignedPathModules.length > 0) {
    lines.push("- Module trong lộ trình đang giao:");
    for (const mod of input.assignedPathModules.slice(0, 6)) {
      lines.push(formatAssignedModuleHint(mod));
    }
  }

  if (lines.length === 0) {
    return "";
  }

  lines.push(
    "",
    "Ưu tiên bám theo lộ trình công ty đang giao; chỉ bổ sung module ngoài lộ trình khi cần khớp nhu cầu cá nhân.",
  );

  return lines.join("\n");
}

export async function loadOrganizationLearningContext(
  userId: string,
): Promise<OrganizationLearningContext> {
  const supabase = await createSupabaseServerClient();

  const [membershipResult, assignmentResult] = await Promise.all([
    supabase
      .from("organization_members")
      .select(
        "organization_id, department_id, organizations(name, ai_tool)",
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(3),
    supabase
      .from("learning_assignments")
      .select(
        "learning_path_id, learning_paths(title, path_type, job_role_id)",
      )
      .eq("user_id", userId)
      .eq("status", "active")
      .order("assigned_at", { ascending: false })
      .limit(3),
  ]);

  if (membershipResult.error) {
    if (isMissingTableError(membershipResult.error.message)) {
      return EMPTY_CONTEXT;
    }
    console.warn(
      "[chat-knowledge-company] organization_members:",
      membershipResult.error.message,
    );
  }

  if (assignmentResult.error && !isMissingTableError(assignmentResult.error.message)) {
    console.warn(
      "[chat-knowledge-company] learning_assignments:",
      assignmentResult.error.message,
    );
  }

  const membershipRows = membershipResult.error
    ? []
    : Array.isArray(membershipResult.data)
      ? membershipResult.data
      : [];
  const membership = membershipRows[0] ?? null;
  const assignmentRows = assignmentResult.error
    ? []
    : Array.isArray(assignmentResult.data)
      ? assignmentResult.data
      : [];
  const org = firstRelation(membership?.organizations);
  const organizationName = readString(org?.name);
  const companyTool = readString(org?.ai_tool);
  const departmentId = readString(membership?.department_id) as RoleId | null;
  const departmentLabel = departmentId
    ? getRole(departmentId)?.shortLabel ?? departmentId
    : null;

  const pathIds = [
    ...new Set(
      assignmentRows
        .map((row) => readString(row.learning_path_id))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  let modulesByPathId = new Map<string, PathModuleRow[]>();
  if (pathIds.length > 0) {
    const { data: pathModuleRows, error: pathModulesError } = await supabase
      .from("learning_path_modules")
      .select(
        "learning_path_id, legacy_module_id, sort_order, is_required, training_modules(title, level, legacy_module_id)",
      )
      .in("learning_path_id", pathIds)
      .order("sort_order", { ascending: true });

    if (pathModulesError) {
      if (!isMissingTableError(pathModulesError.message)) {
        console.warn(
          "[chat-knowledge-company] learning_path_modules:",
          pathModulesError.message,
        );
      }
    } else {
      modulesByPathId = groupPathModuleRows(pathModuleRows ?? []);
    }
  }

  const { assignedPathTitle, assignedPathModules: mergedModules } =
    buildAssignedPathContext(assignmentRows, modulesByPathId);

  return {
    organizationName,
    departmentId,
    departmentLabel,
    companyTool,
    assignedPathTitle,
    assignedPathModules: mergedModules,
  };
}
