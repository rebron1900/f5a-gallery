/**
 * Keyboard renderer — browser-side version.
 * Matches f5a-see-me HTML structure exactly:
 *   .layout-row > .keys > .layout-key-slot > .layout-key
 * Uses Lucide icons for special keys.
 */
(function (root) {
  "use strict";

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function keyVariantClass(key) {
    switch (key.type) {
      case "CapsKey": case "LayoutSwitchKey": case "LayerSwitchKey":
      case "CommaKey": case "SymbolKey": case "LanguageKey": case "BackspaceKey":
        return "alt-key";
      case "SpaceKey": return "space-key";
      case "ReturnKey": return "accent-key";
      default: return "";
    }
  }

  function previewVariantClass(key) {
    var cls = keyVariantClass(key);
    if (key.type === "LanguageKey") cls = cls ? cls + " language-key" : "language-key";
    return cls;
  }

  function lucideIcon(key) {
    switch (key.type) {
      case "CapsKey": return "arrow-up";
      case "BackspaceKey": return "delete";
      case "ReturnKey": return "corner-down-left";
      case "LanguageKey": return "globe";
      default: return null;
    }
  }

  function previewTitle(key) {
    if (!key) return "?";
    if ((key.type === "AlphabetKey" || key.type === "MacroKey") && key.displayText) return key.displayText;
    switch (key.type) {
      case "LayoutSwitchKey": case "LayerSwitchKey": return key.label || "?123";
      case "CommaKey": return ",";
      case "SpaceKey": return "space";
      case "SymbolKey": return key.label || ".";
      case "AlphabetKey": return key.main || "?";
      case "MacroKey": return key.label || "M";
      default: return "";
    }
  }

  function keySubText(key) {
    if (!key) return "";
    if (key.type === "AlphabetKey") return key.alt || "";
    return "";
  }

  function defaultKeyWeight(key) {
    switch (key.type) {
      case "CapsKey": case "LayoutSwitchKey": case "LayerSwitchKey":
      case "ReturnKey": case "BackspaceKey": return 0.15;
      case "CommaKey": case "LanguageKey": return 0.1;
      case "SpaceKey": return 0;
      default: return 0.1;
    }
  }

  function resolveRowWidths(row) {
    if (!row.length) return [];
    var entries = row.map(function (key) {
      var hasWeight = key && "weight" in key;
      var dw = defaultKeyWeight(key);
      var raw = hasWeight ? Number(key.weight) : dw;
      var w = Number.isFinite(raw) ? raw : dw;
      return { width: Math.max(0, w), auto: hasWeight ? w <= 0 : dw <= 0 };
    });
    var fixedSum = 0, flexCount = 0;
    entries.forEach(function (e) { if (!e.auto) fixedSum += e.width; else flexCount++; });
    var remaining = Math.max(0, 1 - fixedSum);
    var flexW = flexCount > 0 ? remaining / flexCount : 0;
    return entries.map(function (e) { return e.auto ? flexW : e.width; });
  }

  function resolveColors(key, colors) {
    var variant = keyVariantClass(key);
    var isAlt = variant === "alt-key";
    var isAccent = variant === "accent-key";
    var isSpace = variant === "space-key";
    var isReturn = key.type === "ReturnKey";
    var isLayoutSwitch = key.type === "LayoutSwitchKey" || key.type === "LayerSwitchKey";

    var bg = isSpace ? colors.spaceBarColor
      : (isReturn || isAccent) ? colors.accentKeyBackgroundColor
      : (isAlt || isLayoutSwitch) ? colors.altKeyBackgroundColor
      : colors.keyBackgroundColor;

    var tx = isReturn || isAccent ? colors.accentKeyTextColor
      : isAlt || isLayoutSwitch ? colors.altKeyTextColor
      : colors.keyTextColor;

    return { background: bg, text: tx, altText: colors.altKeyTextColor, border: colors.keyShadowColor };
  }

  function renderKeyboard(colors, layout, opts) {
    opts = opts || {};
    var hGap = opts.keyHGap != null ? opts.keyHGap : 3;
    var vGap = opts.keyVGap != null ? opts.keyVGap : 3;
    var radius = opts.keyRadius != null ? opts.keyRadius : 4;
    var border = opts.borderEnabled !== false;

    var rowHeight = 42;
    var keyHeight = rowHeight - vGap * 2;

    var html = layout.map(function (row) {
      var widths = resolveRowWidths(row);
      var keysHtml = row.map(function (key, i) {
        var wp = (widths[i] * 100).toFixed(6) + "%";
        var c = resolveColors(key, colors);
        var vc = previewVariantClass(key);
        var bw = border ? 1 : 0;
        var bs = border ? "solid" : "none";
        var title = previewTitle(key);
        var icon = lucideIcon(key);
        var sub = keySubText(key);

        var mainHtml = icon
          ? '<i data-lucide="' + icon + '" class="layout-key-icon"></i>'
          : '<span class="layout-key-main">' + escapeHtml(title) + '</span>';

        var altHtml = sub
          ? '<span class="layout-key-alt" style="color:' + escapeAttr(c.altText) + '">' + escapeHtml(sub) + '</span>'
          : "";

        return '<div class="layout-key-slot" style="--key-width:' + wp + '"><div class="layout-key ' + vc + '" style="background:' + escapeAttr(c.background) + ';color:' + escapeAttr(c.text) + ';border-color:' + escapeAttr(c.border) + ';border-width:' + bw + 'px;border-style:' + bs + ';border-radius:' + radius + 'px">' + mainHtml + altHtml + '</div></div>';
      }).join("");

      return '<div class="layout-row" style="--row-height:' + rowHeight + 'px;--key-height:' + keyHeight + 'px"><div class="keys">' + keysHtml + '</div></div>';
    }).join("");

    return '<div class="keyboard-preview" style="background:' + escapeAttr(colors.keyboardColor) + ';--preview-key-hgap:' + hGap + 'px;--preview-key-vgap:' + vGap + 'px;--preview-key-radius:' + radius + 'px">' + html + '</div>';
  }

  root.renderKeyboard = renderKeyboard;
})(window);
