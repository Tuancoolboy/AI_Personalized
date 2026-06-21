"use client";

import { ChatPromptBlock } from "@/components/chat-prompt-block";
import { splitChatContentBlocks } from "@/lib/chat-content-blocks";
import { parseChatInlineSegments } from "@/lib/module-lesson-links";

type MessageTone = "assistant" | "user";
type Variant = "compact" | "full";

export function ChatRichContent({
  text,
  tone,
  variant = "full",
}: {
  text: string;
  tone: MessageTone;
  variant?: Variant;
}) {
  const blocks = splitChatContentBlocks(text);

  return (
    <div className="space-y-1.5">
      {blocks.map((block, blockIdx) => {
        if (block.type === "code") {
          return (
            <ChatPromptBlock
              key={`code-${blockIdx}`}
              code={block.content}
              variant={variant}
            />
          );
        }

        const lines = block.content.split("\n");
        return (
          <div key={`text-${blockIdx}`} className="space-y-3">
            {renderStructuredLines(lines, tone, variant)}
          </div>
        );
      })}
    </div>
  );
}

function renderStructuredLines(
  lines: string[],
  tone: MessageTone,
  variant: Variant,
) {
  const nodes: React.ReactNode[] = [];
  let idx = 0;
  const baseTextClass = tone === "user" ? "text-brand-foreground" : "text-ink";
  const mutedTextClass =
    tone === "user" ? "text-brand-foreground/88" : "text-ink-2";
  const markerClass =
    tone === "user" ? "marker:text-brand-foreground/75" : "marker:text-brand";

  while (idx < lines.length) {
    const line = lines[idx] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      idx += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const headingClass =
        level === 1
          ? `text-xl font-bold tracking-tight ${baseTextClass}`
          : level === 2
            ? `text-lg font-bold tracking-tight ${baseTextClass}`
            : `text-base font-bold ${baseTextClass}`;
      nodes.push(
        <div key={`heading-${idx}`} className={headingClass}>
          {renderInlineLine(heading[2] ?? "", tone)}
        </div>,
      );
      idx += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      nodes.push(
        <blockquote
          key={`quote-${idx}`}
          className={`border-l-4 px-4 py-2 ${
            tone === "user"
              ? "border-brand-foreground/30 bg-white/8 text-brand-foreground/90"
              : "border-brand/25 bg-secondary/30 text-ink-2"
          }`}
        >
          {renderInlineLine(trimmed.replace(/^>\s?/, ""), tone)}
        </blockquote>,
      );
      idx += 1;
      continue;
    }

    if (isBulletLine(trimmed)) {
      const items: string[] = [];
      while (idx < lines.length) {
        const current = lines[idx]?.trim() ?? "";
        if (!isBulletLine(current)) break;
        items.push(current.replace(/^[-*]\s+/, ""));
        idx += 1;
      }

      nodes.push(
        <ul
          key={`ul-${idx}`}
          className={`space-y-2 ${variant === "full" ? "pl-5" : "pl-4"} list-disc ${markerClass}`}
        >
          {items.map((item, itemIdx) => (
            <li
              key={`ul-item-${idx}-${itemIdx}`}
              className={`leading-relaxed ${baseTextClass}`}
            >
              {renderInlineLine(item, tone)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (isOrderedLine(trimmed)) {
      const items: string[] = [];
      while (idx < lines.length) {
        const current = lines[idx]?.trim() ?? "";
        if (!current) {
          const nextOrderedIdx = findNextOrderedLineIndex(lines, idx + 1);
          if (nextOrderedIdx < 0) break;
          idx = nextOrderedIdx;
          continue;
        }
        if (!isOrderedLine(current)) break;
        items.push(current.replace(/^\d+\.\s+/, ""));
        idx += 1;
      }

      nodes.push(
        <ol
          key={`ol-${idx}`}
          className={`space-y-2 ${variant === "full" ? "pl-5" : "pl-4"} list-decimal marker:font-semibold ${markerClass}`}
        >
          {items.map((item, itemIdx) => (
            <li
              key={`ol-item-${idx}-${itemIdx}`}
              className={`leading-relaxed ${baseTextClass}`}
            >
              {renderInlineLine(item, tone)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraphLines = [trimmed];
    idx += 1;
    while (idx < lines.length) {
      const current = lines[idx]?.trim() ?? "";
      if (
        !current ||
        current.startsWith(">") ||
        isBulletLine(current) ||
        isOrderedLine(current) ||
        /^(#{1,3})\s+/.test(current)
      ) {
        break;
      }
      paragraphLines.push(current);
      idx += 1;
    }

    nodes.push(
      <p
        key={`p-${idx}`}
        className={`whitespace-pre-wrap leading-relaxed ${mutedTextClass}`}
      >
        {renderInlineLine(paragraphLines.join(" "), tone)}
      </p>,
    );
  }

  return nodes;
}

function isBulletLine(text: string) {
  return /^[-*]\s+/.test(text);
}

function isOrderedLine(text: string) {
  return /^\d+\.\s+/.test(text);
}

function findNextOrderedLineIndex(lines: string[], startIdx: number) {
  let idx = startIdx;
  while (idx < lines.length) {
    const current = lines[idx]?.trim() ?? "";
    if (!current) {
      idx += 1;
      continue;
    }
    return isOrderedLine(current) ? idx : -1;
  }
  return -1;
}

function renderInlineLine(line: string, tone: MessageTone) {
  const linkClassName =
    tone === "user"
      ? "font-semibold underline decoration-brand-foreground/50 underline-offset-2 hover:decoration-brand-foreground"
      : "font-semibold text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand";

  return parseChatInlineSegments(line).map((segment, pIdx) => {
    if (segment.kind === "bold") {
      return (
        <strong key={pIdx} className="font-semibold">
          {segment.value}
        </strong>
      );
    }
    if (segment.kind === "link") {
      return (
        <a
          key={pIdx}
          href={segment.href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
        >
          {segment.label}
        </a>
      );
    }
    return <span key={pIdx}>{segment.value}</span>;
  });
}
