/**
 * Keyboard renderer extracted from fxliang/f5a-see-me
 * Pure display only — no editing, no state management.
 * Colors use hex strings instead of ARGB int32.
 */

export interface ThemeColors {
  backgroundColor: string;
  barColor: string;
  keyboardColor: string;
  keyBackgroundColor: string;
  keyTextColor: string;
  candidateTextColor: string;
  candidateLabelColor: string;
  candidateCommentColor: string;
  altKeyBackgroundColor: string;
  altKeyTextColor: string;
  accentKeyBackgroundColor: string;
  accentKeyTextColor: string;
  keyPressHighlightColor: string;
  keyShadowColor: string;
  popupBackgroundColor: string;
  popupTextColor: string;
  spaceBarColor: string;
  dividerColor: string;
  clipboardEntryColor: string;
  genericActiveBackgroundColor: string;
  genericActiveForegroundColor: string;
}

export interface KeyDef {
  type: string;
  main?: string;
  alt?: string;
  label?: string;
  weight?: number;
  displayText?: string;
}

export type Layout = KeyDef[][];

// --- Key type → CSS class mapping (from f5a-see-me keyVariantClass) ---

function keyVariantClass(key: KeyDef): string {
  const classes: string[] = [];
  switch (key.type) {
    case "CapsKey":
    case "LayoutSwitchKey":
    case "LayerSwitchKey":
    case "CommaKey":
    case "SymbolKey":
    case "LanguageKey":
    case "BackspaceKey":
      classes.push("alt-key");
      break;
    case "SpaceKey":
      classes.push("space-key");
      break;
    case "ReturnKey":
      classes.push("accent-key");
      break;
  }
  return classes.join(" ");
}

function previewVariantClass(key: KeyDef): string {
  const classes = keyVariantClass(key)
    .split(/\s+/)
    .filter((cls) => cls && cls !== "macro-key" && cls !== "compose-key");
  if (key.type === "LanguageKey") classes.push("language-key");
  return classes.join(" ");
}

// --- Key display text (from f5a-see-me previewTitleFromObj) ---

function previewTitle(key: KeyDef): string {
  if (!key) return "?";
  if (key.type === "AlphabetKey" || key.type === "MacroKey") {
    if (typeof key.displayText === "string" && key.displayText) return key.displayText;
  }
  switch (key.type) {
    case "CapsKey": return "⇧";
    case "LayoutSwitchKey":
    case "LayerSwitchKey": return key.label || "?123";
    case "CommaKey": return ",";
    case "LanguageKey": return "🌐";
    case "SpaceKey": return "space";
    case "SymbolKey": return key.label || ".";
    case "ReturnKey": return "↵";
    case "BackspaceKey": return "⌫";
    case "AlphabetKey": return key.main || "?";
    case "MacroKey": return key.label || "M";
    default: return key.type;
  }
}

// --- Key sub text (from f5a-see-me keySubText) ---

function keySubText(key: KeyDef): string {
  if (!key) return "";
  if (key.type === "AlphabetKey") return key.alt || "";
  return "";
}

// --- Key width calculation (from f5a-see-me resolveRegularRowWidths) ---

function defaultKeyWeight(key: KeyDef): number {
  switch (key.type) {
    case "CapsKey":
    case "LayoutSwitchKey":
    case "LayerSwitchKey":
    case "ReturnKey":
    case "BackspaceKey":
      return 0.15;
    case "CommaKey":
    case "LanguageKey":
      return 0.1;
    case "SpaceKey":
      return 0;
    default:
      return 0.1;
  }
}

function resolveRowWidths(row: KeyDef[]): number[] {
  if (!row.length) return [];
  const entries = row.map((key) => {
    const hasWeight = key && "weight" in key;
    const defaultWidth = defaultKeyWeight(key);
    const raw = hasWeight ? Number(key.weight) : defaultWidth;
    const width = Number.isFinite(raw) ? raw : defaultWidth;
    return {
      width: Math.max(0, width),
      auto: hasWeight ? width <= 0 : defaultWidth <= 0,
    };
  });
  const fixedSum = entries.reduce((sum, item) => sum + (item.auto ? 0 : item.width), 0);
  const flexCount = entries.filter((item) => item.auto).length;
  const remaining = Math.max(0, 1 - fixedSum);
  const flexWidth = flexCount > 0 ? remaining / flexCount : 0;
  return entries.map((item) => (item.auto ? flexWidth : item.width));
}

// --- Color resolution (simplified from f5a-see-me) ---

interface PreviewColors {
  background: string;
  text: string;
  altText: string;
  border: string;
}

function resolveColors(key: KeyDef, colors: ThemeColors): PreviewColors {
  const variant = keyVariantClass(key);
  const isAlt = variant.includes("alt-key");
  const isAccent = variant.includes("accent-key");
  const isSpace = variant.includes("space-key");
  const isReturn = key.type === "ReturnKey";
  const isLayoutSwitch = key.type === "LayoutSwitchKey" || key.type === "LayerSwitchKey";

  // Background
  let background: string;
  if (isSpace) {
    background = colors.spaceBarColor;
  } else if (isReturn) {
    background = colors.accentKeyBackgroundColor;
  } else if (isLayoutSwitch) {
    background = colors.altKeyBackgroundColor;
  } else if (isAccent) {
    background = colors.accentKeyBackgroundColor;
  } else if (isAlt) {
    background = colors.altKeyBackgroundColor;
  } else {
    background = colors.keyBackgroundColor;
  }

  // Text
  let text: string;
  if (isReturn) {
    text = colors.accentKeyTextColor;
  } else if (isAccent) {
    text = colors.accentKeyTextColor;
  } else if (isAlt || isLayoutSwitch) {
    text = colors.altKeyTextColor;
  } else {
    text = colors.keyTextColor;
  }

  // Alt text (for key sub labels)
  const altText = colors.altKeyTextColor;

  // Border
  const border = colors.keyShadowColor;

  return { background, text, altText, border };
}

// --- HTML escape ---

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Main render function ---

export function renderKeyboard(colors: ThemeColors, layout: Layout, options?: {
  keyHGap?: number;
  keyVGap?: number;
  keyRadius?: number;
  borderEnabled?: boolean;
}): string {
  const {
    keyHGap = 3,
    keyVGap = 3,
    keyRadius = 4,
    borderEnabled = true,
  } = options || {};

  const rows = layout;
  const rowCount = rows.length;
  const rowHeight = rowCount > 0 ? Math.max(34, Math.round(48 * (100 / rowCount) / 25)) : 42;
  const keyHeight = Math.max(1, rowHeight - keyVGap * 2);

  const html = rows.map((row) => {
    const widths = resolveRowWidths(row);
    const keysHtml = row.map((key, i) => {
      const flexGrow = widths[i];
      const c = resolveColors(key, colors);
      const variant = previewVariantClass(key);
      const borderWidth = borderEnabled ? 1 : 0;
      const borderStyle = borderEnabled ? "solid" : "none";

      const mainText = previewTitle(key);
      const sub = keySubText(key);

      const altHtml = sub
        ? `<span class="keyboard-alt" style="color:${c.altText}">${escapeHtml(sub)}</span>`
        : "";

      return `<div class="keyboard-slot" style="--kw:${flexGrow}">
        <div class="keyboard-key ${variant}"
             style="background:${c.background};color:${c.text};border-color:${c.border};border-width:${borderWidth}px;border-style:${borderStyle};border-radius:${keyRadius}px">
          <span class="keyboard-main">${escapeHtml(mainText)}</span>${altHtml}
        </div>
      </div>`;
    }).join("");

    return `<div class="keyboard-row" style="gap:${keyHGap}px">${keysHtml}</div>`;
  }).join("");

  return `<div class="keyboard-preview" style="background:${colors.keyboardColor};gap:${keyVGap}px">${html}</div>`;
}
