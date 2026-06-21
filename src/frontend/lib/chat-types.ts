export type ChatAudience = "employee" | "manager";

export type ChatHistoryMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type { ResumeLesson } from "@/lib/resume-lesson";

import type { ResumeLesson } from "@/lib/resume-lesson";

export type ChatHistoryResponse = {
  conversationId: string | null;
  coreContext: string | null;
  resumeLesson: ResumeLesson | null;
  messages: ChatHistoryMessage[];
};
