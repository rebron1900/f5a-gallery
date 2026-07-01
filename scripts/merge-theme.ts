#!/usr/bin/env node
/**
 * merge-theme.ts
 * Extracts theme JSON from a GitHub Issue body and writes it to src/content/themes/
 *
 * Input and output are native fcitx5-android-fx（靓企鹅版）format:
 *   - Colors as signed 32-bit integers (ARGB), flat top-level structure
 *   - No gallery extension fields (author, builtin) in theme JSON
 *   - Author info is stored separately in src/data/theme-meta.json
 *
 * Usage: node merge-theme.ts --issue=<number>
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import themeConfig from "../src/data/theme-config.json" with { type: "json" };

const THEME_COLORS = [
  "backgroundColor", "barColor", "keyboardColor", "keyBackgroundColor",
  "keyTextColor", "candidateTextColor", "candidateLabelColor",
  "candidateCommentColor", "altKeyBackgroundColor", "altKeyTextColor",
  "accentKeyBackgroundColor", "accentKeyTextColor", "keyPressHighlightColor",
  "keyShadowColor", "popupBackgroundColor", "popupTextColor",
  "spaceBarColor", "dividerColor", "clipboardEntryColor",
  "genericActiveBackgroundColor", "genericActiveForegroundColor",
];

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

/**
 * Find existing slug for an issue number by scanning theme-meta.json
 */
function findSlugByIssue(meta: Record<string, any>, issueNumber: number): string | null {
  for (const [slug, entry] of Object.entries(meta)) {
    if ((entry as any).issue === issueNumber) return slug;
  }
  return null;
}

function validateTheme(data: any): string[] {
  const errors: string[] = [];
  if (!data.name || typeof data.name !== "string") errors.push("Missing 'name'");
  if (typeof data.isDark !== "boolean") errors.push("Missing 'isDark'");

  for (const token of THEME_COLORS) {
    if (data[token] === undefined) errors.push(`Missing color: ${token}`);
    else if (typeof data[token] !== "number") errors.push(`Color '${token}' must be a number (int32), got ${typeof data[token]}`);
  }
  return errors;
}

async function main() {
  const issueArg = process.argv.find((a) => a.startsWith("--issue="));
  const updateMode = process.argv.includes("--update");
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

  // Build output in native format (no gallery extension fields)
  const issueAuthor = issue.user?.login || "unknown";
  const theme: any = {
    name: data.name,
    isDark: data.isDark,
    backgroundImage: null,
    version: themeConfig.themeVersion,
  };

  // Copy all 21 color tokens as-is (native int32 values)
  for (const token of THEME_COLORS) {
    theme[token] = data[token];
  }

  // If submitter included backgroundImage or version, use their values
  if (data.backgroundImage !== undefined) theme.backgroundImage = data.backgroundImage;
  if (data.version !== undefined) theme.version = data.version;

  const slug = slugify(theme.name);
  const themesDir = join(process.cwd(), "src", "content", "themes");
  const filePath = join(themesDir, `${slug}.json`);
  const metaPath = join(process.cwd(), "src", "data", "theme-meta.json");
  const meta: Record<string, { author: string; builtin: boolean; issue?: number }> = existsSync(metaPath)
    ? JSON.parse(readFileSync(metaPath, "utf-8"))
    : {};

  // In update mode, find and clean up the old theme if slug changed
  if (updateMode) {
    const oldSlug = findSlugByIssue(meta, issueNumber);
    if (oldSlug && oldSlug !== slug) {
      const oldFile = join(themesDir, `${oldSlug}.json`);
      if (existsSync(oldFile)) {
        unlinkSync(oldFile);
        console.log(`🗑️  Removed old theme file: ${oldSlug}.json (slug changed to ${slug})`);
      }
      delete meta[oldSlug];
    }
  }

  if (existsSync(filePath) && !updateMode) {
    console.error(`Theme file already exists: ${slug}.json`);
    process.exit(1);
  }

  // Write theme JSON (pure native format)
  writeFileSync(filePath, JSON.stringify(theme, null, 2) + "\n");

  // Update theme-meta.json with author info and issue number
  meta[slug] = { author: issueAuthor, builtin: false, issue: issueNumber };
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");

  console.log(`✅ Theme ${updateMode ? "updated" : "written"}: src/content/themes/${slug}.json`);
  console.log(`   Name: ${theme.name}`);
  console.log(`   Author: ${issueAuthor} (saved to theme-meta.json)`);
  console.log(`   Issue: #${issueNumber}`);
  console.log(`   Format: native fcitx5-android-fx（靓企鹅版）(signed int32 colors, flat structure)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
