"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Flag, Trophy, Waves } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import {
  applyDuckRaceQuestionProgress,
  buildDuckRaceStandings,
  getDuckRaceOutcomeLabel,
  getDuckRaceQuestionProgressPercent,
} from "@/lib/hoc-tap-duck-race";
import type { HocTapRoomSnapshot } from "@/lib/hoc-tap-room-store";

const RACE_ANIMATION_MS = 700;

export function DuckRaceFinishPanel({
  room,
  backHref,
}: {
  room: HocTapRoomSnapshot;
  backHref: string;
}) {
  const standings = useMemo(
    () => buildDuckRaceStandings(room.leaderboard, room.questionCount),
    [room.leaderboard, room.questionCount],
  );
  const finishedStandings = useMemo(
    () => applyDuckRaceQuestionProgress(standings, 100),
    [standings],
  );
  const winnerLabel = getDuckRaceOutcomeLabel(finishedStandings);

  return (
    <div className="space-y-5">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-50 text-amber-500">
        <Trophy className="size-8" aria-hidden="true" />
      </span>

      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent">
          Bản đồ đua vịt
        </p>
        <h2 className="mt-2 font-display text-2xl font-black text-ink">
          Cuộc đua tổng kết đã sẵn sàng
        </h2>
        <p className="mt-2 text-sm font-medium leading-6 text-ink-2">
          {winnerLabel}
        </p>
      </div>

      <DuckRaceCanvas standings={finishedStandings} animate={false} />

      <div className="grid gap-3 sm:grid-cols-3">
        <RaceStatCard
          icon={Flag}
          label="Đích"
          value="100% đường đua"
        />
        <RaceStatCard
          icon={Waves}
          label="Làn đua"
          value={`${standings.length} người chơi`}
        />
        <RaceStatCard
          icon={Trophy}
          label="Câu hỏi"
          value={`${room.questionCount} câu`}
        />
      </div>

      <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-ink-3">
              Leaderboard tổng kết
            </p>
            <h3 className="mt-1 font-display text-lg font-black text-ink">
              Bảng xếp hạng session
            </h3>
          </div>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-[11px] font-black text-brand">
            Map đua vịt
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {standings.length > 0 ? (
            standings.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-secondary px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-10 flex-none text-sm font-black text-amber-600">
                    #{participant.rank}
                  </span>
                  <UserAvatar
                    avatarUrl={participant.avatarUrl}
                    fallbackText={participant.initials}
                    alt={`Avatar của ${participant.name}`}
                    className="size-11 rounded-full border border-line bg-card object-cover"
                    fallbackClassName="grid size-11 place-items-center rounded-full bg-brand-soft font-black text-brand"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-ink">
                      {participant.name}
                    </p>
                    <p className="text-[11px] font-semibold text-ink-3">
                      Đã hoàn thành đường đua
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-brand">
                    {participant.score} điểm
                  </p>
                  <p className="text-[11px] font-semibold text-ink-3">
                    {participant.duckName}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-secondary px-4 py-5 text-center text-sm font-semibold text-ink-3">
              Phòng chưa có kết quả người chơi để xếp hạng.
            </p>
          )}
        </div>
      </section>

      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-extrabold text-brand-foreground transition hover:bg-brand-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        Quay lại Chơi với team
      </Link>
    </div>
  );
}

export function DuckRaceProgressPanel({ room }: { room: HocTapRoomSnapshot }) {
  const progressPercent = getDuckRaceQuestionProgressPercent({
    questionCount: room.questionCount,
    currentQuestionIndex: room.currentQuestionIndex,
    phase: room.phase,
    status: room.status,
  });
  const completedQuestionCount = Math.round(
    (progressPercent / 100) * room.questionCount,
  );
  const standings = useMemo(
    () =>
      applyDuckRaceQuestionProgress(
        buildDuckRaceStandings(room.leaderboard, room.questionCount),
        progressPercent,
      ),
    [progressPercent, room.leaderboard, room.questionCount],
  );

  return (
    <section
      className="space-y-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4"
      aria-label="Tiến độ bản đồ đua vịt"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">
            Bản đồ đua vịt
          </p>
          <h2 className="mt-1 font-display text-lg font-black text-ink">
            Cả team đã đi {completedQuestionCount}/{room.questionCount} chặng
          </h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-sky-700 shadow-sm">
          {Math.round(progressPercent)}% đường đua
        </span>
      </div>
      <p className="text-xs font-semibold leading-5 text-ink-2">
        Mỗi câu hoàn tất sẽ đưa toàn bộ vịt tiến thêm một chặng. Điểm vẫn dùng
        để xếp hạng chung cuộc.
      </p>
      <DuckRaceCanvas standings={standings} animate />
    </section>
  );
}

function DuckRaceCanvas({
  standings,
  animate,
}: {
  standings: ReturnType<typeof buildDuckRaceStandings>;
  animate: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const [canvasWidth, setCanvasWidth] = useState(960);
  const targetProgress = standings[0]?.distancePercent ?? 0;
  const previousProgressRef = useRef(targetProgress);
  const [displayProgress, setDisplayProgress] = useState(targetProgress);
  const [imageVersion, setImageVersion] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const compact = canvasWidth < 560;
  const laneHeight = compact ? 72 : 84;
  const canvasHeight = Math.max(220, standings.length * laneHeight + 64);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;

    const updateWidth = () => {
      setCanvasWidth(Math.max(280, Math.round(node.clientWidth - 24)));
    };
    updateWidth();

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const fromProgress = previousProgressRef.current;
    previousProgressRef.current = targetProgress;

    if (
      !animate ||
      prefersReducedMotion ||
      Math.abs(fromProgress - targetProgress) < 0.01
    ) {
      setDisplayProgress(targetProgress);
      return;
    }

    const startedAt = performance.now();
    let frameId = 0;

    const animateStep = (time: number) => {
      const elapsed = time - startedAt;
      const linearProgress = Math.min(1, elapsed / RACE_ANIMATION_MS);
      const easedProgress = 1 - Math.pow(1 - linearProgress, 3);
      setDisplayProgress(
        fromProgress + (targetProgress - fromProgress) * easedProgress,
      );
      if (linearProgress < 1) {
        frameId = window.requestAnimationFrame(animateStep);
      }
    };

    frameId = window.requestAnimationFrame(animateStep);
    return () => window.cancelAnimationFrame(frameId);
  }, [animate, prefersReducedMotion, targetProgress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvasWidth * pixelRatio);
    canvas.height = Math.round(canvasHeight * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const duckWidth = compact ? 52 : 72;
    const duckHeight = compact ? 40 : 54;
    const startX = compact ? 80 : 132;
    const finishLineX = canvasWidth - (compact ? 30 : 54);
    const trackLength = Math.max(
      0,
      finishLineX - startX - duckWidth - (compact ? 6 : 12),
    );

    const background = context.createLinearGradient(0, 0, 0, canvasHeight);
    background.addColorStop(0, "#d9f4ff");
    background.addColorStop(0.55, "#96d8f8");
    background.addColorStop(1, "#5eb4df");
    context.fillStyle = background;
    context.fillRect(0, 0, canvasWidth, canvasHeight);

    for (let index = 0; index < standings.length; index += 1) {
      const laneTop = 36 + index * laneHeight;
      context.fillStyle =
        index % 2 === 0
          ? "rgba(255,255,255,0.14)"
          : "rgba(17,75,53,0.08)";
      context.fillRect(0, laneTop - 8, canvasWidth, laneHeight - 8);

      context.strokeStyle = "rgba(255,255,255,0.45)";
      context.lineWidth = 2;
      context.setLineDash([10, 10]);
      context.beginPath();
      context.moveTo(startX - 8, laneTop + duckHeight / 2);
      context.lineTo(finishLineX - 12, laneTop + duckHeight / 2);
      context.stroke();
      context.setLineDash([]);
    }

    drawFinishLine(context, finishLineX, canvasHeight);

    standings.forEach((participant, index) => {
      const laneTop = 36 + index * laneHeight;
      const duckProgress = (trackLength * displayProgress) / 100;
      const duckX = startX + duckProgress;
      const bobbingOffset = prefersReducedMotion
        ? 0
        : Math.sin(displayProgress * Math.PI * 0.08 + index) * 1.5;
      const duckY = laneTop + bobbingOffset;
      const duckImage = getDuckImage(
        participant.duckSkinIndex,
        imageCacheRef.current,
        () => setImageVersion((current) => current + 1),
      );

      context.fillStyle = "rgba(11, 42, 56, 0.14)";
      context.beginPath();
      context.ellipse(
        duckX + duckWidth / 2,
        duckY + duckHeight - 3,
        duckWidth * 0.38,
        compact ? 5 : 8,
        0,
        0,
        Math.PI * 2,
      );
      context.fill();

      if (duckImage.complete && duckImage.naturalWidth > 0) {
        context.drawImage(duckImage, duckX, duckY, duckWidth, duckHeight);
        context.fillStyle = "#0f3f2d";
        context.font = `800 ${compact ? 10 : 12}px ui-sans-serif, system-ui, sans-serif`;
        context.textAlign = "center";
        drawFittedCanvasText(
          context,
          participant.duckName.replace(/^Vịt\s+/u, ""),
          duckX + duckWidth * 0.16,
          duckY + duckHeight * 0.73,
          duckWidth * 0.72,
        );
        context.textAlign = "start";
      } else {
        context.fillStyle = "#ffd54f";
        context.fillRect(duckX, duckY, duckWidth, duckHeight);
      }

      context.fillStyle = "#0f3f2d";
      context.font = `700 ${compact ? 11 : 13}px ui-sans-serif, system-ui, sans-serif`;
      drawFittedCanvasText(
        context,
        participant.name,
        compact ? 8 : 16,
        duckY + 18,
        startX - (compact ? 16 : 28),
      );
      context.font = `600 ${compact ? 9 : 11}px ui-sans-serif, system-ui, sans-serif`;
      context.fillStyle = "rgba(15, 63, 45, 0.78)";
      context.fillText(
        `${participant.duckName} - ${participant.score} điểm`,
        compact ? 8 : 16,
        duckY + (compact ? 34 : 39),
      );

      const bubbleWidth = compact ? 52 : 68;
      const bubbleX = Math.min(
        canvasWidth - bubbleWidth - 8,
        duckX + duckWidth - 4,
      );
      context.fillStyle = "rgba(255,255,255,0.92)";
      context.fillRect(
        bubbleX,
        duckY + (compact ? 4 : 8),
        bubbleWidth,
        compact ? 22 : 26,
      );
      context.fillStyle = "#114b35";
      context.font = `700 ${compact ? 10 : 12}px ui-sans-serif, system-ui, sans-serif`;
      context.fillText(
        `${Math.round(displayProgress)}%`,
        bubbleX + (compact ? 10 : 14),
        duckY + (compact ? 19 : 25),
      );
    });
  }, [
    displayProgress,
    canvasHeight,
    canvasWidth,
    compact,
    imageVersion,
    laneHeight,
    prefersReducedMotion,
    standings,
  ]);

  if (standings.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-line bg-[#e7f7ff] px-5 py-10 text-center">
        <p className="text-sm font-bold text-ink-2">
          Chưa có dữ liệu người chơi để dựng đường đua.
        </p>
      </div>
    );
  }

  const raceSummary = standings
    .slice(0, 3)
    .map(
      (participant) =>
        `hạng ${participant.rank} ${participant.name} cùng ${participant.duckName}, ${participant.score} điểm`,
    )
    .join("; ");
  const canvasLabel = `Đường đua vịt đã hoàn thành ${Math.round(
    displayProgress,
  )}%. ${raceSummary}.`;

  return (
    <div
      ref={wrapperRef}
      className="overflow-hidden rounded-[28px] border border-line bg-[#e7f7ff] p-3 shadow-sm"
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={canvasLabel}
        className="block w-full rounded-[22px] bg-transparent"
        style={{ height: canvasHeight }}
      >
        {canvasLabel}
      </canvas>
    </div>
  );
}

function drawFinishLine(
  context: CanvasRenderingContext2D,
  x: number,
  height: number,
) {
  context.fillStyle = "#ffffff";
  context.fillRect(x, 20, 18, height - 40);
  const tile = 12;
  for (let row = 0; row < Math.ceil((height - 40) / tile); row += 1) {
    for (let col = 0; col < 2; col += 1) {
      if ((row + col) % 2 === 0) {
        context.fillStyle = "#111111";
        context.fillRect(x + col * 9, 20 + row * tile, 9, tile);
      }
    }
  }
}

function getDuckImage(
  skinIndex: number,
  cache: Map<number, HTMLImageElement>,
  onReady: () => void,
): HTMLImageElement {
  const cached = cache.get(skinIndex);
  if (cached) return cached;
  const image = new Image();
  image.onload = onReady;
  image.onerror = onReady;
  image.src = `/images/hoc-tap/duck-race/duck-${skinIndex}.png`;
  cache.set(skinIndex, image);
  return image;
}

function drawFittedCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
) {
  if (context.measureText(text).width <= maxWidth) {
    context.fillText(text, x, y);
    return;
  }

  let shortened = text;
  while (
    shortened.length > 1 &&
    context.measureText(`${shortened}…`).width > maxWidth
  ) {
    shortened = shortened.slice(0, -1);
  }
  context.fillText(`${shortened}…`, x, y);
}

function RaceStatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-brand">
        <Icon className="size-4" aria-hidden="true" />
        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-ink-3">
          {label}
        </span>
      </div>
      <p className="mt-2 text-sm font-black text-ink">{value}</p>
    </div>
  );
}
