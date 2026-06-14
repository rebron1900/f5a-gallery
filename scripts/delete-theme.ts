#!/usr/bin/env node
/**
 * delete-theme.ts
 * Removes a theme by issue number — deletes theme JSON file and meta entry.
 *
 * Usage: npx tsx scripts/delete-theme.ts --issue=<number>
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";

function main() {
  const issueArg = process.argv.find((a) => a.startsWith("--issue="));
  if (!issueArg) {
    console.error("Usage: npx tsx scripts/delete-theme.ts --issue=<number>");
    process.exit(1);
  }

  const issueNumber = parseInt(issueArg.split("=")[1], 10);
  const metaPath = join(process.cwd(), "src", "data", "theme-meta.json");

  if (!existsSync(metaPath)) {
    console.error("theme-meta.json not found");
    process.exit(1);
  }

  const meta: Record<string, { author: string; builtin: boolean; issue?: number }> =
    JSON.parse(readFileSync(metaPath, "utf-8"));

  // Find slug by issue number
  const slug = Object.entries(meta).find(
    ([, entry]) => (entry as any).issue === issueNumber
  )?.[0];

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
