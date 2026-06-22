"use client";

import { useEffect, useState } from "react";
import type { AppAvatarChoice } from "@/lib/app-avatar";
import { fetchProfile, isSupabaseBackend } from "@/lib/client-api";
import { getDemoProfile, type DemoProfile } from "@/lib/demo-storage";

export function useAppProfile() {
  const [profile, setProfile] = useState<DemoProfile | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<AppAvatarChoice | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function load() {
      if (isSupabaseBackend()) {
        try {
          const prof = await fetchProfile();
          setFullName(prof.fullName);
          setAvatar(prof.avatar ?? null);
          if (prof.roleId) {
            setProfile({
              roleId: prof.roleId,
              createdAt: new Date().toISOString(),
              learningProfile: prof.avatar ? { avatar: prof.avatar } : undefined,
              ...(prof.aiLevel !== undefined
                ? {
                    assessment: {
                      aiLevel: prof.aiLevel,
                      totalScore: 0,
                      skipBasicModules: prof.aiLevel >= 5,
                      dailyTasks: [],
                      toolsTried: [],
                      industry: "",
                      position: "",
                      levelLabel: "",
                      levelDesc: "",
                    },
                  }
                : {}),
            });
          } else {
            setProfile(null);
          }
        } catch {
          const demo = getDemoProfile();
          setProfile(demo);
          setFullName(null);
          setAvatar(demo?.learningProfile?.avatar ?? null);
        }
      } else {
        const demo = getDemoProfile();
        setProfile(demo);
        setFullName(null);
        setAvatar(demo?.learningProfile?.avatar ?? null);
      }
      setHydrated(true);
    }
    void load();
  }, []);

  return {
    profile,
    hydrated,
    roleId: profile?.roleId ?? null,
    fullName,
    avatar,
  };
}
