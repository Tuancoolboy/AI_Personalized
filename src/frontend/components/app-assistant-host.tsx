"use client";

import type { AppUserType } from "@/lib/assistant-actions";
import { FloatingAssistantWidget } from "@/components/floating-assistant-widget";

export function AppAssistantHost({
  userType,
  displayName,
}: {
  userType: AppUserType;
  displayName: string;
}) {
  return (
    <FloatingAssistantWidget userType={userType} displayName={displayName} />
  );
}
