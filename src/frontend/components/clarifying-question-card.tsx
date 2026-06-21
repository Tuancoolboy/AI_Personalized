"use client";

import { useState } from "react";
import type { ClarifyingQuestion } from "@/lib/chat-clarify-types";

type ClarifyingQuestionCardProps = {
  clarify: ClarifyingQuestion;
  disabled?: boolean;
  selectedAnswer?: string | null;
  onSubmit: (answer: string) => void;
  onSkip: () => void;
  variant?: "compact" | "full";
};

export function ClarifyingQuestionCard({
  clarify,
  disabled = false,
  selectedAnswer = null,
  onSubmit,
  onSkip,
  variant = "full",
}: ClarifyingQuestionCardProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const textSize = variant === "full" ? "text-sm" : "text-xs";

  function handleOption(option: string) {
    if (disabled) return;
    if (/^khác/i.test(option)) {
      setCustomOpen(true);
      return;
    }
    onSubmit(option);
  }

  function handleCustomSubmit() {
    const trimmed = customText.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setCustomText("");
    setCustomOpen(false);
  }

  return (
    <div
      className={`rounded-2xl border border-line bg-secondary/30 shadow-sm ${
        variant === "full" ? "p-4" : "p-3"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className={`${textSize} font-semibold leading-snug text-ink`}>
          {clarify.question}
        </p>
        <span
          className={`shrink-0 rounded-full bg-card px-2 py-0.5 ${textSize} font-medium text-ink-3`}
        >
          {clarify.step} / {clarify.total}
        </span>
      </div>

      <div className="space-y-2">
        {clarify.options.map((option, index) => {
          const isSelected = selectedAnswer === option;
          return (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => handleOption(option)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                isSelected
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line bg-card text-ink hover:border-brand/40 hover:bg-brand-soft/40"
              } ${disabled ? "cursor-default opacity-70" : ""}`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-semibold ${
                  isSelected
                    ? "bg-brand text-brand-foreground"
                    : "bg-secondary text-ink-2"
                }`}
              >
                {index + 1}
              </span>
              <span className={textSize}>{option}</span>
            </button>
          );
        })}
      </div>

      {customOpen && !disabled && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
          <span className="text-ink-3" aria-hidden>
            ✎
          </span>
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCustomSubmit();
              }
            }}
            placeholder="Mô tả thêm…"
            className={`min-w-0 flex-1 bg-transparent ${textSize} text-ink outline-none placeholder:text-ink-3`}
          />
          <button
            type="button"
            onClick={handleCustomSubmit}
            disabled={!customText.trim()}
            className={`rounded-lg bg-brand px-2.5 py-1 ${textSize} font-semibold text-brand-foreground disabled:opacity-50`}
          >
            Gửi
          </button>
        </div>
      )}

      {!disabled && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onSkip}
            className={`${textSize} font-medium text-ink-3 transition hover:text-ink`}
          >
            Bỏ qua
          </button>
        </div>
      )}
    </div>
  );
}
