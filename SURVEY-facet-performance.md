# Survey: Facet-query performance across p3 summary/overview widgets

Follow-up to the `ProteinFeatureSummary` fix (branch `bugfix/protein-summary-facet-perf`,
commit `22f7b2fb7`). Goal: find other places that share the "slow facet" behavior.

All timings are `curl` wall-clock against `https://alpha.bv-brc.org/api/...`, run
multiple times to separate cold-cache from steady state. Test genomes:
`996.379` (~3200 CDS), `562.62915` (E. coli), `100177.28` (~2000 features).

## TL;DR

- The **exact** anti-pattern that made ProteinFeatureSummary slow — unscoped
  `type:query` sub-facets that each build a DocSet over the *whole* `genome_feature`
  collection — exists in **only one file, and it is already fixed**.
- The other `json.facet` callers (Pathway/Subsystem stores, PathwayMapKegg) are all
  ID-scoped and safe.
- Two **secondary hotspots** show ~2–3s cold-cache times, both on pages the user loads.
  Neither has the clean structural fix that ProteinFeatureSummary had — see the honest
  caveats in §4. In short: these facet timings are **dominated by Solr's shared cache
  state and are very noisy** (the same query swings from 4s to 0.1s run-to-run), so any
  proposed tweak must be judged on many alternating trials, not one measurement.
  1. **`GenomeFeatureSummary`** (Genome Overview page): pivot facet ~2.5–3s cold.
     `(method,enum)` is **not** a reliable improvement (noisy; sometimes worse).
  2. **`FunctionalProfile`** (Feature List Overview page): `facet((field,product))` on
     the free-text `product` field is ~3s even for one genome. A `json.facet` terms
     rewrite *may* help (~1.3s in some trials) but is also noisy. **Do NOT add
     `(method,enum)` here** — on the high-cardinality text field it reproducibly explodes
     to ~46–50s.

---

## 1. Root-cause recap (the fixed bug)

In a SOLR JSON Facet request, a `type:'query'` sub-facet is evaluated as a DocSet over
the **entire collection**, then intersected with the base-query domain. The main query's
`genome_id` filter scopes the *domain* but not the sub-facet DocSet. ProteinFeatureSummary
had seven such sub-queries (`plfam_id:PLF*`, `property:EC*`, `feature_type:CDS`, …), so each
request scanned the full `genome_feature` index (~15s cold, even on a tiny genome).

Fix: prepend `genome_id:X AND (...)` to every sub-facet query → ~15s → <1s, counts identical.

Rule of thumb: **any `type:query` facet sub-query must itself carry the domain-narrowing
filter — the main `q` does not propagate into it.** Terms/pivot facets (`type:field`,
`facet((field,...))`, `facet((pivot,...))`) do inherit the scoped domain, so they don't
have this specific problem — but they have their own cost (below).

---

## 2. `json.facet` callers — all clear

| File | Endpoint | Sub-facet | Scope | Verdict |
|---|---|---|---|---|
| `widget/ProteinFeatureSummary.js` | genome_feature | `type:query` ×7 | **now scoped** | FIXED |
| `store/PathwaySummaryMemoryStore.js` (L96,170) | pathway | `type:field` | `feature_id:(...)` / `genome_id:(...)` | safe |
| `store/PathwayMapMemoryStore.js` (L154) | pathway | nested `type:field` | `genome_id:(...) AND pathway_id:X` | safe |
| `store/SubsystemMapMemoryStore.js` (L161) | subsystem | nested `type:field` | `genome_id:(...) AND subsystem_id:X` | safe |
| `widget/PathwayMapKegg.js` (L248) | pathway | `type:field` unique | `genome_id:(...) AND pathway_id:(...)` | safe |

(Several use `limit:-1`; acceptable because the domain is a bounded ID set. `facet.query`
returned zero matches anywhere in `public/js/p3/`.)

---

## 3. RQL `facet(...)` summary widgets — measured

Base class `SummaryWidget.onSetQuery` POSTs `this.query + this.baseQuery`; scope comes
entirely from the caller-supplied `this.query`.

### Genome Overview page (the reported page) — 4 widgets

| Widget | facet clause | Time (genome-scoped) | Verdict |
|---|---|---|---|
| ProteinFeatureSummary | `json.facet` `type:query`×7 | **<1s** (was ~15s) | FIXED |
| AMRPanelSummary | `facet((pivot,(resistant_phenotype,evidence,antibiotic)),…,(method,enum))` | ~0.2s | fine (already uses enum) |
| SpecialtyGeneSummary | `facet((field,property_source),(mincount,1))` | ~1–2s | minor; low cardinality, acceptable |
| **GenomeFeatureSummary** | `facet((pivot,(annotation,feature_type)),(mincount,0))` | **~2.5–3s cold, noisy** | investigate — see §4 |

### Feature List Overview page — 2 widgets

| Widget | facet clause | Time (single genome) | Verdict |
|---|---|---|---|
| **FunctionalProfile** | `facet((field,product),(mincount,1),(sort,count),(limit,10))` | **~3s** | **improvable — see §4, but delicate** |
| TaxonomyProfile | `facet((field,genome_id),(mincount,1),(limit,-1))` | ~3s | scales with #genomes; watch at taxon scope |

### Other pages (not the reported problem; scope = caller query)

- `ReferenceGenomeSummary` — `eq(reference_genome,*) … limit(25000) facet((field,reference_genome))`
  on the `genome` collection, **no genome/taxon narrowing**. Global by design; measured ~1.2s. OK for now.
- `VirusMetaSummary` / `BacteriaMetaSummary` / `GenomeMetaSummary` — multi-`(field,…)` facets on
  `genome`; measured fast (<0.2s) at both single-genome and E. coli-taxon scope. Fine.
- SARS-CoV-2 / H5N1 outbreak grid+chart containers — `keyword(*)` broad by design over small
  outbreak collections. Fine.

---

## 4. Recommended follow-up changes (separate from the shipped fix)

### 4a. GenomeFeatureSummary — pivot facet ~2.5–3s cold  ⚠️ no clean fix found
`public/js/p3/widget/GenomeFeatureSummary.js:19`
```
baseQuery: '&limit(1)&in(annotation,(PATRIC,RefSeq))&ne(feature_type,source)&facet((pivot,(annotation,feature_type)),(mincount,0))'
```
This runs on the same Genome Overview page as the bug just fixed, so it contributes to the
reported slow page. **But I could not find a reliable improvement.** I tested `(method,enum)`
and a `json.facet` nested-terms rewrite; across alternating trials the results were
dominated by Solr cache state — the same unmodified query ranged from ~4s to ~0.13s, and
`(method,enum)` was sometimes faster, sometimes slower. (An early single-shot measurement
that looked like a clean ~5x enum win turned out to be a warm-cache coincidence.) The output
of `(method,enum)` *is* byte-identical to the default, so it's safe correctness-wise, but I
can't honestly claim it's faster. **Recommendation:** don't change this blindly. If this
facet is worth optimizing, measure server-side (Solr query logs / `debugQuery`) to see
whether the cost is the pivot itself or cold field-cache/docValues loading, then decide.

### 4b. FunctionalProfile — consider a json.facet terms rewrite  ⚠️ delicate
`public/js/p3/widget/FunctionalProfile.js:15` — `facet((field,product),…)` on the free-text
`product` field is ~3s/genome. A genome-scoped `json.facet` terms rewrite measured ~1.3s
(~2x). **`(method,enum)` is a trap here: it made the same query ~46–50s** because `product`
is high-cardinality text. Only worth doing if this page's latency is a complaint; needs an
output-equivalence check and is a bigger change than 4a (switches content-type/parse path).

### 4c. TaxonomyProfile `facet((field,genome_id),(limit,-1))`
Fine per-genome, but cost grows with the number of matching genomes; if the feature-list
overview is ever opened on a broad (taxon-wide) selection this is a candidate. No change now.

---

## 5. What is NOT a problem

- Terms/pivot facets that inherit the scoped main query domain (they don't repeat the
  full-index-scan bug; their cost is field-cardinality/method related, not scope-related).
- The `limit:-1` json.facet callers over bounded ID sets.
- Global-by-design facets over small collections (outbreaks, reference genomes).
