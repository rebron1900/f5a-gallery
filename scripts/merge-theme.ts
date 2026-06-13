#!/usr/bin/env node
/**
 * merge-theme.ts
 * Extracts theme JSON from a GitHub Issue body and writes it to src/content/themes/
 *
 * Supports two input formats:
 *   - Native fcitx5-android: colors as signed 32-bit integers (ARGB), top-level
 *   - Gallery format: colors as hex strings inside a colors object
 *
 * Output is always gallery format with hex strings.
 *
 * Usage: node merge-theme.ts --issue=<number>
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const THEME_COLORS = [
  "backgroundColor", "barColor", "keyboardColor", "keyBackgroundColor",
  "keyTextColor", "candidateTextColor", "candidateLabelColor",
  "candidateCommentColor", "altKeyBackgroundColor", "altKeyTextColor",
  "accentKeyBackgroundColor", "accentKeyTextColor", "keyPressHighlightColor",
  "keyShadowColor", "popupBackgroundColor", "popupTextColor",
  "spaceBarColor", "dividerColor", "clipboardEntryColor",
  "genericActiveBackgroundColor", "genericActiveForegroundColor",
];

/** Convert signed 32-bit ARGB integer to #RRGGBB hex string */
function intToHex(argb: number): string {
  // Mask to unsigned 32-bit, extract RGB (drop alpha)
  const unsigned = argb >>> 0;
  const r = (unsigned >> 16) & 0xff;
  const g = (unsigned >> 8) & 0xff;
  const b = unsigned & 0xff;
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

/** Detect if a color value is a signed 32-bit integer (not a hex string) */
function isIntColor(v: unknown): v is number {
  return typeof v === "number";
}

/** Normalize theme data to gallery format (hex strings, colors wrapper) */
function normalizeTheme(data: any, author?: string): any {
  const result: any = {
    name: data.name,
    author: author || data.author || "unknown",
    isDark: data.isDark,
    builtin: false,
  };

  // Detect format: if colors exist at top level as integers, convert
  const rawColors = data.colors || data;
  const colors: Record<string, string> = {};

  for (const token of THEME_COLORS) {
    const v = rawColors[token];
    if (v === undefined) continue;
    colors[token] = isIntColor(v) ? intToHex(v) : v;
  }

  result.colors = colors;
  return result;
}

function extractJsonFromIssueBody(body: string): string | null {
  // Match JSON inside ```json ... ``` code block
  const codeBlockMatch = body.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // Fallback: try to find raw JSON object
  const jsonMatch = body.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];

  return null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "");
}

function validateTheme(data: any): string[] {
  const errors: string[] = [];
  if (!data.name || typeof data.name !== "string") errors.push("Missing 'name'");
  if (typeof data.isDark !== "boolean") errors.push("Missing 'isDark'");

  // Check colors exist (either in wrapper or top-level)
  const rawColors = data.colors || data;
  for (const token of THEME_COLORS) {
    if (rawColors[token] === undefined) errors.push(`Missing color: ${token}`);
  }
  return errors;
}

async function main() {
  const issueArg = process.argv.find((a) => a.startsWith("--issue="));
  if (!issueArg) {
    console.error("Usage: node merge-theme.ts --issue=<number>");
    process.exit(1);
  }

  const issueNumber = parseInt(issueArg.split("=")[1], 10);
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;

  if (!token || !repo) {
    console.error("GITHUB_TOKEN and GITHUB_REPOSITORY env vars required");
    process.exit(1);
  }

  // Fetch issue body
  const res = await fetch(`https://api.github.com/repos/${repo}/issues/${issueNumber}`, {
    headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" },
  });

  if (!res.ok) {
    console.error(`Failed to fetch issue #${issueNumber}: ${res.status}`);
    process.exit(1);
  }

  const issue = await res.json();
  const body = issue.body || "";

  const jsonStr = extractJsonFromIssueBody(body);
  if (!jsonStr) {
    console.error("Could not extract JSON from issue body");
    process.exit(1);
  }

  let data: any;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    console.error("Invalid JSON in issue body:", e);
    process.exit(1);
  }

  const errors = validateTheme(data);
  if (errors.length > 0) {
    console.error("Theme validation failed:", errors.join(", "));
    process.exit(1);
  }

  // Normalize to gallery format, use issue author as theme author
  const issueAuthor = issue.user?.login || "unknown";
  const theme = normalizeTheme(data, issueAuthor);
  const slug = slugify(theme.name);
  const themesDir = join(process.cwd(), "src", "content", "themes");
  const filePath = join(themesDir, `${slug}.json`);

  if (existsSync(filePath)) {
    console.error(`Theme file already exists: ${slug}.json`);
    process.exit(1);
  }

  writeFileSync(filePath, JSON.stringify(theme, null, 2) + "\n");
  console.log(`✅ Theme written: src/content/themes/${slug}.json`);
  console.log(`   Name: ${theme.name}`);
  console.log(`   Author: ${theme.author}`);
  console.log(`   Format: normalized to hex strings`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
