# Plan: cursor-paged infinite scroll for the data grids

**Status:** proposal · **Author:** drafted 2026-11-17 · **Target:** `alpha`

Replace offset pagination in the data grids with cursor-based paging that
extends the grid by one page as the user scrolls to the end.

---

## Why

Two separate reasons. The second is the durable one.

### 1. The nginx deep-offset block

The production frontend proxy returns a 400 for deep offsets:

```nginx
map $args $is_deep_offset {
    default 0;
    "~limit\([0-9]+,[0-9]{6,}\)" 1;
}
# location /api/ ... if ($deep_offset) { return 400 "Deep offset paging is
#   not supported. Page with a cursor instead (...)"; }
```

Added in response to bot swarms taking the site down; the 100,000 threshold is
arbitrary, not a Solr or application constraint. It lives in `nginx.conf`, not
`p3_api`, which is why it is absent from the API source and from alpha.

**It matches on `$args` — the query string — so it does not currently affect
the grids.** They POST RQL in the body and pass the offset in a `Range` header,
which the rule never sees. Measured on `www`:

```
GET  ...&limit(100,150000)        -> 400   (blocked)
POST body limit(100,150000)       -> 200   (not blocked: offset is not in $args)
POST + Range: items=150000-...    -> 200   (not blocked: no limit() at all)
POST + Range: items=17000000-...  -> 200
```

So the wall is real but narrowly aimed, and the grids route around it by
accident. Do not design to the 100,000 number: it is a tunable knob that could
move, and a future tightening of the rule to cover `Range` would break every
large grid at once. The point is that **offset paging is the thing being
rate-limited**, and cursors are the sanctioned alternative.

### 2. Deep offsets are genuinely expensive — this is the real driver

Solr must walk and discard every skipped row. Measured on `www` through the
grid's own transport (POST + `Range`), so the nginx rule is not in play:

| offset | latency |
|---:|---:|
| 0 | 1.37 s |
| 10,000 | 1.68 s |
| 100,000 | 2.03 s |
| 500,000 | 4.60 s |
| 2,000,000 | 19.35 s |
| 8,000,000 | 56.60 s |

A cursor page is **1.49 s at any depth**. That is the argument: offset paging
degrades without bound and is exactly the load profile that motivated the
proxy block, while cursor paging is flat. Fixing this removes the incentive
for the block rather than merely evading it.

## What the API actually offers

The cursor is an **RQL clause**, not a request header. The 400's wording
(`send X-Cursor-Mark: *`) is stale — the response header is called that, but the
request carries `cursor(<mark>)` in the query. Server side: `cursor()` is
extracted in `p3_api/middleware/RQLQueryParser.js:14`, and `Limiter.js:129`
skips Range/offset injection entirely when a cursor is present (they are
mutually exclusive in Solr).

Measured against `www.bv-brc.org/api` and `alpha.bv-brc.org/api`, both current:

| property | result |
|---|---|
| basic paging | `...&sort(+genome_id)&limit(200)&cursor(%2A)` → 200, 200 rows, `X-Cursor-Mark: AoEpMTAwMDMyOC4z` |
| **total still reported** | `Content-Range: items 0-200/17094027` — the row count survives cursor mode |
| **arbitrary sort column** | `sort(+genome_name)` pages correctly; `ensureSortHasUniqueKey` appends the unique key server-side |
| **marks replay out of order** | 4 marks recorded forward, replayed as 2,0,3,1 → every page byte-identical |
| **variable page sizes compose** | resuming one mark with 100, then 50, then 150 == a single 300-row fetch |
| no short pages before the end | six consecutive requests each returned exactly 200 |
| exhaustion signal | the returned mark equals the one sent |

The replay result is the load-bearing one: a Solr cursor mark is an encoded
sort-key position, not a server-side session. Nothing is allocated, nothing
expires, order of use does not matter. **One recorded mark per page boundary
gives random access to any page already visited, at one request each.**

Scripts used, re-runnable against either host:
`cursor_replay.py`, `cursor_varlimit.py`, `cursor_partial.py` (job tmp dir).

## The model

True infinite scroll: the scrollbar never extends more than a little beyond
what is loaded. Reach the bottom, a page arrives, the spacer re-extends.

This is what makes the design cursor-pure. Every fetch is then either

- **forward** — `cursor(<last mark>)`, the next page, or
- **back** — `cursor(<recorded mark>)`, a replay,

and no offset is ever computed, so the 100k wall is unreachable *by
construction* rather than merely unlikely.

`OnDemandList` does not behave this way out of the box. It sizes its preload
node from the full total (`OnDemandList.js:201`):

```javascript
preloadNode.style.height = Math.min(total * self.rowHeight, self.maxEmptySpace) + "px";
```

`maxEmptySpace` defaults to `Infinity`, so 17M rows yields a 17M × 24px spacer
and a thumb that can land anywhere — which would demand random access by
offset. Capping `maxEmptySpace` converts dgrid's virtual scrolling into
append-only scrolling; its own doc comment anticipates this: limiting it "can
limit the ability to instantly scroll to the end."

**Implementation found the cap is necessary but not sufficient — see
"Findings from implementation" below.** The first draft said "clamp to one page
(4,800 px)"; that value was wrong and the cap alone left a runaway-scroll bug.

## Current state

- **`widget/PageGrid.js`** — `dgrid/Grid` + `extensions/Pagination`. The real
  base: **76 modules** import it, including every list view.
- **`widget/Grid.js`** — `dgrid/OnDemandGrid`, already infinite-scroll, but
  only 7 importers and missing `_selectAll`, `maxSelectAll`, `ColumnReorder`
  and the `Confirmation` dialog that `PageGrid` has. It is not a drop-in.
- **`store/P3JsonRest.js`** — POSTs RQL, sends a real `Range` header
  (`rangeParam` is unset). **No caching of any kind**; no `dojo/store/Cache`
  wrapper exists anywhere in `public/js/p3/`. 21 stores extend it, and none
  override `query()` — they set `dataModel` and `idProperty` only, so a change
  in the base reaches all of them.
- `results.total` is derived from `Content-Range` off a captured xhr
  (`P3JsonRest.js:145`). Unaffected by cursor mode.

Scope note: `*MemoryGrid.js`, `TSV_CSV_Grid.js` and the transcriptomics grids
are backed by Memory stores holding client-side data, so they page in memory
and are out of scope. (`transcriptomics_*` collections 404 on the API
entirely.)

Unique keys live in `p3_api/config.js:124` (`collectionUniqueKeys`, 38
collections) and cover every collection the grids query, so **the client does
not need its own copy** — unlike `widget/copilot/CursorDownload.js:27`, which
hardcodes a 10-entry table. Do not duplicate that.

---

## Phase 1 — cursor-paged store (behind a flag)

Land this against the **existing `PageGrid`**, page buttons and all. A
cursor-backed store is strictly better than offset paging even with pagination
still in place: it removes the 100k wall on its own, and it is independently
testable. This is the part where correctness can actually go wrong, so it ships
alone.

**New: `public/js/p3/store/cursorPaging.js`** — pure functions, no Dojo, Jest-testable:

- `pageIndex(start, pageSize)` / `pageStart(index, pageSize)`
- `markFor(state, index)` → recorded mark, or the furthest known mark below it
- `recordMark(state, index, mark)`
- `buildQuery(rql, sort, mark, limit)` → appends `cursor(<encoded>)`, ensuring
  a `sort()` is present (the server adds the unique key, we only guarantee
  *some* sort clause)
- `resetKey(rql, sort)` → the identity a mark map is valid for

**Changed: `store/P3JsonRest.js`** — when `useCursorPaging` is on:

- maintain `{ key, marks: Map<pageIndex, mark>, maxPage }`
- `query(rql, {start, count})`:
  - `key = resetKey(...)`; if it differs from the stored key, clear the map
  - `page = pageIndex(start, pageSize)`
  - mark known → one request, slice to `count`
  - mark unknown → walk forward from the furthest known mark, recording each
    mark as it arrives (bounded in practice by the Phase 2 clamp; until then,
    cap the walk and fall back to offsets beyond it)
- fetch internally in fixed `pageSize` units and slice to what dgrid asked for,
  so a mark is only ever recorded at a boundary we can name
- **do not send `Range` when a cursor is in play** — the server ignores it, and
  sending both invites confusion
- keep `results.total` reading `Content-Range` exactly as now

**Config:** `useCursorPaging`, default `false`, alongside `enableThrottleRetry`
in `p3-web.conf` / `views/javascript.ejs`.

**Tests** (`store/tests/cursorPaging.test.js`) — pure-function level:
index/mark math; reset on query change; reset on **sort** change (marks from
`sort(+genome_id)` are meaningless under `sort(+genome_name)`); forward walk
records every intermediate mark; replay of a recorded mark issues exactly one
request; `limit`/`sort`/`cursor` composition and encoding; **two overlapping
requests for the same page issue one fetch** (the coalescing the prefetch
depends on).

Note `jest.config.json` on master adds `public/js/p3/store` to `roots` — keep
that when merging (see `RELEASE-NOTES-3.60.md`, Notes for deployment).

**Exit criteria:** with the flag on, a `genome` grid pages past row 100,000
without a 400; page buttons still work; row counts unchanged.

## Phase 2 — infinite scroll (UI)

Purely visual, lands separately so a rendering regression is not entangled with
a data-correctness one.

**Changed: `widget/PageGrid.js`** — as built, NOT a base-class swap. A swap
would have broken `JobsGrid`/`JobManager` (which drive `gotoPage` and
`_currentPage`) and every Memory-backed grid. `PageGrid` stays paginated and
gains `PageGrid.Scrolling` (`dgrid/OnDemandGrid`, same mixins, same body) and
`PageGrid.Auto` (Scrolling when `useCursorPaging` is on, `PageGrid` otherwise).
The 23 grids over a `*JsonRest` store extend `Grid.Auto`; nothing else changes.
All the custom behaviour (`_selectAll`, `maxSelectAll`, `row()`,
`_initSelectionEvents`, `_setTotalRows`, copy-to-clipboard) is shared. The
scrolling variant sets:

```javascript
maxEmptySpace: 1000,                      // see Findings: must stay < bufferRows * rowHeight
minRowsPerPage: 200,
maxRowsPerPage: 200,
farOffRemoval: 2000,                      // unchanged; rows recycle, marks persist
bufferRows: 100,                          // prefetch lead (see below)
pagingMethod: 'throttleDelayed',          // request while scrolling, not after
pagingDelay: 250,
```

Fixing `min`/`maxRowsPerPage` to the page size keeps dgrid's requests aligned
to mark boundaries.

### Prefetching ahead of the scroll

The next page must be in flight **before** the user reaches it, or every page
boundary costs a visible ~1.5 s stall at the "Loading..." node. dgrid already
provides this; it is a matter of configuring it rather than writing it.

**`bufferRows`** is the lead distance — "the number of rows to keep ready on
each side of the viewport so that the user can perform local scrolling without
seeing the grid being built." It becomes `requestBuffer = bufferRows *
rowHeight` (`OnDemandList.js:341`), which widens the region treated as visible,
so a query fires while the rows are still that far below the fold.

`PageGrid` already sets `bufferRows: 100` (vs dgrid's default of 10), giving
2,400 px of lead — about 2.4 s at a brisk 1,000 px/s scroll, comfortably more
than a 1.5 s cursor fetch. **Keep 100.** Note the default of 10 would give only
240 px / 0.24 s and would stall on every boundary.

**`pagingMethod` matters more here, and the default is wrong for prefetch.**
It defaults to `'debounce'`, which "will cause the grid to wait until the user
pauses scrolling before firing any requests" — the exact opposite of
prefetching: during a continuous scroll each event cancels the previous timer
and *nothing* is requested until the user stops. `'throttleDelayed'`
"progressively request[s] as the user scrolls." That is what we want, and
dgrid's own caveat ("generally incurs more overhead") is much weaker under
cursor paging, where a page costs a flat 1.5 s regardless of depth.

With sequential cursors there is a wrinkle dgrid does not have to handle with
offsets: **page N+2 cannot be fetched until page N+1's mark comes back.** So
prefetch depth is inherently one page unless we chain. The store should
therefore:

- coalesce concurrent requests for the same page index (a throttled scroll can
  ask twice before the first resolves — return the in-flight promise, do not
  issue a second request);
- optionally chain one page beyond the requested one on a forward walk, so the
  mark for N+2 is already recorded by the time it is asked for.

Tune `bufferRows` against measured fetch latency once Phase 1 is live, rather
than guessing now; 100 is a sound starting point because it already exceeds
the observed page time.

> **AMD hazard.** `PageGrid.js`'s `define` array is 23 entries aligned
> positionally with its factory parameters; removing `Pagination` means
> removing both. A mismatch fails silently at runtime. Verify
> programmatically after editing (array length == parameter count), as was
> done for the `genomeContextQuery` work.

**ES2019 constraint.** `PageGrid` and `P3JsonRest` are statically layered, so
they go through Closure v20200112 — **no `?.` or `??`** (CLAUDE.md, Production
Build). And `buildClient.sh` fails silently; confirm `build-report.txt` is
clean rather than trusting "Done".

**Exit criteria:** scrolling to the bottom extends by one page; the thumb never
reaches unloaded space; scrolling back up re-renders from a recorded mark;
no horizontal/column regressions.

### Findings from implementation

Verified in a real browser against alpha (17,094,027 genomes), flag on.

- **The wire is what the plan said.** `eq(public,true)&sort(-date_inserted)&limit(200)&cursor(*)`,
  no `Range` header, response carries `x-cursor-mark` and `content-range: items 0-200/17094027`.
  Each later request's `cursor(...)` is exactly the previous response's mark.
- **Prefetch works.** Scrolling at ~900 px/s, the next page was requested with
  ~1,650 px of loaded rows still ahead and had landed before the bottom;
  `scrollHeight` grew by one page (~4,700 px) per fetch and the viewport always
  held 23–24 rows. No offset request was ever sent.
- **dgrid re-reads recycled rows constantly** (it asked for starts 0, 135, 334
  while the user went *down*), and **none of those hit the network**: 6 store
  queries, 3 requests. The page cache and recorded marks are doing real work,
  not just the unit tests' simulation.
- **BUG FOUND: End key / dragging the thumb to the bottom ran away.** One jump
  and `scrollTop` climbed to 141,000 px in three seconds with no further input.
  dgrid's requests were perfectly contiguous (start=200, 400, 600…), so it was
  not dgrid skipping ahead. Each insertion produced a `scroll` event of
  exactly +4,704 px (200 rows × 23.52) and `grid.scrollTo` was never called:
  **Chrome's scroll anchoring.** With the viewport inside the unloaded spacer,
  that spacer is the anchor node; rows inserted above it make the browser shift
  `scrollTop` down by the inserted height, which lands the viewport back in the
  spacer and triggers the next load, forever. Incremental scrolling never showed
  it because the anchor is then a row, and rows insert below it.
  **Fix: `overflow-anchor: none` on the grid's scroller** (dgrid manages its own
  scroll position). After it, three End presses and an idle period left the grid
  bounded and still.
- **The `maxEmptySpace` value.** Kept at 1,000 px, below
  `bufferRows * rowHeight` (~2,350 px). By the arithmetic in `OnDemandList`
  (`offset = (visibleTop - requestBuffer - preloadTop) / rowHeight`), a larger
  cap lets End land far enough past the loaded rows that dgrid loads a page
  further on than the next one, leaving a gap. That second effect was derived
  from the source, not reproduced; the anchoring bug above was reproduced.
  I first blamed the cap for the runaway and got that wrong — instrumenting
  `store.query` and `scroll` events is what found the real cause.

## Phase 3 — rollout

1. Enable `useCursorPaging` on alpha; exercise the large grids
   (Genomes, Features, Sequences) and the saved-search and taxon-view paths.
2. Measure. The win is latency at depth (19 s → 1.5 s at offset 2M), so compare
   page-fetch times before and after on a multi-million-row grid rather than
   just checking that rows appear.
3. Default the flag on; remove the offset fallback in a later release once the
   cursor path has soaked.
4. **Then revisit the nginx rule with whoever owns it.** Once the grids no
   longer issue deep offsets, the block is only catching bots and direct API
   users — and the 400 it returns names a header (`X-Cursor-Mark: *`) that is
   not how a client requests a cursor. The correct instruction is the RQL
   clause `cursor(*)`. Worth fixing the message whatever else changes.

---

## User-visible consequences

Worth deciding deliberately — these are the real tradeoffs.

- **The scrollbar stops being a position indicator.** It reflects loaded rows,
  not the result set. On a 17M-row grid the thumb looks nearly full while
  showing 200 rows. Standard infinite-scroll bargain, but it is a change.
- **"Jump to the last page" goes away.** Low cost: `firstLastArrows` defaults
  to `false` (`Pagination.js:52`) and the only module enabling it is
  `viewer/SFVT.js:445`, which is Memory-backed and out of scope. On the API
  grids the control is not exposed at all. Where a jump to the end *is*
  meaningful, the equivalent is to invert the sort.
- **The total count stays.** `Content-Range` is returned under cursor mode, so
  the header can still read "17,094,027 genomes" while the grid holds 200.
  Keep `_setTotalRows` wired; it is what the page count was really
  communicating.

## Risks

| risk | handling |
|---|---|
| The 100,000 threshold is arbitrary and may move | It is an anti-bot knob in `nginx.conf`, not an application limit. Do not encode it anywhere in the client. The design must be correct because cursors are cheap at any depth, not because of where the block currently sits. |
| nginx rule could later cover `Range` | Today it matches `limit(n,offset)` in `$args` only, so the grids' POST+`Range` transport slips past. If it were widened, every large grid would break at once — which is an argument for doing this work before that happens, not after. |
| 76 modules import `PageGrid` | Nearly all are `declare([Grid], {columns, store})`; the change concentrates in the base. Audit the handful that touch paging state (`JobsGrid.js:21` sets `rowsPerPage: 200`; `SFVT.js:440` builds its own `Grid + Pagination` and should be left alone). |
| Selection across recycled rows | `Selection` tracks `this.selection` by row id independently of `_rowIdToObject`, so it already survives recycling. But `_selectAll` (`PageGrid.js:196`) issues its own bulk query with `limit(maxSelectAll)` = 10,000 — unaffected by paging, and worth an explicit test since saved searches depend on it. |
| Sort change mid-scroll | A new sort invalidates every mark. Keyed on `resetKey`; `_StoreMixin._setQuery` routes both query and sort changes through `refresh()`, giving one reset point. |
| Silent empty grid on a shed request | Unchanged by this work, but the 429 contract still applies: a shed cursor page must not render as an empty grid (CLAUDE.md). `P3JsonRest` already wraps in `retryRequest`. |

## Not in scope

Downloads (`DownloadExecutor` already streams via server-side cursorMark),
Memory-backed grids, and `widget/copilot/CursorDownload.js` (a separate,
working cursor client for Copilot download links — a candidate to fold into
`cursorPaging.js` later, but not now).

### Why `viewer/SFVT.js` is excluded

It builds its own grid inline (`SFVT.js:440`) rather than extending `PageGrid`:

```javascript
let store = new Memory({data: data});
this.grid = new (declare([Grid, Pagination, ColumnResizer]))({ ... });
```

That is **not** an arbitrary divergence. SFVT fetches all variant types in one
request (`limit(1000000)`, `SFVT.js:235`), derives per-position columns from
the data, then builds a `dojo/store/Memory` over the computed rows. Its columns
are dynamic — one per sequence coordinate, known only after the fetch — so it
cannot use a `PageGrid` subclass with a declared `columns` map, and its store
is already fully in memory, so there is nothing to page over the network.

Paging there is pure client-side display over an in-memory array. Cursors are
irrelevant to it, and `firstLastArrows`/`pagingTextBox` are genuinely useful on
a bounded local dataset. **Leave it on `Pagination`.**

There is a real issue nearby, just not this one: `limit(1000000)` on a single
request is the same unbounded-fetch pattern that the API caps at 25,000 rows
(`RQLQueryParser.js`, `maxRequestLimit`), so a sequence feature with more
variant types than that would silently truncate. Worth a separate look;
unrelated to paging.
