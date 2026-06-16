"""
Fetch GitHub issue reactions for themes and write public/reactions.json.

Run at build time. Uses unauthenticated API (60 req/hour limit).
Only themes with an 'issue' number in theme-meta.json are fetched.

Output format: { "slug": { "total": N, "url": "https://..." }, ... }
"""

import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

REPO = "rebron1900/f5a-gallery"
META_PATH = Path(__file__).resolve().parent.parent / "src" / "data" / "theme-meta.json"
OUT_PATH = Path(__file__).resolve().parent.parent / "public" / "reactions.json"


def get_token() -> str | None:
    """Read GitHub token from env or secrets file."""
    import os
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        return token
    secrets = Path.home() / ".hermes" / "secrets" / "github_token"
    if secrets.exists():
        return secrets.read_text().strip()
    return None


def fetch_reactions(issue_number: int) -> dict:
    """Fetch reaction counts for a single issue."""
    url = f"https://api.github.com/repos/{REPO}/issues/{issue_number}/reactions"
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "f5a-gallery-bot",
    }
    token = get_token()
    if token:
        headers["Authorization"] = f"token {token}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            # Sum all positive reaction types
            total = len(data)
            return {"total": total}
    except urllib.error.HTTPError as e:
        print(f"  ⚠ Issue #{issue_number}: HTTP {e.code}", file=sys.stderr)
        return {"total": 0}
    except Exception as e:
        print(f"  ⚠ Issue #{issue_number}: {e}", file=sys.stderr)
        return {"total": 0}


def main():
    meta = json.loads(META_PATH.read_text())
    result = {}

    for slug, info in meta.items():
        issue = info.get("issue")
        if not issue:
            continue
        print(f"  Fetching reactions for {slug} (issue #{issue})...")
        reactions = fetch_reactions(issue)
        result[slug] = {
            "total": reactions["total"],
            "url": f"https://github.com/{REPO}/issues/{issue}",
        }

    OUT_PATH.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(f"✓ Wrote {len(result)} entries to {OUT_PATH}")


if __name__ == "__main__":
    main()
