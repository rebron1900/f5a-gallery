#!/usr/bin/env node
/**
 * validate-theme.ts
 * Validates theme JSON files in src/content/themes/
 * Supports both formats:
 *   - Native fcitx5-android: colors as signed 32-bit integers, no colors wrapper
 *   - Gallery format: colors as hex strings inside a colors object
 */

import { readdirSync, readFileSync } from "fs";
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

const themesDir = join(process.cwd(), "src", "content", "themes");
const files = readdirSync(themesDir).filter((f) => f.endsWith(".json"));

let passed = 0;
let failed = 0;

for (const file of files) {
  const data = JSON.parse(readFileSync(join(themesDir, file), "utf-8"));
  const errors: string[] = [];

  if (!data.name || typeof data.name !== "string") errors.push("missing name");
  if (typeof data.isDark !== "boolean") errors.push("missing isDark");

  // Support both formats: colors wrapper or top-level tokens
  const colors = data.colors || data;
  const hasColors = typeof colors === "object";
  if (!hasColors) {
    errors.push("missing color tokens");
  } else {
    for (const token of THEME_COLORS) {
      if (colors[token] === undefined) errors.push(`missing ${token}`);
    }
  }

  if (errors.length > 0) {
    console.error(`❌ ${file}: ${errors.join(", ")}`);
    failed++;
  } else {
    console.log(`✅ ${file}`);
    passed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed out of ${files.length} themes`);
if (failed > 0) process.exit(1);
