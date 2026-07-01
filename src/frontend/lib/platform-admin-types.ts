export type PlatformAdminOrganizationRow = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended" | "archived";
  aiTool: string;
  memberCount: number;
  managerCount: number;
  employeeCount: number;
  updatedAt: string | null;
};

export type PlatformAdminUserRow = {
  id: string;
  email: string;
  fullName: string;
  accountType: "company" | "individual";
  roleId: string | null;
  aiLevel: number | null;
  learningActivated: boolean;
  learningActivatedAt: string | null;
  activationEmailSentAt: string | null;
  organizationId: string | null;
  organizationName: string | null;
  memberRole: "owner" | "manager" | "employee" | null;
  departmentId: string | null;
  platformAdmin: boolean;
  phoneNumber: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastActivityAt: string | null;
};

export type PlatformAdminAuditRow = {
  id: string;
  actor: string;
  action: string;
  detail: string;
  organizationName: string | null;
  at: string;
};

export type PlatformAdminContentRow = {
  label: string;
  status: string;
  count: number;
  note: string;
};

export type PlatformAdminContentItemRow = {
  collection:
    | "learning_modules"
    | "training_modules"
    | "learning_paths"
    | "assessments";
  id: string;
  title: string;
  status: string;
  scope: string | null;
  organizationName: string | null;
  version: string | null;
  updatedAt: string | null;
};

export type PlatformAdminInviteLinkRow = {
  id: string;
  organizationId: string;
  organizationName: string;
  createdBy: string;
  token: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

export type PlatformAdminConsoleReport = {
  generatedAt: string;
  persisted: boolean;
  message?: string;
  platform: {
    supabaseConfigured: boolean;
    openaiConfigured: boolean;
    openaiModel: string;
    rateLimitPerDay: number;
  };
  overview: {
    organizations: number;
    activeOrganizations: number;
    suspendedOrganizations: number;
    archivedOrganizations: number;
    users: number;
    platformAdmins: number;
    managers: number;
    employees: number;
    totalModules: number;
    publishedModules: number;
    totalPaths: number;
    publishedPaths: number;
    assignments: number;
    assessments: number;
    gradingQueue: number;
    ahaReflections: number;
    leads: number;
    quizCount: number;
    quizAvgScore: number;
    totalHoursSaved: number;
    chatUsage7d: number;
    chatUsage30d: number;
    inviteLinks: number;
    auditEvents30d: number;
  };
  organizations: PlatformAdminOrganizationRow[];
  users: PlatformAdminUserRow[];
  content: PlatformAdminContentRow[];
  contentItems: PlatformAdminContentItemRow[];
  inviteLinks: PlatformAdminInviteLinkRow[];
  audits: PlatformAdminAuditRow[];
  alerts: string[];
};

export type PlatformAdminConsoleFilters = {
  organizationQuery?: string;
  organizationStatus?: "active" | "suspended" | "archived";
  organizationTool?: string;
  userQuery?: string;
  userRole?: "platform-admin" | "manager" | "employee";
  userAccount?: "company" | "individual";
  userActivation?: "activated" | "pending";
  contentQuery?: string;
  contentCollection?: PlatformAdminContentItemRow["collection"];
  contentStatus?: "draft" | "published" | "archived";
  inviteQuery?: string;
  inviteStatus?: "active" | "inactive";
  auditQuery?: string;
  auditAction?: string;
};
