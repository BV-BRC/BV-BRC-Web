/**
 * Size and position of the floating Copilot window.
 *
 * The window's geometry is kept as fractions of the viewport ({x, y, w, h},
 * each 0..1).  Only a drag or a resize by the user changes the fractions; a
 * browser resize re-derives pixels from them, so snapping the browser to half
 * the screen and back restores the window instead of leaving it half size.
 *
 * clampRect keeps the result usable on any viewport: never larger than the
 * viewport and fully inside it, so the title bar can always be dragged.
 *
 * Pure functions, no DOM: tested under Jest (tests/FloatingWindowGeometry.test.js).
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CopilotFloatingWindowGeometry = factory();
  }
}(this, function () {
  var DEFAULT = {
    x: 0.1, y: 0.1, w: 0.8, h: 0.7
  }; // the old CSS: 10vw / 10vh, 80% × 70%
  var MIN_W = 300;
  var MIN_H = 200;
  var NARROW_BELOW = 700; // window width under which the sidebar collapses
  var STORAGE_KEY = 'copilot-floating-geometry';

  function isNum(v) {
    return typeof v === 'number' && isFinite(v);
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  // A saved value is used only if it is four finite fractions that describe a
  // window of some size; anything else (old format, hand edits) is DEFAULT.
  function validFractions(f) {
    if (!f || typeof f !== 'object') return null;
    if (!isNum(f.x) || !isNum(f.y) || !isNum(f.w) || !isNum(f.h)) return null;
    if (f.w <= 0 || f.h <= 0 || f.w > 1.5 || f.h > 1.5) return null;
    if (f.x < -1 || f.x > 1 || f.y < -1 || f.y > 1) return null;
    return {
      x: f.x, y: f.y, w: f.w, h: f.h
    };
  }

  function toFractions(rect, viewport) {
    var vw = viewport.width || 1;
    var vh = viewport.height || 1;
    return {
      x: rect.left / vw,
      y: rect.top / vh,
      w: rect.width / vw,
      h: rect.height / vh
    };
  }

  function fromFractions(frac, viewport) {
    var f = validFractions(frac) || DEFAULT;
    return {
      left: Math.round(f.x * viewport.width),
      top: Math.round(f.y * viewport.height),
      width: Math.round(f.w * viewport.width),
      height: Math.round(f.h * viewport.height)
    };
  }

  /**
   * Fit a pixel rect to the viewport: the size is at least the minimum and at
   * most the viewport (a viewport smaller than the minimum is filled), and the
   * window is moved fully inside.  Fully inside is always possible after the
   * size clamp, and it keeps the title bar (the drag handle) reachable.
   */
  function clampRect(rect, viewport, opts) {
    opts = opts || {};
    var minW = isNum(opts.minW) ? opts.minW : MIN_W;
    var minH = isNum(opts.minH) ? opts.minH : MIN_H;
    var vw = Math.max(0, viewport.width);
    var vh = Math.max(0, viewport.height);

    var width = Math.min(Math.max(rect.width, minW), vw);
    var height = Math.min(Math.max(rect.height, minH), vh);
    return {
      left: Math.round(clamp(rect.left, 0, vw - width)),
      top: Math.round(clamp(rect.top, 0, vh - height)),
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  function isNarrow(windowWidth) {
    return windowWidth < NARROW_BELOW;
  }

  function load(storage) {
    try {
      var raw = storage && storage.getItem(STORAGE_KEY);
      return raw ? validFractions(JSON.parse(raw)) : null;
    } catch (e) {
      return null;
    }
  }

  function save(storage, frac) {
    var f = validFractions(frac);
    if (!f || !storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch (e) {
      // private mode or a full store: the window just won't be remembered
    }
  }

  return {
    DEFAULT: DEFAULT,
    MIN_W: MIN_W,
    MIN_H: MIN_H,
    NARROW_BELOW: NARROW_BELOW,
    STORAGE_KEY: STORAGE_KEY,
    validFractions: validFractions,
    toFractions: toFractions,
    fromFractions: fromFractions,
    clampRect: clampRect,
    isNarrow: isNarrow,
    load: load,
    save: save
  };
}));
