"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, X } from "lucide-react";
import { createRoom } from "@/services/quizApi";
import { useQuizSocket } from "@/hooks/useQuizSocket";
import { useGameStore } from "@/hooks/useGameStore";
import { cn } from "@/lib/utils";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUIZ_OPTIONS = [
  { value: "ai-van-phong", label: "AI cơ bản cho mọi người" },
  { value: "ai-ban-hang", label: "AI hỗ trợ bán hàng" },
  { value: "ai-marketing", label: "AI trong Marketing" },
  { value: "ai-ke-toan", label: "AI an toàn cho kế toán" },
  { value: "ai-hanh-chinh-hr", label: "AI cho Hành chính & HR" },
] as const;

export function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const router = useRouter();
  const { hostRoom } = useQuizSocket();
  const { setPlayerName, setTopic, setMode } = useGameStore();

  const [hostName, setHostName] = useState("");
  const [quizId, setQuizId] = useState<(typeof QUIZ_OPTIONS)[number]["value"]>(
    "ai-van-phong",
  );
  const [mode, setModeState] = useState<"classic" | "team_battle">("classic");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreateRoom() {
    if (!hostName.trim()) {
      setError("Vui lòng nhập tên hiển thị.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const selectedQuiz =
        QUIZ_OPTIONS.find((option) => option.value === quizId) ?? QUIZ_OPTIONS[0];
      const response = await createRoom({
        hostName: hostName.trim(),
        topic: selectedQuiz.label,
        quizId,
        mode,
        maxPlayers: 20,
      });

      if (!response.success) {
        setError(response.error ?? "Không thể tạo phòng.");
        return;
      }

      setPlayerName(hostName.trim());
      setTopic(selectedQuiz.label);
      setMode(mode);
      hostRoom(response.data.roomCode, hostName.trim());
      saveRoomIdentity(response.data.roomCode, {
        participantId: response.data.participantId,
        hostToken: response.data.hostToken,
      });
      router.push(`/hoc-tap/phong/${response.data.roomCode}`);
    } catch {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="relative bg-accent p-6 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Đóng"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-xl bg-white/20">
              <Sparkles className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-2xl font-black">Tạo phòng mới</h2>
              <p className="text-sm font-medium text-white/80">
                Tạo mã phòng và mời team tham gia.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6">
          {error ? (
            <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-ink">Tên của bạn</span>
            <input
              type="text"
              value={hostName}
              onChange={(event) => setHostName(event.target.value)}
              placeholder="Nhập tên hiển thị..."
              className="h-11 w-full rounded-xl border border-line bg-card px-4 text-sm font-semibold outline-none transition placeholder:text-ink-3 focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-ink">Bộ quiz</span>
            <select
              value={quizId}
              onChange={(event) =>
                setQuizId(event.target.value as typeof quizId)
              }
              className="h-11 w-full rounded-xl border border-line bg-card px-4 text-sm font-semibold outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
            >
              {QUIZ_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "classic", label: "Classic" },
              { value: "team_battle", label: "Team Battle" },
            ].map((option) => {
              const active = mode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setModeState(option.value as typeof mode)}
                  className={cn(
                    "h-11 rounded-xl border text-sm font-extrabold transition focus-visible:ring-2 focus-visible:ring-brand",
                    active
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-line bg-card text-ink-2 hover:border-brand/35 hover:text-brand",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-secondary px-4 text-sm font-bold text-ink-2 transition hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleCreateRoom}
              disabled={isLoading}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-extrabold text-brand-foreground transition hover:bg-brand-2 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="size-4" aria-hidden="true" />
              )}
              Tạo phòng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function saveRoomIdentity(
  code: string,
  identity: { participantId: string; hostToken?: string },
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    `ai_troly_hoc_tap_room_${code}`,
    JSON.stringify(identity),
  );
}
