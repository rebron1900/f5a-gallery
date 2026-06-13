#!/usr/bin/env node
/**
 * merge-theme.ts
 * Extracts theme JSON from a GitHub Issue body and writes it to src/content/themes/
 * Usage: node merge-theme.ts --issue=<number>
 *
 * Expects GITHUB_TOKEN env var and issue body accessible via GitHub API.
 * In CI, the issue body is passed via stdin or env.
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

function extractJsonFromIssueBody(body: string): string | null {
  // Match JSON inside ```json ... ``` code block
  const codeBlockMatch = body.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // Fallback: try to find raw JSON object
  const jsonMatch = body.match(/\{[\s\S]*"colors"[\s\S]*\}/);
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
  if (!data.name || typeof data.name !== "string") errors.push("Missing or invalid 'name'");
  if (!data.author || typeof data.author !== "string") errors.push("Missing or invalid 'author'");
  if (typeof data.isDark !== "boolean") errors.push("Missing or invalid 'isDark'");
  if (!data.colors || typeof data.colors !== "object") {
    errors.push("Missing 'colors' object");
  } else {
    for (const token of THEME_COLORS) {
      if (!data.colors[token]) errors.push(`Missing color token: ${token}`);
    }
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

  // Add builtin flag
  data.builtin = false;

  const slug = slugify(data.name);
  const themesDir = join(process.cwd(), "src", "content", "themes");
  const filePath = join(themesDir, `${slug}.json`);

  if (existsSync(filePath)) {
    console.error(`Theme file already exists: ${slug}.json`);
    process.exit(1);
  }

  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  console.log(`✅ Theme written: src/content/themes/${slug}.json`);
  console.log(`   Name: ${data.name}`);
  console.log(`   Author: ${data.author}`);
  console.log(`   Slug: ${slug}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
