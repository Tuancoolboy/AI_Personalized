#!/usr/bin/env python3
"""
Codex transcript scanner — extracts real user prompts from local Codex sessions.

This is a fallback for environments where `.codex/hooks.json` is present but
the Codex runtime does not execute hook lifecycle commands. It reads the same
on-disk session JSONL that Codex writes during the conversation and logs only
user messages whose nearest `turn_context.cwd` belongs to the current repo.

Usage:
  python scripts/log_codex.py --auto        # default: last 24h
  python scripts/log_codex.py --hours 72
  python scripts/log_codex.py --all
  python scripts/log_codex.py --dry-run
"""
import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

VN_TZ = timezone(timedelta(hours=7))
CODEX_SESSIONS_DIR = Path.home() / ".codex" / "sessions"


def load_env_file(path: Path = Path(".env")) -> None:
    if not path.exists():
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


def git(*args: str) -> str:
    try:
        return subprocess.check_output(
            ["git", *args],
            shell=False,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        return ""


def normalize_path(path: str) -> str:
    if not path:
        return ""
    try:
        return str(Path(path).expanduser().resolve()).lower().rstrip("/")
    except Exception:
        return path.strip().lower().rstrip("/")


def path_matches_repo(cwd: str, repo_root: str) -> bool:
    cwd_n = normalize_path(cwd)
    repo_n = normalize_path(repo_root)
    if not cwd_n or not repo_n:
        return False
    return (
        cwd_n == repo_n
        or cwd_n.startswith(repo_n + "/")
        or repo_n.startswith(cwd_n + "/")
    )


def text_from_content(content) -> str:
    parts: list[str] = []
    if isinstance(content, str):
        return content.strip()
    if not isinstance(content, list):
        return ""
    for item in content:
        if not isinstance(item, dict):
            continue
        text = item.get("text") or item.get("input_text")
        if isinstance(text, str) and text.strip():
            parts.append(text.strip())
    return "\n\n".join(parts).strip()


def should_skip_prompt(text: str) -> bool:
    stripped = text.strip()
    return (
        not stripped
        or stripped.startswith("# AGENTS.md instructions")
        or stripped.startswith("<environment_context>")
    )


def parse_ts(value: str) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def iter_session_files(cutoff: datetime | None):
    if not CODEX_SESSIONS_DIR.exists():
        return
    for path in sorted(CODEX_SESSIONS_DIR.rglob("*.jsonl")):
        if cutoff:
            try:
                if datetime.fromtimestamp(path.stat().st_mtime, timezone.utc) < cutoff:
                    continue
            except OSError:
                continue
        yield path


def iter_user_prompts(session_file: Path, repo_root: str, cutoff: datetime | None):
    session_id = session_file.stem
    current_cwd = ""
    current_model = ""

    with open(session_file, encoding="utf-8", errors="replace") as f:
        for line_no, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue

            payload = row.get("payload")
            if row.get("type") == "session_meta" and isinstance(payload, dict):
                session_id = (
                    payload.get("id")
                    or payload.get("session_id")
                    or payload.get("sessionId")
                    or session_id
                )
                continue

            if row.get("type") == "turn_context" and isinstance(payload, dict):
                current_cwd = payload.get("cwd") or current_cwd
                current_model = payload.get("model") or current_model
                continue

            if not path_matches_repo(current_cwd, repo_root):
                continue
            if not (isinstance(payload, dict)
                    and payload.get("type") == "message"
                    and payload.get("role") == "user"):
                continue

            ts_raw = row.get("timestamp") or ""
            ts_dt = parse_ts(ts_raw)
            if cutoff and ts_dt and ts_dt < cutoff:
                continue

            prompt = text_from_content(payload.get("content"))
            if should_skip_prompt(prompt):
                continue

            yield {
                "session_id": session_id,
                "line_no": line_no,
                "timestamp": ts_raw,
                "model": current_model,
                "prompt": prompt,
            }


def get_logged_entry_ids(log_dir: Path) -> set[str]:
    logged: set[str] = set()
    log_files = [log_dir / "session.jsonl"]
    archive_dir = log_dir / "archive"
    if archive_dir.exists():
        log_files.extend(sorted(archive_dir.glob("*.jsonl")))

    for log_file in log_files:
        if not log_file.exists():
            continue
        with open(log_file, encoding="utf-8-sig", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                entry_id = entry.get("entry_id")
                if entry_id:
                    logged.add(entry_id)
    return logged


def build_entry(msg: dict, repo: str, branch: str, commit: str,
                student: str) -> dict:
    ts = msg["timestamp"]
    ts_dt = parse_ts(ts)
    if ts_dt:
        ts = ts_dt.astimezone(VN_TZ).isoformat()

    return {
        "ts": ts or datetime.now(VN_TZ).isoformat(),
        "tool": "codex",
        "event": "UserPrompt",
        "entry_id": f"codex-{msg['session_id']}-{msg['line_no']:05d}",
        "session_id": msg["session_id"],
        "model": msg["model"],
        "repo": repo,
        "branch": branch,
        "commit": commit,
        "student": student,
        "prompt": msg["prompt"],
        "response_summary": "",
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract user prompts from Codex transcripts into .ai-log/session.jsonl."
    )
    parser.add_argument("--auto", action="store_true",
                        help="Default mode: scan recent sessions.")
    parser.add_argument("--hours", type=int, default=24,
                        help="Window in hours when scanning (default: 24).")
    parser.add_argument("--all", action="store_true",
                        help="Ignore the time window; scan every session.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be logged, don't write.")
    args = parser.parse_args()

    load_env_file()

    repo_root = git("rev-parse", "--show-toplevel") or str(Path.cwd())
    origin = git("remote", "get-url", "origin")
    repo = origin.rstrip("/").split("/")[-1].replace(".git", "") or Path(repo_root).name
    branch = git("rev-parse", "--abbrev-ref", "HEAD")
    commit = git("rev-parse", "--short", "HEAD")
    student = git("config", "user.email") or os.environ.get(
        "USERNAME", os.environ.get("USER", "unknown")
    )

    cutoff = None
    if not args.all:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=args.hours)

    log_dir = Path(os.environ.get("AI_LOG_DIR", ".ai-log"))
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / "session.jsonl"
    logged_ids = get_logged_entry_ids(log_dir)

    new_entries: list[dict] = []
    for session_file in iter_session_files(cutoff):
        for msg in iter_user_prompts(session_file, repo_root, cutoff):
            entry = build_entry(msg, repo, branch, commit, student)
            if entry["entry_id"] in logged_ids:
                continue
            new_entries.append(entry)
            logged_ids.add(entry["entry_id"])

    if not new_entries:
        scope = "all" if args.all else f"{args.hours}h"
        print(f"[codex-log] No new prompts (repo={repo_root}, window={scope}).",
              file=sys.stderr)
        sys.exit(0)

    if args.dry_run:
        print(f"\n[codex-log] DRY RUN — would log {len(new_entries)} entries:\n")
        for entry in new_entries:
            preview = entry["prompt"].replace("\n", " ")[:120]
            print(f"  [{entry['ts'][:19]}] {preview}")
        sys.exit(0)

    with open(log_file, "a", encoding="utf-8") as f:
        for entry in new_entries:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    print(f"[codex-log] Logged {len(new_entries)} prompt(s) from Codex.",
          file=sys.stderr)


if __name__ == "__main__":
    main()
