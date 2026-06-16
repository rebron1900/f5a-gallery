/**
 * Keyboard renderer — browser-side version.
 * Extracted from fxliang/f5a-see-me, plain JS (no TS/build needed).
 * Colors use signed int32 ARGB values (converted to CSS hex at render time).
 */
(function (root) {
  "use strict";

  function int32ToCSS(n) {
    var u = n >= 0 ? n : n + 0x100000000;
    var a = (u >> 24) & 0xff;
    var r = (u >> 16) & 0xff;
    var g = (u >> 8) & 0xff;
    var b = u & 0xff;
    if (a < 255) {
      return 'rgba(' + r + ',' + g + ',' + b + ',' + (a / 255).toFixed(2) + ')';
    }
    return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

  function previewTitle(key) {
    if (!key) return "?";
    if ((key.type === "AlphabetKey" || key.type === "MacroKey") && key.displayText) return key.displayText;
    switch (key.type) {
      case "CapsKey": return "⇧";
      case "LayoutSwitchKey": case "LayerSwitchKey": return key.label || "?123";
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
    var fixedSum = 0;
    var flexCount = 0;
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

    var bg;
    if (isSpace) {
      bg = int32ToCSS(colors.spaceBarColor);
    } else if (isReturn) {
      bg = int32ToCSS(colors.accentKeyBackgroundColor);
    } else if (isLayoutSwitch) {
      bg = int32ToCSS(colors.altKeyBackgroundColor);
    } else if (isAccent) {
      bg = int32ToCSS(colors.accentKeyBackgroundColor);
    } else if (isAlt) {
      bg = int32ToCSS(colors.altKeyBackgroundColor);
    } else {
      bg = int32ToCSS(colors.keyBackgroundColor);
    }

    var tx;
    if (isReturn) {
      tx = int32ToCSS(colors.accentKeyTextColor);
    } else if (isAccent) {
      tx = int32ToCSS(colors.accentKeyTextColor);
    } else if (isAlt || isLayoutSwitch) {
      tx = int32ToCSS(colors.altKeyTextColor);
    } else {
      tx = int32ToCSS(colors.keyTextColor);
    }

    return { background: bg, text: tx, altText: int32ToCSS(colors.altKeyTextColor), border: int32ToCSS(colors.keyShadowColor) };
  }

  function renderKeyboard(colors, layout, opts) {
    opts = opts || {};
    var hGap = opts.keyHGap != null ? opts.keyHGap : 6;
    var vGap = opts.keyVGap != null ? opts.keyVGap : 6;
    var radius = opts.keyRadius != null ? opts.keyRadius : 10;
    var border = opts.borderEnabled === true;
    var isDark = opts.isDark === true;

    var rows = layout;
    var rowCount = rows.length;
    var rowH = rowCount > 0 ? Math.max(34, Math.round(48 * (100 / rowCount) / 25)) : 42;
    var keyH = Math.max(1, rowH - vGap * 2);

    var html = rows.map(function (row) {
      var widths = resolveRowWidths(row);
      var keysHtml = row.map(function (key, i) {
        var wp = (widths[i] * 100).toFixed(6) + "%";
        var c = resolveColors(key, colors);
        var vc = previewVariantClass(key);
        var bw = border ? 1 : 0;
        var bs = border ? "solid" : "none";
        var main = previewTitle(key);
        var sub = keySubText(key);
        var altHtml = sub ? '<span class="keyboard-alt" style="color:' + c.altText + '">' + escapeHtml(sub) + '</span>' : "";

        return '<div class="keyboard-slot" style="--key-width:' + wp + '">'
          + '<div class="keyboard-key ' + vc + '"'
          + ' style="background:' + c.background + ';color:' + c.text + ';border-color:' + c.border
          + ';border-width:' + bw + 'px;border-style:' + bs + ';border-radius:' + radius + 'px">'
          + '<span class="keyboard-main">' + escapeHtml(main) + '</span>' + altHtml
          + '</div></div>';
      }).join("");

      return '<div class="keyboard-row" style="--key-height:' + keyH + 'px;gap:' + hGap + 'px">' + keysHtml + '</div>';
    }).join("");

    // Toolbar
    var TOOLBAR_ICONS = {
      back:    '<path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      undo:    '<path d="M3 10h10a5 5 0 0 1 0 10H9" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 6L3 10l4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      redo:    '<path d="M21 10H11a5 5 0 0 0 0 10h4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 6l4 4-4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      paste:   '<rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" stroke-width="2" fill="none"/><path d="M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke="currentColor" stroke-width="2" fill="none"/>',
      grid:    '<rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2" fill="none"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2" fill="none"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2" fill="none"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2" fill="none"/>',
      doc:     '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
      more:    '<circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/>',
      collapse:'<path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    };
    var toolbarOrder = ['back','undo','redo','paste','grid','doc','more','collapse'];
    var toolbarHtml = '<div class="keyboard-toolbar" style="color:' + int32ToCSS(colors.keyTextColor) + '">';
    toolbarOrder.forEach(function(key) {
      toolbarHtml += '<div class="toolbar-btn"><svg viewBox="0 0 24 24" width="18" height="18">' + TOOLBAR_ICONS[key] + '</svg></div>';
    });
    toolbarHtml += '</div>';

    return '<div class="keyboard-preview" data-dark="' + (isDark ? '1' : '0') + '" style="background:' + int32ToCSS(colors.keyboardColor) + ';gap:' + vGap + 'px">' + toolbarHtml + html + '</div>';
  }

  root.int32ToCSS = int32ToCSS;
  root.renderKeyboard = renderKeyboard;
})(window);
