# Plan: Handle HTTP 429 / 503 (Throttling) from the Data API

**Status:** revised 2026-10-16 to conform to
[`BV-BRC-API/Docs/CLIENT-429.md`](https://github.com/BV-BRC/BV-BRC-API/blob/alpha/Docs/CLIENT-429.md),
which is **normative** for all API clients and supersedes the original draft of this plan.

## Context

The Data API now sheds load with `429 Too Many Requests` (and `503`), carrying a
`Retry-After` header in seconds. Today the website has **no** 429, 503, or `Retry-After`
handling anywhere in `public/js/p3/` — a shed request fails like any other error.

**The API ships with admission control disabled specifically because this contract is not
implemented in clients. Implementing it is what unblocks enabling it.**

The governing constraint is not "retry on 429." It is **back off by the amount the server
asked for, and give up rather than hammer.** Retry amplification of exactly this kind was
identified as the cause of the 2026-06-05 coordinator crash.

### What changed from the original draft

The first version of this plan was written before the spec existed and disagreed with it on
four points, each in the direction of retrying harder than the server permits:

| | original draft | spec (normative) |
|---|---|---|
| Max retries | 4 | **3** — *for interactive clients* (§3) |
| Jitter | none | **required**, `× (1 + random(0, 0.3))` |
| 503 | not mentioned | **identical handling to 429** |
| 504 / 400 | not mentioned | **never retry** |
| `Retry-After` | optional; backoff was the normal path | always sent; backoff is **fallback only** |

Jitter is the most consequential omission. The draft's verification step claimed "the
backoff delay should stagger [requests] naturally" — it does not. An unjittered
`Retry-After: 10` returns every shed client at the same instant, reproducing the burst.

### The 3-retry cap is now explicitly interactive-only

The spec gained **§3a (long-running clients)** after this plan's first revision. The
3-retry cap is now scoped to clients where *a person is waiting*; for unattended work the
spec says **cap the delay, not the attempt count** — escalate to a ~300 s ceiling and hold
there indefinitely, treating `Retry-After` as a *floor* rather than a target, with an
optional operator-set wall-clock budget.

**For the website this changes nothing: the spec's per-client table lists the web app as
`interactive`, so 3 retries remains correct here.** It matters for this plan in two places:

- `retryRequest` should take a `mode` (`'interactive' | 'unattended'`) from the outset
  rather than hardcoding the cap. The cost is a few lines now versus reworking every call
  site later, and the suggested escalation schedule is `1–3: Retry-After exactly;
  4–6: 30 s; 7–10: 60 s; 11+: 300 s ceiling`.
- Anything on the site that is genuinely unattended — a bulk download left running, a
  long-poll — is `unattended`, not `interactive`. Downloads (§4) are the likely case.

---

## What the API sends

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 10
Content-Type: application/json

{"status":429,"message":"The server is busy processing other large requests. Please retry shortly."}
```

Branch on the **status code**. Do not parse the message text.

### Only heavy requests are realistically shed

Admission control classifies requests; a 429 is likely only for:

- `rows >= 10000`, or
- a download (`http_download=true`), or
- a streaming request

Ordinary grid pages and single-document fetches use a much larger pool. **This is the single
most important scoping fact in this plan:** the downloads are where this fires, not routine
paging. It also intersects the (now-fixed) `rows >= 10000` truncation bug, which left
hardcoded `rows: 25000` call sites scattered across the stores — all of them heavy by this
classification. See "Interaction with the rows>=10000 truncation bug" below.

### Status codes, and what to do with each

| status | meaning | retry? |
|---|---|---|
| **429** | server busy, shedding | **yes** |
| **503** | temporarily unavailable | **yes**, identically |
| **504** | upstream Solr timeout | **no** — the query was too expensive; retrying repeats the cost |
| **400** | refused on its merits (e.g. taxon matching too many genomes) | **no** — permanent for that query |

---

## Required behavior (from the spec)

1. **Honour `Retry-After`.** If the server says 10s, waiting 1s is a violation, not an
   optimisation.
2. **Add jitter:** `wait = Retry-After × (1 + random(0, 0.3))`.
3. **Cap at 3 retries** *for interactive clients* — the website's mode — then surface
   failure. **§3a:** unattended clients cap the *delay* (~300 s ceiling) and keep going.
4. **Missing/unparseable `Retry-After`:** exponential backoff from 2s, doubling, same cap
   and jitter. Never an immediate retry.
5. **Never a tight retry loop.** This is about the *interval*, not the attempt count — an
   unattended job holding at a 5-minute ceiling forever is fine; three retries with no
   delay is not.
6. **Never escalate concurrency** while backing off — no extra connections, no splitting
   the request into parallel pieces.
7. **Tell the user something true.** "The server is busy. Retrying in 10 seconds…", then
   "The server is currently busy. Please try again in a few minutes." Never render a shed
   request as a failed query, a network error, or — worst of all — **an empty result set**.
   A user who sees zero rows will believe their data is missing.

---

## 1. Shared retry utility

**New file:** `public/js/p3/util/retryRequest.js`

A single AMD module, dependency-light (`dojo/Deferred`, `dojo/topic`), wrapping any
promise-returning request function.

```javascript
// retryRequest(requestFn, options) -> promise
//   requestFn(attempt) -> promise, rejecting with an error carrying .status
//   options: {
//     mode: 'interactive',   // 'interactive' | 'unattended'  (spec §3 / §3a)
//     maxRetries: 3,         // interactive only
//     ceilingSeconds: 300,   // unattended only — hold here indefinitely
//     maxTotalWaitMs,        // unattended only — optional wall-clock budget
//     label: 'genome query'
//   }
```

**Behavior:**

- Resolve pass-through on success.
- Reject immediately — no retry, no banner — for any status **other than 429/503**,
  including 504 and 400.
- On 429/503:
  - read `Retry-After` (integer seconds); if finite and `>= 0`, use it;
    otherwise `2 * Math.pow(2, attempt)` seconds
  - **`interactive`:** honour that figure directly; if `attempt >= maxRetries`, publish
    `/throttle/failed` and reject with a throttle error carrying the spec's user-facing
    string
  - **`unattended` (§3a):** treat `Retry-After` as a **floor**, escalate
    `1–3: Retry-After · 4–6: 30 s · 7–10: 60 s · 11+: ceiling`, and hold at the ceiling
    indefinitely — give up only on `maxTotalWaitMs`
  - jitter every wait: `waitMs = baseSeconds * 1000 * (1 + Math.random() * 0.3)`
  - publish `/throttle/active` with `{ waitMs, label }`, wait, retry
- Publish `/throttle/resolved` on eventual success **and** on terminal failure, so the
  banner's active-counter is balanced on every exit path.

The website is `interactive` per the spec's per-client table, so `interactive` is the
default and is what every call site in this plan uses. `unattended` exists so the mode is a
parameter rather than a rewrite — see §4, where bulk downloads are the plausible first
`unattended` caller.

**Reading the status and header in Dojo 1.16.** `dojo/_base/xhr.js:631` copies
`error.status`, `error.responseText`, and `error.xhr` off `error.response` before
rejecting, so on a `rawXhrPost` rejection:

```javascript
err.status              // 429
err.xhr.getResponseHeader('Retry-After')
```

Both are available. `fetch` paths use `res.status` / `res.headers.get('Retry-After')`.
Because the two differ, `retryRequest` takes the status/header extraction as a small
adapter rather than assuming one shape.

**Counter balance is a correctness requirement, not a nicety.** Every `/throttle/active`
must be matched by exactly one `/throttle/resolved` or `/throttle/failed`, including when
the caller cancels the Deferred. An unbalanced counter leaves the banner pinned on screen
for the rest of the session.

---

## 2. One registration covers nearly all of it — `config-requestProvider`

**This replaces the original plan's "wrap each entry point, address widgets incrementally"
approach.** There *is* a unified internal path to the data API, and Dojo gives a documented
global override for it.

### Why this is the right layer

Transport inventory across `public/js/p3/` — 336 post/get call sites, **216 targeting the
data API**:

| import | count |
|---|---|
| `dojo/request` | **208** |
| `dojo/request/xhr` (direct) | 10 |

`dojo/request` is effectively universal. Of 28 `*MemoryStore.js` files, every one that
makes a request at all funnels through `request.post` in its own `loadData` (one uses
`request.get`) — including every uncapped `rows: 25000` store listed later in this plan.

### The hook, verified

1. `dojo/request.js` loads `'./request/default!'` — note the **empty** plugin id.
2. `request/default.js:6` reads `has('config-requestProvider')` and uses it as `defId`,
   falling back to `./xhr` only when unset. With an empty id it resolves `defId`, not the
   platform default.
3. `dojo.js:622` registers every `dojoConfig` key as a has-flag:
   `p != "has" && has.add("config-" + p, config[p], 0, booting)`.
4. `dojoConfig` is defined inline at `views/javascript.ejs:2`.
5. `release.profile.js:15` `staticHasFeatures` pins only `dojo-firebug`,
   `dojo-debug-messages`, `dojo-trace-api`, `dojo-log-api`, `async` — **not**
   `config-requestProvider`, so the production build will not constant-fold it away.

I traced the resolution logic to confirm the empty-id case picks our provider while
`registry.js`'s `'./default!platform'` still resolves to `./xhr` — so a registry-based
provider can delegate to the real transport without recursing into itself.

**New file:** `public/js/p3/util/throttledRequest.js`, registered as
`requestProvider: 'p3/util/throttledRequest'` in the `dojoConfig` at `views/javascript.ejs:2`.

Build it on `dojo/request/registry`: register a matcher for data-API URLs that wraps
`dojo/request/xhr` in `retryRequest`, and let everything else fall through to the registry's
own `./xhr` fallback untouched.

### Provider contract

Whatever is exported must be a drop-in for `dojo/request/xhr`:

- callable as `provider(url, options)`
- carry `.get` / `.post` / `.put` / `.del` — use `util.addCommonMethods(provider)`, which
  is exactly how `xhr.js` builds them
- return dojo's **dual promise**: the data promise *plus* a `.response` sub-promise
  (`request/util.js:146`). Delegating to `dojo/request/xhr` preserves this for free; a
  hand-rolled Deferred would not.

I checked for call sites depending on `.response` on a request promise: **zero**. (The
`response.response.docs` hits in `SubsystemServiceMemoryGridContainer.js` and
`SubSystemsMemoryGridContainer.js` are Solr payload shape, not the dojo property.)
Error objects already expose `.status` — `GridContainer.js:1599` reads `err.response.status`
today — so branching on 429/503 needs no change to error shapes.

### URL matching is mandatory, not optional

The matcher must fire **only** on data-API URLs (`window.App.dataAPI` /
`dataServiceURL`, whose deployed value is `/alpha/api`). Workspace RPC, app-service RPC,
Shock, and the user service must pass through untouched — they do not speak 429, their
`Authorization` schemes differ (see `CLAUDE.md`), and silently retrying a workspace write
is a different and worse problem than retrying a read.

### What this does *not* cover

Three gaps remain after the registration, and they are small and enumerable:

| gap | detail |
|---|---|
| `P3JsonRest` | uses `dojo.rawXhrPost` from legacy `dojo/_base/xhr` — a different module that never consults `config-requestProvider`. Needs its own wrap; see §2a. |
| `dojo/request/xhr` direct importers | 10 files. Only **2** touch the data API: `widget/search/SFVTSearch.js` and `widget/viewer/SystemStatus.js`. The rest are JobManager, WorkflowManager, SEEDClient, FASTA, the three outbreak dashboards, and a test — none data-API. Either switch those two to `dojo/request` or wrap them individually. |
| downloads | `form.submit()` / `window.open()` are not XHRs at any layer. See §4. |

### Status: prototyped and confirmed working

Run against the dev server (`npm start`, **HTTPS** on :3000) with headless Chrome over CDP,
loading `/view/GenomeList/?eq(genome_status,Complete)` on both the genomes and features
tabs. A pass-through instrumented provider was registered as
`requestProvider: 'p3/util/throttledRequest'` and the page exercised end to end.

Results:

- **The provider is invoked.** 52 `dojo/request` calls intercepted on first load; the grid
  rendered **200 rows** normally with the provider in the path.
- **The dual `.response` promise survives** delegation (`sawResponsePromise: true`) — grid
  paging, sorting and `Content-Range` totals all intact.
- **Matching works.** 2 data-API calls matched; the other 50 (dijit/p3 HTML templates) fell
  through untouched.
- **CDP initiator stacks confirm the three-way split exactly as predicted** — no new gap:

  | # | request | initiator | covered? |
  |---|---|---|---|
  | 1 | `GET genome/?…facet(…)` | `FilterContainerActionBar.js:1205` → **provider** | ✅ §2 |
  | 2 | `POST genome/` | `P3JsonRest.js:111` → `dojo/_base/xhr.js:651` | ❌ §2a |
  | 3 | `GET genome/?…select(genome_id)` | `bvbrc_client.js` → `GenomeList.js:49` | ❌ §3 |
  | 4 | `GET data/taxon_category/` | `GenomeList.js:60` → **provider** | ✅ §2 |

  The features tab produced the identical pattern against `genome_feature`.

So §2 + §2a + §3 together are **complete coverage of the XHR surface** on these pages —
the two uncovered requests are precisely the two this plan already carves out, and nothing
else escaped. Downloads (§4) remain outside any of it.

Two environment notes for whoever picks this up: the dev server is **HTTPS**, not HTTP
(`curl http://…` returns nothing and looks like a dead server), and it binds IPv6 — use
`https://127.0.0.1:3000`.

The prototype lives at `public/js/p3/util/throttledRequest.js` and is **instrumentation
only** — it counts and classifies, then delegates. The `retryRequest` call goes where the
comment marks it at line 38.

---

## 2a. `P3JsonRest` — the one store that bypasses the provider

**File:** `public/js/p3/store/P3JsonRest.js` (the `rawXhrPost` at **line 112**)

21 grid stores extend `P3JsonRest`, and it is the single funnel for their queries. It needs
its own wrap because it uses `dojo.rawXhrPost` from **legacy `dojo/_base/xhr`** — a separate
module from `dojo/request` that never consults `config-requestProvider`, so §2's
registration does not reach it. It is the only `rawXhrPost` call site in the codebase.

Wrapping it is **not** the drop-in the original draft implied:

> **Hazard: `results.total` reaches through the Deferred into `results.ioArgs`.**
>
> ```javascript
> var results = dojo.rawXhrPost({...}, true);
> results.total = results.then(function () {
>   var range = results.ioArgs.xhr.getResponseHeader('Content-Range');   // line 123
>   if (!range) range = results.ioArgs.xhr.getResponseHeader('X-Content-Range');
>   return range && (range = range.match(/\/(.*)/)) && +range[1];
> });
> ```
>
> `ioArgs` is a property of the **specific Deferred that `rawXhrPost` returned**. A naive
> `retryRequest(function () { return dojo.rawXhrPost(...) })` returns a *new* promise with
> no `ioArgs`, so `results.ioArgs.xhr` throws and **every grid loses its total row count** —
> on the success path, with no 429 involved. `PageGrid.js:140` consumes `results.total`.

So the wrapper must either:

- **(a)** carry the winning attempt's `ioArgs` onto the returned Deferred, or
- **(b)** have `retryRequest` resolve with `{ data, xhr }` and let `P3JsonRest` read
  `Content-Range` off the passed-through `xhr`.

**(b) is preferred** — it is explicit, and it drops `P3JsonRest`'s reliance on the
`ioArgs` back-channel rather than preserving it. Either way, `QueryResults(results)` must
still receive a `total` property.

Also note `rawXhrPost` is called with the second argument `true` (returns the raw Deferred,
not the handled one). Preserve that.

**Cancellation.** Grids abandon in-flight queries when the user re-sorts or re-filters. The
wrapper must propagate `.cancel()` to the in-flight XHR **and** clear any pending
`setTimeout`, or a cancelled query will still fire its retry — exactly the "do not escalate
concurrency" violation the spec prohibits.

---

## 3. `BVBRCClient` — the `fetch` path

The third transport, and the other thing §2's registration does not reach: `fetch` is not
`dojo/request`.

**Source:** `public/js/bvbrc_js_client/src/index.js` — four `fetch()` sites at lines
**54, 124, 162, 448**. Line 124 (`query`) is the one that matters.

> **Build hazard: `dist/` is a generated, minified bundle and `node_modules/` is absent.**
> `package.json` builds it with `browserify -p tinyify … | derequire`. The original draft
> listed `dist/bvbrc_client.js` as the file to modify — **editing the minified bundle by
> hand is not acceptable**; it would be silently reverted by the next build. This also means
> the change cannot be made and tested without first running `npm install` in that
> directory.

Two options:

- **(a)** Edit `src/index.js`, run the build, commit both. Correct, but adds a build step
  and the bundle churns in the diff.
- **(b)** Leave the client alone for now and wrap at the **consumer**: `public/js/p3/DataAPI.js`
  is a five-line module returning the singleton, and every widget imports *that*. A wrapping
  layer there covers all callers without touching the vendored bundle.

**Recommend (b) for the first pass**, with (a) as the follow-up so the client is correct for
non-website consumers. Flagging this as a decision point for review — (b) is faster and
lower-risk; (a) is where the fix ultimately belongs.

Note the client currently throws `Error(response.statusText)` with the status discarded, so
either path needs the status preserved for `retryRequest` to branch on.

---

## 4. Downloads — the case that actually matters

**This is the gap in the original draft.** Downloads are the most likely requests to be shed,
and they **cannot be retried by any wrapper**, because they are not XHRs:

| file | mechanism |
|---|---|
| `widget/DownloadTooltipDialog.js:112-125` | builds a hidden `<form method="post">` and calls `form.submit()` |
| `widget/AdvancedDownload.js:119` | `form.submit()` |
| `widget/actions/TableDownload.js:42` | `window.open(url)` |

A form submit hands the response to the **browser**, not to JS. On a 429 the user gets a
browser-rendered JSON error page or a failed download, with no way to intercept, no retry,
and no banner. `DownloadTooltipDialog.js:106` requests `limit(2500000)` — unambiguously
"heavy" by the spec's classification, so this is the **most** likely path to be shed and
the **least** able to cope.

Options, in increasing order of effort:

1. **Preflight probe.** Before submitting the form, issue a cheap XHR (e.g. `limit(1)`)
   through `retryRequest`. If it comes back 429, show the banner and back off rather than
   submitting; submit only once the probe succeeds. Cheap, but racy — the probe succeeding
   does not guarantee the real download is admitted, and it adds a round trip to every
   download.
2. **Convert to XHR + Blob.** Fetch with `responseType: 'blob'`, then trigger a save via
   an object URL. Makes downloads fully retriable and bannerable, but changes memory
   behavior for large files and loses the browser's native download progress UI. A 2.5M-row
   CSV held in memory as a Blob is a real concern.
3. **Accept the gap for v1**, document it, and handle downloads in a follow-up.

**Recommendation: (3) for the initial PR, (2) as the follow-up**, with the limitation stated
explicitly in the PR description rather than left implicit. (1) looks attractive but buys
little for its cost. **This is the main open decision in this plan.**

---

## 5. User-visible state

**New file:** `public/js/p3/widget/ThrottleBanner.js`

Subscribes to `/throttle/active`, `/throttle/resolved`, `/throttle/failed`; keeps a counter
of in-flight throttled requests; shows while `> 0`.

- **Active:** amber bar — *"The server is busy. Retrying in N seconds…"* with a live
  countdown, which is what makes a 10s pause read as progress rather than a hang (the spec
  calls out silent pauses looking like hangs for CLI tools; the same applies here).
- **Exhausted:** *"The server is currently busy. Please try again in a few minutes."*
- Non-blocking; the user can keep navigating. Auto-dismiss the resolved state after a few
  seconds; keep the exhausted state until dismissed.

**Mounting.** The original draft said to place it "after the header" in `p3app.js`. There is
no existing banner or toast infrastructure to reuse — I checked; `p3app.js` has no
`region: 'top'` chrome and no toaster. The simplest correct approach is a
`domConstruct.create` into `document.body` with fixed positioning, following the existing
`ShowChatRectButton` pattern at `p3app.js:59-67`, rather than inserting a region into a
`BorderContainer` and forcing a relayout of every page.

**Grids must not render a shed request as an empty grid.** This is the spec's sharpest
requirement and it is *not* satisfied by the banner alone — if the store rejects, the grid
needs to show a busy/error state rather than "no data." Worth confirming during
implementation what each grid currently does with a rejected query.

---

## Interaction with the `rows >= 10000` truncation bug — **now fixed**

JIRA-4420: the data API returned **HTTP 200 with a one-byte body `[`** at `rows >= 10000`,
which then failed JSON parsing. `HomologyResultMemoryStore` was capped to
`Math.min(ids.length, 9000)` as a workaround (`073ee8da2`).

**The server-side bug is fixed and the cap can be lifted.** Root cause was
`ShardCursorStream` sending each cursor page as a **GET**, so a large filter hit Jetty's
`requestHeaderSize` (~8 KB). It now POSTs a form-encoded body. Confirmed on alpha with the
shape that used to fail — 3,000 feature ids, a 153 KB filter body, `limit(25000)` — both
`in()` and `terms()` returning 200 / 2,546,003 bytes / 3,000 docs, byte-identical, parsing
clean. I separately swept production and alpha at `rows` = 9999 / 10000 / 15000 / 20000 /
25000 / 50000 / 100000: all valid JSON, no `[`.

Regression gate: `tests/test-distributed/test.shardcursor-post.spec.js` (9 tests, all 9 fail
against the pre-change module).

### What the fix does and does not change here

- The truncation bug was a **200**, so `retryRequest` never would have touched it. Unchanged.
- **The 9000-row cap is no longer load-bearing** and can be raised.
- **The cap only ever landed in one store.** `CLAUDE.md` reads as though it were applied
  broadly; it was not. Still at hardcoded `rows: 25000`, every one of them heavy-classified
  and a shed candidate under this spec:

  | file | sites |
  |---|---|
  | `store/BlastResultMemoryStore.js` | 120 — same decoration pattern as Homology; *does* have an error handler, so it degrades rather than hangs, but was never capped |
  | `store/IDMappingMemoryStore.js` | 194, 223, 308, 332 |
  | `store/ProteinFamiliesServiceMemoryStore.js` | 419 |
  | `widget/SubsystemServiceMemoryGridContainer.js` | 307, 384, 489, 541 |
  | `widget/SubSystemsMemoryGridContainer.js` | 344, 421, 526, 578 |
  | `widget/PathwayMapKegg.js` | 269, 301, 372 |
  | `widget/DataItemFormatter.js` | 313, 341 |
  | `widget/SubsystemMapHeatmapContainer.js` | 237, 279 |

  These look like cargo-culted ceilings rather than considered limits. **Bounding them by
  actual id count the way Homology now is would drop most below the heaviness threshold and
  remove them as shed candidates entirely** — cheaper than retry logic for those paths, and
  worth doing before adding `retryRequest` coverage to them.

### Three things for whoever lifts the cap

1. **The regression is currently unreachable through normal traffic.**
   `Limiter.detectFixedIdCount` caps a fixed-id query to `idCount + 10`, dropping it below
   `minLimitThreshold` — so neither verification request above engaged the distributed path
   at all. That cap now covers `terms()` as well as `in()`. Consequence: a future change
   re-enabling the GET path would **pass every functional test** and break only under a
   specific combination. The spec gate is what holds the line — per the API's `CLAUDE.md`,
   *"do not delete it on the grounds that the bug is unreachable."*
2. **Raising a store above 10,000 routes it through the distributed path for real** — which
   is exactly where the 8 KB ceiling lived. Lifting the cap should be accompanied by an
   actual large-filter integration test, not just the unit gate.
3. **Raised stores become shed candidates** and need `retryRequest` coverage — and for a
   pipeline-style store, **unattended mode (§3a), not the 3-retry interactive cap.**

---

## Explicitly out of scope for the first pass

- **The 8 remaining `dojo/request/xhr` direct importers that don't touch the data API** —
  JobManager, WorkflowManager, SEEDClient, FASTA, the three outbreak dashboards, a test.
  (The 2 that *do* — `SFVTSearch.js`, `SystemStatus.js` — are in scope; see §2.)
- **Workspace / app-service RPC.** Different services, not covered by the spec. No change
  unless they adopt 429. The §2 matcher must explicitly *not* catch them.
- **Server-side changes.** The Express layer proxies `/alpha/api` via `express-http-proxy`
  (`app.js:103-115`), which passes responses through without filtering headers, and the API
  is same-origin through that proxy — so `Retry-After` is readable without
  `Access-Control-Expose-Headers`. **Verify this in the browser rather than assuming it**;
  it is a one-line check and the whole mechanism depends on it.

Note the original draft deferred "scattered direct `xhr.get()` calls in widgets" as a
known gap. §2 closes that: those are `dojo/request` under a local alias `xhr`, so the
provider registration covers them.

---

## Files

**Create**

| file | purpose |
|---|---|
| `public/js/p3/util/retryRequest.js` | retry core: `Retry-After`, jitter, interactive cap / unattended ceiling, 429+503 only |
| `public/js/p3/util/throttledRequest.js` | `dojo/request` provider — registry matcher on data-API URLs, delegating to `dojo/request/xhr` through `retryRequest` |
| `public/js/p3/widget/ThrottleBanner.js` | busy state + countdown |

**Modify**

| file | change |
|---|---|
| `views/javascript.ejs` | add `requestProvider: 'p3/util/throttledRequest'` to the `dojoConfig` at line 2 |
| `public/js/p3/store/P3JsonRest.js` | wrap line 112 (`rawXhrPost`, bypasses the provider); rework the `results.total` / `ioArgs` coupling |
| `public/js/p3/DataAPI.js` *or* `bvbrc_js_client/src/index.js` | 429 handling for the `fetch` path (see §3) |
| `public/js/p3/widget/search/SFVTSearch.js`, `widget/viewer/SystemStatus.js` | the 2 data-API `dojo/request/xhr` direct importers — switch to `dojo/request` or wrap |
| `public/js/p3/app/p3app.js` | instantiate `ThrottleBanner` |

**Not modified:** `GridContainer.js`, `PageGrid.js` (retries are transparent below them),
`app.js`, and — the point of §2 — **none of the ~200 widget-level `request.post`/`request.get`
call sites.**

---

## Verification

Simulate with a test middleware in the Express proxy returning 429 + `Retry-After: 10` for a
fraction of `/api/` requests; the API side has
`node scripts/verify-protections.js <endpoint> --expect-429 --concurrency 40`.

1. **`Retry-After` is honoured — measure, don't eyeball.** With `Retry-After: 10`, the gap
   between attempts must be **10–13s** (10s + up to 30% jitter), never less. The spec is
   blunt that a client "handling" 429 by retrying after 100ms is worse than one that fails
   immediately. This is the test that actually matters.
2. **Jitter is present.** Across ~20 shed requests the delays must differ. Identical delays
   mean jitter is missing even if the mean is right.
3. **Interactive cap holds at 3.** Four attempts total, then the exhausted message. Not 4
   retries. If an `unattended` call site exists, separately confirm it escalates to the
   300 s ceiling and *keeps going* rather than stopping.
4. **504 and 400 are not retried.** One attempt, straight to the error path, no banner.
5. **503 behaves exactly as 429.**
6. **Concurrency does not rise while backing off.** Watch the network panel across several
   simultaneously-shed grids; in-flight count must not exceed the pre-429 count.
7. **No empty-grid rendering.** A shed query must leave a busy/error state, never "0 rows."
8. **`results.total` still populates on the success path** — the non-429 regression risk
   from §2a. Check the grid row count with no throttling in play at all.
9. **Cancellation.** Re-sort a grid mid-backoff; the pending retry must not fire.
10. **Banner counter balances.** After a mixed run of successes, retries, and exhaustions,
    the banner must end hidden.

### Provider-specific checks (§2)

11–13 are **done** — see "Status: prototyped and confirmed working" in §2. Provider is
invoked, matching is correct, dual `.response` promise survives, grid renders 200 rows.
Re-run them after `retryRequest` is wired in, since the prototype only passed through.

14. **Production build parity — DONE, passes.** See "Phase 0 result" below.
15. **Workspace/app-service RPC bypass.** The prototype confirmed template fetches fall
    through, but no workspace RPC fired on the pages tested — the dev session could not
    reach the workspace manager (`Unable to initialize workspace manager` in console).
    Verify logged in, against a page that actually issues one.

### Phase 0 result: the provider survives the production build

Tested against `production: true` with the server serving the **built layers** from
`public/js/release/` (`/js/3.60.5/...`, boot path `require(["p3/layer/core"])`).

Two independent confirmations:

**1. The hook is intact in the built layer.** `dojo/request/default` is bundled into
`p3/layer/core.js` with its config check *unevaluated*:

```javascript
'dojo/request/default':function(){ define([...], function(exports, require, has){
  var defId = has('config-requestProvider'), platformId;
  if( 1 || has('host-webworker')){ platformId = './xhr'; }   // host-browser folded to 1
  ...
  if(!defId){ defId = platformId; }
```

The build folded `has('host-browser')` to a literal `1` but left
`has('config-requestProvider')` as a **runtime** lookup — exactly what this depends on.

**2. End-to-end behavior is identical to dev.** CDP initiator stacks against the built
layer reproduce the same four requests and the same three-way split, with the provider in
the path:

```
[1] GET  genome/?…facet(…)        p3/layer/grids.js:111  → provider ✅
[2] POST genome/                  p3/layer/grids.js:289  → dojo.js rawXhrPost  ❌ §2a
[3] GET  genome/?…select(genome_id)  bvbrc_client.js     ❌ §3
[4] GET  data/taxon_category/     GenomeList.js:60       → provider ✅
```

200 grid rows rendered, `sawResponsePromise: true`. No new bypass appeared under the build.

**Module availability is not a concern.** `app.js:207-210` mounts the versioned path with
**two** static roots — `public/js/release/` first, then `public/js/` as fallback. A new
`p3/util/*.js` module resolves either way: verified serving from `release/`, then deleted
that copy and confirmed it still loads (HTTP 200) and still works from the source tree.
So the provider does not have to be in a built layer to work in production.

**Caveat on what was tested.** This used the *existing* `release/` tree (built 2026-09-08),
not a fresh `buildClient.sh` run — a full build would also move the archaeopteryx submodule
off its current modified state and rebuild Auspice, which was out of scope for a
feasibility check. What matters here is how the Dojo builder treats
`config-requestProvider`, and that is settled by the bundled source above. Re-confirm after
the next real build.

**Verdict: Phase 0 passes. Proceed with the §2 provider design.** The fallback plan
(wrap `P3JsonRest` + client only, accept the widget gap) is not needed.

Tests 8, 9, and 14–15 are regression and feasibility checks on paths that work today; 1 and
2 are the ones that determine whether this helps or harms the server.
