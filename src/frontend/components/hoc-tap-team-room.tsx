"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  Crown,
  LogOut,
  LockKeyhole,
  Loader2,
  Play,
  Send,
  Trophy,
  Unlock,
  Users,
  XCircle,
} from "lucide-react";
import {
  DuckRaceFinishPanel,
  DuckRaceProgressPanel,
} from "@/components/hoc-tap-duck-race-finish";
import { UserAvatar } from "@/components/user-avatar";
import { useAppProfile } from "@/hooks/use-app-profile";
import { usePreferredAvatar } from "@/hooks/use-preferred-avatar";
import {
  buildAvatarIdentityCandidates,
} from "@/lib/avatar-preferences";
import { getHocTapRoomMapThemeLabel } from "@/lib/hoc-tap-duck-race";
import {
  clearHocTapRoomIdentity,
  readHocTapRoomIdentity,
  saveHocTapRoomIdentity,
  type HocTapRoomIdentity,
} from "@/lib/hoc-tap-room-identity";
import {
  fetchHocTapRoom,
  joinHocTapRoomByCode,
  leaveHocTapRoomGame,
  startHocTapRoomGame,
  submitHocTapRoomAnswer,
  updateHocTapRoomSettings,
} from "@/lib/client-api";
import type { HocTapRoomSnapshot } from "@/lib/hoc-tap-room-store";

const BACK_TO_TEAM_HREF = "/choi-voi-team";

type StoredRoomIdentityState = {
  key: string;
  value: HocTapRoomIdentity | null;
};

type HocTapTeamRoomProps = {
  code: string;
  displayName: string;
};

export function HocTapTeamRoom({ code, displayName }: HocTapTeamRoomProps) {
  const router = useRouter();
  const normalizedCode = code.toUpperCase();
  const { fullName, email, avatar: remoteAvatar } = useAppProfile();
  const avatarIdentities = useMemo(
    () => buildAvatarIdentityCandidates(fullName, displayName, email),
    [displayName, email, fullName],
  );
  const roomIdentityKey = avatarIdentities.primary;
  const roomIdentityAliases = avatarIdentities.aliases;
  const { avatarSeed } = usePreferredAvatar(
    roomIdentityKey,
    remoteAvatar,
    roomIdentityAliases,
  );
  const [room, setRoom] = useState<HocTapRoomSnapshot | null>(null);
  const [identityState, setIdentityState] = useState<StoredRoomIdentityState>(
    () => ({
      key: roomIdentityKey,
      value: readHocTapRoomIdentity(
        normalizedCode,
        roomIdentityKey,
        roomIdentityAliases,
      ),
    }),
  );
  const identity =
    identityState.key === roomIdentityKey
      ? identityState.value
      : readHocTapRoomIdentity(
          normalizedCode,
          roomIdentityKey,
          roomIdentityAliases,
        );
  const participantId = identity?.participantId;
  const hostToken = identity?.hostToken;
  const [joinName, setJoinName] = useState(displayName);
  const [selectedAnswer, setSelectedAnswer] = useState<{
    questionIndex: number;
    answerIndex: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletedByHost, setDeletedByHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    let active = true;

    fetchHocTapRoom(normalizedCode, participantId)
      .then((response) => {
        if (!active) return;
        setRoom(response.room);
        if (response.room.viewerParticipantId) {
          const nextIdentity = {
            participantId: response.room.viewerParticipantId,
            hostToken,
          };
          saveHocTapRoomIdentity(
            normalizedCode,
            roomIdentityKey,
            nextIdentity,
            roomIdentityAliases,
          );
          setIdentityState({ key: roomIdentityKey, value: nextIdentity });
        } else {
          clearHocTapRoomIdentity(
            normalizedCode,
            roomIdentityKey,
            roomIdentityAliases,
          );
          setIdentityState({ key: roomIdentityKey, value: null });
        }
        setDeletedByHost(false);
        setError("");
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (isRoomNotFoundError(err)) {
          clearHocTapRoomIdentity(
            normalizedCode,
            roomIdentityKey,
            roomIdentityAliases,
          );
          setRoom(null);
          setDeletedByHost(false);
          setIdentityState({ key: roomIdentityKey, value: null });
        }
        setError(err instanceof Error ? err.message : "Không tải được phòng.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    hostToken,
    normalizedCode,
    participantId,
    roomIdentityAliases,
    roomIdentityKey,
  ]);

  useEffect(() => {
    if (!room || room.status === "finished") return;
    const timer = window.setInterval(() => {
      fetchHocTapRoom(normalizedCode, participantId)
        .then((response) => {
          setRoom(response.room);
          if (response.room.viewerParticipantId) {
            const nextIdentity = {
              participantId: response.room.viewerParticipantId,
              hostToken,
            };
            saveHocTapRoomIdentity(
              normalizedCode,
              roomIdentityKey,
              nextIdentity,
              roomIdentityAliases,
            );
            setIdentityState({ key: roomIdentityKey, value: nextIdentity });
          } else {
            clearHocTapRoomIdentity(
              normalizedCode,
              roomIdentityKey,
              roomIdentityAliases,
            );
            setIdentityState({ key: roomIdentityKey, value: null });
          }
          setDeletedByHost(false);
          setError("");
        })
        .catch((err: unknown) => {
          if (isRoomNotFoundError(err)) {
            clearHocTapRoomIdentity(
              normalizedCode,
              roomIdentityKey,
              roomIdentityAliases,
            );
            setRoom(null);
            setDeletedByHost(true);
            setIdentityState({ key: roomIdentityKey, value: null });
            setError("");
            return;
          }
          // Keep the current snapshot during transient polling failures.
        });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    hostToken,
    normalizedCode,
    participantId,
    room,
    roomIdentityAliases,
    roomIdentityKey,
  ]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  const viewer = useMemo(
    () =>
      identity
        ? room?.participants.find((item) => item.id === identity.participantId) ??
          null
        : null,
    [identity, room],
  );

  async function handleJoin() {
    if (!joinName.trim()) {
      setError("Vui lòng nhập tên để tham gia phòng.");
      return;
    }

    setActionLoading(true);
    try {
      const response = await joinHocTapRoomByCode({
        code: normalizedCode,
        playerName: joinName.trim(),
        avatarSeed,
      });
      const nextIdentity = { participantId: response.participantId };
      saveHocTapRoomIdentity(
        normalizedCode,
        roomIdentityKey,
        nextIdentity,
        roomIdentityAliases,
      );
      setIdentityState({ key: roomIdentityKey, value: nextIdentity });
      setRoom(response.room);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa tham gia được phòng.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStart() {
    if (!identity || !room?.canStart) {
      setError("Chỉ người có quyền điều khiển phòng mới bắt đầu được.");
      return;
    }
    setActionLoading(true);
    try {
      const response = await startHocTapRoomGame({
        code: normalizedCode,
        hostToken: identity.hostToken,
        participantId: identity.participantId,
      });
      setRoom(response.room);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa bắt đầu được phòng.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAnswer(answerIndex: number) {
    if (!identity || !room) {
      setError("Bạn cần tham gia phòng trước khi trả lời.");
      return;
    }
    setSelectedAnswer({
      questionIndex: room.currentQuestionIndex,
      answerIndex,
    });
    setActionLoading(true);
    try {
      const response = await submitHocTapRoomAnswer({
        code: normalizedCode,
        participantId: identity.participantId,
        questionIndex: room.currentQuestionIndex,
        answerIndex,
      });
      setRoom(response.room);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa gửi được đáp án.");
    } finally {
      setActionLoading(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(normalizedCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Trình duyệt chưa cho phép copy mã phòng.");
    }
  }

  async function handleLockToggle() {
    if (!identity || !room?.canManageRoom) {
      setError("Chỉ người điều khiển phòng mới đổi trạng thái khoá.");
      return;
    }
    setActionLoading(true);
    try {
      const response = await updateHocTapRoomSettings({
        code: normalizedCode,
        locked: !room.isLocked,
        hostToken: identity.hostToken,
        participantId: identity.participantId,
      });
      setRoom(response.room);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa đổi được trạng thái khoá.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLeaveRoom() {
    if (!identity) {
      router.push(BACK_TO_TEAM_HREF);
      return;
    }

    setActionLoading(true);
    try {
      await leaveHocTapRoomGame({
        code: normalizedCode,
        participantId: identity.participantId,
        hostToken: identity.hostToken,
      });
      clearHocTapRoomIdentity(
        normalizedCode,
        roomIdentityKey,
        roomIdentityAliases,
      );
      router.push(BACK_TO_TEAM_HREF);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa rời được phòng.");
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[62vh] w-full max-w-5xl items-center justify-center px-4 py-10">
        <span className="inline-flex items-center gap-2 rounded-2xl border border-line bg-card px-5 py-3 text-sm font-bold text-ink-2 shadow-sm">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Đang tải phòng...
        </span>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={BACK_TO_TEAM_HREF}
            className="grid size-10 flex-none place-items-center rounded-xl border border-line text-ink-2 transition hover:border-brand/35 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Quay lại Chơi với team"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent">
              Phòng chơi team
            </p>
            <h1 className="truncate font-display text-xl font-black text-ink sm:text-2xl">
              {room?.title ?? "Không tìm thấy phòng"}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-extrabold text-brand-foreground transition hover:bg-brand-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <Clipboard className="size-4" aria-hidden="true" />
            {copied ? "Đã copy" : normalizedCode}
          </button>
          {room?.isLocked ? (
            <span className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-50 px-4 text-xs font-black text-amber-700">
              <LockKeyhole className="size-4" aria-hidden="true" />
              Phòng khoá
            </span>
          ) : null}
          {room ? <RoomStatusPill status={room.status} /> : null}
          {room?.canManageRoom && room.status === "waiting" ? (
            <button
              type="button"
              onClick={handleLockToggle}
              disabled={actionLoading}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-xs font-black text-ink transition hover:border-brand/35 hover:text-brand disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              {room.isLocked ? (
                <Unlock className="size-4" aria-hidden="true" />
              ) : (
                <LockKeyhole className="size-4" aria-hidden="true" />
              )}
              {room.isLocked ? "Mở phòng" : "Khoá phòng"}
            </button>
          ) : null}
          {identity ? (
            <button
              type="button"
              onClick={handleLeaveRoom}
              disabled={actionLoading}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              <LogOut className="size-4" aria-hidden="true" />
              {room?.canManageRoom ? "Rời & xoá phòng" : "Rời phòng"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      {!room ? (
        <EmptyRoomState deletedByHost={deletedByHost} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 rounded-2xl border border-line bg-card p-5 shadow-sm">
            {room.isLocked ? (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                {room.status === "playing"
                  ? "Phòng đã khoá khi bắt đầu chơi. Người mới không thể tham gia, kể cả khi có mã phòng."
                  : "Phòng đang khoá. Người mới chỉ vào được khi nhập đúng mã phòng."}
              </div>
            ) : null}

            {room.status === "playing" && room.mapTheme === "duck-race" ? (
              <div className="mb-5">
                <DuckRaceProgressPanel room={room} />
              </div>
            ) : null}

            {room.status === "waiting" ? (
              <LobbyPanel
                room={room}
                viewerName={viewer?.name ?? null}
                joinName={joinName}
                onJoinNameChange={setJoinName}
                onJoin={handleJoin}
                onStart={handleStart}
                actionLoading={actionLoading}
                isKnownParticipant={Boolean(viewer)}
                canStart={room.canStart}
                canManageRoom={room.canManageRoom}
                onToggleLock={handleLockToggle}
              />
            ) : null}

            {room.status === "playing" &&
            (room.phase === "question" || room.phase === "reveal") ? (
              <QuestionPanel
                room={room}
                nowMs={nowMs}
                selectedAnswer={
                  selectedAnswer?.questionIndex === room.currentQuestionIndex
                    ? selectedAnswer.answerIndex
                    : null
                }
                canAnswer={
                  Boolean(identity) &&
                  !room.isHost
                }
                isHostViewer={room.isHost}
                actionLoading={actionLoading}
                onAnswer={handleAnswer}
              />
            ) : null}

            {room.status === "playing" && room.phase === "leaderboard" ? (
              <RoundLeaderboardPanel room={room} nowMs={nowMs} />
            ) : null}

            {room.status === "finished" ? <FinishedPanel room={room} /> : null}
          </section>

          <aside className="space-y-5">
            <RoomSummary room={room} />
            <Leaderboard room={room} />
          </aside>
        </div>
      )}
    </main>
  );
}

function LobbyPanel({
  room,
  viewerName,
  joinName,
  onJoinNameChange,
  onJoin,
  onStart,
  onToggleLock,
  actionLoading,
  isKnownParticipant,
  canStart,
  canManageRoom,
}: {
  room: HocTapRoomSnapshot;
  viewerName: string | null;
  joinName: string;
  onJoinNameChange: (value: string) => void;
  onJoin: () => void;
  onStart: () => void;
  onToggleLock: () => void;
  actionLoading: boolean;
  isKnownParticipant: boolean;
  canStart: boolean;
  canManageRoom: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-black text-ink">
          Sảnh chờ
        </h2>
        <p className="mt-2 text-sm font-medium leading-6 text-ink-2">
          {room.hostMode === "system"
            ? "Người tạo phòng sẽ bấm bắt đầu khi team đã vào đủ. Phòng chỉ ở sảnh chờ cho tới lúc đó, rồi hệ thống mới chạy câu hỏi 60 giây, hiện đáp án 5 giây và chuyển bảng xếp hạng."
            : "Chia sẻ mã phòng cho team. Khi mọi người đã vào đủ, chủ phòng bấm bắt đầu rồi quan sát đường đua, điểm và leaderboard của người chơi."}
        </p>
      </div>

      {room.hostMode === "system" || canManageRoom ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
          {canManageRoom && room.hostMode === "human"
            ? room.participantCount > 0
              ? "Bạn là chủ phòng. Bấm bắt đầu khi team đã sẵn sàng; bạn chỉ quan sát và không trả lời quiz."
              : "Bạn là chủ phòng. Mời ít nhất 1 người chơi vào phòng trước khi bắt đầu."
            : canStart
            ? "Bạn là người tạo phòng. Khi sẵn sàng, bấm bắt đầu để mở câu đầu tiên cho cả team."
            : "Hãy chờ người tạo phòng bấm bắt đầu để cả team cùng vào câu hỏi đầu tiên."}
        </div>
      ) : null}

      {!isKnownParticipant ? (
        <div className="space-y-2 rounded-2xl bg-secondary p-4">
          {room.participantCount >= room.maxPlayers ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700">
              Phòng đầy. Khi có người rời phòng, slot sẽ tự mở lại.
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="block">
              <span className="sr-only">Tên tham gia phòng</span>
              <input
                value={joinName}
                onChange={(event) => onJoinNameChange(event.target.value)}
                disabled={room.participantCount >= room.maxPlayers}
                className="h-11 w-full rounded-xl border border-line bg-card px-4 text-sm font-bold text-ink outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-brand focus:ring-4 focus:ring-brand/10"
                placeholder="Tên hiển thị của bạn"
              />
            </label>
            <button
              type="button"
              onClick={onJoin}
              disabled={actionLoading || room.participantCount >= room.maxPlayers}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-extrabold text-brand-foreground transition hover:bg-brand-2 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <Send className="size-4" aria-hidden="true" />
              {room.participantCount >= room.maxPlayers ? "Phòng đầy" : "Vào phòng"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-brand-soft p-4 text-sm font-bold text-brand">
          Bạn đang ở trong phòng với tên {viewerName}.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {room.participants.map((participant) => (
          <div
            key={participant.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <ParticipantAvatar participant={participant} size="lg" />
              <span className="truncate text-sm font-extrabold text-ink">
                {participant.name}
              </span>
            </div>
            {participant.isHost ? (
              <Crown className="size-4 flex-none text-amber-500" aria-hidden="true" />
            ) : null}
          </div>
        ))}
      </div>

      {canManageRoom ? (
        <div>
          <button
            type="button"
            onClick={onToggleLock}
            disabled={actionLoading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-black text-ink transition hover:border-brand/35 hover:text-brand disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            {room.isLocked ? (
              <Unlock className="size-4" aria-hidden="true" />
            ) : (
              <LockKeyhole className="size-4" aria-hidden="true" />
            )}
            {room.isLocked ? "Mở phòng" : "Khoá phòng"}
          </button>
        </div>
      ) : null}

      {canStart ? (
        <button
          type="button"
          onClick={onStart}
          disabled={actionLoading || room.participantCount < 1}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-black text-white shadow-sm shadow-accent/20 transition hover:bg-accent/90 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          {actionLoading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="size-4" aria-hidden="true" />
          )}
          Bắt đầu chơi
        </button>
      ) : null}
    </div>
  );
}

function QuestionPanel({
  room,
  nowMs,
  selectedAnswer,
  canAnswer,
  isHostViewer,
  actionLoading,
  onAnswer,
}: {
  room: HocTapRoomSnapshot;
  nowMs: number;
  selectedAnswer: number | null;
  canAnswer: boolean;
  isHostViewer: boolean;
  actionLoading: boolean;
  onAnswer: (answerIndex: number) => void;
}) {
  const question = room.currentQuestion;
  const viewerAnswer = room.viewerAnswer;
  const answered = Boolean(viewerAnswer);
  const answerRevealed = Boolean(viewerAnswer?.revealed);
  const isRevealPhase = room.phase === "reveal";
  const countdownLabel = room.phaseEndsAt
    ? formatSecondsLeft(room.phaseEndsAt, nowMs)
    : null;

  if (!question) {
    return (
      <div className="rounded-2xl bg-secondary p-6 text-center text-sm font-bold text-ink-2">
        Đang chờ câu hỏi tiếp theo...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent">
            Câu {room.currentQuestionIndex + 1} / {room.questionCount}
          </p>
          <h2 className="mt-2 font-display text-2xl font-black leading-tight text-ink">
            {question.question}
          </h2>
        </div>
        <span className="inline-flex w-max items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-black text-brand">
          <Users className="size-4" aria-hidden="true" />
          {room.participantCount} người chơi
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-secondary px-4 py-3 text-sm font-bold text-ink">
          Đã trả lời: {room.answeredPlayerCount}/{room.participantCount}
        </div>
        <div className="rounded-2xl bg-secondary px-4 py-3 text-sm font-bold text-ink">
          {isRevealPhase ? "Sang leaderboard sau" : "Còn lại"}:{" "}
          {countdownLabel ?? "0 giây"}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {question.options.map((option, index) => {
          const isSelected = viewerAnswer
            ? viewerAnswer.answerIndex === index
            : selectedAnswer === index;
          const showCorrect =
            answerRevealed && question.correctIndex === index;
          const showWrong =
            answerRevealed &&
            Boolean(viewerAnswer) &&
            viewerAnswer?.answerIndex === index &&
            !viewerAnswer.isCorrect &&
            isRevealPhase;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onAnswer(index)}
              disabled={
                !canAnswer ||
                answered ||
                actionLoading ||
                isRevealPhase
              }
              className={`min-h-[88px] rounded-2xl border p-4 text-left text-sm font-extrabold leading-6 transition focus-visible:ring-2 focus-visible:ring-brand ${
                showCorrect
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : showWrong
                    ? "border-red-200 bg-red-50 text-red-700"
                    : isSelected
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-line bg-white text-ink hover:border-brand/35 hover:text-brand"
              } disabled:cursor-not-allowed`}
            >
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-current/60">
                Đáp án {index + 1}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {viewerAnswer && answerRevealed ? (
        <div
          className={`rounded-2xl p-4 text-sm font-semibold leading-6 ${
            viewerAnswer.isCorrect
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          <div className="mb-1 flex items-center gap-2 font-black">
            {viewerAnswer.isCorrect ? (
              <CheckCircle2 className="size-4" aria-hidden="true" />
            ) : (
              <XCircle className="size-4" aria-hidden="true" />
            )}
            {viewerAnswer.isCorrect ? "Chính xác" : "Chưa đúng"}
          </div>
          {viewerAnswer.explanation}
        </div>
      ) : answered ? (
        <div className="rounded-2xl bg-brand-soft p-4 text-sm font-semibold leading-6 text-brand">
          <div className="mb-1 flex items-center gap-2 font-black">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Đã chốt đáp án
          </div>
          Chờ cả phòng trả lời xong hoặc hết 60 giây để hệ thống hiện đáp án đúng.
        </div>
      ) : isRevealPhase ? (
        <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800">
          <div className="mb-1 flex items-center gap-2 font-black">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Đáp án đúng đang được hiển thị
          </div>
          {isHostViewer
            ? "Chủ phòng quan sát đáp án đúng trước khi chuyển sang leaderboard."
            : "Bạn chưa chốt đáp án kịp, nên hệ thống đang hiện đáp án đúng trước khi sang bảng xếp hạng."}
        </div>
      ) : isHostViewer ? (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-700">
          Chủ phòng chỉ quan sát và không tham gia trả lời.
        </div>
      ) : !canAnswer ? (
        <div className="rounded-2xl bg-secondary p-4 text-sm font-bold text-ink-2">
          Nhập tên để tham gia phòng trước khi trả lời.
        </div>
      ) : null}
    </div>
  );
}

function RoundLeaderboardPanel({
  room,
  nowMs,
}: {
  room: HocTapRoomSnapshot;
  nowMs: number;
}) {
  const countdownLabel = room.phaseEndsAt
    ? formatSecondsLeft(room.phaseEndsAt, nowMs)
    : null;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent">
          Top 5 sau câu {room.currentQuestionIndex + 1}
        </p>
        <h2 className="mt-2 font-display text-2xl font-black text-ink">
          Bảng xếp hạng tạm thời
        </h2>
        <p className="mt-2 text-sm font-medium text-ink-2">
          Câu tiếp theo sẽ tự mở sau {countdownLabel ?? "0 giây"}.
        </p>
      </div>

      <div className="grid gap-3">
        {room.roundTopFive.map((participant, index) => (
          <div
            key={participant.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-secondary px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="w-6 flex-none text-sm font-black text-amber-500">
                {index + 1}
              </span>
              <ParticipantAvatar participant={participant} size="lg" />
              <span className="truncate text-sm font-extrabold text-ink">
                {participant.name}
              </span>
            </div>
            <span className="text-sm font-black text-brand">
              {participant.score} điểm
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinishedPanel({ room }: { room: HocTapRoomSnapshot }) {
  if (room.mapTheme === "duck-race") {
    return <DuckRaceFinishPanel room={room} backHref={BACK_TO_TEAM_HREF} />;
  }

  return (
    <div className="space-y-5">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-50 text-amber-500">
        <Trophy className="size-8" aria-hidden="true" />
      </span>
      <div className="text-center">
        <h2 className="font-display text-2xl font-black text-ink">
          Phòng đã kết thúc
        </h2>
        <p className="mt-2 text-sm font-medium text-ink-2">
          {room.finalTopThree[0]
            ? `${room.finalTopThree[0].name} đứng đầu bảng xếp hạng chung cuộc.`
            : "Chưa có điểm số trong phòng này."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {room.finalTopThree.map((participant, index) => (
          <div
            key={participant.id}
            className="rounded-2xl border border-line bg-secondary px-4 py-5 text-center"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-accent">
              Top {index + 1}
            </p>
            <div className="mx-auto mt-3 flex justify-center">
              <ParticipantAvatar participant={participant} size="xl" />
            </div>
            <p className="mt-3 truncate text-sm font-extrabold text-ink">
              {participant.name}
            </p>
            <p className="mt-1 text-xs font-black text-brand">
              {participant.score} điểm
            </p>
          </div>
        ))}
      </div>
      <Link
        href={BACK_TO_TEAM_HREF}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-extrabold text-brand-foreground transition hover:bg-brand-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        Quay lại Chơi với team
      </Link>
    </div>
  );
}

function RoomSummary({ room }: { room: HocTapRoomSnapshot }) {
  const modeLabel = room.mode === "team-battle" ? "Team Battle" : "Classic";
  const mapLabel = getHocTapRoomMapThemeLabel(room.mapTheme);
  const phaseLabel =
    room.phase === "waiting"
      ? "Đang chờ"
      : room.phase === "question"
        ? "Đang trả lời"
        : room.phase === "reveal"
          ? "Hiện đáp án"
        : room.phase === "leaderboard"
          ? "Top 5"
          : "Kết thúc";

  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h2 className="font-display text-sm font-black text-ink">Thông tin phòng</h2>
      <div className="mt-4 space-y-3 text-xs font-semibold text-ink-2">
        <SummaryRow label="Mã phòng" value={room.code} />
        <SummaryRow label="Host" value={room.hostName} />
        <SummaryRow label="Trạng thái khoá" value={room.isLocked ? "Đang khoá" : "Công khai"} />
        <SummaryRow
          label="Kiểu host"
          value={room.hostMode === "system" ? "Hệ thống" : "Người thật"}
        />
        <SummaryRow label="Chế độ" value={modeLabel} />
        <SummaryRow label="Bản đồ" value={mapLabel} />
        <SummaryRow label="Pha hiện tại" value={phaseLabel} />
        <SummaryRow label="Bộ quiz" value={room.category} />
        <SummaryRow
          label="Người chơi"
          value={`${room.participantCount}/${room.maxPlayers}`}
        />
      </div>
    </section>
  );
}

function ParticipantAvatar({
  participant,
  size,
}: {
  participant: HocTapRoomSnapshot["participants"][number];
  size: "md" | "lg" | "xl";
}) {
  const sizeClass =
    size === "xl"
      ? "size-12 text-sm"
      : size === "lg"
        ? "size-10 text-[10px]"
        : "size-8 text-[10px]";

  return (
    <UserAvatar
      avatarUrl={participant.avatarUrl}
      fallbackText={participant.initials}
      alt={`Avatar của ${participant.name}`}
      className={`${sizeClass} flex-none rounded-full border border-line bg-card object-cover`}
      fallbackClassName={`grid ${sizeClass} flex-none place-items-center rounded-full bg-brand-soft font-black text-brand`}
    />
  );
}

function Leaderboard({ room }: { room: HocTapRoomSnapshot }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h2 className="font-display text-sm font-black text-ink">
        Bảng điểm tổng
      </h2>
      <div className="mt-4 space-y-3">
        {room.leaderboard.map((participant, index) => (
          <div
            key={participant.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="w-5 flex-none text-xs font-black text-amber-500">
                {index + 1}
              </span>
              <ParticipantAvatar participant={participant} size="md" />
              <span className="truncate text-xs font-extrabold text-ink">
                {participant.name}
              </span>
            </div>
            <span className="flex-none text-xs font-black text-brand">
              {participant.score} điểm
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatSecondsLeft(targetIso: string, nowMs: number): string {
  const diffMs = Date.parse(targetIso) - nowMs;
  const seconds = Math.max(0, Math.ceil(diffMs / 1000));
  return `${seconds} giây`;
}

function RoomStatusPill({ status }: { status: HocTapRoomSnapshot["status"] }) {
  const config = {
    waiting: "bg-violet-50 text-violet-700",
    playing: "bg-emerald-50 text-emerald-700",
    finished: "bg-ink text-white",
  } satisfies Record<typeof status, string>;
  const label = {
    waiting: "Đang chờ",
    playing: "Đang chơi",
    finished: "Kết thúc",
  } satisfies Record<typeof status, string>;

  return (
    <span
      className={`inline-flex min-h-10 items-center rounded-xl px-4 text-xs font-black ${config[status]}`}
    >
      {label[status]}
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line pb-2 last:border-0 last:pb-0">
      <span>{label}</span>
      <span className="truncate text-right font-black text-ink">{value}</span>
    </div>
  );
}

function EmptyRoomState({ deletedByHost = false }: { deletedByHost?: boolean }) {
  return (
    <section className="rounded-2xl border border-dashed border-line bg-card px-6 py-14 text-center shadow-sm">
      <h2 className="font-display text-xl font-black text-ink">
        {deletedByHost ? "Phòng đã bị xoá" : "Không tìm thấy phòng"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-ink-2">
        {deletedByHost
          ? "Host đã xoá phòng này. Bạn có thể quay lại Chơi với team để tham gia phòng khác hoặc tạo phòng mới."
          : "Mã phòng có thể đã sai hoặc runtime đã được khởi động lại. Tạo phòng mới từ trang Học tập để tiếp tục."}
      </p>
      <Link
        href={BACK_TO_TEAM_HREF}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-extrabold text-brand-foreground transition hover:bg-brand-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        Về Chơi với team
      </Link>
    </section>
  );
}

function isRoomNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("Không tìm thấy phòng")
  );
}
