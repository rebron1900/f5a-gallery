/**
 * Keyboard renderer — faithful port from fxliang/f5a-see-me
 * renderLayoutPreview() in js/app.js
 *
 * HTML: .layout-row > .keys > .layout-key-slot > .layout-key
 * CSS variables set on .keyboard-preview: --preview-key-hgap, --preview-key-vgap, --preview-key-radius, --preview-row-gap
 * CSS variables set on .layout-row: --row-height, --key-height
 * CSS variables set on .layout-key-slot: --key-width
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

/* --- helpers --- */

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

/** Lucide icon name for special keys */
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

function resolveColors(key: KeyDef, colors: ThemeColors) {
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

  return { bg, tx, altTx: colors.altKeyTextColor, border: colors.keyShadowColor };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Render keyboard HTML — matches f5a-see-me's renderLayoutPreview() exactly.
 *
 * Defaults match f5a-see-me's defaults:
 *   keyHGap=0, keyVGap=0, keyRadius=4, rowGap=8
 * These are set as CSS custom properties on .keyboard-preview.
 */
export function renderKeyboard(
  colors: ThemeColors,
  layout: Layout,
  options?: { keyHGap?: number; keyVGap?: number; keyRadius?: number; borderEnabled?: boolean }
): string {
  const hGap = options?.keyHGap ?? 0;
  const vGap = options?.keyVGap ?? 0;
  const radius = options?.keyRadius ?? 4;
  const border = options?.borderEnabled !== false;

  const rowHeight = 42;
  const keyHeight = rowHeight - vGap * 2;
  const rowGap = 8;

  const html = layout.map((row) => {
    const widths = resolveRowWidths(row);
    const keysHtml = row.map((key, i) => {
      const wp = `${(widths[i] * 100).toFixed(6)}%`;
      const c = resolveColors(key, colors);
      const vc = previewVariantClass(key);
      const bw = border ? 1 : 0;
      const bs = border ? "solid" : "none";
      const icon = lucideIcon(key);
      const title = previewTitle(key);
      const sub = keySubText(key);

      const mainHtml = icon
        ? `<i data-lucide="${icon}" class="layout-key-icon"></i>`
        : `<span class="layout-key-main">${esc(title)}</span>`;

      const altHtml = sub
        ? `<span class="layout-key-alt" style="color:${esc(c.altTx)}">${esc(sub)}</span>`
        : "";

      return `<div class="layout-key-slot" style="--key-width:${wp}">` +
        `<div class="layout-key ${vc}" style="background:${esc(c.bg)};color:${esc(c.tx)};border-color:${esc(c.border)};border-width:${bw}px;border-style:${bs};border-radius:${radius}px">` +
        `${mainHtml}${altHtml}</div></div>`;
    }).join("");

    return `<div class="layout-row" style="--row-height:${rowHeight}px;--key-height:${keyHeight}px"><div class="keys">${keysHtml}</div></div>`;
  }).join("");

  return `<div class="keyboard-preview" style="background:${esc(colors.keyboardColor)};--preview-key-hgap:${hGap}px;--preview-key-vgap:${vGap}px;--preview-key-radius:${radius}px;--preview-row-gap:${rowGap}px">${html}</div>`;
}
