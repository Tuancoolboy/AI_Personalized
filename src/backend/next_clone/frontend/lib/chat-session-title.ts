/**
 * Tóm tắt yêu cầu user thành tiêu đề session — không trích nguyên câu hỏi.
 */
export function summarizeChatSessionTitle(
  userMessage: string,
  max = 48,
): string {
  let text = userMessage.trim().replace(/\s+/g, " ");
  if (!text) return "Hội thoại mới";

  const normalized = text
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/hoc den dau|dang hoc|tien do|hoc gi tiep|hoan thanh bao nhieu/.test(normalized)) {
    return truncateTitle("Tiến độ học tập", max);
  }

  if (/bao cao|report/.test(normalized)) {
    const period = /thang nay|tuan nay|quy nay/.test(normalized)
      ? text.match(/(tháng này|tuần này|quý này)/i)?.[0] ?? ""
      : "";
    const domain = /marketing|ban hang|kinh doanh|ke toan|van hanh|nhan su|hanh chinh|hr/.test(normalized)
      ? pickDomainLabel(normalized)
      : "";
    const parts = ["Báo cáo", domain, period].filter(Boolean);
    return truncateTitle(parts.join(" "), max);
  }

  if (/email|mail/.test(normalized)) {
    return truncateTitle("Soạn email công việc", max);
  }

  if (/caption|content|noi dung|bai dang|facebook|fb/.test(normalized)) {
    return truncateTitle("Ý tưởng nội dung", max);
  }

  if (/prompt|chatgpt|claude|copilot/.test(normalized)) {
    return truncateTitle("Hỗ trợ viết prompt", max);
  }

  text = stripOpeners(text);
  text = stripLeadingPronounNeed(text);
  text = stripTrailingClauses(text);

  const actionMatch = text.match(
    /(?:làm|viết|tạo|soạn|lên|chuẩn bị|hỗ trợ)\s+(?:một |1 |bài |cái )?(.+?)(?:\s+(?:cho|với|trong|tuần|tháng|này)|$)/i,
  );
  if (actionMatch?.[1]) {
    text = actionMatch[1].trim();
  }

  text = stripTrailingClauses(text);
  text = capitalizeFirst(text);

  if (text.length < 6) {
    text = capitalizeFirst(stripOpeners(userMessage.trim()).slice(0, max));
  }

  return truncateTitle(text || "Hội thoại mới", max);
}

function pickDomainLabel(normalized: string): string {
  if (/marketing/.test(normalized)) return "marketing";
  if (/ban hang|kinh doanh/.test(normalized)) return "bán hàng";
  if (/ke toan/.test(normalized)) return "kế toán";
  if (/nhan su|hr/.test(normalized)) return "nhân sự";
  if (/hanh chinh/.test(normalized)) return "hành chính";
  if (/van hanh/.test(normalized)) return "vận hành";
  return "";
}

function stripOpeners(text: string): string {
  let result = text;
  const pattern =
    /^(okay+|ok+|ừ+|dạ+|chào+|hey+|hi+|hello+|giờ+|vậy+|thì+|à+|nhé+|nè+|ơi+)\s*[,.!]?\s*/i;
  while (pattern.test(result)) {
    result = result.replace(pattern, "");
  }
  return result.trim();
}

function stripLeadingPronounNeed(text: string): string {
  return text
    .replace(
      /^(?:mình|tôi|em|anh|chị|a|e)\s+(?:đang|sẽ|cần|muốn|có|tính|hỏi)\s+(?:làm|viết|tạo|soạn|chuẩn bị|lên|hỏi|biết(?: về)?|hỗ trợ)?\s*/i,
      "",
    )
    .trim();
}

function stripTrailingClauses(text: string): string {
  return text
    .replace(/\s+(?:nhưng mà|mà|nhưng|vì|tại vì)\s+.+$/i, "")
    .replace(/\s+(?:chưa biết|không biết|không rõ|được không).+$/i, "")
    .replace(/\s+(?:em|bạn|ai đó)\s+(?:hỗ trợ|giúp).+$/i, "")
    .replace(/\s*[?!.…]+$/g, "")
    .trim();
}

function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function truncateTitle(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
