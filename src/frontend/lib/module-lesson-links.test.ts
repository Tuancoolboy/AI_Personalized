import { describe, expect, it } from "vitest";
import {
  isSafeLessonHref,
  MAX_CHAT_INLINE_LINE_LENGTH,
  MAX_INLINE_MATCH_COUNT,
  MAX_INLINE_PARSE_DEPTH,
  parseChatInlineSegments,
  resolveModuleHrefByTitle,
  type ParsedInlineSegment,
} from "./module-lesson-links";

function linkSegments(segments: ParsedInlineSegment[]) {
  return segments.filter(
    (segment): segment is Extract<ParsedInlineSegment, { kind: "link" }> =>
      segment.kind === "link",
  );
}

describe("module-lesson-links", () => {
  it("resolves known module title to lesson href", () => {
    expect(resolveModuleHrefByTitle("AI là gì? Nó giúp được gì cho marketing")).toBe(
      "/lo-trinh/marketing-m1",
    );
  });

  it("returns null for unknown title", () => {
    expect(resolveModuleHrefByTitle("Không phải module")).toBeNull();
  });

  it("accepts only internal lesson paths", () => {
    expect(isSafeLessonHref("/lo-trinh/marketing-m1")).toBe(true);
    expect(isSafeLessonHref("/lo-trinh/marketing-m1?extra=1")).toBe(true);
    expect(isSafeLessonHref("https://evil.example")).toBe(false);
    expect(isSafeLessonHref("javascript:alert(1)")).toBe(false);
  });

  it("parses markdown lesson links", () => {
    const segments = parseChatInlineSegments(
      "Anh/chị đang học [AI là gì? Nó giúp được gì cho marketing](/lo-trinh/marketing-m1).",
    );
    expect(segments).toEqual([
      { kind: "text", value: "Anh/chị đang học " },
      {
        kind: "link",
        label: "AI là gì? Nó giúp được gì cho marketing",
        href: "/lo-trinh/marketing-m1",
      },
      { kind: "text", value: "." },
    ]);
  });

  it("converts guillemet module titles to links", () => {
    const segments = parseChatInlineSegments(
      "Module «AI là gì? Nó giúp được gì cho marketing» đang học dở.",
    );
    expect(segments).toEqual([
      { kind: "text", value: "Module " },
      {
        kind: "link",
        label: "AI là gì? Nó giúp được gì cho marketing",
        href: "/lo-trinh/marketing-m1",
      },
      { kind: "text", value: " đang học dở." },
    ]);
  });

  it("strips guillemets for non-module quotes", () => {
    const segments = parseChatInlineSegments("Prompt mẫu «content» quá chung.");
    expect(segments).toEqual([
      { kind: "text", value: "Prompt mẫu " },
      { kind: "text", value: "content" },
      { kind: "text", value: " quá chung." },
    ]);
  });

  it("prefers lesson links over bold when patterns overlap", () => {
    const segments = parseChatInlineSegments(
      "**[AI là gì? Nó giúp được gì cho marketing](/lo-trinh/marketing-m1)**",
    );
    expect(linkSegments(segments)).toEqual([
      {
        kind: "link",
        label: "AI là gì? Nó giúp được gì cho marketing",
        href: "/lo-trinh/marketing-m1",
      },
    ]);
  });

  it("parses links inside mixed bold text", () => {
    const segments = parseChatInlineSegments(
      "**Xem [AI là gì? Nó giúp được gì cho marketing](/lo-trinh/marketing-m1) nhé**",
    );
    expect(segments).toEqual([
      { kind: "bold", value: "Xem " },
      {
        kind: "link",
        label: "AI là gì? Nó giúp được gì cho marketing",
        href: "/lo-trinh/marketing-m1",
      },
      { kind: "bold", value: " nhé" },
    ]);
  });

  it("allows single asterisks inside bold text", () => {
    const segments = parseChatInlineSegments("**text*with*asterisk**");
    expect(segments).toEqual([{ kind: "bold", value: "text*with*asterisk" }]);
  });

  it("coalesces adjacent bold segments split by a link", () => {
    const segments = parseChatInlineSegments(
      "**Trước **[AI là gì? Nó giúp được gì cho marketing](/lo-trinh/marketing-m1)** sau**",
    );
    expect(segments).toEqual([
      { kind: "bold", value: "Trước " },
      {
        kind: "link",
        label: "AI là gì? Nó giúp được gì cho marketing",
        href: "/lo-trinh/marketing-m1",
      },
      { kind: "bold", value: " sau" },
    ]);
  });

  it("stops recursive bold parsing at max depth", () => {
    const segments = parseChatInlineSegments(
      "deep",
      MAX_INLINE_PARSE_DEPTH + 1,
    );
    expect(segments).toEqual([{ kind: "text", value: "deep" }]);
  });

  it("does not recurse bold parsing when already at max depth", () => {
    const segments = parseChatInlineSegments(
      "**hello**",
      MAX_INLINE_PARSE_DEPTH,
    );
    expect(segments).toEqual([{ kind: "bold", value: "hello" }]);
  });

  it("returns plain text for lines exceeding max length", () => {
    const longLine = `[skip](/lo-trinh/marketing-m1) ${"x".repeat(MAX_CHAT_INLINE_LINE_LENGTH)}`;
    const segments = parseChatInlineSegments(longLine);
    expect(segments).toEqual([{ kind: "text", value: longLine }]);
    expect(linkSegments(segments)).toEqual([]);
  });

  it("parses many inline tokens on a long but bounded line", () => {
    const chunk = "word [A](/lo-trinh/marketing-m1) ";
    const line = chunk.repeat(20).trim();
    expect(line.length).toBeLessThan(MAX_CHAT_INLINE_LINE_LENGTH);
    const segments = parseChatInlineSegments(line);
    expect(linkSegments(segments)).toHaveLength(20);
  });

  it("stops parsing after max inline match count", () => {
    const chunk = "«AI là gì? Nó giúp được gì cho marketing» ";
    const line = chunk.repeat(MAX_INLINE_MATCH_COUNT + 5);
    const segments = parseChatInlineSegments(line);
    expect(linkSegments(segments).length).toBeLessThanOrEqual(
      MAX_INLINE_MATCH_COUNT,
    );
    expect(segments.at(-1)?.kind).toBe("text");
  });

  it("terminates on malformed bracket prefix without hanging", () => {
    const malformed = `[${"a".repeat(MAX_CHAT_INLINE_LINE_LENGTH - 2)}`;
    expect(malformed.length).toBeLessThanOrEqual(MAX_CHAT_INLINE_LINE_LENGTH);
    const segments = parseChatInlineSegments(malformed);
    expect(segments).toEqual([{ kind: "text", value: malformed }]);
    expect(linkSegments(segments)).toEqual([]);
  });

  describe("security regression", () => {
    it("rejects javascript: and external hrefs in isSafeLessonHref", () => {
      expect(isSafeLessonHref("javascript:alert(1)")).toBe(false);
      expect(isSafeLessonHref("https://evil.example/phish")).toBe(false);
      expect(isSafeLessonHref("//evil.example/lo-trinh/marketing-m1")).toBe(false);
      expect(isSafeLessonHref("/lo-trinh/marketing-m1?x=1")).toBe(false);
      expect(isSafeLessonHref("/lo-trinh/marketing-m1?extra=1")).toBe(true);
      expect(isSafeLessonHref("/lo-trinh/marketing-m1#anchor")).toBe(false);
    });

    it("does not render javascript: markdown as a link", () => {
      const segments = parseChatInlineSegments("[click me](javascript:alert(1))");
      expect(linkSegments(segments)).toEqual([]);
      expect(segments).toEqual([
        { kind: "text", value: "[click me](javascript:alert(1))" },
      ]);
    });

    it("does not render external markdown URLs as links", () => {
      const line = "Xem [trang lừa đảo](https://evil.example/phish) nhé.";
      const segments = parseChatInlineSegments(line);
      expect(linkSegments(segments)).toEqual([]);
      const rendered = segments
        .map((segment) =>
          segment.kind === "link" ? segment.label : segment.value,
        )
        .join("");
      expect(rendered).toContain("https://evil.example/phish");
    });

    it("does not render extra path segments as links", () => {
      const segments = parseChatInlineSegments(
        "[Bài học](/lo-trinh/marketing-m1/extra/path)",
      );
      expect(linkSegments(segments)).toEqual([]);
      expect(segments).toEqual([
        {
          kind: "text",
          value: "[Bài học](/lo-trinh/marketing-m1/extra/path)",
        },
      ]);
    });

    it("renders extra lesson query links as internal lesson links", () => {
      const segments = parseChatInlineSegments(
        "[Viết email nội bộ & truyền thông HR bằng AI](/lo-trinh/van-hanh-m9?extra=1)",
      );
      expect(linkSegments(segments)).toEqual([
        {
          kind: "link",
          label: "Viết email nội bộ & truyền thông HR bằng AI",
          href: "/lo-trinh/van-hanh-m9?extra=1",
        },
      ]);
    });

    it("does not render encoded or special characters in href as links", () => {
      const attempts = [
        "[Bài](/lo-trinh/marketing-m1%00)",
        "[Bài](/lo-trinh/marketing-m1<script>)",
        "[Bài](/lo-trinh/marketing m1)",
        "[Bài]( /lo-trinh/marketing-m1)",
      ];

      for (const line of attempts) {
        expect(linkSegments(parseChatInlineSegments(line))).toEqual([]);
      }
    });

    it("only allows lesson hrefs from the static title map for guillemet fallback", () => {
      const segments = parseChatInlineSegments("«javascript:alert(1)»");
      expect(linkSegments(segments)).toEqual([]);
      expect(segments).toEqual([{ kind: "text", value: "javascript:alert(1)" }]);
    });

    it("parses HTML-like markdown labels as plain strings (React escapes at render)", () => {
      const segments = parseChatInlineSegments(
        "[<img onerror=alert(1)>](/lo-trinh/marketing-m1)",
      );
      expect(linkSegments(segments)).toEqual([
        {
          kind: "link",
          label: "<img onerror=alert(1)>",
          href: "/lo-trinh/marketing-m1",
        },
      ]);
    });
  });
});
