"use client";

import type { RefObject } from "react";
import type { AssistantMessage } from "@/hooks/use-assistant-chat";
import {
  AssistantChatMessageList,
  AssistantThinkingIndicator,
  AssistantTypingIndicator,
} from "@/components/assistant-chat-messages";
import { formatClarifyUserAnswer } from "@/lib/chat-clarify-parse";
import { Skeleton } from "@/components/ui/skeleton";

type Variant = "compact" | "full";

type ChatConversationBodyProps = {
  sessionKey: string;
  sessionLoading: boolean;
  messages: AssistantMessage[];
  typing: boolean;
  thinkingText: string | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  bottomRef: RefObject<HTMLDivElement | null>;
  variant?: Variant;
  scrollClassName?: string;
  onSendMessage?: (text: string) => void;
};

function ChatSessionLoadingPlaceholder({ variant }: { variant: Variant }) {
  const bubbleWidth =
    variant === "full" ? "w-[72%] sm:w-[68%]" : "w-[78%]";

  return (
    <div className="space-y-4" aria-busy="true" aria-label="Đang tải hội thoại">
      <div className="flex items-start gap-2.5">
        <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
        <Skeleton className={`h-24 ${bubbleWidth} rounded-2xl rounded-tl-sm`} />
      </div>
      <div className="flex items-start justify-end gap-2.5">
        <Skeleton className="h-10 w-[48%] rounded-2xl rounded-tr-sm" />
        <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
      </div>
    </div>
  );
}

export function ChatConversationBody({
  sessionKey,
  sessionLoading,
  messages,
  typing,
  thinkingText,
  scrollRef,
  bottomRef,
  variant = "full",
  scrollClassName = "",
  onSendMessage,
}: ChatConversationBodyProps) {
  const sessionAnimationClass = sessionLoading
    ? "animate-chat-session-loading"
    : "";

  return (
    <div
      ref={scrollRef}
      className={`flex-1 bg-gradient-to-b from-card to-secondary/30 px-5 py-6 ${scrollClassName}`}
    >
      <div
        key={sessionKey}
        className={`space-y-4 ${sessionAnimationClass}`}
      >
        {sessionLoading ? (
          <ChatSessionLoadingPlaceholder variant={variant} />
        ) : (
          <>
            <AssistantChatMessageList
              messages={messages}
              typing={typing}
              variant={variant}
              onClarifySubmit={
                onSendMessage
                  ? (question, answer) =>
                      onSendMessage(formatClarifyUserAnswer(question, answer))
                  : undefined
              }
            />
            {typing && thinkingText && (
              <AssistantThinkingIndicator variant={variant} text={thinkingText} />
            )}
            {typing && !thinkingText && (
              <AssistantTypingIndicator variant={variant} />
            )}
          </>
        )}
      </div>
      <div ref={bottomRef} className="h-px w-full shrink-0" aria-hidden />
    </div>
  );
}
