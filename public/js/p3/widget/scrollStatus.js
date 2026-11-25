define([], function () {

  /**
   * The footer of an infinite-scroll grid (PageGrid.Scrolling):
   * "Rows 4,201–4,224 of 17,094,027 · 4,400 loaded".
   *
   * The scrollbar cannot say where you are. Its scroll area only extends a
   * little past the loaded rows (maxEmptySpace), because a full-height one
   * would let the thumb land millions of rows down, which only an offset query
   * can reach, at up to a minute a page. It could not be full height anyway:
   * browsers cap an element at ~33.5M px (Chrome) or ~17.9M px (Firefox), and
   * 17 million genome rows at 23.5 px is ~400M px. So the footer carries the
   * position instead, the way the numbered pager's "1 - 200 of N" did.
   *
   * Pure functions, so they can be tested without dgrid.
   */

  function fmt(n) {
    return Number(n).toLocaleString();
  }

  /**
   * The rows in view, as zero-based indexes { first, last }, or null when no
   * row is in view. `rows` are { index, top, height } in scroll-content
   * coordinates; `scrollTop` and `viewHeight` describe the viewport.
   * A row counts when any part of it is visible.
   */
  function visibleRange(rows, scrollTop, viewHeight) {
    var bottom = scrollTop + viewHeight;
    var first = null;
    var last = null;
    (rows || []).forEach(function (r) {
      if (typeof r.index !== 'number' || r.index < 0) return;
      if (r.top + r.height <= scrollTop || r.top >= bottom) return;
      if (first === null || r.index < first) first = r.index;
      if (last === null || r.index > last) last = r.index;
    });
    return first === null ? null : { first: first, last: last };
  }

  /**
   * The footer text. `range` is visibleRange()'s result, `total` the result
   * count, `loaded` how many rows have been fetched so far. "loaded" is left
   * out once everything is, since it would just repeat the total.
   */
  function statusText(range, total, loaded) {
    if (typeof total !== 'number' || !isFinite(total)) {
      return '';
    }
    if (total === 0) {
      return 'No results';
    }
    var text = range
      ? 'Rows ' + fmt(range.first + 1) + '–' + fmt(range.last + 1) + ' of ' + fmt(total)
      : fmt(total) + ' rows';
    if (loaded < total) {
      text += ' · ' + fmt(loaded) + ' loaded';
    }
    return text;
  }

  return {
    visibleRange: visibleRange,
    statusText: statusText
  };
});
