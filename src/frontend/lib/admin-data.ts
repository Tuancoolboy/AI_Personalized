// Dữ liệu demo cho khu Quản trị nền tảng (/quan-tri) — platform_admin.
// Real mode sẽ thay bằng truy vấn service-role (organizations, organization_members,
// profiles, events). Demo dùng dữ liệu giả để show được ngay, không màn trắng.

export type AdminDeptTool = { department: string; tool: string };

export type AdminCompany = {
  id: string;
  name: string;
  employeeCount: number;
  managerCount: number;
  deptTools: AdminDeptTool[];
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  type: "company" | "individual";
  org: string;
  role: "manager" | "member";
};

export type AdminAuditEntry = {
  id: string;
  actor: string;
  action: string;
  detail: string;
  at: string;
};

export type AdminStats = {
  companies: number;
  users: number;
  individuals: number;
  lessonsCompleted: number;
};

const TOOL_LABEL: Record<string, string> = {
  claude: "Claude",
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  copilot: "Copilot",
};

export function toolLabel(tool: string): string {
  return TOOL_LABEL[tool] ?? tool;
}

export const DEMO_COMPANIES: AdminCompany[] = [
  {
    id: "org-1",
    name: "Công ty TNHH Minh An",
    employeeCount: 42,
    managerCount: 4,
    deptTools: [
      { department: "Kinh doanh", tool: "claude" },
      { department: "Kế toán", tool: "copilot" },
      { department: "Marketing", tool: "chatgpt" },
      { department: "Hành chính / HR", tool: "claude" },
    ],
  },
  {
    id: "org-2",
    name: "CP Thương mại Bình Minh",
    employeeCount: 18,
    managerCount: 2,
    deptTools: [
      { department: "Kinh doanh", tool: "chatgpt" },
      { department: "Kế toán", tool: "copilot" },
      { department: "Hành chính / HR", tool: "gemini" },
    ],
  },
  {
    id: "org-3",
    name: "Studio Sáng Tạo Vega",
    employeeCount: 9,
    managerCount: 1,
    deptTools: [
      { department: "Marketing", tool: "chatgpt" },
      { department: "Vận hành", tool: "claude" },
    ],
  },
];

export const DEMO_ADMIN_USERS: AdminUser[] = [
  { id: "u1", name: "Nguyễn Thu Hà", email: "ha.nt@minhan.vn", type: "company", org: "Công ty TNHH Minh An", role: "manager" },
  { id: "u2", name: "Trần Văn Minh", email: "minh.tv@minhan.vn", type: "company", org: "Công ty TNHH Minh An", role: "member" },
  { id: "u3", name: "Phạm Thị Lan", email: "lan.pt@minhan.vn", type: "company", org: "Công ty TNHH Minh An", role: "member" },
  { id: "u4", name: "Hoàng Quốc Bảo", email: "bao.hq@binhminh.vn", type: "company", org: "CP Thương mại Bình Minh", role: "manager" },
  { id: "u5", name: "Ngô Thanh Tú", email: "tu.nt@binhminh.vn", type: "company", org: "CP Thương mại Bình Minh", role: "member" },
  { id: "u6", name: "Lê Anh Khoa", email: "khoa.la@gmail.com", type: "individual", org: "(Cá nhân)", role: "member" },
  { id: "u7", name: "Vũ Mai Chi", email: "chi.vm@gmail.com", type: "individual", org: "(Cá nhân)", role: "member" },
];

export const DEMO_AUDIT_ENTRIES: AdminAuditEntry[] = [
  { id: "a1", actor: "ha.nt@minhan.vn", action: "Đổi công cụ AI phòng Kế toán", detail: "→ Copilot", at: "2 giờ trước" },
  { id: "a2", actor: "bao.hq@binhminh.vn", action: "Mời nhân viên mới", detail: "tu.nt@binhminh.vn · phòng Kinh doanh", at: "4 giờ trước" },
  { id: "a3", actor: "ha.nt@minhan.vn", action: "Gán lộ trình", detail: "Cả phòng Hành chính / HR · 9 bài", at: "Hôm qua" },
  { id: "a4", actor: "admin@vega.studio", action: "Đổi công cụ AI phòng Marketing", detail: "→ ChatGPT", at: "Hôm qua" },
  { id: "a5", actor: "bao.hq@binhminh.vn", action: "Cấp quyền quản lý", detail: "cho mai.tt@binhminh.vn", at: "2 ngày trước" },
];

export function getDemoAdminStats(): AdminStats {
  const companies = DEMO_COMPANIES.length;
  const users = DEMO_ADMIN_USERS.length;
  const individuals = DEMO_ADMIN_USERS.filter((u) => u.type === "individual").length;
  return { companies, users, individuals, lessonsCompleted: 287 };
}
