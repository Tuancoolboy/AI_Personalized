import { getManagerMembershipForUser } from "@/lib/manager-auth";
import { isPlatformAdmin } from "@/lib/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LearningActivationRecord = {
  roleId: string | null;
  learningActivated: boolean;
  learningActivatedAt: string | null;
  activationEmailSentAt: string | null;
  isManager: boolean;
  isPlatformAdmin: boolean;
};

type ProfileActivationRow = {
  role_id: string | null;
  learning_activated: boolean | null;
  learning_activated_at: string | null;
  activation_email_sent_at: string | null;
};

export async function loadLearningActivationRecord(
  userId: string,
): Promise<LearningActivationRecord> {
  const supabase = await createSupabaseServerClient();
  const [profileResult, managerMembership, platformAdmin] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "role_id, learning_activated, learning_activated_at, activation_email_sent_at",
      )
      .eq("id", userId)
      .maybeSingle(),
    getManagerMembershipForUser(userId),
    isPlatformAdmin(userId),
  ]);

  const profile = (profileResult.data as ProfileActivationRow | null) ?? null;
  return {
    roleId: profile?.role_id ?? null,
    learningActivated: Boolean(profile?.learning_activated),
    learningActivatedAt: profile?.learning_activated_at ?? null,
    activationEmailSentAt: profile?.activation_email_sent_at ?? null,
    isManager: Boolean(managerMembership),
    isPlatformAdmin: platformAdmin,
  };
}

export function needsLearningActivation(record: LearningActivationRecord): boolean {
  return Boolean(record.roleId) && !record.isManager && !record.isPlatformAdmin;
}

export function canAccessLearning(record: LearningActivationRecord): boolean {
  return !needsLearningActivation(record) || record.learningActivated;
}
