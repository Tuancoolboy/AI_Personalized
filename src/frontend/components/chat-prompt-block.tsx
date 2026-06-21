"use client";

import { useCallback, useState } from "react";

type ChatPromptBlockProps = {
  code: string;
  variant?: "compact" | "full";
};

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // legacy fallback
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function ChatPromptBlock({ code, variant = "full" }: ChatPromptBlockProps) {
  const [copied, setCopied] = useState(false);
  const textSize = variant === "full" ? "text-xs" : "text-[11px]";

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(code);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="my-2">
      <pre
        className={`overflow-x-auto whitespace-pre-wrap rounded-xl border border-line bg-secondary/60 p-3 font-mono leading-relaxed text-ink-2 ${textSize}`}
      >
        {code}
      </pre>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className={`mt-2 inline-flex items-center rounded-full border border-brand bg-card px-3 py-1.5 font-semibold text-brand transition hover:bg-brand-soft ${textSize}`}
      >
        {copied ? "✓ Đã copy" : "📋 Copy prompt"}
      </button>
    </div>
  );
}
