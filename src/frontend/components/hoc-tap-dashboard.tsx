"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Database,
  Eye,
  Flame,
  Lightbulb,
  ListChecks,
  LockKeyhole,
  Megaphone,
  MessageSquareText,
  Pencil,
  Plus,
  Rocket,
  Search,
  Sparkles,
  Target,
  Trophy,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { DicebearAvatarPicker } from "@/components/dicebear-avatar-picker";
import { useAppProfile } from "@/hooks/use-app-profile";
import { usePreferredAvatar } from "@/hooks/use-preferred-avatar";
import {
  parseAvatarChoice,
  type AppAvatarChoice,
  type AppAvatarOption,
} from "@/lib/app-avatar";
import { buildAvatarIdentity } from "@/lib/avatar-preferences";
import {
  HocTapOverview,
  HocTapOverviewLeaderboard,
} from "@/components/hoc-tap-overview";
import {
  createHocTapRoom,
  fetchHocTapDepartments,
  fetchHocTapRooms,
  joinHocTapRoomByCode,
  previewHocTapRoomQuestions,
  type HocTapAiRoomDifficulty,
} from "@/lib/client-api";
import {
  buildAllHocTapDepartmentOptions,
  getHocTapDepartmentLabel,
  mergeHocTapDepartmentFilterOptions,
  type HocTapDepartmentOption,
} from "@/lib/hoc-tap-departments";
import type {
  HocTapPublicRoom,
  HocTapRoomEntryRole,
  HocTapRoomQuestionInput,
  HocTapRoomType,
} from "@/lib/hoc-tap-room-store";
import {
  buildHocTapQuizCatalog,
  filterHocTapQuizCatalog,
  filterHocTapQuizLibrary,
  getVisibleHocTapQuizzes,
  getHocTapQuizTopic,
  getHocTapDepartmentFilterValue,
  getHocTapQuizHref,
  getHocTapQuizProgress,
  isAvailableQuizRoleId,
  resolveHocTapLevelProgress,
  sortHocTapQuizCatalog,
  type AvailableQuizRoleId,
  type HocTapQuizDifficultyFilter,
  type HocTapQuizFilter,
  type HocTapQuizItem,
  type HocTapQuizSort,
  type HocTapQuizTheme,
  type HocTapQuizTopic,
} from "@/lib/hoc-tap-quiz-catalog";

type HocTapActiveTab = "overview" | "quiz" | "team";

const QUIZ_THEME: Record<
  HocTapQuizTheme,
  {
    gradient: string;
    badge: string;
    visualLabel: string;
    icon: typeof Users;
  }
> = {
  hr: {
    gradient: "from-violet-600 to-indigo-700",
    badge: "bg-indigo-900/40 text-indigo-50",
    visualLabel: "AI HR",
    icon: Users,
  },
  sales: {
    gradient: "from-orange-500 to-amber-600",
    badge: "bg-orange-900/35 text-orange-50",
    visualLabel: "AI Sales",
    icon: Target,
  },
  marketing: {
    gradient: "from-teal-500 to-emerald-600",
    badge: "bg-teal-900/40 text-teal-50",
    visualLabel: "AI Marketing",
    icon: Megaphone,
  },
  accounting: {
    gradient: "from-blue-600 to-blue-800",
    badge: "bg-blue-950/45 text-blue-50",
    visualLabel: "AI Kế toán",
    icon: WalletCards,
  },
  office: {
    gradient: "from-violet-600 to-indigo-700",
    badge: "bg-indigo-900/40 text-indigo-50",
    visualLabel: "AI Văn phòng",
    icon: Sparkles,
  },
  prompt: {
    gradient: "from-purple-600 to-pink-500",
    badge: "bg-purple-950/40 text-purple-50",
    visualLabel: "Prompt Lab",
    icon: MessageSquareText,
  },
  data: {
    gradient: "from-teal-500 to-cyan-500",
    badge: "bg-teal-950/40 text-teal-50",
    visualLabel: "Data Analytics",
    icon: Database,
  },
  automation: {
    gradient: "from-rose-500 to-red-500",
    badge: "bg-rose-950/40 text-rose-50",
    visualLabel: "AI Automation",
    icon: Rocket,
  },
};

const TOPIC_OPTIONS: Array<{ value: HocTapQuizTopic; label: string }> = [
  { value: "all", label: "Tất cả chủ đề" },
  { value: "ai-co-ban", label: "AI cơ bản" },
  { value: "marketing", label: "Marketing" },
  { value: "data", label: "Data Analytics" },
  { value: "automation", label: "AI Automation" },
  { value: "prompt", label: "Prompt Engineering" },
];

const DIFFICULTY_OPTIONS: Array<{
  value: HocTapQuizDifficultyFilter;
  label: string;
}> = [
  { value: "all", label: "Tất cả độ khó" },
  { value: "Dễ", label: "Dễ" },
  { value: "Trung bình", label: "Trung bình" },
  { value: "Khó", label: "Khó" },
];

const PERSONAL_LEADERBOARD = [
  { rank: 1, name: "Nguyễn Thu Hà", initials: "NH", xp: 739, tone: "blue" },
  { rank: 2, name: "Phạm Thị Lan", initials: "PL", xp: 730, tone: "orange" },
  { rank: 3, name: "Dương Văn Hùng", initials: "DH", xp: 720, tone: "purple" },
  { rank: 4, name: "Hoàng Quốc Bảo", initials: "HB", xp: 710, tone: "emerald" },
  { rank: 5, name: "Vũ Đức Anh", initials: "VA", xp: 641, tone: "rose" },
] as const;

const DEPARTMENT_LEADERBOARD = [
  { rank: 1, name: "Marketing", xp: 1669, percent: 95, tone: "emerald" },
  { rank: 2, name: "Vận hành", xp: 1608, percent: 88, tone: "orange" },
  { rank: 3, name: "Kinh doanh", xp: 1580, percent: 82, tone: "violet" },
  { rank: 4, name: "Kế toán", xp: 1471, percent: 70, tone: "sky" },
] as const;

type TeamRoomStatus = "waiting" | "playing" | "starting";
type TeamRoomMode = "Classic" | "Team Battle";
type TeamRoomFilter =
  | "all"
  | TeamRoomStatus
  | "classic"
  | "team-battle";

type TeamRoomSeed = {
  id: string;
  quizId: string;
  title: string;
  category: string;
  host: string;
  hostInitials: string;
  status: TeamRoomStatus;
  mode: TeamRoomMode;
  participants: number;
  capacity: number;
  cta: string;
  featured?: "star" | "hot" | "spark";
};

type TeamRoom = TeamRoomSeed & {
  quiz: HocTapQuizItem | null;
  href: string | null;
  code?: string;
  isLive?: boolean;
  isLocked?: boolean;
  hostAvatarUrl?: string | null;
  topic: Exclude<HocTapQuizTopic, "all">;
  roleId: AvailableQuizRoleId | null;
  questionCount: number;
  xp: number;
  durationMinutes: number;
  publishedOrder: number;
  theme: HocTapQuizTheme;
};

const TEAM_ROOM_SEEDS: TeamRoomSeed[] = [
  {
    id: "room-ai-co-ban",
    quizId: "ai-van-phong",
    title: "AI cơ bản cho mọi người",
    category: "AI CƠ BẢN",
    host: "Minh Hai",
    hostInitials: "MH",
    status: "waiting",
    mode: "Classic",
    participants: 10,
    capacity: 20,
    cta: "Tham gia",
    featured: "star",
  },
  {
    id: "room-ai-marketing",
    quizId: "ai-marketing",
    title: "AI trong Marketing",
    category: "AI TRONG MARKETING",
    host: "TuanCoolBoy",
    hostInitials: "TC",
    status: "playing",
    mode: "Team Battle",
    participants: 8,
    capacity: 12,
    cta: "Vào phòng",
    featured: "hot",
  },
  {
    id: "room-ai-sales",
    quizId: "ai-ban-hang",
    title: "AI cho Sales & CSKH",
    category: "AI CHO SALES & CSKH",
    host: "lucasaivn",
    hostInitials: "LA",
    status: "starting",
    mode: "Classic",
    participants: 5,
    capacity: 10,
    cta: "Tham gia",
    featured: "spark",
  },
  {
    id: "room-ai-hr",
    quizId: "ai-hanh-chinh-hr",
    title: "AI nâng cao ứng dụng",
    category: "AI NÂNG CAO",
    host: "Anh Thu",
    hostInitials: "AT",
    status: "waiting",
    mode: "Classic",
    participants: 6,
    capacity: 20,
    cta: "Tham gia",
  },
  {
    id: "room-ai-ke-toan",
    quizId: "ai-ke-toan",
    title: "AI an toàn cho kế toán",
    category: "AI KẾ TOÁN",
    host: "Ngọc Minh",
    hostInitials: "NM",
    status: "starting",
    mode: "Team Battle",
    participants: 7,
    capacity: 14,
    cta: "Tham gia",
  },
];

const ROOM_FILTER_OPTIONS: Array<{ value: TeamRoomFilter; label: string }> = [
  { value: "all", label: "Tất cả phòng" },
  { value: "waiting", label: "Đang chờ" },
  { value: "playing", label: "Đang chơi" },
];

const HOC_TAP_PROGRESS_EVENT = "hoc-tap-quiz-progress";
const EMPTY_PROGRESS_SNAPSHOT = "0:0";

type HocTapDashboardProps = {
  displayName: string;
  initialTab?: HocTapActiveTab;
};

export function HocTapDashboard({
  displayName,
  initialTab = "overview",
}: HocTapDashboardProps) {
  const { profile, fullName, email, avatar: remoteAvatar } = useAppProfile();
  const currentRoleId =
    profile?.roleId && isAvailableQuizRoleId(profile.roleId)
      ? profile.roleId
      : null;
  const avatarIdentity = buildAvatarIdentity(fullName, displayName, email);
  const {
    avatarOptions,
    avatarSeed,
    avatarUrl,
    selectAvatar,
  } = usePreferredAvatar(avatarIdentity, remoteAvatar, [
    fullName,
    displayName,
    email,
  ]);
  const [activeTab, setActiveTab] = useState<HocTapActiveTab>(initialTab);
  const [quizQuery, setQuizQuery] = useState("");
  const [quizDepartmentFilter, setQuizDepartmentFilter] =
    useState<HocTapQuizFilter>("all");
  const [quizDifficulty, setQuizDifficulty] =
    useState<HocTapQuizDifficultyFilter>("all");
  const [quizSort, setQuizSort] = useState<HocTapQuizSort>("newest");
  const [quizExpanded, setQuizExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] =
    useState<HocTapQuizFilter>("all");
  const [departmentFilterTouched, setDepartmentFilterTouched] =
    useState(false);
  const [departmentOptions, setDepartmentOptions] = useState<
    HocTapDepartmentOption[]
  >(() => buildAllHocTapDepartmentOptions());
  const effectiveDepartmentFilter =
    !departmentFilterTouched && departmentFilter === "all" && currentRoleId
      ? getHocTapDepartmentFilterValue(currentRoleId)
      : departmentFilter;
  const [topic, setTopic] = useState<HocTapQuizTopic>("all");
  const [roomFilter, setRoomFilter] = useState<TeamRoomFilter>("all");
  const [sort, setSort] = useState<HocTapQuizSort>("newest");
  const [expanded, setExpanded] = useState(false);
  const [liveRooms, setLiveRooms] = useState<HocTapPublicRoom[]>([]);
  const progressSnapshot = useSyncExternalStore(
    subscribeHocTapProgress,
    getHocTapProgressSnapshot,
    getServerHocTapProgressSnapshot,
  );
  const quizProgress = getHocTapQuizProgress();
  const { levelProgress, completedMockQuizzes } = useMemo(
    () => parseHocTapProgressSnapshot(progressSnapshot),
    [progressSnapshot],
  );
  const attemptedQuizIds = useMemo(
    () => new Set(quizProgress.attempts.map((attempt) => attempt.quizId)),
    [quizProgress],
  );
  const catalog = useMemo(() => buildHocTapQuizCatalog(), []);
  const filteredQuizCatalog = useMemo(
    () =>
      sortHocTapQuizCatalog(
          filterHocTapQuizLibrary(
          filterHocTapQuizCatalog(catalog, quizDepartmentFilter),
          {
            query: quizQuery,
            topic: "all",
            difficulty: quizDifficulty,
          },
        ),
        quizSort,
      ),
    [
      catalog,
      quizDepartmentFilter,
      quizDifficulty,
      quizQuery,
      quizSort,
    ],
  );
  const visibleQuizCatalog = useMemo(
    () => getVisibleHocTapQuizzes(filteredQuizCatalog, quizExpanded, 8),
    [filteredQuizCatalog, quizExpanded],
  );
  const teamRooms = useMemo(
    () => [...buildLiveTeamRooms(liveRooms, catalog), ...buildTeamRooms(catalog)],
    [catalog, liveRooms],
  );
  const filteredRooms = useMemo(
    () =>
      filterTeamRooms(
        filterTeamRoomsByDepartment(teamRooms, effectiveDepartmentFilter),
        {
          query,
          topic,
          roomFilter,
        },
      ),
    [effectiveDepartmentFilter, query, roomFilter, teamRooms, topic],
  );
  const sortedRooms = useMemo(
    () => sortTeamRooms(filteredRooms, sort),
    [filteredRooms, sort],
  );
  const visibleRooms = expanded ? sortedRooms : sortedRooms.slice(0, 4);
  const profileRoleLabel = currentRoleId
    ? getHocTapDepartmentLabel(currentRoleId)
    : "Nhân viên";
  const levelPercent = Math.min(
    100,
    Math.round((levelProgress.currentXp / levelProgress.targetXp) * 100),
  );
  const hasActiveFilters =
    query.trim().length > 0 ||
    effectiveDepartmentFilter !== "all" ||
    topic !== "all" ||
    roomFilter !== "all";
  const hasActiveQuizFilters =
    quizQuery.trim().length > 0 ||
    quizDepartmentFilter !== "all" ||
    quizDifficulty !== "all";

  useEffect(() => {
    let active = true;

    async function loadDepartments() {
      try {
        const response = await fetchHocTapDepartments();
        if (!active) return;
        setDepartmentOptions(
          mergeHocTapDepartmentFilterOptions(
            response.departments,
            currentRoleId,
          ),
        );
      } catch {
        if (!active) return;
        setDepartmentOptions(buildAllHocTapDepartmentOptions(currentRoleId));
      }
    }

    void loadDepartments();

    return () => {
      active = false;
    };
  }, [currentRoleId]);

  useEffect(() => {
    if (activeTab !== "team") return;
    let active = true;

    async function loadRooms() {
      try {
        const response = await fetchHocTapRooms();
        if (active) setLiveRooms(response.rooms);
      } catch {
        if (active) setLiveRooms([]);
      }
    }

    void loadRooms();
    const timer = window.setInterval(() => {
      void loadRooms();
    }, 4000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activeTab]);

  function clearTeamFilters() {
    setQuery("");
    setDepartmentFilter("all");
    setDepartmentFilterTouched(true);
    setTopic("all");
    setRoomFilter("all");
    setExpanded(false);
  }

  function clearQuizFilters() {
    setQuizQuery("");
    setQuizDepartmentFilter("all");
    setQuizDifficulty("all");
    setQuizExpanded(false);
  }

  return (
    <div className="mx-auto grid w-full max-w-[1550px] grid-cols-1 gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_320px] 2xl:grid-cols-[260px_minmax(0,1fr)_340px]">
      <aside className="space-y-6 lg:sticky lg:top-5 lg:self-start">
        <ProfileCard
          displayName={displayName}
          avatarOptions={avatarOptions}
          avatarSeed={avatarSeed}
          avatarUrl={avatarUrl}
          onSelectAvatar={selectAvatar}
          roleLabel={profileRoleLabel}
          level={levelProgress.level}
          currentXp={levelProgress.currentXp}
          targetXp={levelProgress.targetXp}
          totalXp={levelProgress.totalXp}
          completedMockQuizzes={completedMockQuizzes}
          levelPercent={levelPercent}
        />
        <LearningMenu activeTab={activeTab} onTabChange={setActiveTab} />
      </aside>

      <main className="min-w-0 space-y-6">
        {activeTab === "overview" ? (
          <HocTapOverview
            levelProgress={levelProgress}
            progressVersion={progressSnapshot}
          />
        ) : (
          <>
        <StudyHero activeTab={activeTab} />

        {activeTab === "quiz" ? (
          <QuizLibraryPanel
            quizzes={visibleQuizCatalog}
            totalQuizzes={filteredQuizCatalog.length}
            expanded={quizExpanded}
            onExpandedChange={setQuizExpanded}
            query={quizQuery}
            onQueryChange={(value) => {
              setQuizQuery(value);
              setQuizExpanded(false);
            }}
            departmentFilter={quizDepartmentFilter}
            onDepartmentFilterChange={(value) => {
              setQuizDepartmentFilter(value);
              setQuizExpanded(false);
            }}
            departmentOptions={departmentOptions}
            difficulty={quizDifficulty}
            onDifficultyChange={(value) => {
              setQuizDifficulty(value);
              setQuizExpanded(false);
            }}
            sort={quizSort}
            onSortChange={(value) => {
              setQuizSort(value);
              setQuizExpanded(false);
            }}
            attemptedQuizIds={attemptedQuizIds}
            hasActiveFilters={hasActiveQuizFilters}
            onClearFilters={clearQuizFilters}
            currentRoleId={currentRoleId}
          />
        ) : (
          <>

        <TeamActionCards
          avatarSeed={avatarSeed}
          displayName={displayName}
          quizzes={catalog}
          currentRoleId={currentRoleId}
        />

        <section className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
            <FilterSelect
              label="Phòng ban"
              value={effectiveDepartmentFilter}
              onChange={(value) => {
                setDepartmentFilter(value as HocTapQuizFilter);
                setDepartmentFilterTouched(true);
                setExpanded(false);
              }}
            >
              <option value="all">Tất cả phòng ban</option>
              {departmentOptions.map((department) => (
                <option
                  key={department.id}
                  value={getHocTapDepartmentFilterValue(
                    department.id as AvailableQuizRoleId,
                  )}
                >
                  {department.label}
                  {department.memberCount > 0
                    ? ` (${department.memberCount})`
                    : ""}
                  {department.isCurrentUserDepartment ? " · của bạn" : ""}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Sắp xếp"
              value={sort}
              onChange={(value) => {
                setSort(value as HocTapQuizSort);
                setExpanded(false);
              }}
            >
              <option value="newest">Mới nhất</option>
              <option value="question-count">Nhiều câu nhất</option>
              <option value="xp">XP cao nhất</option>
            </FilterSelect>

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearTeamFilters}
                className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-xl border border-line bg-card px-4 text-xs font-extrabold text-ink-2 transition hover:border-brand/35 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X className="size-4" aria-hidden="true" />
                Xóa lọc
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px]">
            <label className="relative block">
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-3">
                Tìm phòng hoặc chủ đề
              </span>
              <Search
                className="pointer-events-none absolute left-3 top-[calc(50%+10px)] size-4 -translate-y-1/2 text-ink-3"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setExpanded(false);
                }}
                placeholder="Tìm phòng hoặc chủ đề..."
                className="mt-1 h-11 w-full rounded-xl border border-line bg-card pl-10 pr-10 text-xs font-bold text-ink shadow-sm outline-none transition placeholder:text-ink-3 hover:border-brand/35 focus:border-brand focus:ring-4 focus:ring-brand/10"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-1 top-[calc(50%+10px)] grid size-9 -translate-y-1/2 place-items-center rounded-lg text-ink-3 transition hover:bg-secondary hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </label>

            <FilterSelect
              label="Chủ đề"
              value={topic}
              onChange={(value) => {
                setTopic(value as HocTapQuizTopic);
                setExpanded(false);
              }}
            >
              {TOPIC_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {ROOM_FILTER_OPTIONS.map((option) => {
              const active = roomFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setRoomFilter(option.value);
                    setExpanded(false);
                  }}
                  aria-pressed={active}
                  className={`min-h-10 flex-none rounded-full px-4 text-[11px] font-extrabold transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                    active
                      ? "bg-brand text-brand-foreground shadow-md shadow-brand/15"
                      : "bg-card text-ink-2 ring-1 ring-line hover:text-brand"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        {visibleRooms.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {visibleRooms.map((room) => (
              <TeamRoomCard
                key={room.id}
                room={room}
                recommended={room.roleId === profile?.roleId}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center shadow-sm">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Search className="size-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-display text-lg font-bold text-ink">
              Chưa tìm thấy phòng phù hợp
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-2">
              Thử một từ khóa ngắn hơn hoặc xóa bớt bộ lọc để xem toàn bộ phòng
              đang mở.
            </p>
            <button
              type="button"
              onClick={clearTeamFilters}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-brand-foreground transition hover:bg-brand-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Xem tất cả phòng
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-semibold text-ink-3">
            Hiển thị {visibleRooms.length} của {sortedRooms.length} phòng
          </span>
          {sortedRooms.length > 4 ? (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-card px-5 text-xs font-extrabold text-ink transition hover:border-brand/35 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              {expanded ? "Thu gọn phòng" : "Xem thêm phòng"}
              {expanded ? (
                <ChevronUp className="size-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-4" aria-hidden="true" />
              )}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="grid size-8 place-items-center rounded-lg text-ink-3">
                <ChevronLeft className="size-4" aria-hidden="true" />
              </span>
              <span className="grid size-8 place-items-center rounded-lg bg-brand font-bold text-brand-foreground">
                1
              </span>
              <span className="grid size-8 place-items-center rounded-lg text-ink-3">
                <ChevronRight className="size-4" aria-hidden="true" />
              </span>
            </div>
          )}
        </div>
          </>
        )}
          </>
        )}
      </main>

      <aside className="space-y-6 lg:col-span-2 xl:col-span-1 xl:sticky xl:top-5 xl:self-start">
        {activeTab === "overview" ? (
          <HocTapOverviewLeaderboard
            displayName={displayName}
            totalXp={levelProgress.totalXp}
          />
        ) : activeTab === "quiz" ? (
          <>
            <LeaderboardPanel />
            <DepartmentLeaderboardPanel />
          </>
        ) : (
          <>
            <RankSummaryPanel
              totalXp={levelProgress.totalXp}
              rank={4}
            />
            <LeaderboardPanel />
          </>
        )}
      </aside>
    </div>
  );
}

function ProfileCard({
  displayName,
  avatarOptions,
  avatarSeed,
  avatarUrl,
  onSelectAvatar,
  roleLabel,
  level,
  currentXp,
  targetXp,
  totalXp,
  completedMockQuizzes,
  levelPercent,
}: {
  displayName: string;
  avatarOptions: AppAvatarOption[];
  avatarSeed: string;
  avatarUrl: string;
  onSelectAvatar: (choice: AppAvatarChoice) => void;
  roleLabel: string;
  level: number;
  currentXp: number;
  targetXp: number;
  totalXp: number;
  completedMockQuizzes: number;
  levelPercent: number;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 text-center shadow-sm">
      <div className="relative mb-3">
        <DicebearAvatarPicker
          align="center"
          avatarUrl={avatarUrl}
          displayName={displayName}
          fallbackText={getDisplayInitials(displayName)}
          onSelect={onSelectAvatar}
          options={avatarOptions}
          selectedChoice={parseSerializedAvatarChoice(avatarSeed)}
          size="lg"
        />
        <span className="absolute bottom-8 right-[calc(50%-2.75rem)] grid size-6 place-items-center rounded-full border-2 border-card bg-brand text-brand-foreground">
          <Sparkles className="size-3" aria-hidden="true" />
        </span>
      </div>

      <h2 className="truncate font-display text-base font-extrabold text-ink">
        {displayName}
      </h2>
      <span className="mt-1 inline-flex rounded-full bg-brand-soft px-3 py-1 text-[10px] font-bold text-brand">
        {roleLabel}
      </span>

      <div className="mt-6 text-left">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-3">
          Cấp độ minh họa
        </p>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-display text-xl font-black text-ink">
            Lv. {level}
          </span>
          <Trophy className="size-6 text-amber-500" aria-hidden="true" />
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-1.5 rounded-full bg-amber-500"
            style={{ width: `${levelPercent}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] font-bold text-ink-3">
          XP {currentXp.toLocaleString("vi-VN")} /{" "}
          {targetXp.toLocaleString("vi-VN")}
        </p>
      </div>

      <div className="mt-5 space-y-3 border-t border-line pt-4 text-xs">
        <StatRow label="Điểm XP" value={`${totalXp.toLocaleString("vi-VN")} XP`} />
        <StatRow
          label="Bộ đề đã làm"
          value={completedMockQuizzes.toString()}
        />
        <StatRow label="Hạng của bạn" value="#6" brand />
      </div>
    </section>
  );
}

function LearningMenu({
  activeTab,
  onTabChange,
}: {
  activeTab: HocTapActiveTab;
  onTabChange: (tab: HocTapActiveTab) => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <p className="px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-3">
        Học tập
      </p>
      <div className="mt-4 space-y-1">
        <LearningMenuButton
          active={activeTab === "overview"}
          icon={BarChart3}
          label="Tổng quan"
          onClick={() => onTabChange("overview")}
        />
        <LearningMenuButton
          active={activeTab === "quiz"}
          icon={ListChecks}
          label="Quiz & Trắc nghiệm"
          onClick={() => onTabChange("quiz")}
        />
        <LearningMenuButton
          active={activeTab === "team"}
          icon={Users}
          label="Chơi với team"
          onClick={() => onTabChange("team")}
        />
        <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-ink-3">
          <Clock3 className="size-4" aria-hidden="true" />
          Lịch sử chơi
        </span>
      </div>
    </section>
  );
}

function LearningMenuButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Users;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
        active
          ? "bg-brand-soft font-bold text-brand"
          : "font-semibold text-ink-2 hover:bg-secondary hover:text-ink"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </span>
    </button>
  );
}

function StudyHero({ activeTab }: { activeTab: HocTapActiveTab }) {
  const isQuiz = activeTab === "quiz";
  const Icon = isQuiz ? ListChecks : Lightbulb;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-accent">
            <Lightbulb className="size-4" aria-hidden="true" />
            Học mà chơi
          </p>
          <h1 className="font-display text-2xl font-black tracking-tight text-ink sm:text-3xl">
            {isQuiz ? "Quiz & Trắc nghiệm" : "Chơi với team"}
          </h1>
          <p className="max-w-2xl text-sm font-medium leading-6 text-ink-2">
            {isQuiz
              ? "Học mà chơi - chơi mà học với các bộ quiz được xây dựng sẵn theo phòng ban."
              : "Vừa học vừa chơi - cùng team chinh phục thử thách và tích lũy XP."}
          </p>
        </div>
        <div className="grid size-14 flex-none place-items-center rounded-full bg-amber-50 text-amber-600">
          <Icon className="size-8" strokeWidth={1.9} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

function QuizLibraryPanel({
  quizzes,
  totalQuizzes,
  expanded,
  onExpandedChange,
  query,
  onQueryChange,
  departmentFilter,
  onDepartmentFilterChange,
  departmentOptions,
  difficulty,
  onDifficultyChange,
  sort,
  onSortChange,
  attemptedQuizIds,
  hasActiveFilters,
  onClearFilters,
  currentRoleId,
}: {
  quizzes: HocTapQuizItem[];
  totalQuizzes: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  departmentFilter: HocTapQuizFilter;
  onDepartmentFilterChange: (value: HocTapQuizFilter) => void;
  departmentOptions: HocTapDepartmentOption[];
  difficulty: HocTapQuizDifficultyFilter;
  onDifficultyChange: (value: HocTapQuizDifficultyFilter) => void;
  sort: HocTapQuizSort;
  onSortChange: (value: HocTapQuizSort) => void;
  attemptedQuizIds: Set<string>;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  currentRoleId: AvailableQuizRoleId | null;
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-black text-ink">
            Tất cả bộ đề
          </h2>
          <p className="mt-1 text-xs font-medium leading-5 text-ink-3">
            Luyện tập với các bộ đề có sẵn, được phân loại theo phòng ban và mức
            độ.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[400px] xl:grid-cols-2">
          <FilterSelect
            label="Phòng ban"
            value={departmentFilter}
            onChange={(value) =>
              onDepartmentFilterChange(value as HocTapQuizFilter)
            }
          >
            <option value="all">Tất cả phòng ban</option>
            {departmentOptions.map((department) => (
              <option
                key={department.id}
                value={getHocTapDepartmentFilterValue(
                  department.id as AvailableQuizRoleId,
                )}
              >
                {department.label}
                {department.memberCount > 0
                  ? ` (${department.memberCount})`
                  : ""}
                {department.isCurrentUserDepartment ? " · của bạn" : ""}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Sắp xếp"
            value={sort}
            onChange={(value) => onSortChange(value as HocTapQuizSort)}
          >
            <option value="newest">Mới nhất</option>
            <option value="question-count">Nhiều câu nhất</option>
            <option value="xp">XP cao nhất</option>
          </FilterSelect>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_auto]">
        <label className="relative block">
          <span className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-3">
            Tìm bộ đề
          </span>
          <Search
            className="pointer-events-none absolute left-3 top-[calc(50%+10px)] size-4 -translate-y-1/2 text-ink-3"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Tìm bộ đề..."
            className="mt-1 h-11 w-full rounded-xl border border-line bg-card pl-10 pr-10 text-xs font-bold text-ink shadow-sm outline-none transition placeholder:text-ink-3 hover:border-brand/35 focus:border-brand focus:ring-4 focus:ring-brand/10"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="absolute right-1 top-[calc(50%+10px)] grid size-9 -translate-y-1/2 place-items-center rounded-lg text-ink-3 transition hover:bg-secondary hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="Xóa từ khóa tìm kiếm bộ đề"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </label>

        <FilterSelect
          label="Độ khó"
          value={difficulty}
          onChange={(value) =>
            onDifficultyChange(value as HocTapQuizDifficultyFilter)
          }
        >
          {DIFFICULTY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FilterSelect>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-xl border border-line bg-card px-4 text-xs font-extrabold text-ink-2 transition hover:border-brand/35 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X className="size-4" aria-hidden="true" />
            Xóa lọc
          </button>
        ) : null}
      </div>

      {quizzes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quizzes.map((quiz) => (
            <QuizPracticeCard
              key={quiz.id}
              quiz={quiz}
              recommended={quiz.roleId === currentRoleId}
              attempted={attemptedQuizIds.has(quiz.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center shadow-sm">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
            <Search className="size-6" aria-hidden="true" />
          </span>
          <h3 className="mt-4 font-display text-lg font-bold text-ink">
            Chưa tìm thấy bộ đề phù hợp
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-2">
            Thử một từ khóa ngắn hơn hoặc xóa bớt bộ lọc để xem toàn bộ bộ đề.
          </p>
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-brand-foreground transition hover:bg-brand-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Xem tất cả bộ đề
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-semibold text-ink-3">
          Hiển thị {quizzes.length} của {totalQuizzes} bộ đề
        </span>
        {totalQuizzes > quizzes.length ? (
          <button
            type="button"
            onClick={() => onExpandedChange(!expanded)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-card px-5 text-xs font-extrabold text-ink transition hover:border-brand/35 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            {expanded ? "Thu gọn bộ đề" : "Xem thêm bộ đề"}
            {expanded ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="grid size-8 place-items-center rounded-lg text-ink-3">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </span>
            <span className="grid size-8 place-items-center rounded-lg bg-brand font-bold text-brand-foreground">
              1
            </span>
            <span className="grid size-8 place-items-center rounded-lg text-ink-3">
              <ChevronRight className="size-4" aria-hidden="true" />
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

function QuizPracticeCard({
  quiz,
  recommended,
  attempted,
}: {
  quiz: HocTapQuizItem;
  recommended: boolean;
  attempted: boolean;
}) {
  const theme = QUIZ_THEME[quiz.theme];
  const Icon = theme.icon;
  const href = getHocTapQuizHref(quiz);

  return (
    <article className="group flex min-h-[268px] flex-col justify-between overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand/20 hover:shadow-lg motion-reduce:transform-none">
      <div>
        <div
          className={`relative flex h-24 flex-col justify-between overflow-hidden bg-gradient-to-r ${theme.gradient} p-4`}
        >
          <span className="relative z-10 max-w-[80%] text-[9px] font-black uppercase tracking-[0.08em] text-white/95">
            {quiz.category}
          </span>
          {recommended ? (
            <span className="relative z-10 w-max rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-black text-white">
              Gợi ý cho bạn
            </span>
          ) : null}
          <Icon
            className="absolute bottom-2 right-4 size-12 text-white/25"
            strokeWidth={1.6}
            aria-hidden="true"
          />
        </div>

        <div className="space-y-2 p-4">
          <h3 className="line-clamp-2 font-display text-sm font-extrabold leading-snug text-ink transition group-hover:text-brand">
            {quiz.title}
          </h3>
          <p className="line-clamp-2 text-[11px] font-medium leading-5 text-ink-3">
            {quiz.description}
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4 pt-0">
        <div className="flex items-center justify-between gap-3 text-[10px] font-bold">
          <span className="inline-flex items-center gap-1 text-ink-3">
            <ListChecks className="size-3.5" aria-hidden="true" />
            {quiz.questionCount} câu hỏi
          </span>
          <span className={`rounded-full px-2.5 py-0.5 ${difficultyTone(quiz.difficulty)}`}>
            {quiz.difficulty}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[10px] font-bold text-ink-3">
          <span>{quiz.durationMinutes} phút</span>
          <span>+{quiz.xp} XP</span>
        </div>
        {href ? (
          <Link
            href={href}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-brand px-4 text-xs font-extrabold text-brand-foreground transition hover:bg-brand-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            {attempted ? "Xem kiểm tra" : "Làm kiểm tra"}
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-secondary px-4 text-xs font-extrabold text-ink-3"
          >
            Sắp ra mắt
          </button>
        )}
      </div>
    </article>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1 text-right">
      <span className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-3">
        {label}
      </span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full appearance-none rounded-lg border border-line bg-card px-3 pr-8 text-xs font-bold text-ink shadow-sm outline-none transition hover:border-brand/35 focus:border-brand focus:ring-4 focus:ring-brand/10"
          aria-label={label}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-3"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

type RoomCreateSource = "ai-project" | "quiz";
type EditablePreviewQuestion = HocTapRoomQuestionInput & {
  selected: boolean;
};

const AI_ROOM_DIFFICULTY_OPTIONS: HocTapAiRoomDifficulty[] = [
  "Dễ",
  "Trung bình",
  "Khó",
  "Thực chiến",
];

function TeamActionCards({
  avatarSeed,
  displayName,
  quizzes,
  currentRoleId,
}: {
  avatarSeed: string;
  displayName: string;
  quizzes: HocTapQuizItem[];
  currentRoleId: AvailableQuizRoleId | null;
}) {
  const router = useRouter();
  const playableQuizzes = useMemo(
    () =>
      quizzes.filter(
        (quiz) =>
          quiz.status === "available" &&
          quiz.roleId &&
          isAvailableQuizRoleId(quiz.roleId),
      ),
    [quizzes],
  );
  const defaultQuizId =
    playableQuizzes.find((quiz) => quiz.roleId === currentRoleId)?.id ??
    playableQuizzes[0]?.id ??
    "";
  const [hostName, setHostName] = useState(displayName);
  const [selectedQuizId, setSelectedQuizId] = useState(defaultQuizId);
  const effectiveSelectedQuizId = selectedQuizId || defaultQuizId;
  const [createSource, setCreateSource] =
    useState<RoomCreateSource>("ai-project");
  const [entryRole, setEntryRole] = useState<HocTapRoomEntryRole>("host");
  const [roomType, setRoomType] = useState<HocTapRoomType>("host-review");
  const [roomTitle, setRoomTitle] = useState("Project AI Quiz");
  const [projectTopic, setProjectTopic] = useState(
    "Ứng dụng AI cho quy trình nội bộ",
  );
  const [questionCount, setQuestionCount] = useState(8);
  const [difficulty, setDifficulty] =
    useState<HocTapAiRoomDifficulty>("Trung bình");
  const [projectContext, setProjectContext] = useState(
    "Team đang học cách dùng AI để phân tích nhu cầu, tạo checklist công việc và đề xuất bước tiếp theo cho dự án thực tế.",
  );
  const [previewQuestions, setPreviewQuestions] = useState<
    EditablePreviewQuestion[]
  >([]);
  const [previewSource, setPreviewSource] = useState<
    "openai" | "fallback" | null
  >(null);
  const [lockedRoom, setLockedRoom] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState(displayName);
  const [isCreating, setIsCreating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [createError, setCreateError] = useState("");
  const [joinError, setJoinError] = useState("");
  const selectedPreviewCount = previewQuestions.filter(
    (question) => question.selected,
  ).length;

  const aiPayload = {
    title: roomTitle.trim() || "Project AI Quiz",
    topic: projectTopic.trim() || "Project AI",
    context: projectContext.trim() || "Chưa có context chi tiết.",
    questionCount,
    difficulty,
    roomType,
  };

  async function handlePreviewQuestions() {
    if (roomType === "ai-secret") return;

    setIsPreviewing(true);
    setCreateError("");

    try {
      const response = await previewHocTapRoomQuestions(aiPayload);
      setRoomTitle(response.title);
      setProjectTopic(response.topic);
      setProjectContext(response.context);
      setQuestionCount(response.questionCount);
      setDifficulty(response.difficulty);
      setPreviewSource(response.source);
      setPreviewQuestions(
        response.questions.map((question) => ({
          ...question,
          selected: true,
        })),
      );
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Chưa gen được câu hỏi AI.",
      );
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleCreateRoom() {
    if (!hostName.trim()) {
      setCreateError(
        entryRole === "player"
          ? "Vui lòng nhập tên người chơi."
          : "Vui lòng nhập tên host.",
      );
      return;
    }
    if (createSource === "quiz" && !effectiveSelectedQuizId) {
      setCreateError("Chưa có bộ quiz nào sẵn sàng để tạo phòng.");
      return;
    }
    if (createSource === "ai-project" && roomType === "host-review") {
      if (selectedPreviewCount < 3) {
        setCreateError("Phòng host kiểm duyệt cần chọn ít nhất 3 câu hỏi.");
        return;
      }
    }

    setIsCreating(true);
    setCreateError("");

    try {
      const selectedQuestions = previewQuestions
        .filter((question) => question.selected)
        .map(stripEditableQuestion);
      const response =
        createSource === "ai-project"
          ? await createHocTapRoom({
              hostName: hostName.trim(),
              avatarSeed,
              aiProject: aiPayload,
              questions:
                roomType === "host-review" ? selectedQuestions : undefined,
              mode: "classic",
              roomType,
              maxPlayers: 20,
              entryRole,
              locked: lockedRoom,
            })
          : await createHocTapRoom({
              hostName: hostName.trim(),
              avatarSeed,
              quizId: effectiveSelectedQuizId,
              mode: "classic",
              roomType,
              maxPlayers: 20,
              entryRole,
              locked: lockedRoom,
            });
      saveHocTapRoomIdentity(response.room.code, response.hostToken
        ? {
            participantId: response.participantId,
            hostToken: response.hostToken,
          }
        : {
            participantId: response.participantId,
          });
      router.push(`/hoc-tap/phong/${response.room.code}`);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Chưa tạo được phòng.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  function updatePreviewQuestion(
    questionIndex: number,
    patch: Partial<EditablePreviewQuestion>,
  ) {
    setPreviewQuestions((current) =>
      current.map((question, index) =>
        index === questionIndex ? { ...question, ...patch } : question,
      ),
    );
  }

  function updatePreviewOption(
    questionIndex: number,
    optionIndex: number,
    value: string,
  ) {
    setPreviewQuestions((current) =>
      current.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option, optionItemIndex) =>
                optionItemIndex === optionIndex ? value : option,
              ),
            }
          : question,
      ),
    );
  }

  async function handleJoinRoom() {
    if (!roomCode.trim()) {
      setJoinError("Vui lòng nhập mã phòng.");
      return;
    }
    if (!playerName.trim()) {
      setJoinError("Vui lòng nhập tên của bạn.");
      return;
    }

    setIsJoining(true);
    setJoinError("");

    try {
      const response = await joinHocTapRoomByCode({
        code: roomCode,
        playerName: playerName.trim(),
        avatarSeed,
      });
      saveHocTapRoomIdentity(response.room.code, {
        participantId: response.participantId,
      });
      router.push(`/hoc-tap/phong/${response.room.code}`);
    } catch (err) {
      setJoinError(
        err instanceof Error ? err.message : "Chưa tham gia được phòng.",
      );
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <article className="relative overflow-hidden rounded-2xl border border-line bg-card p-5 shadow-sm">
        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-extrabold text-ink">
                Tạo phòng mới
              </h2>
              <p className="mt-1 text-xs font-medium leading-5 text-ink-3">
                AI gen câu hỏi từ project hoặc dùng bộ quiz có sẵn.
              </p>
            </div>
            <span className="grid size-10 flex-none place-items-center rounded-xl bg-amber-50 text-amber-600">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
            {[
              { value: "ai-project", label: "AI project" },
              { value: "quiz", label: "Quiz có sẵn" },
            ].map((option) => {
              const active = createSource === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCreateSource(option.value as RoomCreateSource)}
                  className={`min-h-9 rounded-xl text-[11px] font-black transition focus-visible:ring-2 focus-visible:ring-brand ${
                    active
                      ? "bg-card text-brand shadow-sm"
                      : "text-ink-2 hover:text-brand"
                  }`}
                  aria-pressed={active}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-2">
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/70 px-3 py-2">
              <div>
                <p className="text-xs font-black text-ink">Phòng khoá theo mã</p>
                <p className="text-[10px] font-semibold leading-4 text-ink-3">
                  Phòng vẫn hiện ở danh sách live room nhưng người mới chỉ vào được bằng mã.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLockedRoom((current) => !current)}
                className={`inline-flex h-7 w-14 items-center rounded-full px-1 transition ${
                  lockedRoom ? "bg-amber-500" : "bg-secondary"
                }`}
                aria-pressed={lockedRoom}
                aria-label="Bật hoặc tắt khoá phòng"
              >
                <span
                  className={`size-5 rounded-full bg-white shadow-sm transition ${
                    lockedRoom ? "translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
            </label>

            {createSource === "quiz" ? (
              <>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
                  {[
                    { value: "host", label: "Chủ phòng" },
                    { value: "player", label: "Người chơi" },
                  ].map((option) => {
                    const active = entryRole === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setEntryRole(option.value as HocTapRoomEntryRole)
                        }
                        className={`min-h-9 rounded-xl text-[11px] font-black transition focus-visible:ring-2 focus-visible:ring-brand ${
                          active
                            ? "bg-card text-brand shadow-sm"
                            : "text-ink-2 hover:text-brand"
                        }`}
                        aria-pressed={active}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  value={hostName}
                  onChange={(event) => setHostName(event.target.value)}
                  placeholder={
                    entryRole === "player" ? "Tên người chơi" : "Tên host"
                  }
                  className="h-9 w-full rounded-xl border border-line bg-white/85 px-3 text-xs font-bold text-ink outline-none transition placeholder:text-ink-3 focus:border-brand focus:ring-4 focus:ring-brand/10"
                  aria-label={
                    entryRole === "player" ? "Tên người chơi" : "Tên host"
                  }
                />

                <select
                  value={effectiveSelectedQuizId}
                  onChange={(event) => setSelectedQuizId(event.target.value)}
                  className="h-9 w-full rounded-xl border border-line bg-white/85 px-3 text-xs font-bold text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
                  aria-label="Chọn bộ quiz"
                >
                  {playableQuizzes.map((quiz) => (
                    <option key={quiz.id} value={quiz.id}>
                      {quiz.title}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
                  {[
                    { value: "host", label: "Chủ phòng" },
                    { value: "player", label: "Người chơi" },
                  ].map((option) => {
                    const active = entryRole === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setEntryRole(option.value as HocTapRoomEntryRole)
                        }
                        className={`min-h-9 rounded-xl text-[11px] font-black transition focus-visible:ring-2 focus-visible:ring-brand ${
                          active
                            ? "bg-card text-brand shadow-sm"
                            : "text-ink-2 hover:text-brand"
                        }`}
                        aria-pressed={active}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  value={hostName}
                  onChange={(event) => setHostName(event.target.value)}
                  placeholder={entryRole === "player" ? "Tên người chơi" : "Tên host"}
                  className="h-9 w-full rounded-xl border border-line bg-white/85 px-3 text-xs font-bold text-ink outline-none transition placeholder:text-ink-3 focus:border-brand focus:ring-4 focus:ring-brand/10"
                  aria-label={entryRole === "player" ? "Tên người chơi" : "Tên host"}
                />

                <input
                  type="text"
                  value={roomTitle}
                  onChange={(event) => setRoomTitle(event.target.value)}
                  placeholder="Tên phòng"
                  className="h-9 w-full rounded-xl border border-line bg-white/85 px-3 text-xs font-bold text-ink outline-none transition placeholder:text-ink-3 focus:border-brand focus:ring-4 focus:ring-brand/10"
                  aria-label="Tên phòng AI"
                />

                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    {
                      value: "host-review",
                      title: "Host kiểm duyệt",
                      desc: "Xem/sửa/chọn câu trước khi tạo.",
                      icon: Eye,
                    },
                    {
                      value: "ai-secret",
                      title: "AI bí mật",
                      desc: "Ẩn câu hỏi cho tới khi chơi.",
                      icon: LockKeyhole,
                    },
                  ].map((option) => {
                    const active = roomType === option.value;
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setRoomType(option.value as HocTapRoomType)
                        }
                        className={`rounded-2xl border p-3 text-left transition focus-visible:ring-2 focus-visible:ring-brand ${
                          active
                            ? "border-brand/25 bg-brand-soft text-brand"
                            : "border-line bg-white/80 text-ink-2 hover:border-brand/25 hover:text-brand"
                        }`}
                        aria-pressed={active}
                      >
                        <span className="flex items-center gap-2 text-xs font-black">
                          <Icon className="size-4" aria-hidden="true" />
                          {option.title}
                        </span>
                        <span className="mt-1 block text-[10px] font-semibold leading-4 text-current/75">
                          {option.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  value={projectTopic}
                  onChange={(event) => setProjectTopic(event.target.value)}
                  placeholder="Chủ đề project"
                  className="h-9 w-full rounded-xl border border-line bg-white/85 px-3 text-xs font-bold text-ink outline-none transition placeholder:text-ink-3 focus:border-brand focus:ring-4 focus:ring-brand/10"
                  aria-label="Chủ đề project"
                />

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="sr-only">Số câu muốn gen</span>
                    <input
                      type="number"
                      min={3}
                      max={30}
                      value={questionCount}
                      onChange={(event) =>
                        setQuestionCount(
                          Math.min(
                            30,
                            Math.max(3, Number.parseInt(event.target.value, 10) || 3),
                          ),
                        )
                      }
                      className="h-9 w-full rounded-xl border border-line bg-white/85 px-3 text-xs font-bold text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
                      aria-label="Số câu muốn gen"
                    />
                  </label>
                  <select
                    value={difficulty}
                    onChange={(event) =>
                      setDifficulty(event.target.value as HocTapAiRoomDifficulty)
                    }
                    className="h-9 w-full rounded-xl border border-line bg-white/85 px-3 text-xs font-bold text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
                    aria-label="Mức độ"
                  >
                    {AI_ROOM_DIFFICULTY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  value={projectContext}
                  onChange={(event) => setProjectContext(event.target.value)}
                  rows={4}
                  placeholder="Context project cho AI..."
                  className="w-full resize-none rounded-xl border border-line bg-white/85 px-3 py-2 text-xs font-semibold leading-5 text-ink outline-none transition placeholder:text-ink-3 focus:border-brand focus:ring-4 focus:ring-brand/10"
                  aria-label="Context project cho AI"
                />

                {roomType === "ai-secret" ? (
                  <div className="rounded-2xl border border-dashed border-line bg-secondary p-4 text-center">
                    <span className="mx-auto grid size-10 place-items-center rounded-xl bg-brand text-brand-foreground">
                      <LockKeyhole className="size-5" aria-hidden="true" />
                    </span>
                    <p className="mt-2 text-xs font-black text-ink">
                      Phòng AI bí mật
                    </p>
                    <p className="mt-1 text-[11px] font-semibold leading-5 text-ink-3">
                      {entryRole === "host"
                        ? "Bạn tạo phòng dưới vai host. Server sẽ gen bộ đề khi tạo phòng và không trả preview/đáp án trước."
                        : "Bạn sẽ vào phòng dưới vai người chơi. Server giữ bộ đề bí mật và host hệ thống sẽ tự điều phối countdown."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-2xl border border-line bg-white/70 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-black text-ink">
                          Câu hỏi AI đề xuất
                        </p>
                        <p className="text-[10px] font-semibold text-ink-3">
                          Tick để chọn, sửa nhanh nội dung trước khi tạo phòng.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handlePreviewQuestions}
                        disabled={isPreviewing}
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-brand px-3 text-[11px] font-black text-brand-foreground transition hover:bg-brand-2 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        {isPreviewing ? (
                          <Clock3 className="size-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Sparkles className="size-3.5" aria-hidden="true" />
                        )}
                        AI gen câu hỏi
                      </button>
                    </div>

                    {previewSource ? (
                      <p className="rounded-xl bg-brand-soft px-3 py-2 text-[10px] font-black text-brand">
                        Nguồn câu hỏi:{" "}
                        {previewSource === "openai"
                          ? "OpenAI"
                          : "Fallback deterministic"}
                        {" · "}
                        Đã chọn {selectedPreviewCount}/{previewQuestions.length}
                      </p>
                    ) : null}

                    <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                      {previewQuestions.length === 0 ? (
                        <div className="rounded-xl bg-secondary px-3 py-4 text-center text-[11px] font-semibold leading-5 text-ink-3">
                          Bấm “AI gen câu hỏi” để xem trước bộ đề.
                        </div>
                      ) : (
                        previewQuestions.map((question, questionIndex) => (
                          <div
                            key={`${question.question}-${questionIndex}`}
                            className="rounded-xl border border-line bg-card p-3"
                          >
                            <div className="mb-2 flex items-start gap-2">
                              <label className="mt-2 flex-none">
                                <span className="sr-only">
                                  Chọn câu {questionIndex + 1}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={question.selected}
                                  onChange={(event) =>
                                    updatePreviewQuestion(questionIndex, {
                                      selected: event.target.checked,
                                    })
                                  }
                                  className="size-4 accent-[#114b35]"
                                />
                              </label>
                              <label className="min-w-0 flex-1">
                                <span className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.1em] text-ink-3">
                                  <Pencil className="size-3" aria-hidden="true" />
                                  Câu {questionIndex + 1}
                                </span>
                                <textarea
                                  value={question.question}
                                  onChange={(event) =>
                                    updatePreviewQuestion(questionIndex, {
                                      question: event.target.value,
                                    })
                                  }
                                  rows={2}
                                  className="w-full resize-none rounded-lg border border-line bg-white px-2 py-1.5 text-[11px] font-bold leading-5 text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                                />
                              </label>
                            </div>

                            <div className="grid gap-1.5">
                              {question.options.map((option, optionIndex) => (
                                <label
                                  key={`${questionIndex}-${optionIndex}`}
                                  className="flex items-center gap-2 rounded-lg bg-secondary px-2 py-1.5"
                                >
                                  <input
                                    type="radio"
                                    checked={question.correctIndex === optionIndex}
                                    onChange={() =>
                                      updatePreviewQuestion(questionIndex, {
                                        correctIndex: optionIndex,
                                      })
                                    }
                                    className="accent-[#114b35]"
                                    aria-label={`Đáp án đúng câu ${questionIndex + 1}`}
                                  />
                                  <input
                                    value={option}
                                    onChange={(event) =>
                                      updatePreviewOption(
                                        questionIndex,
                                        optionIndex,
                                        event.target.value,
                                      )
                                    }
                                    className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold text-ink outline-none"
                                    aria-label={`Đáp án ${optionIndex + 1}`}
                                  />
                                </label>
                              ))}
                            </div>

                            <input
                              value={question.explanation ?? ""}
                              onChange={(event) =>
                                updatePreviewQuestion(questionIndex, {
                                  explanation: event.target.value,
                                })
                              }
                              placeholder="Giải thích đáp án đúng"
                              className="mt-2 h-8 w-full rounded-lg border border-line bg-white px-2 text-[11px] font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                              aria-label={`Giải thích câu ${questionIndex + 1}`}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

          </div>

          {createSource === "quiz" ? (
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-bold leading-4 text-amber-700">
              {entryRole === "host"
                ? "Quiz có sẵn cho phép bạn làm chủ phòng để quan sát người chơi và theo dõi top 5 sau mỗi câu."
                : "Quiz có sẵn sẽ tạo phòng chờ với host hệ thống, đưa bạn vào vai người chơi và chỉ bắt đầu khi người tạo bấm mở trận."}
              {lockedRoom ? " Phòng này sẽ được gắn trạng thái khoá theo mã." : ""}
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-bold leading-4 text-amber-700">
              {entryRole === "host"
                ? roomType === "host-review"
                  ? "Bạn tạo phòng dưới vai host, được xem/chọn bộ đề trước khi mời team vào chơi."
                  : "Bạn tạo phòng dưới vai host, bộ đề sẽ được giữ bí mật cho tới lúc vào trận."
                : roomType === "host-review"
                  ? "Bạn vẫn được xem/chọn bộ đề trước khi tạo, nhưng khi vào phòng sẽ ở vai người chơi trong sảnh chờ và hệ thống chỉ chạy sau khi người tạo bấm bắt đầu."
                  : "Bạn sẽ vào phòng dưới vai người chơi trong sảnh chờ; host hệ thống giữ bộ đề bí mật và chỉ điều phối sau khi người tạo bấm bắt đầu."}
              {lockedRoom ? " Phòng này sẽ hiện nhãn khoá và người mới phải nhập mã phòng để vào." : ""}
            </div>
          )}

          {createError ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold leading-4 text-red-700">
              {createError}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-xs font-extrabold text-white shadow-sm shadow-accent/20 transition hover:bg-accent/90 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {isCreating ? (
              <Clock3 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            {isCreating
              ? "Đang tạo..."
              : entryRole === "player"
                ? "Tạo phòng chờ"
                : "Tạo phòng"}
          </button>
        </div>
        <div className="pointer-events-none absolute -right-12 -top-6 h-28 w-36 overflow-hidden rounded-full bg-amber-50 opacity-40" />
      </article>

      <article className="relative self-start overflow-hidden rounded-2xl border border-line bg-card p-5 shadow-sm">
        <div className="relative z-10 space-y-3 pr-0 sm:pr-36">
          <div>
            <h2 className="font-display text-base font-extrabold text-brand">
              Tham gia phòng
            </h2>
            <p className="mt-1 text-xs font-medium leading-5 text-ink-3">
              Nhập mã phòng do host chia sẻ. Với phòng khoá, đây là cách duy nhất để vào.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(event) =>
                setRoomCode(
                  event.target.value
                    .replace(/[^a-zA-Z0-9]/g, "")
                    .toUpperCase()
                    .slice(0, 6),
                )
              }
              placeholder="Nhập mã phòng"
              className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-white/80 px-3 text-xs font-bold text-ink outline-none transition placeholder:text-ink-3 focus:border-brand focus:ring-4 focus:ring-brand/10"
              aria-label="Nhập mã phòng"
            />
            <button
              type="button"
              onClick={handleJoinRoom}
              disabled={isJoining}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-brand px-4 text-xs font-extrabold text-brand-foreground shadow-sm shadow-brand/15 transition hover:bg-brand-2 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              {isJoining ? "Đang vào..." : "Tham gia"}
            </button>
          </div>
          <input
            type="text"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Tên của bạn"
            className="h-9 w-full rounded-xl border border-line bg-white/80 px-3 text-xs font-bold text-ink outline-none transition placeholder:text-ink-3 focus:border-brand focus:ring-4 focus:ring-brand/10"
            aria-label="Tên của bạn"
          />
          {joinError ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold leading-4 text-red-700">
              {joinError}
            </p>
          ) : null}
        </div>
        <div className="pointer-events-none absolute bottom-0 right-0 h-[118px] w-[124px] overflow-hidden rounded-tl-[28px] bg-violet-50/80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hoc-tap/robot.png"
            alt=""
            className="h-full w-full object-cover object-left-top mix-blend-multiply opacity-95"
            aria-hidden="true"
          />
        </div>
      </article>
    </section>
  );
}

function stripEditableQuestion(
  question: EditablePreviewQuestion,
): HocTapRoomQuestionInput {
  return {
    question: question.question,
    options: question.options,
    correctIndex: question.correctIndex,
    explanation: question.explanation,
  };
}

function TeamRoomCard({
  room,
  recommended,
}: {
  room: TeamRoom;
  recommended: boolean;
}) {
  const theme = QUIZ_THEME[room.theme];
  const Icon = theme.icon;
  const status = roomStatusConfig(room.status);

  return (
    <article className="group flex min-h-[176px] flex-col justify-between rounded-2xl border border-line bg-card p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand/20 hover:shadow-lg motion-reduce:transform-none">
      <div className="flex min-w-0 gap-3">
        <div
          className={`relative grid size-20 flex-none place-items-center overflow-hidden rounded-xl bg-gradient-to-br ${theme.gradient}`}
        >
          <span className="absolute left-2 top-2 rounded-full bg-white/15 px-1.5 py-0.5 text-[8px] font-black uppercase text-white/80">
            AI
          </span>
          <Icon
            className="size-9 text-white drop-shadow-sm"
            strokeWidth={1.7}
            aria-hidden="true"
          />
          <Sparkles
            className="absolute right-2 top-2 size-3 text-white/70"
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-brand">
              {room.category}
            </span>
            {room.featured ? <FeaturedMark type={room.featured} /> : null}
            {recommended ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-700">
                Phòng của bạn
              </span>
            ) : null}
            {room.isLive ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700">
                Live {room.code}
              </span>
            ) : null}
            {room.isLocked ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-700">
                Phòng khoá
              </span>
            ) : null}
          </div>

          <h3 className="line-clamp-2 font-display text-base font-extrabold leading-snug text-ink transition group-hover:text-brand">
            {room.title}
          </h3>

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-ink-3">
            <span className="inline-flex items-center gap-1">
              <HostAvatar room={room} />
              Host: {room.host}
            </span>
            <span className={`rounded-full px-2 py-0.5 ${status.className}`}>
              {status.label}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden="true" />
              {room.participants}/{room.capacity}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        <div className="grid grid-cols-2 gap-5 text-[10px] font-semibold text-ink-3">
          <span>
            Chế độ
            <strong className="mt-0.5 block text-xs text-ink">{room.mode}</strong>
          </span>
          <span>
            Thời gian
            <strong className="mt-0.5 block text-xs text-ink">
              {room.questionCount} câu hỏi
            </strong>
          </span>
        </div>
        {room.href && !room.isLocked ? (
          <Link
            href={room.href}
            className="inline-flex min-h-10 flex-none items-center justify-center rounded-xl bg-brand px-4 text-xs font-extrabold text-brand-foreground transition hover:bg-brand-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            {room.cta}
          </Link>
        ) : room.isLocked ? (
          <button
            type="button"
            disabled
            className="inline-flex min-h-10 flex-none items-center justify-center rounded-xl bg-amber-50 px-4 text-xs font-extrabold text-amber-700"
            title="Phòng này đang khoá. Hãy nhập mã phòng để vào."
          >
            Chỉ nhập mã
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex min-h-10 flex-none items-center justify-center rounded-xl bg-secondary px-4 text-xs font-extrabold text-ink-3"
          >
            Sắp ra mắt
          </button>
        )}
      </div>
    </article>
  );
}

function HostAvatar({ room }: { room: TeamRoom }) {
  const [failed, setFailed] = useState(false);

  if (room.hostAvatarUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={room.hostAvatarUrl}
        alt={`Avatar của ${room.host}`}
        className="size-5 rounded-full border border-line bg-secondary object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className="grid size-5 place-items-center rounded-full bg-secondary text-[8px] font-black text-ink-2">
      {room.hostInitials}
    </span>
  );
}

function FeaturedMark({ type }: { type: NonNullable<TeamRoom["featured"]> }) {
  if (type === "hot") {
    return <Flame className="size-3.5 text-orange-500" aria-hidden="true" />;
  }
  if (type === "spark") {
    return <Zap className="size-3.5 text-amber-500" aria-hidden="true" />;
  }

  return (
    <Sparkles className="size-3.5 text-amber-500" aria-hidden="true" />
  );
}

function RankSummaryPanel({
  totalXp,
  rank,
}: {
  totalXp: number;
  rank: number;
}) {
  return (
    <section className="grid gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3 rounded-2xl border border-line/70 bg-background px-3 py-3">
        <span className="grid size-11 flex-none place-items-center rounded-xl bg-amber-50 text-amber-500">
          <Trophy className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-ink-3">Điểm của bạn</p>
          <p className="font-display text-xl font-extrabold text-ink sm:text-2xl">
            {totalXp.toLocaleString("vi-VN")} XP
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-line/70 bg-background px-3 py-3">
        <span className="grid size-11 flex-none place-items-center rounded-xl bg-rose-50 text-rose-600">
          <Target className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-ink-3">Hạng của bạn</p>
          <p className="font-display text-lg font-extrabold text-accent">
            #{rank}
          </p>
        </div>
      </div>
    </section>
  );
}

function LeaderboardPanel() {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <PanelHeader title="Bảng xếp hạng cá nhân" action="Xem tất cả" />
      <div className="mt-4 space-y-3 text-xs font-semibold">
        {PERSONAL_LEADERBOARD.map((item) => (
          <div key={item.rank} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="w-4 flex-none font-bold text-amber-500">
                {item.rank}
              </span>
              <span
                className={`grid size-7 flex-none place-items-center rounded-full text-[10px] font-bold ${avatarTone(item.tone)}`}
              >
                {item.initials}
              </span>
              <span className="truncate text-ink">{item.name}</span>
            </div>
            <span className="flex-none text-[11px] font-bold text-ink-2">
              {item.xp.toLocaleString("vi-VN")} XP
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function DepartmentLeaderboardPanel() {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <PanelHeader title="Bảng xếp hạng phòng ban" action="Xem tất cả" />
      <div className="mt-4 space-y-4 text-xs font-semibold">
        {DEPARTMENT_LEADERBOARD.map((department) => (
          <div key={department.name} className="space-y-1.5">
            <div className="flex justify-between gap-3 text-ink">
              <span>
                {department.rank}. {department.name}
              </span>
              <span>{department.xp.toLocaleString("vi-VN")} XP</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-1.5 rounded-full ${departmentLeaderboardTone(
                  department.tone,
                )}`}
                style={{ width: `${department.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PanelHeader({
  title,
  action,
}: {
  title: string;
  action: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-sm font-extrabold text-ink">{title}</h3>
      </div>
      <span className="text-[10px] font-bold text-brand">{action}</span>
    </div>
  );
}

function buildTeamRooms(catalog: HocTapQuizItem[]): TeamRoom[] {
  return TEAM_ROOM_SEEDS.map((seed) => {
    const quiz = catalog.find((item) => item.id === seed.quizId) ?? null;

    return {
      ...seed,
      quiz,
      href: quiz ? getHocTapQuizHref(quiz) : null,
      isLocked: false,
      hostAvatarUrl: null,
      topic: quiz ? getHocTapQuizTopic(quiz) : "ai-co-ban",
      roleId: quiz?.roleId ?? null,
      questionCount: quiz?.questionCount ?? 10,
      xp: quiz?.xp ?? 50,
      durationMinutes: quiz?.durationMinutes ?? 15,
      publishedOrder: quiz?.publishedOrder ?? 0,
      theme: quiz?.theme ?? "office",
    };
  });
}

function buildLiveTeamRooms(
  rooms: HocTapPublicRoom[],
  catalog: HocTapQuizItem[],
): TeamRoom[] {
  return rooms.map((room) => {
    const quiz = catalog.find((item) => item.id === room.quizId) ?? null;
    const mode: TeamRoomMode =
      room.mode === "team-battle" ? "Team Battle" : "Classic";

    return {
      id: `live-${room.code}`,
      code: room.code,
      quizId: room.quizId,
      title: room.title,
      category: room.category.toUpperCase(),
      host: room.hostName,
      hostInitials: getDisplayInitials(room.hostName),
      status: room.status === "playing" ? "playing" : "waiting",
      mode,
      participants: room.participantCount,
      capacity: room.maxPlayers,
      cta: room.status === "playing" ? "Vào phòng" : "Tham gia",
      featured: "star",
      quiz,
      href: room.isLocked ? null : `/hoc-tap/phong/${room.code}`,
      isLive: true,
      isLocked: room.isLocked,
      hostAvatarUrl: room.hostAvatarUrl,
      topic: quiz ? getHocTapQuizTopic(quiz) : "ai-co-ban",
      roleId: quiz?.roleId ?? null,
      questionCount: room.questionCount,
      xp: quiz?.xp ?? 50,
      durationMinutes: quiz?.durationMinutes ?? 15,
      publishedOrder: Date.parse(room.updatedAt) || 0,
      theme: quiz?.theme ?? "office",
    };
  });
}

function filterTeamRoomsByDepartment(
  rooms: TeamRoom[],
  departmentFilter: HocTapQuizFilter,
): TeamRoom[] {
  const departmentCatalog = filterHocTapQuizCatalog(
    rooms
      .map((room) => room.quiz)
      .filter((quiz): quiz is HocTapQuizItem => Boolean(quiz)),
    departmentFilter,
  );
  const quizIds = new Set(departmentCatalog.map((quiz) => quiz.id));

  if (departmentFilter === "all") return rooms;
  return rooms.filter((room) => room.quiz && quizIds.has(room.quiz.id));
}

function filterTeamRooms(
  rooms: TeamRoom[],
  filters: {
    query: string;
    topic: HocTapQuizTopic;
    roomFilter: TeamRoomFilter;
  },
): TeamRoom[] {
  const normalizedQuery = normalizeHocTapSearchText(filters.query);

  return rooms.filter((room) => {
    if (filters.topic !== "all" && room.topic !== filters.topic) {
      return false;
    }
    if (!matchesRoomFilter(room, filters.roomFilter)) {
      return false;
    }
    if (!normalizedQuery) return true;

    return normalizeHocTapSearchText(
      `${room.title} ${room.category} ${room.host} ${room.mode}`,
    ).includes(normalizedQuery);
  });
}

function matchesRoomFilter(room: TeamRoom, filter: TeamRoomFilter): boolean {
  if (filter === "all") return true;
  if (filter === "classic") return room.mode === "Classic";
  if (filter === "team-battle") return room.mode === "Team Battle";
  return room.status === filter;
}

function sortTeamRooms(
  rooms: TeamRoom[],
  sort: HocTapQuizSort,
): TeamRoom[] {
  return [...rooms].sort((a, b) => {
    if (sort === "question-count") {
      return b.questionCount - a.questionCount || b.publishedOrder - a.publishedOrder;
    }
    if (sort === "xp") {
      return b.xp - a.xp || b.publishedOrder - a.publishedOrder;
    }
    return b.publishedOrder - a.publishedOrder;
  });
}

function roomStatusConfig(status: TeamRoomStatus) {
  const config = {
    waiting: {
      label: "Đang chờ",
      className: "bg-violet-50 text-violet-700",
    },
    playing: {
      label: "Đang chơi",
      className: "bg-cyan-50 text-cyan-700",
    },
    starting: {
      label: "Sắp bắt đầu",
      className: "bg-emerald-50 text-emerald-700",
    },
  } satisfies Record<TeamRoomStatus, { label: string; className: string }>;

  return config[status];
}

function StatRow({
  label,
  value,
  brand = false,
}: {
  label: string;
  value: string;
  brand?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 font-medium text-ink-2">
      <span>{label}</span>
      <span className={brand ? "font-bold text-brand" : "font-bold text-ink"}>
        {value}
      </span>
    </div>
  );
}

function avatarTone(tone: (typeof PERSONAL_LEADERBOARD)[number]["tone"]) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return tones[tone];
}

function difficultyTone(difficulty: HocTapQuizItem["difficulty"]) {
  const tones = {
    Dễ: "bg-emerald-50 text-emerald-700",
    "Trung bình": "bg-amber-50 text-amber-700",
    Khó: "bg-rose-50 text-rose-700",
  } satisfies Record<HocTapQuizItem["difficulty"], string>;

  return tones[difficulty];
}

function departmentLeaderboardTone(
  tone: (typeof DEPARTMENT_LEADERBOARD)[number]["tone"],
) {
  const tones = {
    emerald: "bg-emerald-600",
    orange: "bg-orange-500",
    violet: "bg-violet-600",
    sky: "bg-sky-500",
  };
  return tones[tone];
}

function normalizeHocTapSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi-VN")
    .trim();
}

function getDisplayInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "US";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last || first}`.toUpperCase();
}

function parseSerializedAvatarChoice(value: string): AppAvatarChoice {
  return parseAvatarChoice(value) ?? { provider: "dicebear", id: "ban::default" };
}

function saveHocTapRoomIdentity(
  code: string,
  identity: { participantId: string; hostToken?: string },
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    `ai_troly_hoc_tap_room_${code}`,
    JSON.stringify(identity),
  );
}

function subscribeHocTapProgress(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === "ai_troly_hoc_tap_quiz_progress") {
      onStoreChange();
    }
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(HOC_TAP_PROGRESS_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(HOC_TAP_PROGRESS_EVENT, onStoreChange);
  };
}

function getHocTapProgressSnapshot(): string {
  const progress = getHocTapQuizProgress();
  return `${progress.totalXpEarned}:${progress.attempts.length}`;
}

function getServerHocTapProgressSnapshot(): string {
  return EMPTY_PROGRESS_SNAPSHOT;
}

function parseHocTapProgressSnapshot(snapshot: string) {
  const [rawExtraXp, rawAttempts] = snapshot.split(":");
  const extraXp = Number(rawExtraXp);
  const attempts = Number(rawAttempts);

  return {
    levelProgress: resolveHocTapLevelProgress(
      Number.isFinite(extraXp) ? extraXp : 0,
    ),
    completedMockQuizzes: Number.isFinite(attempts) ? attempts : 0,
  };
}
