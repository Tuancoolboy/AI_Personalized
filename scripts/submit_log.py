#!/usr/bin/env python3
"""
Submit .ai-log/session.jsonl to grading server.
Called by git pre-push hook or manually.

After a successful submit, the live log is rotated:
  - Moved into .ai-log/archive/YYYY-MM-DD.jsonl (appended, never overwritten)
  - The live session.jsonl is recreated empty by the next hook write

If the POST fails, the pending file is restored so nothing is lost.
"""
import json
import os
import shutil
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    def _parse_env_line(line: str) -> tuple[str, str] | None:
        """Parse a simple KEY=VALUE .env line, including quoted values.

        This intentionally supports only the dotenv subset used by the hook
        setup, but handles blank/malformed lines and inline comments without
        corrupting values that contain `#` inside quotes.
        """
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            return None

        key, value = line.split("=", 1)
        key = key.strip()
        if not key:
            return None

        value = value.strip()
        if len(value) >= 2 and value[0] in ("'", '"') and value[-1] == value[0]:
            return key, value[1:-1]

        value = value.split(" #", 1)[0].strip()
        return key, value

    def _load_env_file(path: Path = Path(".env")) -> None:
        """Small .env fallback for hook Python installs without python-dotenv."""
        if not path.exists():
            return
        with open(path, encoding="utf-8") as f:
            for line in f:
                parsed = _parse_env_line(line)
                if not parsed:
                    continue
                key, value = parsed
                if key and key not in os.environ:
                    os.environ[key] = value

    _load_env_file()

SERVER_URL = os.environ.get("AI_LOG_SERVER", "")
API_KEY = os.environ.get("AI_LOG_API_KEY", "")
LOG_DIR = Path(os.environ.get("AI_LOG_DIR", ".ai-log"))
LOG_FILE = LOG_DIR / "session.jsonl"
ARCHIVE_DIR = LOG_DIR / "archive"

# Server returns HTTP 413 when the JSON body is too large. Cap by bytes first,
# then by entry count (server MAX_BATCH_ENTRIES).
BATCH_LIMIT = int(os.environ.get("AI_LOG_BATCH_LIMIT", "100"))
MAX_PAYLOAD_BYTES = int(os.environ.get("AI_LOG_MAX_PAYLOAD_BYTES", "900000"))
# Drain backlog across multiple POSTs in one pre-push without blocking too long.
MAX_BATCHES_PER_RUN = int(os.environ.get("AI_LOG_MAX_BATCHES_PER_RUN", "8"))
BATCH_PAUSE_SEC = float(os.environ.get("AI_LOG_BATCH_PAUSE_SEC", "1.0"))


def _payload_size(entries: list[dict]) -> int:
    return len(json.dumps({"entries": entries}, ensure_ascii=False).encode("utf-8"))


def _next_batch(lines: list[str]) -> tuple[list[dict], list[str], list[str]]:
    """Take the next submit batch from the front of `lines`."""
    entries: list[dict] = []
    used_lines: list[str] = []
    idx = 0

    while idx < len(lines):
        stripped = lines[idx].strip()
        if not stripped:
            idx += 1
            continue

        try:
            entry = json.loads(stripped)
        except json.JSONDecodeError:
            idx += 1
            continue

        candidate = entries + [entry]
        if (
            len(candidate) > BATCH_LIMIT
            or (
                _payload_size(candidate) > MAX_PAYLOAD_BYTES
                and entries
            )
        ):
            break

        if _payload_size(candidate) > MAX_PAYLOAD_BYTES:
            # Single oversized entry — submit alone so we do not stall forever.
            entries = [entry]
            used_lines = [lines[idx]]
            idx += 1
            break

        entries.append(entry)
        used_lines.append(lines[idx])
        idx += 1

        if len(entries) >= BATCH_LIMIT:
            idx += 1
            break

    return entries, used_lines, lines[idx:]


def _archive_lines(lines: list[str]) -> None:
    """Append submitted lines to today's archive."""
    if not lines:
        return
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    archive_file = ARCHIVE_DIR / f"{today}.jsonl"
    with open(archive_file, "a", encoding="utf-8") as dst:
        for line in lines:
            if not line.endswith("\n"):
                line += "\n"
            dst.write(line)


def _restore_unsubmitted(unsubmitted_lines: list[str]) -> None:
    """Failure path: put unsubmitted lines back in LOG_FILE."""
    hook_lines: list[str] = []
    if LOG_FILE.exists():
        with open(LOG_FILE, encoding="utf-8") as f:
            hook_lines = f.readlines()

    with open(LOG_FILE, "w", encoding="utf-8") as f:
        f.writelines(unsubmitted_lines)
        f.writelines(hook_lines)


def _post_entries(entries: list[dict]) -> None:
    payload = json.dumps({"entries": entries}, ensure_ascii=False).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"
    req = urllib.request.Request(
        SERVER_URL,
        data=payload,
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        print(
            f"[ai-log] Submitted {len(entries)} entries "
            f"({len(payload):,} bytes) → {resp.status}",
            file=sys.stderr,
        )


def _merge_orphaned_pending() -> None:
    """Recover from a prior crash between POST and archive/unlink."""
    orphans = sorted(LOG_DIR.glob("session.pending.*.jsonl"))
    if not orphans:
        return

    merged: list[str] = []
    for path in orphans:
        with open(path, encoding="utf-8") as f:
            merged.extend(f.readlines())
        path.unlink()

    if LOG_FILE.exists():
        with open(LOG_FILE, encoding="utf-8") as f:
            merged.extend(f.readlines())

    if merged:
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            f.writelines(merged)
        print(
            f"[ai-log] Recovered {len(orphans)} orphaned pending file(s).",
            file=sys.stderr,
        )


def main():
    if not SERVER_URL:
        print("[ai-log] AI_LOG_SERVER not set — skipping submission.", file=sys.stderr)
        sys.exit(0)

    _merge_orphaned_pending()

    if not LOG_FILE.exists() or LOG_FILE.stat().st_size == 0:
        print("[ai-log] No logs to submit.", file=sys.stderr)
        sys.exit(0)

    # Atomic rename closes the race window: hook writes that arrive after this
    # land in a fresh LOG_FILE, not in the batch we're about to POST.
    pending = LOG_FILE.with_name(f"session.pending.{int(time.time())}.jsonl")
    try:
        LOG_FILE.rename(pending)
    except FileNotFoundError:
        print("[ai-log] No logs to submit.", file=sys.stderr)
        sys.exit(0)

    with open(pending, encoding="utf-8") as f:
        remaining = f.readlines()
    pending.unlink()

    batches_sent = 0

    while remaining and batches_sent < MAX_BATCHES_PER_RUN:
        entries, used_lines, remaining = _next_batch(remaining)
        if not entries:
            break

        try:
            _post_entries(entries)
        except urllib.error.URLError as e:
            _restore_unsubmitted(used_lines + remaining)
            print(f"[ai-log] Submit failed: {e} — logs kept locally.", file=sys.stderr)
            sys.exit(0)

        _archive_lines(used_lines)
        batches_sent += 1

        if remaining and batches_sent < MAX_BATCHES_PER_RUN and BATCH_PAUSE_SEC > 0:
            time.sleep(BATCH_PAUSE_SEC)

    if remaining:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.writelines(remaining)
        print(
            f"[ai-log] {len(remaining)} entries deferred to next push "
            f"({batches_sent} batch(es) sent this run).",
            file=sys.stderr,
        )
    elif batches_sent:
        print(f"[ai-log] All pending entries submitted ({batches_sent} batch(es)).", file=sys.stderr)
    else:
        print("[ai-log] No valid entries to submit.", file=sys.stderr)


if __name__ == "__main__":
    main()
