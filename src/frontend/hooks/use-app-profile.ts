"use client";

import { useEffect, useState } from "react";
import { fetchProfile, isSupabaseBackend } from "@/lib/client-api";
import { getDemoProfile, type DemoProfile } from "@/lib/demo-storage";

export function useAppProfile() {
  const [profile, setProfile] = useState<DemoProfile | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function load() {
      if (isSupabaseBackend()) {
        try {
          const prof = await fetchProfile();
          setFullName(prof.fullName);
          if (prof.roleId) {
            setProfile({
              roleId: prof.roleId,
              createdAt: new Date().toISOString(),
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
        }
      } else {
        setProfile(getDemoProfile());
        setFullName(null);
      }
      setHydrated(true);
    }
    void load();
  }, []);

  return { profile, hydrated, roleId: profile?.roleId ?? null, fullName };
}
