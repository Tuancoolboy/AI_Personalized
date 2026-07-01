import { describe, expect, it } from "vitest";
import { getRole } from "@/lib/roles";
import { UNANSWERED_QUIZ_OPTION } from "@/lib/quiz-answers";
import {
  AVAILABLE_QUIZ_ROLE_IDS,
  buildHocTapQuizCatalog,
  calculateHocTapQuizXp,
  calculateHocTapXpIncrement,
  filterHocTapQuizCatalog,
  filterHocTapQuizLibrary,
  getHocTapDepartmentFilterValue,
  getHocTapQuiz,
  getHocTapQuizHref,
  getVisibleHocTapQuizzes,
  gradeHocTapQuizAnswers,
  parseHocTapDepartmentFilter,
  resolveHocTapQuizForRoute,
  resolveHocTapLevelProgress,
  resolveQuizReturnHref,
  sortHocTapQuizCatalog,
} from "@/lib/hoc-tap-quiz-catalog";

describe("hoc-tap quiz catalog", () => {
  it("contains eight playable quiz sets and no coming-soon cards", () => {
    const catalog = buildHocTapQuizCatalog();
    const available = catalog.filter((item) => item.status === "available");
    const comingSoon = catalog.filter((item) => item.status === "coming-soon");

    expect(catalog).toHaveLength(8);
    expect(available).toHaveLength(8);
    expect(comingSoon).toHaveLength(0);
    expect(new Set(available.map((item) => item.roleId))).toEqual(
      new Set([...AVAILABLE_QUIZ_ROLE_IDS]),
    );
    expect(available.every((item) => item.creator === "AI Trợ Lý")).toBe(true);

    for (const item of available) {
      expect(item.roleId).not.toBeNull();
      expect(item.questionCount).toBeGreaterThanOrEqual(10);
      expect(item.questionCount).toBeLessThanOrEqual(15);
      expect(item.durationMinutes).toBeGreaterThan(0);
    }
  });

  it("keeps hoc-tap practice questions separate from role lesson quizzes", () => {
    const salesQuiz = getHocTapQuiz("ai-ban-hang");
    const roleQuiz = getRole("kinh-doanh")?.quiz[0];

    expect(salesQuiz).not.toBeNull();
    expect(salesQuiz?.questions[0]?.question).not.toBe(roleQuiz?.question);
    expect(salesQuiz?.questions[0]?.explanation).toContain("Prompt");
  });

  it("sorts by newest, question count, and XP without mutating input", () => {
    const catalog = buildHocTapQuizCatalog();
    const originalIds = catalog.map((item) => item.id);

    expect(sortHocTapQuizCatalog(catalog, "newest")[0]?.publishedOrder).toBe(8);
    expect(
      sortHocTapQuizCatalog(catalog, "question-count")[0]?.questionCount,
    ).toBe(10);
    expect(sortHocTapQuizCatalog(catalog, "xp")[0]?.xp).toBe(100);
    expect(catalog.map((item) => item.id)).toEqual(originalIds);
  });

  it("filters quiz catalog by department from database option values", () => {
    const catalog = buildHocTapQuizCatalog();
    const marketingFilter = getHocTapDepartmentFilterValue("marketing");

    expect(parseHocTapDepartmentFilter(marketingFilter)).toBe("marketing");
    expect(filterHocTapQuizCatalog(catalog, marketingFilter).map((item) => item.id))
      .toEqual(["ai-marketing"]);
    expect(filterHocTapQuizCatalog(catalog, "all")).toHaveLength(8);
  });

  it("filters the practice library by unaccented search, topic, and difficulty", () => {
    const catalog = buildHocTapQuizCatalog();

    expect(
      filterHocTapQuizLibrary(catalog, {
        query: "ke toan",
        topic: "all",
        difficulty: "all",
      }).map((item) => item.id),
    ).toEqual(["ai-ke-toan"]);
    expect(
      filterHocTapQuizLibrary(catalog, {
        query: "",
        topic: "automation",
        difficulty: "Khó",
      }).map((item) => item.id),
    ).toEqual(["ai-automation"]);
    expect(
      filterHocTapQuizLibrary(catalog, {
        query: "",
        topic: "ai-co-ban",
        difficulty: "Dễ",
      }).map((item) => item.id),
    ).toEqual(["ai-hanh-chinh-hr", "ai-van-phong"]);
  });

  it("shows four cards initially and all cards after expansion", () => {
    const catalog = buildHocTapQuizCatalog();

    expect(getVisibleHocTapQuizzes(catalog, false)).toHaveLength(4);
    expect(getVisibleHocTapQuizzes(catalog, true)).toHaveLength(8);
  });

  it("creates quiz links for every playable quiz", () => {
    const marketingQuiz = getHocTapQuiz("ai-marketing");
    const catalog = buildHocTapQuizCatalog();
    const promptQuiz = catalog.find((item) => item.id === "prompt-engineering");

    expect(marketingQuiz).not.toBeNull();
    expect(getHocTapQuizHref(marketingQuiz!)).toBe(
      "/kiem-tra/marketing?from=hoc-tap&quiz=ai-marketing",
    );
    expect(promptQuiz).toBeDefined();
    expect(getHocTapQuizHref(promptQuiz!)).toBe(
      "/kiem-tra/khac?from=hoc-tap&quiz=prompt-engineering",
    );
  });

  it("resolves hoc-tap route quiz only when role and quiz id match", () => {
    expect(resolveHocTapQuizForRoute("marketing", "ai-marketing")?.id).toBe(
      "ai-marketing",
    );
    expect(resolveHocTapQuizForRoute("marketing", "ai-ban-hang")).toBeNull();
    expect(resolveHocTapQuizForRoute("marketing", null)?.id).toBe(
      "ai-marketing",
    );
    expect(resolveHocTapQuizForRoute("khac", "prompt-engineering")?.id).toBe(
      "prompt-engineering",
    );
  });

  it("maps only the known hoc-tap source to the hoc-tap return route", () => {
    expect(resolveQuizReturnHref("hoc-tap")).toBe("/hoc-tap");
    expect(resolveQuizReturnHref("https://example.com")).toBe("/lo-trinh");
    expect(resolveQuizReturnHref(["hoc-tap"])).toBe("/lo-trinh");
    expect(resolveQuizReturnHref(undefined)).toBe("/lo-trinh");
  });

  it("calculates real quiz XP from zero and only awards best-score improvements", () => {
    expect(calculateHocTapQuizXp(100, 80)).toBe(80);
    expect(calculateHocTapQuizXp(100, 0)).toBe(0);
    expect(calculateHocTapQuizXp(100, 120)).toBe(100);
    expect(calculateHocTapXpIncrement(100, 0, 80)).toBe(80);
    expect(calculateHocTapXpIncrement(100, 80, 70)).toBe(0);
    expect(calculateHocTapXpIncrement(100, 80, 95)).toBe(15);

    expect(resolveHocTapLevelProgress(0)).toMatchObject({
      level: 1,
      currentXp: 0,
      totalXp: 0,
    });
    expect(resolveHocTapLevelProgress(100)).toMatchObject({
      level: 2,
      currentXp: 0,
      totalXp: 100,
    });
    expect(resolveHocTapLevelProgress(720)).toMatchObject({
      level: 8,
      currentXp: 20,
      totalXp: 720,
    });
  });

  it("grades hoc-tap answers only for the matching quiz and role", () => {
    const quiz = getHocTapQuiz("ai-marketing")!;
    const correctAnswers = quiz.questions.map((question) => question.correctIndex);

    expect(
      gradeHocTapQuizAnswers({
        quizId: quiz.id,
        roleId: quiz.roleId,
        answers: correctAnswers,
      }),
    ).toEqual({
      score: 100,
      correctCount: quiz.questions.length,
      questionCount: quiz.questions.length,
    });
    expect(
      gradeHocTapQuizAnswers({
        quizId: quiz.id,
        roleId: "kinh-doanh",
        answers: correctAnswers,
      }),
    ).toBeNull();
    expect(
      gradeHocTapQuizAnswers({
        quizId: quiz.id,
        roleId: quiz.roleId,
        answers: correctAnswers.slice(1),
      }),
    ).toBeNull();
  });

  it("counts unanswered hoc-tap questions as wrong for timed-out attempts", () => {
    const quiz = getHocTapQuiz("ai-marketing")!;
    const answers = quiz.questions.map((question) => question.correctIndex);
    answers[0] = UNANSWERED_QUIZ_OPTION;

    expect(
      gradeHocTapQuizAnswers({
        quizId: quiz.id,
        roleId: quiz.roleId,
        answers,
      }),
    ).toEqual({
      score: 90,
      correctCount: quiz.questions.length - 1,
      questionCount: quiz.questions.length,
    });
  });
});
