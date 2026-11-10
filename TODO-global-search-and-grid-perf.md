# TODO — Global Search & Grid Performance

Consolidated from the 2026-07-31 investigation (Cloudflare data-API connectivity test →
global-search performance analysis). Backing detail:
`query-logs/REPORT-global-search-performance.md` and memory `project_global_search_join`.

Environments referenced:
- **prod** = www.bv-brc.org (3.58.4, production data API) — does NOT have the genome-join code
- **alpha** = alpha.bv-brc.org (3.59.1, production-like API) — newer code, WITHOUT distributed-query changes
- **test** = localhost:3000 (3.59.1, same API as alpha) — newer code, WITH distributed-query changes

**Alpha-merge status** is called out per item (verified against `alpha/alpha` on 2026-07-31):
- The two ✅ code changes live on `feature/global-search-incremental` and are **NOT yet merged to alpha**.
- The client-side TODO *fixes* are **not on alpha** — i.e. the underlying problems (join on count
  fan-out, join-key shadowing, GridContainer double-fetch, broken eslintrc) are all still present on alpha.

---

## ✅ Done (branch `feature/global-search-incremental`, off `alpha`)

- [x] **Incremental global-search rendering** (`4b925a2f9`) — **Alpha: NOT merged** (on `feature/global-search-incremental`)
  `public/js/p3/widget/AdvancedSearch.js`. Replaced the single batched `query/` POST (awaited all
  15 categories → page blocked ~16–20s on the slowest) with 15 independent per-category requests.
  Skeleton with spinners paints immediately; each cell + Top Matches block fills as its own
  response arrives. Fastest-first issue order (`resultFetchOrder`), slow join categories
  (genome_feature, sp_gene) last. Per-search token discards superseded responses; failed
  categories show `—`. Verified against test API: fast cells ~3s, join cells ~13s, no console errors.

- [x] **Fixed-width count-grid columns** (`6ee3326fc`) — **Alpha: NOT merged** (on `feature/global-search-incremental`)
  `table-layout:fixed; width:100%` + `33.33%` cells + ellipsis, so columns don't reflow as
  results arrive. Verified: column left/width identical loading vs loaded.

---

## 🔧 Client-side, outstanding (this repo)

- [ ] **Drop the genome-join on the global-search COUNT fan-out**
  **Alpha: fix NOT merged — problem present on alpha** (join code shipped in PR #1330).
  `public/js/p3/util/buildGlobalSearchQuery.js`. The `genome(and(gt(completion_date,NOW-1YEARS),
  ne(genome_status,Deprecated)))` crossCollection join was added (PR #1330) to speed up large-taxa
  *grid reads*, but Top Matches only needs `numFound`. On the count fan-out the join is net-negative:
  genome_feature ~16.8s / sp_gene ~20.5s (test) vs 2.3s / 7.4s bare (prod). Issue bare counts for
  Top Matches; keep the join for the actual scoped list/grid views where it pays off.
  → Complements the incremental rendering above: incremental hides the perceived stall; this removes
  the actual cost.

- [ ] **Fix the dead-code join-key shadowing for protein_feature / protein_structure**
  **Alpha: fix NOT merged — problem present on alpha** (shipped in PR #1330).
  `buildGlobalSearchQuery.js`. Both targets are in BOTH `genomeScopeOnlyTargets` and
  `wrappedPropByTarget`. The `genomeScopeOnlyTargets` branch is checked first and returns, so the
  intended typed join (`to(protein_feature_id)` / `to(protein_structure_id)` via
  `wrapGenomeScopedQuery`) is unreachable — those cores get a generic `genome_id` join instead.
  Decide correct join key WITH the data-API session (changes emitted Solr), then either remove them
  from `genomeScopeOnlyTargets` or reorder the dispatch.

- [ ] **Suppress the unfiltered construction-time grid query (GridContainer double-fetch)**
  **Alpha: fix NOT merged — problem present on alpha** (long-standing, also on `main`).
  `public/js/p3/widget/GridContainer.js` `startup()` (~2161). On genome-view tab load the grid
  queries twice: once at construction with NO genome filter (an UNFILTERED query over the whole
  collection — captured `protein_structure` returning `0-200/32,167,507`), then again with
  `eq(genome_id,…)` once state applies. The browser `net::ERR_ABORTED` on the first is cosmetic —
  it does NOT shed backend work (see server item below). Fix: don't issue the grid query until the
  state-derived query is set (construct with no query / guard `onFirstView` when state is pending).
  Likely affects all grid tabs; cost scales with collection size.

- [x] **Fix broken `.eslintrc.json` + mute legacy debt + align ecmaVersion**
  **Done on branch `fix/eslint-config` (off `alpha`), NOT yet merged/pushed.** Three commits:
  (1) removed invalid `_comment_reactivate_later` rule key (severity was `"block-scoped-var"` not
  0/1/2 → ESLint failed config validation for every file, so lint ran on nothing); (2) muted
  ~16.4k pure-formatting/`strict` findings, keeping correctness rules (no-undef, no-unused-vars,
  etc.) → 16,768 → ~400 real findings; (3) `ecmaVersion` 8 → 2020 to match the browser runtime for
  raw-served modules (see build-target note below). Result: `eslint public/js/p3` runs with 0 parse
  errors, all real signal.

- [ ] **Make `buildClient.sh` fail when the underlying Dojo/Closure build fails**
  **Alpha: NOT done — present on alpha and main.** `buildClient.sh` is `#!/bin/sh` with no
  `set -e`. It calls `./util/buildscripts/build.sh --profile ./release.profile.js --release` at
  line ~46 and then unconditionally continues (`echo "Finished Dojo build"`, the Auspice build,
  `echo "Done"`) without checking `$?`. `build.sh` DOES return the Dojo builder's exit code (its
  last statement is the `node`/`java` build invocation), so the failure is available — it's just
  ignored. Consequence: a broken optimize step (e.g. Closure choking on syntax it can't parse)
  leaves a **stale/unoptimized release on disk** while the script reports success. Fix: add
  `set -e` (and/or explicit `|| exit 1` after the build.sh call and the make_bundle2.sh call), so a
  non-zero build aborts with a non-zero exit. Verify the Dojo builder actually returns non-zero on
  optimize errors (it logs `error(...)` lines in build-report.txt — confirm those propagate to the
  exit code, since Dojo sometimes logs errors but exits 0).

- [ ] **CI guard: catch ES2020+ syntax landing in statically-layered modules**
  **Alpha: NOT done.** Latent gap exposed by the ecmaVersion work. The bundled Closure compiler
  (`public/js/util/closureCompiler/compiler.jar`, **v20200112**) maxes out at `ECMASCRIPT_2019` and
  cannot parse ES2020 syntax (optional chaining `?.`, nullish `??`). `release.profile.js` sets
  `languageIn: ECMASCRIPT_2019`. Raw/dynamically-loaded modules (e.g. `viewer/SFVT.js`, loaded via
  `'p3/widget/viewer/' + type` in `p3app.js`) bypass Closure and can safely use ES2020 — but if
  ES2020 syntax lands in a **statically-layered** module, it will break the Closure build. Once the
  build-fails-on-error item above is done, that break becomes visible; a cheaper early guard would
  be an ESLint override capping `ecmaVersion` at 2019 for the layered subset, or a grep check for
  `?.`/`??` in layered paths. (Longer term: upgrade the Closure jar to a version supporting ES2020,
  which would let the whole app move to ES2020 — but that's a broad recompile with QA risk.)

---

## 🗄️ Backend / data-API session (separate Claude context)

_These live in the data_api service repo, not this web repo, so "alpha merge" refers to which
data-API backend exhibits the behavior. alpha + test are pointed at the same production-like API;
the distributed-query changes are deployed on the **test** backend only, not alpha's._

- [ ] **protein_feature distributed-query regression**
  **Backend: regression present on the distributed-query (test) backend only; alpha backend is fine (29ms).**
  Identical Solr query (byte-for-byte params) is **29ms on alpha vs 15,675ms on test**, both
  returning 0. Regression is entirely in the distributed-query backend path, not the query.
  Runnable queries + bisection cases + questions are in
  `query-logs/REPORT-global-search-performance.md` (section "🔴 protein_feature regression").
  Key question: why does protein_feature regress 540× while the structurally identical
  protein_structure join *improves* 870× (9.6s→11ms) on the same stack?

- [ ] **genome_feature (16.8s) / sp_gene (20.5s) join cost**
  **Backend: slow on both alpha and test backends** (distributed-query changes barely help; still 16–26s).
  Distributed-query changes barely help these (vs the 28–870× wins on pathway/subsystem/
  protein_structure). Determine whether the crossCollection join can be pushed down / cached for
  these cores the way it is for the others. (Client-side mitigation above may make this moot for
  Top Matches, but the join still matters for scoped grid views.)

- [ ] **(Defense-in-depth) Make client abort shed backend work**
  **Backend: not implemented on any backend** (no res.on('close') / Solr timeAllowed anywhere).
  data_api `querySOLR` (paginated path) has no `res.on('close')` / `req.aborted` handling, so a
  browser abort never destroys the upstream Solr socket and Solr has no `timeAllowed` /
  task-cancellation — aborted queries run to completion. Adding `res.on('close')` → destroy Solr
  socket, plus Solr `timeAllowed`, would cap wasted work. Note: the client GridContainer fix above
  is the real remedy; this only limits damage.

---

## Notes / non-issues (ruled out during investigation)

- Cloudflare is NOT implicated anywhere: all envs returned via CF (`server: cloudflare`, `cf-ray`),
  all HTTP 200 / Solr status:0. All slow times are Solr `QTime` (server compute), not edge latency.
- Empty categories (strain/serology/surveillance, sometimes protein_structure) are near-instant
  zeros → unpopulated cores in that dataset, not bugs.
- The genome-join code is on alpha + feature branches only, NOT on `main` — so prod is unaffected
  by the count-fan-out slowdown today; it ships when the alpha line is released.
