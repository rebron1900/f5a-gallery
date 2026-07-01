#!/usr/bin/env node
/**
 * validate-theme.ts
 * Validates theme JSON files in src/content/themes/
 *
 * Expected format: native fcitx5-android-fx（靓企鹅版）format
 *   - Flat structure (no colors wrapper)
 *   - Colors as signed 32-bit integers
 *   - 21 color token fields at top level
 */

import { readdirSync, readFileSync } from "fs";
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

const themesDir = join(process.cwd(), "src", "content", "themes");
const files = readdirSync(themesDir).filter((f) => f.endsWith(".json"));

let passed = 0;
let failed = 0;

for (const file of files) {
  const data = JSON.parse(readFileSync(join(themesDir, file), "utf-8"));
  const errors: string[] = [];

  if (!data.name || typeof data.name !== "string") errors.push("missing or invalid 'name'");
  if (typeof data.isDark !== "boolean") errors.push("missing or invalid 'isDark'");
  if (data.backgroundImage !== null && data.backgroundImage !== undefined && typeof data.backgroundImage !== "object") {
    errors.push("'backgroundImage' must be null or an object");
  }
  if (data.version !== undefined && data.version !== themeConfig.themeVersion) {
    errors.push(`'version' should be "${themeConfig.themeVersion}", got "${data.version}"`);
  }

  // Validate all 21 color tokens exist as numbers (int32) at top level
  for (const token of THEME_COLORS) {
    const value = data[token];
    if (value === undefined) {
      errors.push(`missing ${token}`);
    } else if (typeof value !== "number" || !Number.isInteger(value)) {
      errors.push(`${token} must be a signed int32 number, got ${typeof value}`);
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
