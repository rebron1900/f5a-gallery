#!/usr/bin/env python3
"""
Fetch GitHub reactions for all theme issues at build time.
Output: public/reactions.json
Works without GITHUB_TOKEN (60 req/hr) but better with one (5000 req/hr).
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

REPO_OWNER = "rebron1900"
REPO_NAME = "f5a-gallery"
OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "reactions.json")
META = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "data", "theme-meta.json")


def api_get(url, token=None):
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "f5a-gallery-build",
    }
    if token:
        headers["Authorization"] = f"token {token}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        if e.code == 403:
            print(f"  RATE LIMITED at {url}", file=sys.stderr)
        else:
            print(f"  HTTP {e.code}: {url}", file=sys.stderr)
        return []
    except Exception as e:
        print(f"  WARN: {url} -> {e}", file=sys.stderr)
        return []


def main():
    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        print("No GITHUB_TOKEN — using unauthenticated (60 req/hr, enough for ~15 issues)")

    with open(META) as f:
        meta = json.load(f)

    result = {}
    issues = {v.get("issue"): slug for slug, v in meta.items() if v.get("issue")}

    print(f"Fetching reactions for {len(issues)} issues...")

    for issue_num, slug in issues.items():
        url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/issues/{issue_num}/reactions"
        reactions = api_get(url, token)
        hearts = sum(1 for r in reactions if r.get("content") == "heart")
        rockets = sum(1 for r in reactions if r.get("content") == "rocket")
        result[slug] = {
            "likes": hearts,
            "favorites": rockets,
            "total": hearts,
        }
        print(f"  #{issue_num} {slug}: {hearts} likes, {rockets} favorites")
        time.sleep(0.1)

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(result, f, indent=2)

    print(f"\nWrote {len(result)} entries to {OUTPUT}")


if __name__ == "__main__":
    main()
