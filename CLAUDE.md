# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BV-BRC Web is the Bacterial and Viral Bioinformatics Resource Center website - a Node.js/Express.js web application for bioinformatics data visualization and analysis.

## Common Commands

```bash
# Start development server (port 3000)
npm start

# Run tests (ESLint + Jest)
npm test

# Run ESLint on p3 widget code
./node_modules/.bin/eslint public/js/p3

# Run ESLint with auto-fix
./node_modules/.bin/eslint --fix <file>

# Initialize git submodules (required after clone)
git submodule update --init

# Build the optimized client (Dojo build via Closure) for production
./buildClient.sh
```

## Production Build (`buildClient.sh`)

`buildClient.sh` produces the optimized `public/js/release/` layers served in production (the
versioned `js/<version>/` paths). It pins the Archaeopteryx submodule, regenerates `bundle2.js`,
then runs the Dojo build: `public/js/util/buildscripts/build.sh --profile ./release.profile.js
--release`, which optimizes layers with the Closure compiler.

**ES version constraint (important):** The bundled Closure compiler
(`public/js/util/closureCompiler/compiler.jar`) is **v20200112**, whose max `--language_in` is
`ECMASCRIPT_2019` — it **cannot parse ES2020 syntax** (optional chaining `?.`, nullish `??`).
`release.profile.js` sets `languageIn: ECMASCRIPT_2019`, `languageOut: ECMASCRIPT_2018`.
- **Statically-layered modules** (reachable via static `require`/`define` arrays) go through Closure
  → must stay within **ES2019**. Adding `?.`/`??` to one of these breaks the build.
- **Dynamically-loaded / raw-served modules** (e.g. viewers loaded via `'p3/widget/viewer/' + type`
  in `p3app.js`, like `viewer/SFVT.js`) bypass Closure and are served raw to the browser, so they
  may use ES2020+ (the browser supports it). This is why ESLint's `ecmaVersion` is set to 2020 (it
  lints both sets; the runtime/browser is the real target for raw-served files) while the build
  stays at ES2019.

**Known caveat — build failures are currently silent:** `buildClient.sh` (`#!/bin/sh`, no `set -e`)
does not check the exit code of `build.sh`, so a failed optimize step leaves a stale/unoptimized
`release/` on disk while the script still prints "Done". Treat a build as suspect unless you confirm
`build-report.txt` is clean. (Tracked in `TODO-global-search-and-grid-perf.md`.)

## Architecture

### Backend (Express.js)
- **Entry point:** `bin/p3-web` - Server initialization with SSL support
- **App config:** `app.js` - Express middleware stack, routes, error handling
- **Config:** `config.js` + `p3-web.conf` - nconf-based configuration (argv → env → file → defaults)
- **Routes:** `routes/` - Express route handlers
- **Views:** `views/` - EJS templates
- **Security:** `lib/securityUtils.js` - Input sanitization utilities

### Frontend (Dojo Toolkit)
- **Location:** `public/js/p3/` - Main application code
- **Framework:** Dojo 1.x AMD modules (legacy)
- **Key directories:**
  - `widget/` - UI components (dijit-based)
  - `widget/viewer/` - Data visualization viewers
  - `store/` - Data stores (JsonRest, Memory)
  - `resources/` - CSS stylesheets

### `bvbrc_js_client` is vendored, not an npm dependency

`public/js/bvbrc_js_client/` holds real, tracked files. It **was** a symlink to
`node_modules/bvbrc_js_client` installed from `github:bv-brc/bvbrc_js_client` — git tracked
the symlink and nothing inside it, so the client's source was not editable from this repo
at all. Upstream has been dormant since 2021-08-10 (the pinned SHA was also HEAD of
`main`), and BV-BRC-Web is its only consumer, so it was vendored. **This copy is the source
of truth**; upstream is not kept in sync.

`dist/bvbrc_client.js` is generated and must not be hand-edited. After changing `src/`:

```bash
cd public/js/bvbrc_js_client && npm install && npm run build   # commit dist/ too
```

Two traps, both documented in that directory's README:

- **`node-fetch` is pinned to `^2.7.0` on purpose.** The original `>=2.6.1` resolved to 3.x,
  which is ESM-only and unparseable by browserify — and because the build pipes through
  `derequire`, the failure **truncated `dist/bvbrc_client.js` to zero bytes** rather than
  leaving the previous bundle intact.
- **`.gitignore` has bare `src/` and `test/` rules** (unanchored, so they match at any
  depth) which silently swallowed the vendored package's own source. They are re-included
  explicitly. Worth knowing before vendoring anything else.

### Widget Pattern
Widgets follow Dojo's dijit pattern:
```javascript
define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', ...
], function (declare, BorderContainer, ...) {
  return declare([BorderContainer], {
    // Properties
    region: 'center',

    // Lifecycle methods
    postCreate: function() { this.inherited(arguments); },
    startup: function() { this.inherited(arguments); },

    // Custom methods
    _setStateAttr: function(state) { ... }
  });
});
```

### GridContainer Pattern
Data grids extend `GridContainer` (a BorderContainer) with:
- `gridCtor` - The grid class to instantiate
- `dataModel` - API endpoint name
- `store` - Data store instance
- `onFirstView()` - Called when tab first becomes visible
- `onSetState()` - Called when state changes (via watcher)
- `buildQuery()` - Constructs RQL query from state

### Topic-based Communication
Components communicate via `dojo/topic`:
```javascript
// Publish
Topic.publish('/domainGrid/select', { ids: selectedIds });

// Subscribe
Topic.subscribe('/domainViewer/hover', function(data) { ... });
```

## Key Patterns

### BorderContainer Layout
Dijit's BorderContainer is the primary layout widget. Key concepts:

**Design modes:**
- `design: 'headline'` (default) - Top/bottom regions span full width, left/right fit between
- `design: 'sidebar'` - Left/right regions span full height, top/bottom fit between

**Layout priority:**
Higher `layoutPriority` values position widgets closer to the center. Example:
```javascript
// Right panel (lower priority, laid out first, spans to edge)
rightPanel: { region: 'right', layoutPriority: 3 }

// Top visualization (higher priority, laid out after, aligns with center content)
visualization: { region: 'top', layoutPriority: 5 }
```

**ContentPane in BorderContainer:**
When adding custom panels to a BorderContainer:
```javascript
// Extend ContentPane, not plain widget
return declare([ContentPane], {
  region: 'top',
  style: 'height: 250px; overflow-y: auto;',
  layoutPriority: 5,
  splitter: false
});

// Add as child (not placeAt)
this.addChild(this.visualizationPanel);
```

### State Management
Viewer tabs receive state via `set('state', stateObj)` which triggers:
1. `_setStateAttr` (if defined) or default setter
2. Watcher callback (`watch('state', ...)`) calling `onSetState`
3. Grid query rebuild and refresh

### Data API Queries
Use RQL (Resource Query Language):
```javascript
// Single item
'eq(feature_id,PATRIC.123.456)'

// Multiple conditions
'and(eq(genome_id,123),gt(score,0.5))'

// With filters
state.search + '&' + state.hashParams.filter
```

### HTTP 429/503 throttling: three transports, one contract (PRs #1465, #1467)

The Data API sheds load with `429` (and `503`) carrying `Retry-After`. The normative client
contract is [`BV-BRC-API/Docs/CLIENT-429.md`](https://github.com/BV-BRC/BV-BRC-API/blob/alpha/Docs/CLIENT-429.md);
**the API ships with admission control disabled until clients implement it.**

The rule is not "retry on 429" — it is *back off by the amount the server asked for, and
give up rather than hammer*. Retry amplification caused the 2026-06-05 coordinator crash.

`util/retryRequest.js` implements it: honour `Retry-After`, **jitter every wait by up to
+30%**, cap at 3 retries (interactive) or hold at a 300 s ceiling indefinitely
(`mode: 'unattended'`, spec §3a), retry **429/503 only**, floor every delay at 1 s. It
publishes `/throttle/{active,retrying,resolved,failed}`, which `widget/ThrottleBanner.js`
renders as a countdown. All of it is gated on the **`enableThrottleRetry`** config flag
(default `false`).

**504 and 400 are deliberately not retried.** A 504 means the query was too expensive, so
retrying repeats the cost; a 400 is a permanent refusal of that query.

#### There is no single request funnel — there are three

Knowing which transport a call uses determines whether it has 429 handling:

| transport | how it gets coverage |
|---|---|
| `dojo/request` (the overwhelming majority of p3 imports — ~216 vs ~13 files importing `dojo/request/xhr`) | `util/throttledRequest.js`, registered as `requestProvider` in the `dojoConfig` at `views/javascript.ejs` — covers every call site with **no edits to any of them** |
| `store/P3JsonRest.js` | uses `dojo.rawXhrPost` from legacy `dojo/_base/xhr`, which **never consults `config-requestProvider`**; wrapped separately |
| `bvbrc_js_client` (`fetch`) | its own `src/retry.js`, a deliberate duplicate since the package is standalone with no AMD loader |

The `requestProvider` hook works because `dojo/request` loads `./request/default!` with an
empty plugin id, and `request/default.js` resolves `has('config-requestProvider')` in that
case. The Dojo build leaves that as a **runtime** lookup while folding `has('host-browser')`
to a literal, so it survives `buildClient.sh`. Verified.

**Importing `dojo/request/xhr` directly opts you out of all of this.** Use `dojo/request`
unless you specifically need the raw transport. The data-API callers currently doing so —
and therefore uncovered — are `widget/search/SFVTSearch.js`, `widget/viewer/SystemStatus.js`,
`util/DownloadExecutor.js` and `widget/download/RecordSelectorStep.js`. To find them:

```bash
grep -rl "dojo/request/xhr" public/js/p3/ | xargs grep -l "dataAPI\|dataServiceURL\|apiServer"
```

#### Two freeze traps when wrapping a dojo promise

Both are silent no-ops that bite on the **success path with no 429 involved**:

- **`dojo/Deferred` freezes its promise** (`Deferred.js:305`), so `promise.response = …` or
  `results.total = …` on it does nothing. `lang.delegate()` first — which is exactly what
  `QueryResults` does to a promise for the same reason.
- **`dojo/request`'s contract is a *dual* promise** — the data promise plus a `.response`
  sub-promise (`request/util.js:146`). Delegating to `dojo/request/xhr` preserves it for
  free; wrapping does not, and dropping it breaks consumers inside dojo/dgrid even though
  no p3 call site reads it directly.

`P3JsonRest` hit a third: `results.total` used to read the xhr off `results.ioArgs`, a
property of the *specific* Deferred `rawXhrPost` returned. Any wrapper returns a different
promise, so that back-channel vanishes and every grid silently loses its row count.

#### Never render a shed request as an empty result set

This is the contract's sharpest requirement and the easiest to get wrong. Measured on a
grid whose query was shed with the banner absent: it renders `1 - 1 of 0 results` —
indistinguishable from a legitimate empty result, so **the user concludes their data is
missing**. Retry logic without the banner makes throttling *less* visible, not more.

#### Still uncovered: downloads

`form.submit()` and `window.open()` hand the response to the browser, so no wrapper can
reach them — and they are the heaviest requests on the site (`limit(2500000)`). See the
Unified Download Wizard section; `DownloadExecutor`'s `xhr.post` sites also import
`dojo/request/xhr` directly and so bypass the provider.

### Never inject collection-specific filters into `state.search` (PR #1330 / #1412)

`state.search` is **shared verbatim across every tab of a list viewer**. `GenomeList.setActivePanelState()` mixes it into each sibling tab's state unchanged, and `GridContainer.buildQuery()` forwards it to the API as-is. So a clause that is only valid for one collection becomes an HTTP 400 on all the others:

```
genome          keyword(coli)&ne(genome_status,Deprecated)   200  128,823
genome_feature  keyword(coli)&ne(genome_status,Deprecated)   400  undefined field genome_status
sp_gene         keyword(coli)&ne(genome_status,Deprecated)   400  undefined field genome_status
```

`genome_status` and `completion_date` exist **only** on the `genome` collection — not on `genome_feature`, `genome_sequence`, `sp_gene`, `pathway`, `subsystem`, `protein_feature`, `protein_structure`, or `genome_amr`. This breaks the common workflow of filtering on the Genomes tab and then switching to Features to see the corresponding features.

To filter non-genome collections by a genome property, use the `genome(...)` cross-collection join the facet panel already builds — but note two constraints:

**1. A join with only negative clauses matches nothing.** It needs at least one positive clause:

```
eq(genome_id,*)&genome(ne(genome_status,Deprecated))                   -> 0 hits
eq(genome_id,*)&genome(and(eq(species,Escherichia coli),
                           ne(genome_status,Deprecated)))              -> 1,066,934,281 hits
```

**2. Joins are expensive.** `genome_feature keyword(polymerase)` is 1.1s unjoined vs 19.7s with a `genome(...)` join. Don't add one to a query that doesn't need it — especially not to count queries.

### RQL Queries in HTML Attributes (HTML-entity decoding pitfall)

RQL queries are joined with `&` (e.g. `keyword(carsonella)&gt(completion_date,NOW-1YEARS)&ne(genome_status,Deprecated)`). When such a query is **string-concatenated into an HTML `href` and rendered via `innerHTML`** (or `set('content', ...)`), the browser's HTML parser decodes `&gt`, `&lt`, `&ge`, `&le` into `>`, `<`, etc. — **even without a trailing `;`**, because these are legacy named entities. This silently corrupts the query: `&gt(completion_date,...)` becomes `>(completion_date,...)`, which the rql parser mis-parses (gluing `>` onto the previous token, e.g. producing a bogus `keywordgt` operator → Solr `400 undefined field object`). Note `&ne`, `&and`, `&or`, `&eq` are NOT entities, so only the `gt`/`lt`/`ge`/`le` comparison operators corrupt.

**Rules:**
- Prefer navigating via `Topic.publish('/navigate', { href: query })` — the router uses `pushState`, which does NOT HTML-decode. This is why `GlobalSearch.js` is safe.
- When you MUST embed a query into an HTML `href` string that will be rendered as HTML, HTML-escape it first (`&`→`&amp;`, `"`→`&quot;`). The browser decodes `&amp;` back to `&`, so navigation is correct and `&gt(` is preserved. Reuse the `escapeHtml` pattern in `public/js/p3/util/QueryToEnglish.js`.
- Prefer building anchors with `domConstruct.create('a', { href: query })` (DOM attribute assignment, no HTML parsing) over concatenating into an innerHTML string.

`AdvancedSearch.js` exhibited this bug in its `format*` result-link builders (rendered via `this.viewer.innerHTML`); `GlobalSearch.js` did not (Topic navigate).

### Unified Download Wizard

The `ADV DWNLD` grid action opens `widget/download/UnifiedDownloadWizard.js` — a 3-step wizard (Data
Type → Records → format-specific Options) that replaces the older DownloadTooltipDialog/AdvancedDownload
flow. Key modules:
- `util/DownloadFormats.js` — format registry: `formats`, per-data-type `dataTypeFormats` (pk, sortField,
  categories, `formatOverrides` for cross-collection routing), and `containerTypeToDataType` mapping.
- `util/DownloadExecutor.js` — `execute(spec)` runs the download. Sequence/table/accession formats POST a
  hidden form to `<dataServiceURL>/<dataType>/?http_download=true&http_accept=<mime>` (server-side stream);
  FASTA adds `http_fasta_*` params. `buildQuery(spec)` builds the RQL (`in(pk,(ids))` for selected scope,
  else cleaned grid query) plus `sort()` + `limit(2500000)`.
- Wizard entry: `GridContainer.js` AdvancedDownload action → `QueryDescriptor.createFromGrid(grid,
  containerType, {selection, primaryKey})` → `UnifiedDownloadWizard.show({queryDescriptor})`.

**Pitfall 1 — cursorMark export requires the Solr uniqueKey in `sort()`.** The `http_download=true`
path streams via Solr `cursorMark`, which **rejects any sort that doesn't include the collection's
uniqueKey** (`HTTP 400` → surfaced as `500 "Unable to receive stream: Shard … failed: HTTP 400"`).
Non-obvious: the genome-family collections have **no `id` field** — their uniqueKey is the domain id
(`genome`→`genome_id`, `genome_feature`→`feature_id`, `genome_sequence`→`sequence_id`); everything else
uses `id`. `buildQuery()` builds the sort from `[sortField, pk, DownloadFormats.getUniqueKey(dataType)]`
(deduped) so the uniqueKey is always present. Any new download data type whose configured
`sortField`/`pk` in `dataTypeFormats` is not the uniqueKey (e.g. subsystem's `subsystem_id`, pathway's
`pathway_id`) would 500 without this — and must be added to `getUniqueKey()` if its uniqueKey isn't `id`.

**Pitfall 2 — cross-collection sequence download in *selected* scope must read the linkField off the
selected rows.** Some formats target a different collection than the source grid (e.g. specialty-genes
grid, pk `id` UUID → sequence FASTA from `genome_feature` via `linkField: feature_id`). In selected scope
`selectedIds` defaults to the grid pk, so querying the target with `in(feature_id,(uuids))` matches
nothing → empty file. This is NOT a missing join: the selected grid **rows already carry the linkField**
(`sp_gene` rows contain `feature_id`/`patric_id`) — `QueryDescriptor.extractSelectedIds()` was just
discarding it by keeping only the pk. Fix: `createFromGrid()` retains the row objects as transient
`selectedRows`, and `_buildDownloadSpec()` remaps `selectedIds` to the rows' `linkField` when
`linkField !== sourcePrimaryKey` (selected scope), setting `primaryKey = linkField`. No server prefetch.
When `linkField === pk` (e.g. genome grid → feature accession, both `genome_id`) the remap is skipped and
the target is queried directly. Selected scope only comes from a live grid (the saved-search download
path is always 'all' scope), so the rows are always available. General rule: for any cross-collection
download, read the linking value off the selected row — don't reduce to the grid pk then try to recover it.

**Pitfall 3 — a bare `genome(...)` join as the sole top-level RQL clause makes the data API emit `q=()`
→ Solr `HTTP 400 "Cannot parse '()'"`.** The API's cross-collection join macro (`genome(...)`,
`{!join method=crossCollection fromIndex=genome …}`) requires a top-level term to precede it. When
`genome(...)` is the *only* top-level clause, the join codegen emits an empty main query `q=()` and Solr
400s. Grids sidestep this by always prepending a term (`keyword(*)` / `eq(feature_id,*)`); the download's
`cleanQuery()` did not — it only strips a wrapper matching the *target* collection, so a `genome(...)`
filter on a `sp_gene` source (e.g. a taxon-view Specialty Genes protein-FASTA download, filter
`genome(and(eq(taxon_lineage_ids,…),ne(genome_status,Deprecated)))`) passed through bare and 400'd.
**Stopgap fix (client):** `DownloadExecutor.buildQuery` prepends `eq(<pk>,*)&` when the cleaned query
begins with a bare `genome(`/`feature(`/`genome_feature(`/`genome_sequence(` join (narrow — only fires on
a leading join wrapper; non-join queries untouched). Verified: `genome(...)` alone → 400,
`eq(feature_id,*)&genome(...)` → 200. This is a STOPGAP; the proper fix is server-side — the
cross-collection resolution in `p3_api/PLAN_CROSS_COLLECTION_DOWNLOAD.md` must decompose a source query
that is itself a `genome(...)` join (run inner subquery → genome_ids → filter source by `in(genome_id,…)`)
rather than forward it raw (open question #5 there).

Note: the Excel serializer is slow on multi-thousand-row exports (can exceed client timeouts); the
underlying Solr query/sort is identical to the tsv/csv path, so a slow Excel is a serializer perf issue,
not a query bug.

### Visualization Components
- D3.js for custom visualizations (charts, domain viewers)
- Cytoscape for network graphs
- JBrowse for genome browser (git submodule)
- Mauve viewer for genome alignments (see below)

### Mauve Genome Alignment Viewer
The genome alignment viewer (`public/js/mauve_viewer/`) displays aligned genome sequences:

**Key files:**
- `src/mauve-viewer.js` - Main viewer class
- `src/track.js` - Individual genome track rendering
- `src/colors.js` - Color palette definitions
- `src/backbone.js` - LCB connection lines between tracks

**Color scheme:**
- **LCBs (Locally Collinear Blocks):** Colored rectangles using a 20-color categorical palette. Same LCB across different genomes has the same color. Colors cycle if >20 LCBs.
- **Contigs:** Vertical red lines (`#b50707`) at 65% opacity marking contig boundaries
- **Features:** Gray rectangles (`#777`) at 40% opacity, only visible when zoomed ≤100,000 bp

**LCB Color Palette (in order):**
1. Blue `rgb(31, 119, 180)`, Light blue `rgb(174, 199, 232)`
2. Orange `rgb(255, 127, 14)`, Light orange `rgb(255, 187, 120)`
3. Green `rgb(44, 160, 44)`, Light green `rgb(152, 223, 138)`
4. Red `rgb(214, 39, 40)`, Light red `rgb(255, 152, 150)`
5. Purple `rgb(148, 103, 189)`, Light purple `rgb(197, 176, 213)`
6. Brown `rgb(140, 86, 75)`, Light brown `rgb(196, 156, 148)`
7. Pink `rgb(227, 119, 194)`, Light pink `rgb(247, 182, 210)`
8. Gray `rgb(127, 127, 127)`, Light gray `rgb(199, 199, 199)`
9. Yellow-green `rgb(188, 189, 34)`, Light yellow-green `rgb(219, 219, 141)`
10. Cyan `rgb(23, 190, 207)`, Light cyan `rgb(158, 218, 229)`

### Workspace and Job Result Navigation
Workspace browsing is handled by `WorkspaceBrowser.js` with these key patterns:

**Panel reuse:** When navigating between items of the same type, the existing panel is reused rather than creating a new one. The `instanceof` check determines if panel can be reused.

**Job results:** Job results (`type: 'job_result'`) are special:
- Files stored in hidden folders (e.g., `.JobName/` contains output files)
- `JobResult.js` viewer displays job metadata header + file grid
- Nested job results (e.g., "assembly" inside Comprehensive Genome Analysis) require `set('data', obj)` not `set('path', ...)` when reusing panels
- When reusing JobResult panels, the existing viewer must be destroyed before creating a new one to prevent overlay issues

**Key files:**
- `widget/WorkspaceBrowser.js` - Main workspace navigation and panel management
- `widget/WorkspaceExplorerView.js` - File/folder grid display
- `widget/viewer/JobResult.js` - Job result viewer with metadata header

### `/public` is a UI-only path prefix

Workspace paths under Public Workspaces are displayed and routed as
`/public/<owner>/<folder>`, but the Workspace service has never heard of `/public`. The
canonical path it accepts is `/<owner>/<folder>`. The prefix is added for display and
stripped before every outbound call, so a path crossing a layer boundary is in one of two
different forms and you must know which.

Strip sites (UI path → service path), all producing the identical canonical path:

| site | code |
|---|---|
| `WorkspaceBrowser.js:2847` | `'/' + this.path.split('/').slice(2).join('/')` — before `getObject` |
| `WorkspaceBrowser.js:832` | `.replace(/^\/public/, '')` — before a `/view/Homology` href |
| `ContainerActionBar.js:80` | `_normalizePath()` — so favorites key on the canonical path |
| `ContainerActionBar.js:105` | `parts.splice(1, 1)` — breadcrumb rendering |

The inverse re-add is `WorkspaceGrid.js:208` and `:230`, which put `/public` back on a row
path when the grid is showing a public folder:

```javascript
var path = _self.path.split('/')[1] == 'public' ? '/public' + row.data.path : row.data.path;
```

Two consequences worth holding onto:

- **Favorites must be normalized or they double up.** A folder favorited from the public
  view and the same folder favorited from its owner's view are the same object; only
  `_normalizePath` makes them compare equal.
- **The Workshop shortcut stores a literal space, not `%20`.** `WorkspaceObjectSelector.js:742`
  sets `'/public/ARWattam@patricbrc.org/BV-BRC Workshop'` — correct, because that value is an
  internal path, not a URL. The same folder appears as a hand-written href with `%20` in
  `views/bv-brc-header.ejs:561` and `public/js/p3/app/p3app.js:1029`. Don't "fix" either to
  match the other; they are in different domains. But a raw path with a space is exactly the
  `encodePath` hazard below if it ever reaches a `/navigate` href.

### Empty result-grid pitfalls (JIRA-4420)

The Homology/BLAST result VIEW showed an empty grid for two independent reasons — both worth knowing because the same patterns recur elsewhere:

**1. Always `encodePath()` a workspace path before putting it in a `/navigate` href.**
The VIEW action built its href from the raw workspace path (`'/view/Homology' + modPath`). For a folder named `Clostridium #50 BALST`, the literal `#` is treated as a URL **fragment delimiter**: `location.pathname` truncates at the `#` and the rest leaks into `location.hash`, so the store gets a wrong `dataPath` and hangs empty. Fix: `'/view/Homology' + encodePath(modPath)`. `encodePath` (`util/encodePath.js`) `encodeURIComponent`s each segment (leaving `/` and the user/public segments) and round-trips with the store's `_setState`, which `decodeURIComponent`s each segment. Other `/navigate` calls in `WorkspaceBrowser.js` (e.g. `/view/MSA/`, `afa_file` links, some `/workspace`/`/view/Gexf`) still use raw paths and will break the same way on `#`/space names.

**2. The data API silently truncates responses at `rows >= 10000`.**
It returns **HTTP 200 with a one-byte body (`[`)**, which then fails JSON parsing. `rows: 9999` returns complete valid JSON. Result stores that hardcode `rows: 25000` (`HomologyResultMemoryStore`, `BlastResultMemoryStore`, `ProteinFamiliesService*`, `IDMapping`, etc.) hit this whenever a job has ≥10k hits. Two-part fix: cap `rows` by the actual id count (`Math.min(ids.length, 9000)`), AND add an error handler to the decoration `request.post` so a failed/truncated query still resolves `_loadingDeferred` and renders results without Solr metadata rather than hanging forever. (This is a server-side bug; the client cap is a workaround.)

## Configuration

Edit `p3-web.conf` (copy from `p3-web.conf.sample`):
- `http_port` - Server port (default: 3000)
- `production` - Production mode flag
- `dataServiceURL` - BV-BRC Data API endpoint
- `workspaceServiceURL` - Workspace service endpoint

**Important:** Restart server after config changes.

## Release branches, versions, and hotfixes

Four lanes: `alpha` (staging/dev, the default PR target), `beta` (pre-release), `master`
(production). Normal flow is alpha → beta → master. Hotfixes go **directly to master** and
are cherry-picked back.

### Versions are strict three-part SemVer. There is no fourth component.

Do not invent a hotfix suffix. **The patch component *is* the hotfix component** — that is
what SemVer clause 6 defines it as. Both ways of extending `X.Y.Z` are broken here:

- `3.59.12-1` is a **prerelease** and sorts *below* `3.59.12`
- `3.59.12+hotfix.1` is **build metadata**, excluded from precedence by clause 10 —
  `semver.compare('3.59.12+hotfix.1', '3.59.12')` returns **0**, `semver.eq()` is **true**

A four-part `3.59.12.1` is not SemVer at all, breaks sort order against every prior `vX.Y.Z` tag (58 as of 2026-10), and
npm **silently mis-parses it**: `npm version 3.59.12.1` stores `3.59.1-2.1` and exits 0.
A later `npm version patch` against a four-part version then exits **1** with
`Invalid version: patch`.

Two npm traps found the hard way:

- **`npm version --dry-run` is not read-only.** `npm version patch --no-git-tag-version
  --dry-run` reported `v3.59.14` *and wrote the manifest*. Don't trust that flag
  combination; `git diff` after.
- **`node -p` prints the final expression's value.** `node -p "...process.stdout.write(v)"`
  emits the version *and* the boolean `write()` returns — this produced a literal
  `3.59.12true` version string in the hotfix workflow. Use `node -e` when writing to stdout.

### The lane invariant: alpha must be bumped before cutting a hotfix

**master holds the lower version line; alpha holds the higher one. A hotfix version must be
strictly below alpha's.** Otherwise the hotfix number collides with whatever alpha releases
next — the original workflow bumped "the higher of master and alpha" and produced `3.60.2`
with master at 3.59.12 and alpha at 3.60.1, which was alpha's own next release number.

If alpha is not already ahead, bump it to a new minor line (Release workflow) *first*, then
cut the hotfix. `.github/workflows/hotfix.yml` enforces this and refuses to run otherwise.

### An unmerged release PR blocks every later release run

`release.yml` derives the next version from **alpha's `package.json`**, which only advances
when a release PR *merges*. Leave one open and the next run recomputes the same number,
then dies trying to push a branch that already exists:

```
! [rejected]  release/v3.60.6 -> release/v3.60.6 (fetch first)
```

Nothing in that message says "a release PR is still open," which is what it actually means.
It failed safely — the push was rejected rather than clobbering the branch, and nothing
landed on alpha — but it will recur identically until the open PR is merged or abandoned.

**Merge release PRs promptly.** If one is abandoned, close it *and* delete its branch;
check `git ls-remote --tags` first, because a tag for that version would make the number
unusable.

### Workflow gotchas

`hotfix-tag.yml` tags, then cherry-picks to alpha and beta. Points that bit us:

- **The tag step runs first and succeeds even when everything after it fails.** All five
  historical runs failed at the cherry-pick, but all five tags exist — so the breakage was
  invisible. If you only check that the tag landed, you have checked nothing.
- **An empty cherry-pick and a conflicted one both exit non-zero.** Distinguish them with
  `git diff --name-only --diff-filter=U` (empty = no unmerged paths), not the exit code.
  Treating "empty" as "conflict" led to an abort, then an unconditional `gh pr create` that
  died on "No commits between", and `bash -e` killed the job — skipping beta entirely.
- **`git cherry-pick -m 1` is only valid on a merge commit.** Squash and rebase merges
  produce single-parent commits, where `-m` fails. Detect with
  `git rev-list --parents -n1 <sha> | wc -w` (3 = merge, 2 = ordinary).
- **Never cherry-pick the version bump across lanes.** The target branch owns its own
  version. Restore the manifests from the target after the pick:
  `git checkout "origin/${TARGET}" -- package.json package-lock.json`.

The same reasoning applies by hand: to move a change from master to alpha, **cherry-pick,
don't merge** — a merge drags master's lower version number into alpha's manifests.

## Security Utilities

Use `lib/securityUtils.js` for user input:
- `sanitizeEmail()` - Email validation + CRLF prevention
- `sanitizeUrlPath()` - XSS prevention
- `sanitizeText()` - HTML tag stripping
- `validateIntegerInRange()` - Bounds checking
- `validateAllowedValue()` - Whitelist validation

## Authentication and Tokens

Tokens are a custom RSA-SHA1 pipe-delimited format, **not** JWT:
```
un=user@realm|tokenid=UUID|expiry=UNIX_TS|...|SigningSubject=URL|sig=RSA_SHA1_HEX
```
Generated by `p3_user/generateToken.js`, validated by `p3_user/validateToken.js`. Identity is `username@realm` (e.g. `jsmith@bvbrc`) and is embedded in Solr `owner`/`user_read`/`user_write` and in workspace paths — do not reformat it.

### The `Authorization` header has three conventions, and the difference matters

| Convention | Sent to | Examples |
|---|---|---|
| **Bare token**, no scheme (~287 sites) | p3_api, p3_user, **Workspace RPC, app service RPC** | `Authorization: (window.App.authorizationToken \|\| '')` |
| `OAuth <token>` | **Shock** node URLs (+ app service `/task_info`) | `WorkspaceManager.js:864,1181`, `UploadManager.js:32` |
| `Oauth <token>` (lowercase 'a') | App service stdout/stderr URLs | `JobManager.js` |

**A prefixed token fails signature verification, and this is true of more services than it looks.** `p3_api/middleware/auth.js` passes the header value verbatim into `validateToken.js`, which does `token.split('|')` and reconstructs the RSA-signed base string from the parts. An `OAuth ` prefix makes the first part parse as key `"OAuth un"`, so the reconstructed string no longer matches what was signed.

**The same applies to the Workspace and app service JSON-RPC APIs.** Neither strips a scheme prefix — the raw header goes straight into `P3AuthToken->new(token => $token)`:

- `Workspace/lib/Bio/P3/Workspace/Service.pm:269` (`call_method`, gates every authenticated method), `:225` (`auth_ping`), `WorkspaceImpl.pm:1521`, `WorkspaceCompletion.psgi:32`
- `app_service/lib/Bio/KBase/AppService/AsyncService.pm:239` (`call_method`), `:198` (`auth_ping`)

The **one** exception is `AppServiceImpl.pm:90`, which does `$auth =~ /^OAuth\s+(.*)$/i` — but that is inside `sub _task_info` (opens at `:62`), reachable only via the `/task_info` mount that running jobs call back into.

So the discriminator is **not** "workspace/app service vs. API" — it is **Shock vs. everything else**. The `OAuth `-prefixed sites in `WorkspaceManager.js` and `UploadManager.js` are hitting Shock node URLs (`meta.link_reference`, upload URLs), not Workspace endpoints; `WorkspaceManager`'s actual RPC client sends a bare token (`jsonrpc.js:11`, wired at `WorkspaceManager.js:1654`). On the Perl side every live `OAuth ` sender is likewise a Shock call (`WorkspaceImpl.pm:343,790,793,800,811,830,1823,3126`, `WSFileMember.pm:98`, `AppScript.pm:325`).

When adding an authenticated request, ask **which service the URL resolves to**, not which module you are editing. Do not "normalize" the schemes.

**Shock is live** — it is the Workspace backing store, so the `OAuth ` path is the object-data path, not legacy cruft. (`app_service`'s `Shock.pm` and `Awe.pm` are dead — no `use` sites remain — but that says nothing about Shock itself, which Workspace reaches directly from `WorkspaceImpl.pm`.)

The tell for a Shock call in Perl is **field 11 of a Workspace object-meta tuple**, which is the Shock URL. `WorkspaceClientExt.pm:386,455` and `WorkspaceTests.pm:319` all do `$res->[11]` and then send `OAuth ` to it — they look like Workspace-client calls from the module name, but the target is Shock. The general pattern is: *ask Workspace over RPC with a bare token, get a Shock URL back, then talk to Shock with `OAuth `.*

### Browser token lifecycle

- Token, parsed claims, and profile live in `localStorage`: `tokenstring`, `auth`, `userProfile`, `userid`, `realm` (`p3app.js`)
- `checkLogin()` polls on a timer and refreshes via `GET /authenticate/refresh` — but **only if `window.App.activeMouse || window.App.uploadInProgress`**. An idle user is logged out rather than refreshed; this surprises people debugging session expiry.
- Cross-tab logout is detected by polling for a missing `tokenstring`

### Admin impersonation (SU Login)

`POST /authenticate/sulogin` (`p3_user/routes/authenticate.js`) verifies the caller's `admin` role and password, then returns **a full, ordinary user token for the target** — indistinguishable from one the target would get by logging in. The client stashes the admin's own five `localStorage` keys under `A*` prefixes (`Aauth`, `Atokenstring`, …) and swaps in the target's token (`SuLogin.js`, `p3app.js` `checkSU()`/`suSwitchBack()`).

Consequences: the token carries **no impersonation marker**, so every log line and Solr write attributes the action to the target with no trace of the admin. When auditing "who did this write," remember it may have been an admin. Any change to token handling must account for this feature.

### OAuth2/OIDC migration

A migration to standard OAuth2/OIDC is planned — see `PLAN-oauth2-migration.md`. It is a living document; update it as decisions evolve rather than letting the code drift from it.

## ESLint Configuration

Based on airbnb-base/legacy with relaxed rules for legacy Dojo code:
- Environments: browser, node, AMD, jQuery, ES6
- Global symbols: dojo, dijit, d3, cytoscape, etc.
- Most strict rules disabled for compatibility

## External Service URLs

Configured in `p3-web.conf`:
- Data API: `/api/` proxy
- Workspace: `/workspace/` proxy
- App Service: Job submission
- Homology Service: BLAST searches
- Compare Regions: Genome comparison

### User service `/verify/` endpoint (resend verification email)

The only caller of the user-service `/verify/` API is `UserProfileForm.js`
(`onResendEmail`) — the "resend verification email" button shown when a logged-in
user's account email is unverified. It's an authenticated, self-service action:
`POST <userServiceURL>/verify/` with `Authorization: <App.authorizationToken>` and
a JSON body of **just the bare user id**: `{ id: window.localStorage.userid }` (the
username like `olson`, NOT the full `olson@patricbrc.org`). It asks the backend to
(re)send the verification email; it does not verify a token client-side.

**curl pitfalls (both required, or you get `406 "Missing User ID"`):**
- Must send `Content-Type: application/json`. `curl -d` defaults to
  `application/x-www-form-urlencoded`, so the server's JSON parser never populates
  `id` → 406. (The browser works because it sets the JSON content-type explicitly.)
- Body must be valid JSON with a quoted key: `-d '{"id":"olson"}'` (not `{id:...}`).

Do NOT confuse this with the Express routes `/verify_refresh` and `/verify_failure`
(`app.js`, `routes/index.js`, `p3app.js`) — those are web-app landing pages for the
email round-trip, not the user-service API.

### Email routes (nodemailer + express-formidable)

`routes/reportProblem.js` and `routes/notifySubmitSequence.js` send mail via
`nodemailer` (`createTransport(opts)` + callback `sendMail(msg, cb)`) and parse
multipart form posts via **`express-formidable`** (`formidable()` middleware →
`req.fields` / `req.files`). `formidable` is **never imported directly** — it is a
transitive of `express-formidable@1.2.0`. The root-level `formidable` dep in
`package.json` exists only to control which version the (unmaintained) wrapper
resolves; don't try to "use formidable directly."

**Pitfall — formidable v2 renamed the parsed-file properties.** The wrapper resolves
the top-level `formidable` (v2.x), where `file.name`→`file.originalFilename` and
`file.path`→`file.filepath`. Code written against v1 (`f.name`/`f.path`) silently
gets `undefined` on v2 — this had broken problem-report email attachments
(`fs.createReadStream(undefined)`), fixed to read `f.originalFilename || f.name` and
`f.filepath || f.path`. If `express-formidable` is ever bumped to pull formidable
**v3**, note v3 is ESM (`"type": "module"`) and turns every `req.fields`/`req.files`
value into an **array** (`fields.foo` → `["bar"]`) — a breaking change for both
routes. See [[feedback_prod_node22_esm]] for the related CJS/ESM prod-Node-22 trap.

## Dijit Form Validation Patterns

When working with dijit form validation, be aware of these key behaviors:

### Form Validation and Focus
When `dijit/form/Form.validate()` is called (which happens on every keystroke if `intermediateChanges: true`):
1. It iterates through all form widgets calling `isValid()`
2. If a widget returns `false`, the Form **scrolls to it and calls `focus()`**
3. This can steal focus from the field the user is currently typing in

**Solution:** Override `focus()` in widgets that shouldn't receive automatic focus:
```javascript
focus: function () {
  // Only focus if user explicitly initiated it
  if (this._userInitiatedFocus) {
    this._userInitiatedFocus = false;
    this.searchBox.focus();
  }
  // Otherwise, block automatic focus from form validation
}
```

### Making Custom Widgets Participate in Form Validation
To make a custom widget participate in dijit form validation:
1. Add `dijit/form/_FormValueMixin` to the widget's declare chain
2. Implement `isValid(isFocused)` method that returns boolean
3. Implement `validate(isFocused)` method for visual feedback
4. Ensure the widget has a `name` attribute in the template

**Warning:** Adding `_FormValueMixin` makes the widget subject to Form's focus-stealing behavior.

### Validation Order Matters
When validating optional fields, check if the field is required/empty **before** calling inner widget's `isValid()`:
```javascript
validate: function (isFocused) {
  // Check optional empty FIRST - return early to avoid inner validation
  if (!this.required) {
    var value = this.get('value') || '';
    if (!value || value === '') {
      return true;  // Optional empty = valid
    }
  }
  // Only now check inner widget (which might return false for empty)
  return this.innerWidget.isValid(isFocused);
}
```

### Dijit Error Styling
To show validation errors visually without triggering dijit side effects:
```javascript
// DO: Just add CSS classes
domClass.add(widget.domNode, 'dijitError');
domClass.add(widget.domNode, 'dijitTextBoxError');

// DON'T: Manipulate dijit internal state (can cause focus issues)
widget._set('state', 'Error');
widget._hasBeenBlurred = true;  // Can trigger refresh/focus behavior
```

### WorkspaceObjectSelector and Favorite Folders

The output folder dropdown in job submission forms uses `WorkspaceObjectSelector.js`, which wraps a Dojo `FilteringSelect` with a `Memory` store (`idProperty: 'path'`, `searchAttr: 'name'`).

**Data sources for the dropdown:**
1. `WorkspaceManager.getObjectsByType('folder')` — folders in the current workspace (recursive)
2. `FavoriteFolders.load()` — favorite paths from `~/.preferences/favorites.json`
3. "Missing favorites" — favorites NOT in source 1, fetched via `WorkspaceManager.getObjects(paths, true)`

**Critical: `getObjects` metadata format:**
`getObjects` returns `meta.path` as the PARENT directory (`obj[0][2]`), NOT the full path. The full path is `meta.path + meta.name`. This is different from `metaListToObj` which constructs `path: list[2] + list[0]` internally.

**Path normalization:** Workspace paths may or may not have trailing slashes. Always normalize with `path.replace(/\/+$/, '')` before comparing paths across different sources.

**Don't use `display:none` to hide dropdown items.** Hidden items still occupy slots in FilteringSelect's dropdown as invisible click targets, causing clicks to select the wrong item. Filter items out of the store data instead.

### Widget Lifecycle and Null Checks
Widgets created conditionally (e.g., only when user is logged in) may not exist during early validation:
```javascript
// In startup() - widget may not exist yet
this.inherited(arguments);  // Calls validate()

// In validate() - always check existence
var value = this.optionalWidget ? this.optionalWidget.get('value') : '';
```
