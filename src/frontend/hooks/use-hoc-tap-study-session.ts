"use client";

import { useEffect } from "react";
import { updateHocTapStudySession, isSupabaseBackend } from "@/lib/client-api";
import { addDemoStudySeconds, calculateStudyHeartbeatSeconds } from "@/lib/hoc-tap-overview";

const HEARTBEAT_MS = 30_000;

export function useHocTapStudySession(moduleId: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !moduleId) return;

    let disposed = false;
    let activeSessionId: string | null = null;
    let demoLastSeenAt = new Date().toISOString();
    const persisted = isSupabaseBackend();

    function flushDemo() {
      const now = new Date();
      const seconds = calculateStudyHeartbeatSeconds(demoLastSeenAt, now);
      demoLastSeenAt = now.toISOString();
      if (seconds > 0) addDemoStudySeconds(moduleId, seconds, now);
    }

    async function startSession() {
      if (disposed || document.visibilityState !== "visible") return;
      demoLastSeenAt = new Date().toISOString();
      if (!persisted || activeSessionId) return;
      try {
        const response = await updateHocTapStudySession({ action: "start", moduleId });
        if (disposed || document.visibilityState !== "visible") {
          void updateHocTapStudySession({
            action: "end",
            sessionId: response.sessionId,
          }).catch(() => {});
          return;
        }
        activeSessionId = response.sessionId;
      } catch (error) {
        console.warn("[study-session] Không bắt đầu được phiên học:", error);
      }
    }

    function heartbeat() {
      if (document.visibilityState !== "visible") return;
      if (!persisted) {
        flushDemo();
        return;
      }
      if (!activeSessionId) {
        void startSession();
        return;
      }
      void updateHocTapStudySession({
        action: "heartbeat",
        sessionId: activeSessionId,
      }).catch((error) => {
        console.warn("[study-session] Không gửi được heartbeat:", error);
      });
    }

    function endSession() {
      if (!persisted) {
        flushDemo();
        return;
      }
      const sessionId = activeSessionId;
      activeSessionId = null;
      if (!sessionId) return;
      void updateHocTapStudySession({ action: "end", sessionId }).catch(() => {});
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        endSession();
      } else {
        void startSession();
      }
    }

    void startSession();
    const timer = window.setInterval(heartbeat, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", endSession);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", endSession);
      endSession();
    };
  }, [enabled, moduleId]);
}
