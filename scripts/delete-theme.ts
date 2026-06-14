#!/usr/bin/env node
/**
 * delete-theme.ts
 * Removes a theme by issue number — deletes theme JSON file and meta entry.
 *
 * Primary: match by issue number in theme-meta.json
 * Fallback: match by theme name from --name flag (slugified)
 *
 * Usage: npx tsx scripts/delete-theme.ts --issue=<number> [--name=<theme-name>]
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "");
}

function main() {
  const issueArg = process.argv.find((a) => a.startsWith("--issue="));
  const nameArg = process.argv.find((a) => a.startsWith("--name="));
  if (!issueArg) {
    console.error("Usage: npx tsx scripts/delete-theme.ts --issue=<number> [--name=<theme-name>]");
    process.exit(1);
  }

  const issueNumber = parseInt(issueArg.split("=")[1], 10);
  const fallbackName = nameArg ? nameArg.split("=").slice(1).join("=") : null;
  const metaPath = join(process.cwd(), "src", "data", "theme-meta.json");

  if (!existsSync(metaPath)) {
    console.error("theme-meta.json not found");
    process.exit(1);
  }

  const meta: Record<string, { author: string; builtin: boolean; issue?: number }> =
    JSON.parse(readFileSync(metaPath, "utf-8"));

  // Primary: find by issue number
  let slug = Object.entries(meta).find(
    ([, entry]) => (entry as any).issue === issueNumber
  )?.[0];

  // Fallback: find by theme name (slugified)
  if (!slug && fallbackName) {
    const expectedSlug = slugify(fallbackName);
    if (meta[expectedSlug]) {
      slug = expectedSlug;
      console.log(`Found by name fallback: ${slug}`);
    }
  }

  if (!slug) {
    console.error(`No theme found for issue #${issueNumber}`);
    process.exit(1);
  }

  const entry = meta[slug];

  // Don't delete builtin themes
  if (entry.builtin) {
    console.error(`Cannot delete builtin theme: ${slug}`);
    process.exit(1);
  }

  // Delete theme file
  const themesDir = join(process.cwd(), "src", "content", "themes");
  const filePath = join(themesDir, `${slug}.json`);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
    console.log(`🗑️  Deleted: src/content/themes/${slug}.json`);
  } else {
    console.log(`⚠️  Theme file not found: ${slug}.json (meta entry will still be cleaned)`);
  }

  // Remove from meta
  delete meta[slug];
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
  console.log(`🗑️  Removed meta entry: ${slug}`);

  // Output slug for workflow commit message
  console.log(`SLUG=${slug}`);
}

main();
