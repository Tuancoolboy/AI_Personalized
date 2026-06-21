// Lưu trữ tạm vị trí công việc + lộ trình gán (demo mode, localStorage).
// Real mode dùng bảng job_positions / member_positions / learning_paths /
// path_modules / path_assignments (migration 0015).

export type DemoJobPosition = {
  id: string;
  name: string;
  skills: string[]; // slug kỹ năng mong muốn
};

export type DemoAssignedPath = {
  id: string;
  memberId: string;
  memberName: string;
  positionId: string;
  positionName: string;
  moduleIds: string[];
  assignedAt: string;
};

const KEYS = {
  positions: "ai_troly_demo_job_positions",
  assignments: "ai_troly_demo_path_assignments",
  deptDesigns: "ai_troly_demo_dept_designs",
} as const;

// Thiết kế lộ trình theo phòng ban: kỹ năng mặc định cả phòng + override từng member.
export type DemoDeptDesign = {
  deptId: string;
  positionId: string;
  deptSkills: string[]; // mặc định áp cho mọi thành viên
  overrides: Record<string, string[]>; // memberId -> kỹ năng riêng (ghi đè)
  savedAt: string;
};

// Vị trí mẫu sẵn (gắn kỹ năng để demo builder ngay).
const DEFAULT_POSITIONS: DemoJobPosition[] = [
  {
    id: "pos-hr-tuyendung",
    name: "Chuyên viên Tuyển dụng",
    skills: ["loc-cv", "email-noi-bo", "van-ban-hanh-chinh"],
  },
  {
    id: "pos-hanhchinh",
    name: "Nhân viên Hành chính",
    skills: ["van-ban-hanh-chinh", "tom-tat-tai-lieu", "cham-cong-nghi-phep"],
  },
  {
    id: "pos-hrtonghop",
    name: "HR Tổng hợp",
    skills: ["loc-cv", "cham-cong-nghi-phep", "email-noi-bo", "van-ban-hanh-chinh"],
  },
];

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function getDemoPositions(): DemoJobPosition[] {
  const stored = read<DemoJobPosition[] | null>(KEYS.positions, null);
  if (stored && stored.length > 0) return stored;
  write(KEYS.positions, DEFAULT_POSITIONS);
  return DEFAULT_POSITIONS;
}

export function addDemoPosition(name: string, skills: string[]): DemoJobPosition {
  const positions = getDemoPositions();
  const entry: DemoJobPosition = {
    id: `pos-${Date.now()}`,
    name,
    skills,
  };
  write(KEYS.positions, [...positions, entry]);
  return entry;
}

// Thiết kế phòng ban: lưu/đọc theo deptId (map deptId -> design).
export function getDemoDeptDesign(deptId: string): DemoDeptDesign | null {
  const all = read<Record<string, DemoDeptDesign>>(KEYS.deptDesigns, {});
  return all[deptId] ?? null;
}

export function saveDemoDeptDesign(
  input: Omit<DemoDeptDesign, "savedAt">,
): DemoDeptDesign {
  const all = read<Record<string, DemoDeptDesign>>(KEYS.deptDesigns, {});
  const entry: DemoDeptDesign = { ...input, savedAt: new Date().toISOString() };
  all[input.deptId] = entry;
  write(KEYS.deptDesigns, all);
  return entry;
}

export function getDemoAssignments(): DemoAssignedPath[] {
  return read<DemoAssignedPath[]>(KEYS.assignments, []);
}

export function addDemoAssignment(
  input: Omit<DemoAssignedPath, "id" | "assignedAt">,
): DemoAssignedPath {
  const entry: DemoAssignedPath = {
    ...input,
    id: `path-${Date.now()}`,
    assignedAt: new Date().toISOString(),
  };
  // Thay assignment cũ của cùng nhân viên (1 lộ trình active / người trong demo).
  const others = getDemoAssignments().filter((a) => a.memberId !== input.memberId);
  write(KEYS.assignments, [entry, ...others]);
  return entry;
}
