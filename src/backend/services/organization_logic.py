from __future__ import annotations

from dataclasses import dataclass


SLUG_MAX_LENGTH = 50
SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
VIETNAMESE_CHAR_MAP = {
    "à": "a",
    "á": "a",
    "ả": "a",
    "ã": "a",
    "ạ": "a",
    "ă": "a",
    "ằ": "a",
    "ắ": "a",
    "ẳ": "a",
    "ẵ": "a",
    "ặ": "a",
    "â": "a",
    "ầ": "a",
    "ấ": "a",
    "ẩ": "a",
    "ẫ": "a",
    "ậ": "a",
    "đ": "d",
    "è": "e",
    "é": "e",
    "ẻ": "e",
    "ẽ": "e",
    "ẹ": "e",
    "ê": "e",
    "ề": "e",
    "ế": "e",
    "ể": "e",
    "ễ": "e",
    "ệ": "e",
    "ì": "i",
    "í": "i",
    "ỉ": "i",
    "ĩ": "i",
    "ị": "i",
    "ò": "o",
    "ó": "o",
    "ỏ": "o",
    "õ": "o",
    "ọ": "o",
    "ô": "o",
    "ồ": "o",
    "ố": "o",
    "ổ": "o",
    "ỗ": "o",
    "ộ": "o",
    "ơ": "o",
    "ờ": "o",
    "ớ": "o",
    "ở": "o",
    "ỡ": "o",
    "ợ": "o",
    "ù": "u",
    "ú": "u",
    "ủ": "u",
    "ũ": "u",
    "ụ": "u",
    "ư": "u",
    "ừ": "u",
    "ứ": "u",
    "ử": "u",
    "ữ": "u",
    "ự": "u",
    "ỳ": "y",
    "ý": "y",
    "ỷ": "y",
    "ỹ": "y",
    "ỵ": "y",
}


def normalize_organization_slug_input(value: str) -> str:
    lower = value.strip().lower()
    without_accents = "".join(VIETNAMESE_CHAR_MAP.get(ch, ch) for ch in lower)
    slug = without_accents
    import re

    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = re.sub(r"^-+|-+$", "", slug)
    return slug[:SLUG_MAX_LENGTH]


def slugify_organization_name(name: str) -> str:
    slug = normalize_organization_slug_input(name)
    return slug or "cong-ty"


def is_valid_organization_slug(slug: str) -> bool:
    import re

    return 2 <= len(slug) <= SLUG_MAX_LENGTH and bool(re.match(SLUG_PATTERN, slug))


def dedupe_organization_slug(base_slug: str, taken_slugs: set[str]) -> str:
    root = base_slug[:SLUG_MAX_LENGTH]
    if root not in taken_slugs:
        return root
    for suffix in range(2, 1000):
        suffix_text = f"-{suffix}"
        candidate = f"{root[: SLUG_MAX_LENGTH - len(suffix_text)]}{suffix_text}"
        if candidate not in taken_slugs:
            return candidate
    raise ValueError("Không tạo được slug duy nhất.")


def build_company_entry_path(slug: str) -> str:
    from urllib.parse import quote

    return f"/c/{quote(slug)}"
