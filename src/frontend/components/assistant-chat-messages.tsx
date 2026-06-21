"use client";

import type { AssistantMessage } from "@/hooks/use-assistant-chat";
import { ClarifyingQuestionCard } from "@/components/clarifying-question-card";
import {
  isClarifyUserAnswer,
  parseClarifyUserAnswer,
} from "@/lib/chat-clarify-parse";
import { getClarifyMessageState } from "@/lib/chat-clarify-ui";
import { ChatRichContent } from "@/components/chat-rich-content";

type Variant = "compact" | "full";

type AssistantChatMessageListProps = {
  messages: AssistantMessage[];
  typing: boolean;
  variant?: Variant;
  onClarifySubmit?: (question: string, answer: string) => void;
};

export function AssistantChatMessageList({
  messages,
  typing,
  variant = "compact",
  onClarifySubmit,
}: AssistantChatMessageListProps) {
  return (
    <>
      {messages.map((msg, index) => {
        const { interactive, selectedAnswer } = getClarifyMessageState(
          messages,
          index,
          typing,
        );

        return (
          <AssistantMessageBubble
            key={`${msg.id}-${index}`}
            message={msg}
            variant={variant}
            clarifyInteractive={interactive}
            clarifySelectedAnswer={selectedAnswer}
            onClarifySubmit={
              onClarifySubmit && msg.clarify
                ? (answer) => onClarifySubmit(msg.clarify!.question, answer)
                : undefined
            }
            onClarifySkip={
              onClarifySubmit && msg.clarify && interactive
                ? () => onClarifySubmit(msg.clarify!.question, "Bỏ qua")
                : undefined
            }
          />
        );
      })}
    </>
  );
}

export function AssistantMessageBubble({
  message,
  variant = "compact",
  clarifyInteractive = false,
  clarifySelectedAnswer = null,
  onClarifySubmit,
  onClarifySkip,
}: {
  message: AssistantMessage;
  variant?: Variant;
  clarifyInteractive?: boolean;
  clarifySelectedAnswer?: string | null;
  onClarifySubmit?: (answer: string) => void;
  onClarifySkip?: () => void;
}) {
  const textSize = variant === "full" ? "text-sm" : "text-xs";
  const avatarSize = variant === "full" ? "h-8 w-8 text-sm" : "h-7 w-7 text-xs";
  const pad = variant === "full" ? "px-4 py-3" : "px-3 py-2.5";

  if (message.role === "safety") {
    return (
      <div
        className={`rounded-2xl border-2 border-accent/40 bg-accent/10 ${pad} ${textSize} text-ink`}
      >
        {renderRich(message.content, "assistant", variant)}
      </div>
    );
  }

  const isUser = message.role === "user";

  if (isUser && isClarifyUserAnswer(message.content)) {
    const qa = parseClarifyUserAnswer(message.content);
    return (
      <div
        className={`flex items-start gap-2 ${variant === "full" ? "gap-2.5" : ""} flex-row-reverse`}
      >
        <span
          className={`grid ${avatarSize} flex-none place-items-center rounded-lg bg-accent/20 text-accent`}
        >
          🧑
        </span>
        <div
          className={`${variant === "full" ? "max-w-[82%]" : "max-w-[85%]"} rounded-2xl rounded-tr-sm bg-brand px-4 py-3 ${textSize} text-brand-foreground shadow-sm`}
        >
          <p className="text-[11px] font-medium opacity-80">Câu trả lời của bạn</p>
          <p className="mt-1 font-medium leading-relaxed">
            {qa?.answer ?? message.content}
          </p>
        </div>
      </div>
    );
  }

  if (message.role === "assistant" && message.clarify) {
    return (
      <div
        className={`flex items-start gap-2 ${variant === "full" ? "gap-2.5" : ""}`}
      >
        <span
          className={`grid ${avatarSize} flex-none place-items-center rounded-lg bg-brand-soft text-brand`}
        >
          ✦
        </span>
        <div className={`${variant === "full" ? "max-w-[88%]" : "max-w-[90%]"} space-y-3`}>
          {message.content.trim() ? (
            <div
              className={`rounded-2xl rounded-tl-sm border border-line bg-card ${pad} ${textSize} leading-relaxed text-ink shadow-sm`}
            >
              {renderRich(message.content, "assistant", variant)}
            </div>
          ) : null}
          <ClarifyingQuestionCard
            clarify={message.clarify}
            variant={variant}
            disabled={!clarifyInteractive}
            selectedAnswer={clarifySelectedAnswer}
            onSubmit={(answer) => onClarifySubmit?.(answer)}
            onSkip={() => onClarifySkip?.()}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-2 ${variant === "full" ? "gap-2.5" : ""} ${isUser ? "flex-row-reverse" : ""}`}
    >
      <span
        className={`grid ${avatarSize} flex-none place-items-center rounded-lg ${
          isUser ? "bg-accent/20 text-accent" : "bg-brand-soft text-brand"
        }`}
      >
        {isUser ? "🧑" : "✦"}
      </span>
      <div
        className={`${variant === "full" ? "max-w-[82%]" : "max-w-[85%]"} rounded-2xl ${pad} ${textSize} leading-relaxed ${
          isUser
            ? "rounded-tr-sm bg-brand text-brand-foreground"
            : "rounded-tl-sm border border-line bg-card text-ink shadow-sm"
        }`}
      >
        {renderRich(message.content, isUser ? "user" : "assistant", variant)}
      </div>
    </div>
  );
}

export function AssistantThinkingIndicator({
  variant = "compact",
  text,
}: {
  variant?: Variant;
  text: string;
}) {
  const avatarSize = variant === "full" ? "h-8 w-8 text-sm" : "h-7 w-7 text-xs";
  const pad = variant === "full" ? "px-4 py-3" : "px-3 py-2.5";
  const textSize = variant === "full" ? "text-sm" : "text-xs";

  return (
    <div className={`flex items-start gap-2 ${variant === "full" ? "gap-2.5" : ""}`}>
      <span
        className={`grid ${avatarSize} flex-none place-items-center rounded-lg bg-brand-soft text-brand`}
      >
        ✦
      </span>
      <div
        className={`max-w-[85%] rounded-2xl rounded-tl-sm border border-line bg-card ${pad} shadow-sm`}
      >
        <p className={`${textSize} font-medium text-brand`}>Đang suy nghĩ…</p>
        <p className={`mt-1 ${textSize} leading-relaxed text-ink-2 transition-opacity duration-300`}>
          {text}
        </p>
      </div>
    </div>
  );
}

export function AssistantTypingIndicator({ variant = "compact" }: { variant?: Variant }) {
  const avatarSize = variant === "full" ? "h-8 w-8 text-sm" : "h-7 w-7 text-xs";
  const dotSize = variant === "full" ? "h-2 w-2" : "h-1.5 w-1.5";
  const pad = variant === "full" ? "px-4 py-3.5" : "px-3 py-2.5";

  return (
    <div className={`flex items-start gap-2 ${variant === "full" ? "gap-2.5" : ""}`}>
      <span
        className={`grid ${avatarSize} flex-none place-items-center rounded-lg bg-brand-soft text-brand`}
      >
        ✦
      </span>
      <div
        className={`rounded-2xl rounded-tl-sm border border-line bg-card ${pad} shadow-sm`}
      >
        <div className="flex gap-1">
          <span className={`${dotSize} animate-pulse rounded-full bg-ink-3`} />
          <span
            className={`${dotSize} animate-pulse rounded-full bg-ink-3 [animation-delay:200ms]`}
          />
          <span
            className={`${dotSize} animate-pulse rounded-full bg-ink-3 [animation-delay:400ms]`}
          />
        </div>
      </div>
    </div>
  );
}

type MessageTone = "assistant" | "user";

function renderRich(
  text: string,
  tone: MessageTone,
  variant: Variant = "full",
): React.ReactNode {
  return <ChatRichContent text={text} tone={tone} variant={variant} />;
}
