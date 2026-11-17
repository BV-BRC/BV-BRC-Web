define([], function () {

  /**
   * Cursor-paging bookkeeping for P3JsonRest.
   *
   * Offset paging gets slower the deeper it goes -- Solr walks and discards
   * every skipped row -- and the production proxy refuses `limit(n,offset)`
   * past 100,000 in the query string. A cursor page costs the same at any
   * depth.
   *
   * A Solr cursor mark is an encoded sort-key position, not a server-side
   * session: nothing is allocated, nothing expires, and a mark can be replayed
   * in any order. So the store records the mark that PRODUCES each page
   * boundary as it walks forward, and scrolling back is a replay of a recorded
   * mark. Memory is O(pages), a few dozen bytes each.
   *
   * Everything here is a pure function over a plain `state` object, so it can
   * be tested without Dojo or a network. P3JsonRest owns the I/O.
   *
   * See PLAN-cursor-infinite-scroll.md.
   */

  var FIRST_MARK = '*';

  // Pages whose rows are kept so that dgrid's variable-sized requests
  // (start/count that fall inside one page) do not re-fetch it.
  var DEFAULT_CACHED_PAGES = 12;

  // Distinct query/sort combinations tracked at once. Stores are module-level
  // singletons shared by every grid of a kind, so two tabs on the same
  // collection with different queries are normal.
  var DEFAULT_MAX_STATES = 6;

  // How far a forward walk may run to reach a page whose mark is unknown.
  var DEFAULT_MAX_WALK = 50;

  function pageIndex(start, pageSize) {
    return Math.floor((start || 0) / pageSize);
  }

  function pageStart(index, pageSize) {
    return index * pageSize;
  }

  /**
   * The pages needed to serve rows [start, start + count).
   * Returns null when the request is not a bounded range (no count, Infinity,
   * or a non-positive count), which is the caller's cue to leave it to the
   * ordinary offset path.
   */
  function pagesFor(start, count, pageSize) {
    start = start || 0;
    if (typeof count !== 'number' || !isFinite(count) || count <= 0) {
      return null;
    }
    return {
      first: pageIndex(start, pageSize),
      last: pageIndex(start + count - 1, pageSize)
    };
  }

  /** Does the RQL already carry its own limit()? Then we must not add ours. */
  function hasLimit(rql) {
    return /(^|[&,(])limit\(/.test(rql || '');
  }

  /**
   * Can this query be cursor-paged? The API refuses a cursor on a grouped
   * query (RQLQueryParser: "Cursor pagination cannot be used with grouped
   * queries"), and a query with its own limit() would carry two. Both stay on
   * the offset path.
   */
  function isCursorable(rql) {
    return !hasLimit(rql) && !/(^|[&,(])group\(/.test(rql || '');
  }

  /** `sort(+a,-b)` from dojo-style sort options; '' when there are none. */
  function sortClause(sort, ascendingPrefix, descendingPrefix) {
    if (!sort || !sort.length) {
      return '';
    }
    ascendingPrefix = ascendingPrefix || '+';
    descendingPrefix = descendingPrefix || '-';
    return 'sort(' + sort.map(function (s) {
      return (s.descending ? descendingPrefix : ascendingPrefix)
        + encodeURIComponent(s.attribute);
    }).join(',') + ')';
  }

  /**
   * What a set of marks is valid for. Marks from `sort(+genome_id)` mean
   * nothing under `sort(+genome_name)`, and a different filter is a different
   * result set altogether.
   */
  function resetKey(rql, sort) {
    return (rql || '') + '\u0000' + (sort || '');
  }

  /**
   * The POST body for one cursor page: the query, its sort, limit, cursor.
   * The server appends the collection's unique key to the sort, so any sort
   * the grid has chosen is safe to use.
   */
  function buildQuery(rql, sort, mark, limit) {
    var parts = [];
    if (rql) { parts.push(rql); }
    if (sort) { parts.push(sort); }
    parts.push('limit(' + limit + ')');
    parts.push('cursor(' + encodeURIComponent(mark) + ')');
    return parts.join('&');
  }

  // --- state -------------------------------------------------------------

  function newState(key) {
    return {
      key: key,
      // marks[i] is the mark that PRODUCES page i. Page 0 always starts at '*'.
      marks: { 0: FIRST_MARK },
      // Highest page index whose mark is recorded.
      maxMarked: 0,
      // Rows per page index, most recently used last.
      pages: {},
      pageOrder: [],
      // Fetches in flight, by page index, so concurrent requests for one page
      // share a single request.
      inflight: {},
      total: undefined
    };
  }

  /**
   * Look up (or create) the state for a key in a registry of states. The
   * registry is a plain object `{ states: {}, order: [] }`.
   *
   * A new state is a fresh object, never a mutated old one, so a response
   * still in flight for the previous query records its mark into the old state
   * and cannot corrupt the new one.
   */
  function stateFor(registry, key, maxStates) {
    maxStates = maxStates || DEFAULT_MAX_STATES;
    var state = registry.states[key];
    if (state) {
      touch(registry.order, key);
      return state;
    }
    state = registry.states[key] = newState(key);
    registry.order.push(key);
    while (registry.order.length > maxStates) {
      delete registry.states[registry.order.shift()];
    }
    return state;
  }

  function newRegistry() {
    return { states: {}, order: [] };
  }

  /** Forget everything (called when the grid refreshes). */
  function resetRegistry(registry) {
    registry.states = {};
    registry.order = [];
  }

  function touch(order, key) {
    var i = order.indexOf(key);
    if (i >= 0) { order.splice(i, 1); }
    order.push(key);
  }

  function markFor(state, index) {
    return Object.prototype.hasOwnProperty.call(state.marks, index) ? state.marks[index] : null;
  }

  function recordMark(state, index, mark) {
    if (!mark) { return; }
    state.marks[index] = mark;
    if (index > state.maxMarked) { state.maxMarked = index; }
  }

  /** Pages that must be fetched, in order, before `index` can be. 0 when its mark is known. */
  function walkLength(state, index) {
    return markFor(state, index) !== null ? 0 : index - state.maxMarked;
  }

  // --- page cache --------------------------------------------------------

  function cacheGet(state, index) {
    if (!Object.prototype.hasOwnProperty.call(state.pages, index)) {
      return null;
    }
    touch(state.pageOrder, index);
    return state.pages[index];
  }

  function cachePut(state, index, rows, maxPages) {
    maxPages = maxPages || DEFAULT_CACHED_PAGES;
    state.pages[index] = rows;
    touch(state.pageOrder, index);
    while (state.pageOrder.length > maxPages) {
      delete state.pages[state.pageOrder.shift()];
    }
  }

  /**
   * Rows [start, start + count) from a map of fetched pages { index: rows }.
   * Short pages (the last one) simply yield fewer rows.
   */
  function sliceRows(pages, start, count, pageSize) {
    var out = [];
    var first = pageIndex(start, pageSize);
    var last = pageIndex(start + count - 1, pageSize);
    for (var i = first; i <= last; i++) {
      var rows = pages[i] || [];
      var from = i === first ? start - pageStart(i, pageSize) : 0;
      var to = i === last ? start + count - pageStart(i, pageSize) : rows.length;
      out = out.concat(rows.slice(from, to));
    }
    return out;
  }

  // --- loading -----------------------------------------------------------

  /**
   * Load one page, resolving to its rows.
   *
   * `fetchOne(mark, limit)` does the I/O and resolves
   * `{ rows, next, total }` where `next` is the response's X-Cursor-Mark.
   *
   *  - cached          -> no request
   *  - in flight       -> the SAME promise, so a scroll handler that asks twice
   *                       before the first answer lands issues one request
   *  - mark known      -> one request (this is the scroll-back case)
   *  - mark unknown    -> load the previous page first; its response records
   *                       the mark this page needs
   *
   * A page past the end resolves to [].
   */
  function loadPage(state, index, pageSize, fetchOne, opts) {
    var cached = cacheGet(state, index);
    if (cached) { return Promise.resolve(cached); }
    if (state.inflight[index]) { return state.inflight[index]; }

    var markReady = markFor(state, index) !== null
      ? Promise.resolve(markFor(state, index))
      : loadPage(state, index - 1, pageSize, fetchOne, opts).then(function () {
        // Recorded by the previous page's response; absent if that was the last.
        return markFor(state, index);
      });

    var promise = markReady.then(function (mark) {
      if (mark === null) { return []; }
      return fetchOne(mark, pageSize).then(function (res) {
        var rows = res.rows || [];
        if (res.total !== undefined) { state.total = res.total; }
        // A full page whose next mark differs from the one we sent means more
        // may follow. A short page, or an unchanged mark, is the end.
        if (rows.length >= pageSize && res.next && res.next !== mark) {
          recordMark(state, index + 1, res.next);
        }
        cachePut(state, index, rows, opts && opts.cachedPages);
        return rows;
      });
    });

    state.inflight[index] = promise;
    var clear = function () {
      if (state.inflight[index] === promise) { delete state.inflight[index]; }
    };
    promise.then(clear, clear);
    return promise;
  }

  /** Would serving this request need a walk longer than we allow? */
  function walkTooLong(state, first, last, maxWalk) {
    maxWalk = maxWalk || DEFAULT_MAX_WALK;
    return walkLength(state, first) > maxWalk || walkLength(state, last) > maxWalk;
  }

  /**
   * Rows [start, start + count), resolving `{ rows, total }`.
   * Pages are loaded in order; those whose marks are known go in parallel.
   */
  function loadRange(state, start, count, pageSize, fetchOne, opts) {
    var span = pagesFor(start, count, pageSize);
    var loads = [];
    for (var i = span.first; i <= span.last; i++) {
      loads.push(loadPage(state, i, pageSize, fetchOne, opts));
    }
    return Promise.all(loads).then(function (results) {
      var pages = {};
      results.forEach(function (rows, n) { pages[span.first + n] = rows; });
      return {
        rows: sliceRows(pages, start, count, pageSize),
        total: state.total
      };
    });
  }

  /** Total from "items 0-200/17094027"; undefined when absent. */
  function totalFromRange(range) {
    var m = /\/(\d+)\s*$/.exec(range || '');
    return m ? parseInt(m[1]) : undefined;
  }

  /**
   * Is cursor paging switched on? Read at call time, like enableThrottleRetry.
   *
   * Strict about what counts as on: a value set from the command line or the
   * environment reaches the page as a STRING, and `"false"` is truthy, so a
   * deployer writing useCursorPaging=false would otherwise turn it on.
   */
  function isEnabled(win) {
    win = win || (typeof window !== 'undefined' ? window : null);
    var v = win && win.App ? win.App.useCursorPaging : undefined;
    return v === true || v === 'true';
  }

  return {
    FIRST_MARK: FIRST_MARK,
    DEFAULT_MAX_WALK: DEFAULT_MAX_WALK,
    pageIndex: pageIndex,
    pageStart: pageStart,
    pagesFor: pagesFor,
    hasLimit: hasLimit,
    isCursorable: isCursorable,
    sortClause: sortClause,
    resetKey: resetKey,
    buildQuery: buildQuery,
    newRegistry: newRegistry,
    resetRegistry: resetRegistry,
    stateFor: stateFor,
    markFor: markFor,
    recordMark: recordMark,
    walkLength: walkLength,
    cacheGet: cacheGet,
    cachePut: cachePut,
    sliceRows: sliceRows,
    loadPage: loadPage,
    loadRange: loadRange,
    walkTooLong: walkTooLong,
    totalFromRange: totalFromRange,
    isEnabled: isEnabled
  };
});
