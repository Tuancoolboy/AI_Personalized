const SLUG_MAX_LENGTH = 50;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const VIETNAMESE_CHAR_MAP: Record<string, string> = {
  à: "a",
  á: "a",
  ả: "a",
  ã: "a",
  ạ: "a",
  ă: "a",
  ằ: "a",
  ắ: "a",
  ẳ: "a",
  ẵ: "a",
  ặ: "a",
  â: "a",
  ầ: "a",
  ấ: "a",
  ẩ: "a",
  ẫ: "a",
  ậ: "a",
  đ: "d",
  è: "e",
  é: "e",
  ẻ: "e",
  ẽ: "e",
  ẹ: "e",
  ê: "e",
  ề: "e",
  ế: "e",
  ể: "e",
  ễ: "e",
  ệ: "e",
  ì: "i",
  í: "i",
  ỉ: "i",
  ĩ: "i",
  ị: "i",
  ò: "o",
  ó: "o",
  ỏ: "o",
  õ: "o",
  ọ: "o",
  ô: "o",
  ồ: "o",
  ố: "o",
  ổ: "o",
  ỗ: "o",
  ộ: "o",
  ơ: "o",
  ờ: "o",
  ớ: "o",
  ở: "o",
  ỡ: "o",
  ợ: "o",
  ù: "u",
  ú: "u",
  ủ: "u",
  ũ: "u",
  ụ: "u",
  ư: "u",
  ừ: "u",
  ứ: "u",
  ử: "u",
  ữ: "u",
  ự: "u",
  ỳ: "y",
  ý: "y",
  ỷ: "y",
  ỹ: "y",
  ỵ: "y",
};

export function normalizeOrganizationSlugInput(value: string): string {
  const lower = value.trim().toLowerCase();
  const withoutAccents = [...lower]
    .map((char) => VIETNAMESE_CHAR_MAP[char] ?? char)
    .join("");
  const slug = withoutAccents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH);

  return slug;
}

export function slugifyOrganizationName(name: string): string {
  const slug = normalizeOrganizationSlugInput(name);
  return slug || "cong-ty";
}

export function isValidOrganizationSlug(slug: string): boolean {
  return (
    slug.length >= 2 &&
    slug.length <= SLUG_MAX_LENGTH &&
    SLUG_PATTERN.test(slug)
  );
}

export function dedupeOrganizationSlug(
  baseSlug: string,
  takenSlugs: Set<string>,
): string {
  const root = baseSlug.slice(0, SLUG_MAX_LENGTH);
  if (!takenSlugs.has(root)) return root;

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const suffixText = `-${suffix}`;
    const candidate = `${root.slice(0, SLUG_MAX_LENGTH - suffixText.length)}${suffixText}`;
    if (!takenSlugs.has(candidate)) return candidate;
  }

  throw new Error("Không tạo được slug duy nhất.");
}

export function buildCompanyEntryPath(slug: string): string {
  return `/c/${encodeURIComponent(slug)}`;
}
