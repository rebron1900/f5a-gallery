/**
 * Convert ARGB int32 (Android color format) to CSS hex string.
 * Handles negative int32 by converting to unsigned.
 * Preserves alpha channel when present (non-0xFF alpha).
 */
export function int32ToCSS(n: number): string {
  const u = n >= 0 ? n : n + 0x100000000;
  const r = (u >> 16) & 0xff;
  const g = (u >> 8) & 0xff;
  const b = u & 0xff;
  const a = (u >> 24) & 0xff;
  if (a !== 0xff && a !== 0) {
    return `rgba(${r},${g},${b},${(a / 255).toFixed(2)})`;
  }
  return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
}

/**
 * Lightweight version for client-side use (no template literals for compat).
 */
export function int32ToCSSSimple(n: number): string {
  var u = n >= 0 ? n : n + 0x100000000;
  return '#' + ((u >> 16) & 0xff).toString(16).padStart(2, '0') + ((u >> 8) & 0xff).toString(16).padStart(2, '0') + (u & 0xff).toString(16).padStart(2, '0');
}
