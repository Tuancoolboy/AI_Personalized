import { describe, expect, it } from "vitest";
import {
  buildAssistantChatInitKey,
  buildGreeting,
  resolveAssistantChatHistoryRequest,
} from "./use-assistant-chat";
import type { ResumeLesson } from "@/lib/resume-lesson";

describe("buildGreeting", () => {
  it("includes clickable resume lesson link for in-progress module", () => {
    const resumeLesson: ResumeLesson = {
      moduleId: "marketing-m1",
      title: "AI là gì? Nó giúp được gì cho marketing",
      href: "/lo-trinh/marketing-m1",
      status: "dang-hoc",
    };

    const text = buildGreeting(
      "marketing",
      "employee",
      "Đặng Minh Hải",
      resumeLesson,
    );

    expect(text).toContain("Chào Hải!");
    expect(text).toContain("phần Marketing");
    expect(text).toContain("đang học dở bài");
    expect(text).toContain(
      "[AI là gì? Nó giúp được gì cho marketing](/lo-trinh/marketing-m1)",
    );
    expect(text).not.toContain("«");
    expect(text).not.toContain("Em đang nối tiếp mạch trước");
  });

  it("shows next lesson link when nothing is in progress", () => {
    const resumeLesson: ResumeLesson = {
      moduleId: "marketing-m1",
      title: "AI là gì? Nó giúp được gì cho marketing",
      href: "/lo-trinh/marketing-m1",
      status: "chua-hoc",
    };

    const text = buildGreeting("marketing", "employee", "Đặng Minh Hải", resumeLesson);

    expect(text).toContain("Bài tiếp theo trên lộ trình:");
    expect(text).toContain("[AI là gì? Nó giúp được gì cho marketing](/lo-trinh/marketing-m1)");
  });

  it("omits lesson line when all modules are complete", () => {
    const text = buildGreeting("marketing", "employee", "Đặng Minh Hải", null);

    expect(text).not.toContain("/lo-trinh/");
    expect(text).toContain("Hỏi em về lộ trình");
  });
});

describe("assistant chat init key", () => {
  it("does not restart the session when only the resolved conversation id changes", () => {
    const baseKey = buildAssistantChatInitKey({
      roleId: "marketing",
      userType: "employee",
      fullName: "Đặng Minh Hải",
      preferredAddress: "neutral",
      noRestore: false,
      sessionLoadKey: "new-123",
      activeConversationId: null,
    });

    const resolvedKey = buildAssistantChatInitKey({
      roleId: "marketing",
      userType: "employee",
      fullName: "Đặng Minh Hải",
      preferredAddress: "neutral",
      noRestore: false,
      sessionLoadKey: "new-123",
      activeConversationId: "conv-456",
    });

    expect(resolvedKey).toBe(baseKey);
  });

  it("requests draft history for fresh sessions and selected history for stable sessions", () => {
    expect(
      resolveAssistantChatHistoryRequest("new-123", {
        noRestore: false,
        isNewConversation: false,
        resetContextOnFirstSend: false,
      }),
    ).toEqual({ draft: true });

    expect(
      resolveAssistantChatHistoryRequest("conv-456", {
        noRestore: false,
        isNewConversation: false,
        resetContextOnFirstSend: false,
      }),
    ).toEqual({ conversationId: "conv-456" });

    expect(
      resolveAssistantChatHistoryRequest("boot", {
        noRestore: false,
        isNewConversation: false,
        resetContextOnFirstSend: false,
      }),
    ).toBeUndefined();
  });
});
