import type {
  PlatformAdminOrganizationRow,
  PlatformAdminUserRow,
} from "@/lib/platform-admin-types";

export type PlatformAdminTabKey =
  | "tong-quan"
  | "to-chuc"
  | "nguoi-dung"
  | "noi-dung"
  | "ai-usage"
  | "nhat-ky";

export type PlatformAdminOrgDraft = {
  name: string;
  aiTool: string;
  status: PlatformAdminOrganizationRow["status"];
};

export type PlatformAdminUserDraft = {
  fullName: string;
  phoneNumber: string;
  roleId: string;
  aiLevel: number;
  accountType: PlatformAdminUserRow["accountType"];
  organizationId: string;
  memberRole: NonNullable<PlatformAdminUserRow["memberRole"]> | "";
  departmentId: string;
  platformAdmin: boolean;
};

export type PlatformAdminContentDraft = {
  status: string;
};

export type PlatformAdminDraftState = {
  orgDrafts: Record<string, PlatformAdminOrgDraft>;
  userDrafts: Record<string, PlatformAdminUserDraft>;
  contentDrafts: Record<string, PlatformAdminContentDraft>;
};

export type PlatformAdminToast = {
  kind: "success" | "error";
  message: string;
};

export type PlatformAdminConfirmTone = "default" | "destructive";

export type PlatformAdminConfirmConfig = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: PlatformAdminConfirmTone;
  onConfirm: () => Promise<void> | void;
};
