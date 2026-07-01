"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchPlatformAdminConsole,
  submitPlatformAdminAction,
} from "@/lib/client-api";
import type {
  PlatformAdminConsoleReport,
  PlatformAdminOrganizationRow,
  PlatformAdminUserRow,
} from "@/lib/platform-admin-types";
import type {
  PlatformAdminAction,
} from "@/lib/platform-admin-console";
import {
  type PlatformAdminConfirmConfig,
  type PlatformAdminDraftState,
  type PlatformAdminTabKey,
  type PlatformAdminToast,
} from "@/components/platform-admin/platform-admin-console.types";

function createEmptyDrafts(report: PlatformAdminConsoleReport): PlatformAdminDraftState {
  const orgDrafts: PlatformAdminDraftState["orgDrafts"] = {};
  for (const org of report.organizations) {
    orgDrafts[org.id] = {
      name: org.name,
      aiTool: org.aiTool,
      status: org.status,
    };
  }

  const userDrafts: PlatformAdminDraftState["userDrafts"] = {};
  for (const user of report.users) {
    userDrafts[user.id] = {
      fullName: user.fullName,
      phoneNumber: user.phoneNumber ?? "",
      roleId: user.roleId ?? "",
      aiLevel: user.aiLevel ?? 0,
      accountType: user.accountType,
      organizationId: user.organizationId ?? "",
      memberRole: user.memberRole ?? "",
      departmentId: user.departmentId ?? "",
      platformAdmin: user.platformAdmin,
    };
  }

  const contentDrafts: PlatformAdminDraftState["contentDrafts"] = {};
  for (const item of report.contentItems) {
    contentDrafts[`${item.collection}:${item.id}`] = {
      status: item.status,
    };
  }

  return { orgDrafts, userDrafts, contentDrafts };
}

function createEmptyReport(): PlatformAdminConsoleReport {
  return {
    generatedAt: new Date().toISOString(),
    persisted: false,
    platform: {
      supabaseConfigured: false,
      openaiConfigured: false,
      openaiModel: "",
      rateLimitPerDay: 0,
    },
    overview: {
      organizations: 0,
      activeOrganizations: 0,
      suspendedOrganizations: 0,
      archivedOrganizations: 0,
      users: 0,
      platformAdmins: 0,
      managers: 0,
      employees: 0,
      totalModules: 0,
      publishedModules: 0,
      totalPaths: 0,
      publishedPaths: 0,
      assignments: 0,
      assessments: 0,
      gradingQueue: 0,
      ahaReflections: 0,
      leads: 0,
      quizCount: 0,
      quizAvgScore: 0,
      totalHoursSaved: 0,
      chatUsage7d: 0,
      chatUsage30d: 0,
      inviteLinks: 0,
      auditEvents30d: 0,
    },
    organizations: [],
    users: [],
    content: [],
    contentItems: [],
    inviteLinks: [],
    audits: [],
    alerts: [],
  };
}

export function usePlatformAdminConsole() {
  const [report, setReport] = useState<PlatformAdminConsoleReport | null>(null);
  const [tab, setTab] = useState<PlatformAdminTabKey>("tong-quan");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [toast, setToast] = useState<PlatformAdminToast | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PlatformAdminConfirmConfig | null>(null);
  const [organizationQuery, setOrganizationQuery] = useState("");
  const [organizationStatusFilter, setOrganizationStatusFilter] = useState<
    "all" | PlatformAdminOrganizationRow["status"]
  >("all");
  const [organizationToolFilter, setOrganizationToolFilter] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<
    "all" | "platform-admin" | "manager" | "employee"
  >("all");
  const [userAccountFilter, setUserAccountFilter] = useState<
    "all" | PlatformAdminUserRow["accountType"]
  >("all");
  const [userActivationFilter, setUserActivationFilter] = useState<
    "all" | "activated" | "pending"
  >("all");
  const [contentQuery, setContentQuery] = useState("");
  const [contentCollectionFilter, setContentCollectionFilter] = useState<
    "all" | "learning_modules" | "training_modules" | "learning_paths" | "assessments"
  >("all");
  const [contentStatusFilter, setContentStatusFilter] = useState<
    "all" | "draft" | "published" | "archived"
  >("all");
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteStatusFilter, setInviteStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [auditQuery, setAuditQuery] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<PlatformAdminDraftState>(() =>
    createEmptyDrafts(createEmptyReport()),
  );

  async function loadReport() {
    try {
      setError("");
      const response = await fetchPlatformAdminConsole();
      setReport(response.report);
      setDrafts(createEmptyDrafts(response.report));
      setSelectedUserIds([]);
      if (response.message) {
        setMessage(response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReport();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const canMutate = Boolean(report?.persisted);

  const filteredOrganizations = useMemo(() => {
    if (!report) return [];
    const query = organizationQuery.trim().toLowerCase();
    const toolQuery = organizationToolFilter.trim().toLowerCase();
    return report.organizations.filter((org) => {
      const matchesQuery =
        !query ||
        [org.name, org.slug, org.aiTool]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesStatus =
        organizationStatusFilter === "all" || org.status === organizationStatusFilter;
      const matchesTool = !toolQuery || org.aiTool.toLowerCase().includes(toolQuery);
      return matchesQuery && matchesStatus && matchesTool;
    });
  }, [report, organizationQuery, organizationStatusFilter, organizationToolFilter]);

  const filteredUsers = useMemo(() => {
    if (!report) return [];
    const query = userQuery.trim().toLowerCase();
    return report.users.filter((user) => {
      const matchesQuery =
        !query ||
        [
          user.fullName,
          user.email,
          user.organizationName ?? "",
          user.roleId ?? "",
          String(user.aiLevel ?? ""),
          user.departmentId ?? "",
          user.phoneNumber ?? "",
        ].some((value) => String(value).toLowerCase().includes(query));
      const matchesRole =
        userRoleFilter === "all" ||
        (userRoleFilter === "platform-admin"
          ? user.platformAdmin
          : userRoleFilter === "manager"
            ? user.memberRole === "manager" || user.memberRole === "owner"
            : user.memberRole === "employee" || !user.memberRole);
      const matchesAccount = userAccountFilter === "all" || user.accountType === userAccountFilter;
      const matchesActivation =
        userActivationFilter === "all" ||
        (userActivationFilter === "activated"
          ? user.learningActivated
          : !user.learningActivated);
      return matchesQuery && matchesRole && matchesAccount && matchesActivation;
    });
  }, [report, userQuery, userRoleFilter, userAccountFilter, userActivationFilter]);

  const filteredContentItems = useMemo(() => {
    if (!report) return [];
    const query = contentQuery.trim().toLowerCase();
    return report.contentItems.filter((item) => {
      const matchesQuery =
        !query ||
        [item.title, item.id, item.scope ?? "", item.organizationName ?? "", item.collection]
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesCollection =
        contentCollectionFilter === "all" || item.collection === contentCollectionFilter;
      const matchesStatus = contentStatusFilter === "all" || item.status === contentStatusFilter;
      return matchesQuery && matchesCollection && matchesStatus;
    });
  }, [report, contentQuery, contentCollectionFilter, contentStatusFilter]);

  const filteredInviteLinks = useMemo(() => {
    if (!report) return [];
    const query = inviteQuery.trim().toLowerCase();
    return report.inviteLinks.filter((link) => {
      const matchesQuery =
        !query ||
        [link.organizationName, link.token, link.createdBy].some((value) =>
          String(value).toLowerCase().includes(query),
        );
      const matchesStatus =
        inviteStatusFilter === "all" ||
        (inviteStatusFilter === "active" ? link.isActive : !link.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [report, inviteQuery, inviteStatusFilter]);

  const filteredAudits = useMemo(() => {
    if (!report) return [];
    const query = auditQuery.trim().toLowerCase();
    const actionFilter = auditActionFilter.trim().toLowerCase();
    return report.audits.filter((entry) => {
      const matchesQuery =
        !query ||
        [entry.actor, entry.action, entry.detail, entry.organizationName ?? ""].some((value) =>
          String(value).toLowerCase().includes(query),
        );
      const matchesAction = !actionFilter || entry.action.toLowerCase().includes(actionFilter);
      return matchesQuery && matchesAction;
    });
  }, [report, auditQuery, auditActionFilter]);

  async function refreshReport() {
    setRefreshing(true);
    await loadReport();
  }

  async function runAction(
    key: string,
    action: PlatformAdminAction,
    payload: Record<string, unknown>,
  ) {
    try {
      setError("");
      setMessage("");
      setToast(null);
      setSavingKey(key);
      const result = await submitPlatformAdminAction({ action, payload });
      setMessage(result.message);
      setToast({ kind: "success", message: result.message });
      if (result.data?.token && typeof result.data.token === "string") {
        const token = result.data.token;
        const url = `${window.location.origin}/moi/${encodeURIComponent(token)}`;
        setCopiedToken(url);
      }
      if (result.refreshed) {
        await refreshReport();
      }
    } catch (err) {
      const nextError = err instanceof Error ? err.message : "Không thực hiện được thao tác.";
      setToast({ kind: "error", message: nextError });
    } finally {
      setSavingKey(null);
    }
  }

  function confirmAction(config: PlatformAdminConfirmConfig) {
    setPendingConfirm(config);
  }

  async function resolvePendingConfirm() {
    if (!pendingConfirm) return;
    const current = pendingConfirm;
    setPendingConfirm(null);
    await current.onConfirm();
  }

  function dismissToast() {
    setToast(null);
  }

  function toggleUserSelection(userId: string) {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  function setUserSelection(userIds: string[]) {
    setSelectedUserIds(userIds);
  }

  async function copyInvite(url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedToken(url);
    window.setTimeout(() => setCopiedToken((current) => (current === url ? null : current)), 1600);
  }

  return {
    report,
    tab,
    setTab,
    loading,
    refreshing,
    message,
    error,
    savingKey,
    copiedToken,
    toast,
    dismissToast,
    pendingConfirm,
    setPendingConfirm,
    resolvePendingConfirm,
    confirmAction,
    canMutate,
    drafts,
    setDrafts,
    organizationQuery,
    setOrganizationQuery,
    organizationStatusFilter,
    setOrganizationStatusFilter,
    organizationToolFilter,
    setOrganizationToolFilter,
    userQuery,
    setUserQuery,
    userRoleFilter,
    setUserRoleFilter,
    userAccountFilter,
    setUserAccountFilter,
    userActivationFilter,
    setUserActivationFilter,
    selectedUserIds,
    setSelectedUserIds: setUserSelection,
    toggleUserSelection,
    contentQuery,
    setContentQuery,
    contentCollectionFilter,
    setContentCollectionFilter,
    contentStatusFilter,
    setContentStatusFilter,
    inviteQuery,
    setInviteQuery,
    inviteStatusFilter,
    setInviteStatusFilter,
    auditQuery,
    setAuditQuery,
    auditActionFilter,
    setAuditActionFilter,
    filteredOrganizations,
    filteredUsers,
    filteredContentItems,
    filteredInviteLinks,
    filteredAudits,
    refreshReport,
    runAction,
    copyInvite,
    loadReport,
  };
}

export type PlatformAdminConsoleVM = ReturnType<typeof usePlatformAdminConsole>;
