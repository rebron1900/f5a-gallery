/**
 * Keyboard renderer extracted from fxliang/f5a-see-me
 * Pure display only — no editing, no state management.
 * Colors use signed int32 ARGB values (converted to CSS hex at render time).
 *
 * !!! SYNC: Keep in sync with public/scripts/keyboard-render.js !!!
 * The browser-side JS version is a hand-ported ES5 IIFE that mirrors this module.
 * When adding/removing features or changing function signatures here, update the
 * corresponding function in public/scripts/keyboard-render.js to match.
 */

export interface ThemeColors {
  backgroundColor: number;
  barColor: number;
  keyboardColor: number;
  keyBackgroundColor: number;
  keyTextColor: number;
  candidateTextColor: number;
  candidateLabelColor: number;
  candidateCommentColor: number;
  altKeyBackgroundColor: number;
  altKeyTextColor: number;
  accentKeyBackgroundColor: number;
  accentKeyTextColor: number;
  keyPressHighlightColor: number;
  keyShadowColor: number;
  popupBackgroundColor: number;
  popupTextColor: number;
  spaceBarColor: number;
  dividerColor: number;
  clipboardEntryColor: number;
  genericActiveBackgroundColor: number;
  genericActiveForegroundColor: number;
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

// --- int32 → CSS hex color ---

export function int32ToCSS(n: number): string {
  const u = n >= 0 ? n : n + 0x100000000;
  const a = (u >> 24) & 0xff;
  const r = (u >> 16) & 0xff;
  const g = (u >> 8) & 0xff;
  const b = u & 0xff;
  if (a < 255) {
    return `rgba(${r},${g},${b},${(a / 255).toFixed(2)})`;
  }
  return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
}

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
    background = int32ToCSS(colors.spaceBarColor);
  } else if (isReturn) {
    background = int32ToCSS(colors.accentKeyBackgroundColor);
  } else if (isLayoutSwitch) {
    background = int32ToCSS(colors.altKeyBackgroundColor);
  } else if (isAccent) {
    background = int32ToCSS(colors.accentKeyBackgroundColor);
  } else if (isAlt) {
    background = int32ToCSS(colors.altKeyBackgroundColor);
  } else {
    background = int32ToCSS(colors.keyBackgroundColor);
  }

  // Text
  let text: string;
  if (isReturn) {
    text = int32ToCSS(colors.accentKeyTextColor);
  } else if (isAccent) {
    text = int32ToCSS(colors.accentKeyTextColor);
  } else if (isAlt || isLayoutSwitch) {
    text = int32ToCSS(colors.altKeyTextColor);
  } else {
    text = int32ToCSS(colors.keyTextColor);
  }

  // Alt text (for key sub labels)
  const altText = int32ToCSS(colors.altKeyTextColor);

  // Border
  const border = int32ToCSS(colors.keyShadowColor);

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

// --- Toolbar icons (SVG paths, 18x18 viewBox) ---

const TOOLBAR_ICONS = {
  back:    '<path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  undo:    '<path d="M3 10h10a5 5 0 0 1 0 10H9" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 6L3 10l4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  redo:    '<path d="M21 10H11a5 5 0 0 0 0 10h4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 6l4 4-4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  paste:   '<rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" stroke-width="2" fill="none"/><path d="M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke="currentColor" stroke-width="2" fill="none"/>',
  grid:    '<rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2" fill="none"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2" fill="none"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2" fill="none"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2" fill="none"/>',
  doc:     '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  more:    '<circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/>',
  collapse:'<path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
};

function renderToolbar(barColor: string, textColor: string): string {
  const icons: Array<{ key: keyof typeof TOOLBAR_ICONS; flex?: number }> = [
    { key: 'back' },
    { key: 'undo' },
    { key: 'redo' },
    { key: 'paste' },
    { key: 'grid' },
    { key: 'doc' },
    { key: 'more' },
    { key: 'collapse' },
  ];
  const buttons = icons.map(({ key }) => {
    return `<div class="toolbar-btn"><svg viewBox="0 0 24 24" width="18" height="18">${TOOLBAR_ICONS[key]}</svg></div>`;
  }).join('');
  return `<div class="keyboard-toolbar" style="color:${textColor}">${buttons}</div>`;
}

// --- Main render function ---

export function renderKeyboard(colors: ThemeColors, layout: Layout, options?: {
  keyHGap?: number;
  keyVGap?: number;
  keyRadius?: number;
  borderEnabled?: boolean;
  isDark?: boolean;
}): string {
  const {
    keyHGap = 6,
    keyVGap = 6,
    keyRadius = 10,
    borderEnabled = false,
    isDark = false,
  } = options || {};

  const rows = layout;
  const rowCount = rows.length;
  const rowHeight = rowCount > 0 ? Math.max(34, Math.round(48 * (100 / rowCount) / 25)) : 42;
  const keyHeight = Math.max(28, rowHeight - keyVGap * 2);

  const html = rows.map((row) => {
    const widths = resolveRowWidths(row);
    const keysHtml = row.map((key, i) => {
      const widthPercent = `${(widths[i] * 100).toFixed(6)}%`;
      const c = resolveColors(key, colors);
      const variant = previewVariantClass(key);
      const borderWidth = borderEnabled ? 1 : 0;
      const borderStyle = borderEnabled ? "solid" : "none";

      const mainText = previewTitle(key);
      const sub = keySubText(key);

      const altHtml = sub
        ? `<span class="keyboard-alt" style="color:${c.altText}">${escapeHtml(sub)}</span>`
        : "";

      return `<div class="keyboard-slot" style="--key-width:${widthPercent}">
        <div class="keyboard-key ${variant}"
             style="background:${c.background};color:${c.text};border-color:${c.border};border-width:${borderWidth}px;border-style:${borderStyle};border-radius:${keyRadius}px">
          <span class="keyboard-main">${escapeHtml(mainText)}</span>${altHtml}
        </div>
      </div>`;
    }).join("");

    return `<div class="keyboard-row" style="--key-height:${keyHeight}px;gap:${keyHGap}px">${keysHtml}</div>`;
  }).join("");

  const toolbar = renderToolbar(int32ToCSS(colors.barColor), int32ToCSS(colors.keyTextColor));
  const borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  return `<div class="keyboard-preview" data-dark="${isDark ? '1' : '0'}" style="background:${int32ToCSS(colors.keyboardColor)};gap:${keyVGap}px;border:1px solid ${borderColor}">${toolbar}${html}</div>`;
}
