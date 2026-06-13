/**
 * Keyboard renderer extracted from fxliang/f5a-see-me
 * Pure display only — no editing, no state management.
 * Colors use hex strings instead of ARGB int32.
 *
 * Icons use Lucide SVG (via CDN) instead of emoji characters.
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

function keyVariantClass(key: KeyDef): string {
  switch (key.type) {
    case "CapsKey":
    case "LayoutSwitchKey":
    case "LayerSwitchKey":
    case "CommaKey":
    case "SymbolKey":
    case "LanguageKey":
    case "BackspaceKey":
      return "alt-key";
    case "SpaceKey":
      return "space-key";
    case "ReturnKey":
      return "accent-key";
    default:
      return "";
  }
}

function previewVariantClass(key: KeyDef): string {
  const cls = keyVariantClass(key);
  if (key.type === "LanguageKey") return cls ? cls + " language-key" : "language-key";
  return cls;
}

/** Lucide icon names for special keys */
function lucideIcon(key: KeyDef): string | null {
  switch (key.type) {
    case "CapsKey": return "arrow-up";
    case "BackspaceKey": return "delete";
    case "ReturnKey": return "corner-down-left";
    case "LanguageKey": return "globe";
    default: return null;
  }
}

function previewTitle(key: KeyDef): string {
  if (!key) return "?";
  if ((key.type === "AlphabetKey" || key.type === "MacroKey") && key.displayText) return key.displayText;
  switch (key.type) {
    case "LayoutSwitchKey":
    case "LayerSwitchKey": return key.label || "?123";
    case "CommaKey": return ",";
    case "SpaceKey": return "space";
    case "SymbolKey": return key.label || ".";
    case "AlphabetKey": return key.main || "?";
    case "MacroKey": return key.label || "M";
    default: return "";
  }
}

function keySubText(key: KeyDef): string {
  if (!key) return "";
  if (key.type === "AlphabetKey") return key.alt || "";
  return "";
}

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
    const dw = defaultKeyWeight(key);
    const raw = hasWeight ? Number(key.weight) : dw;
    const w = Number.isFinite(raw) ? raw : dw;
    return { width: Math.max(0, w), auto: hasWeight ? w <= 0 : dw <= 0 };
  });
  const fixedSum = entries.reduce((s, e) => s + (e.auto ? 0 : e.width), 0);
  const flexCount = entries.filter((e) => e.auto).length;
  const remaining = Math.max(0, 1 - fixedSum);
  const flexW = flexCount > 0 ? remaining / flexCount : 0;
  return entries.map((e) => (e.auto ? flexW : e.width));
}

interface PreviewColors {
  background: string;
  text: string;
  altText: string;
  border: string;
}

function resolveColors(key: KeyDef, colors: ThemeColors): PreviewColors {
  const variant = keyVariantClass(key);
  const isAlt = variant === "alt-key";
  const isAccent = variant === "accent-key";
  const isSpace = variant === "space-key";
  const isReturn = key.type === "ReturnKey";
  const isLayoutSwitch = key.type === "LayoutSwitchKey" || key.type === "LayerSwitchKey";

  const bg = isSpace ? colors.spaceBarColor
    : (isReturn || isAccent) ? colors.accentKeyBackgroundColor
    : (isAlt || isLayoutSwitch) ? colors.altKeyBackgroundColor
    : colors.keyBackgroundColor;

  const tx = isReturn || isAccent ? colors.accentKeyTextColor
    : isAlt || isLayoutSwitch ? colors.altKeyTextColor
    : colors.keyTextColor;

  return { background: bg, text: tx, altText: colors.altKeyTextColor, border: colors.keyShadowColor };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Render keyboard HTML — matches f5a-see-me's CSS approach:
 * - flex: 0 0 <percentage> on slots (fixed width, no shrink/grow)
 * - padding on slots for horizontal gaps (NOT gap on row)
 * - .keyboard-keys wrapper per row
 * - CSS variables for hgap/vgap/radius (set by caller or CSS)
 * - Lucide icons for special keys (data-lucide attribute)
 */
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

  const html = layout.map((row) => {
    const widths = resolveRowWidths(row);
    const keysHtml = row.map((key, i) => {
      const widthPercent = `${(widths[i] * 100).toFixed(6)}%`;
      const c = resolveColors(key, colors);
      const variant = previewVariantClass(key);
      const bw = borderEnabled ? 1 : 0;
      const bs = borderEnabled ? "solid" : "none";
      const title = previewTitle(key);
      const icon = lucideIcon(key);
      const sub = keySubText(key);

      const mainHtml = icon
        ? `<i data-lucide="${icon}" class="keyboard-icon"></i>`
        : `<span class="keyboard-main">${escapeHtml(title)}</span>`;

      const altHtml = sub
        ? `<span class="keyboard-alt" style="color:${c.altText}">${escapeHtml(sub)}</span>`
        : "";

      return `<div class="keyboard-slot" style="--key-width:${widthPercent};--hgap:${keyHGap}px"><div class="keyboard-key ${variant}" style="background:${c.background};color:${c.text};border-color:${c.border};border-width:${bw}px;border-style:${bs};border-radius:${keyRadius}px">${mainHtml}${altHtml}</div></div>`;
    }).join("");

    return `<div class="keyboard-row"><div class="keyboard-keys">${keysHtml}</div></div>`;
  }).join("");

  return `<div class="keyboard-preview" style="background:${colors.keyboardColor}">${html}</div>`;
}
