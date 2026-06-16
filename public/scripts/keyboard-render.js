/**
 * Keyboard renderer — browser-side version.
 * Extracted from fxliang/f5a-see-me, plain JS (no TS/build needed).
 * Colors use signed int32 ARGB values (converted to CSS hex at render time).
 */
(function (root) {
  "use strict";

  function int32ToCSS(n) {
    var u = n >= 0 ? n : n + 0x100000000;
    return '#' + ((u >> 16) & 0xff).toString(16).padStart(2, '0')
               + ((u >> 8) & 0xff).toString(16).padStart(2, '0')
               + (u & 0xff).toString(16).padStart(2, '0');
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

    return '<div class="keyboard-preview" data-dark="' + (isDark ? '1' : '0') + '" style="background:' + int32ToCSS(colors.keyboardColor) + ';gap:' + vGap + 'px">' + html + '</div>';
  }

  root.int32ToCSS = int32ToCSS;
  root.renderKeyboard = renderKeyboard;
})(window);
