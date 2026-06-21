import { ROLES } from "@/lib/roles";

const MODULE_TITLE_TO_HREF = new Map<string, string>();

for (const role of Object.values(ROLES)) {
  for (const mod of role.modules) {
    MODULE_TITLE_TO_HREF.set(mod.title, `/lo-trinh/${mod.id}`);
  }
}

export function resolveModuleHrefByTitle(title: string): string | null {
  const trimmed = title.trim();
  return MODULE_TITLE_TO_HREF.get(trimmed) ?? null;
}

export function isSafeLessonHref(href: string): boolean {
  return /^\/lo-trinh\/[a-z0-9-]+$/.test(href.trim());
}

/** Skip heavy inline parsing on pathological chat lines (DoS guard). */
export const MAX_CHAT_INLINE_LINE_LENGTH = 4096;

/** Cap token count per line — chat replies stay short. */
export const MAX_INLINE_MATCH_COUNT = 128;

/** Bounds inner label/path scans — avoids unbounded scans on hostile input. */
export const MAX_INLINE_LABEL_LENGTH = 512;

export const MAX_MODULE_ID_LENGTH = 64;

/** Guards recursive bold parsing when inner content contains nested tokens. */
export const MAX_INLINE_PARSE_DEPTH = 3;

export type ParsedInlineSegment =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "link"; label: string; href: string };

/** @deprecated Bounded linear parser replaced global regex scanning. */
export const MODULE_LINK_INLINE_PATTERN =
  /(?:\[[^\]]+\]\(\/lo-trinh\/[^)]+\)|«[^»]+»|\*\*[^*]+\*\*)/g;

/**
 * Parses a single chat line into render segments (text, bold, internal lesson links).
 * Scoped markdown subset — not a general Markdown engine.
 */
export function parseChatInlineSegments(
  line: string,
  depth = 0,
): ParsedInlineSegment[] {
  if (depth > MAX_INLINE_PARSE_DEPTH) {
    return [{ kind: "text", value: line }];
  }

  if (line.length > MAX_CHAT_INLINE_LINE_LENGTH) {
    return [{ kind: "text", value: line }];
  }

  const segments: ParsedInlineSegment[] = [];
  let textStart = 0;
  let index = 0;
  let matchCount = 0;

  while (index <= line.length) {
    const loopStart = index;
    const token =
      index < line.length ? matchInlineTokenAt(line, index) : null;

    if (token) {
      matchCount += 1;
      if (matchCount > MAX_INLINE_MATCH_COUNT) {
        if (textStart < line.length) {
          segments.push({ kind: "text", value: line.slice(textStart) });
        }
        break;
      }

      if (index > textStart) {
        segments.push({ kind: "text", value: line.slice(textStart, index) });
      }

      pushParsedToken(segments, token, depth);
      index += Math.max(token.length, 1);
      textStart = index;
    } else if (index >= line.length) {
      break;
    } else {
      const nextSpecial = findNextInlineTokenIndex(line, index + 1);
      if (nextSpecial === -1) {
        segments.push({ kind: "text", value: line.slice(textStart) });
        break;
      }
      index = nextSpecial;
    }

    if (index === loopStart && index < line.length) {
      index += 1;
    }
  }

  return coalesceAdjacentBold(segments);
}

function matchInlineTokenAt(line: string, index: number): string | null {
  return (
    matchLessonMdLinkAt(line, index) ??
    matchGuillemetAt(line, index) ??
    matchBoldAt(line, index)
  );
}

function matchLessonMdLinkAt(line: string, index: number): string | null {
  if (line[index] !== "[") return null;

  const closeBracket = line.indexOf("]", index + 1);
  if (closeBracket === -1) return null;
  if (closeBracket - index - 1 > MAX_INLINE_LABEL_LENGTH) return null;
  if (line[closeBracket + 1] !== "(") return null;

  const pathStart = closeBracket + 2;
  const pathPrefix = "/lo-trinh/";
  if (!line.startsWith(pathPrefix, pathStart)) return null;

  let pathEnd = pathStart + pathPrefix.length;
  while (pathEnd < line.length && isModuleIdChar(line[pathEnd]!)) {
    if (pathEnd - (pathStart + pathPrefix.length) >= MAX_MODULE_ID_LENGTH) {
      return null;
    }
    pathEnd += 1;
  }

  if (pathEnd === pathStart + pathPrefix.length) return null;
  if (line[pathEnd] !== ")") return null;

  const href = line.slice(pathStart, pathEnd);
  if (!isSafeLessonHref(href)) return null;

  return line.slice(index, pathEnd + 1);
}

function matchGuillemetAt(line: string, index: number): string | null {
  if (line[index] !== "«") return null;

  const close = line.indexOf("»", index + 1);
  if (close === -1) return null;
  if (close - index - 1 > MAX_INLINE_LABEL_LENGTH) return null;

  return line.slice(index, close + 1);
}

function matchBoldAt(line: string, index: number): string | null {
  if (line[index] !== "*" || line[index + 1] !== "*") return null;

  const close = line.indexOf("**", index + 2);
  if (close === -1) return null;

  const innerLen = close - index - 2;
  if (innerLen < 1 || innerLen > MAX_INLINE_LABEL_LENGTH) return null;

  return line.slice(index, close + 2);
}

function isModuleIdChar(char: string): boolean {
  return /[a-z0-9-]/.test(char);
}

function findNextInlineTokenIndex(line: string, from: number): number {
  for (let i = from; i < line.length; i += 1) {
    const char = line[i];
    if (char === "[" || char === "«") return i;
    if (char === "*" && line[i + 1] === "*") return i;
  }
  return -1;
}

function pushParsedToken(
  segments: ParsedInlineSegment[],
  token: string,
  depth: number,
): void {
  const mdLink = token.match(/^\[([^\]]+)\]\((\/lo-trinh\/[^)]+)\)$/);
  if (mdLink && isSafeLessonHref(mdLink[2]!)) {
    segments.push({ kind: "link", label: mdLink[1]!, href: mdLink[2]! });
    return;
  }

  if (token.startsWith("**") && token.endsWith("**")) {
    appendBoldInner(segments, token.slice(2, -2), depth);
    return;
  }

  const guillemet = token.match(/^«([^»]+)»$/);
  if (guillemet) {
    const title = guillemet[1]!.trim();
    const href = resolveModuleHrefByTitle(title);
    if (href) {
      segments.push({ kind: "link", label: title, href });
    } else {
      segments.push({ kind: "text", value: title });
    }
    return;
  }

  segments.push({ kind: "text", value: token });
}

function appendBoldInner(
  segments: ParsedInlineSegment[],
  inner: string,
  depth: number,
): void {
  if (depth >= MAX_INLINE_PARSE_DEPTH) {
    segments.push({ kind: "bold", value: inner });
    return;
  }

  const innerSegments = parseChatInlineSegments(inner, depth + 1);

  if (innerSegments.length === 1 && innerSegments[0]?.kind === "text") {
    segments.push({ kind: "bold", value: innerSegments[0].value });
    return;
  }

  for (const part of innerSegments) {
    if (part.kind === "link") {
      segments.push(part);
      continue;
    }
    segments.push({ kind: "bold", value: part.value });
  }
}

function coalesceAdjacentBold(
  segments: ParsedInlineSegment[],
): ParsedInlineSegment[] {
  const out: ParsedInlineSegment[] = [];

  for (const segment of segments) {
    const prev = out[out.length - 1];
    if (prev?.kind === "bold" && segment.kind === "bold") {
      out[out.length - 1] = { kind: "bold", value: prev.value + segment.value };
      continue;
    }
    out.push(segment);
  }

  return out;
}
