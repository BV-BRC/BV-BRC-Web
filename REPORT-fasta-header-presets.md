# FASTA header format strings — verified against alpha

**Date:** 2026-10-30, after the API update adding virology fields to the enrichment set.
**Every header below is real output** from `https://alpha.bv-brc.org/api/`, not illustrative.

Reproduce any row with:

```bash
curl -s -X POST "https://alpha.bv-brc.org/api/genome_feature/?http_download=true\
&http_accept=application/dna+fasta&http_fasta_header=<urlencoded format string>" \
  -d 'and(eq(genome_id,646741.3),eq(feature_type,CDS))&limit(1)&sort(+feature_id)' | head -1
```

Test records used:

| genome_id | what it is |
|---|---|
| `646741.3` | *Influenza A virus (A/New York/3197/2009(N1))*, segment 3, USA, 2009-04-29 |
| `408922.4` | *Influenza B*, B/Houston/B86/2003, Victoria lineage |
| `1727158.4` | *Influenza B*, B/California/NHRC_27301/2015 — **`strain` is empty** |
| `1071165.3` | H5N1 reassortant, `h5_clade` = 2.2.1 |
| `83332.12` | *M. tuberculosis* H37Rv |
| `1545742.911` | *uncultured Christensenella* sp., host/country populated, no collection_date |

---

## What the API update delivered

`genome_feature` enrichment went **35 → 42 fields**. All seven requested resolve:

```
subtype  segment  lineage  clade  h5_clade  genbank_accessions  species     all "enriched"
```

```
select(feature_id,subtype,segment,species,genbank_accessions)
  -> {"species":"Alphainfluenzavirus influenzae","segment":["3"],
      "subtype":"N1","genbank_accessions":"CY086966"}
```

Consistent across collections — 42 enriched on `genome_feature`, `sp_gene`, `genome_amr`,
`pathway`, `subsystem`; 41 on `genome_sequence` (it has native `segment`, so no enriched copy).

Brace escaping is also fixed: `A{{x}}B` now renders `>A{x}B` (previously `>A{}B`).

---

## Presets — format string and real output

### 1. Classic NCBI / BLAST — `genome_feature`

```
{patric_id} {product} [{genome_name}]
```

```
>fig|646741.3.CDS.1 putative polymerase PA, fragment [Influenza A virus (A/New York/3197/2009(N1))]
>fig|83332.12.peg.1000 Beta-carotene ketolase [Mycobacterium tuberculosis H37Rv]
```

What most tools expect from a downloaded protein FASTA. Closest to today's default.

### 2. NCBI source modifiers — `genome_feature`

Per https://www.ncbi.nlm.nih.gov/genbank/fastaformat/ : `>SeqID [modifier=value]`, no spaces
around `=`, organism required.

```
{patric_id} [organism={genome_name}] [strain={strain}] [host={host_name}] [country={isolation_country}] [collection_date={collection_date}]
```

```
>fig|1545742.911.peg.9 [organism=uncultured Christensenella sp. MGYG-HGUT-00869] [strain=MGYG-HGUT-00869] [host=Human] [country=USA] [collection_date=]
```

⚠ Note `[collection_date=]` — see *Empty values* below.

### 3. NCBI source modifiers, influenza — `genome_feature`

```
{accession} [organism={genome_name}] [strain={strain}] [serotype={subtype}] [segment={segment}] [host={host_name}] [country={isolation_country}] [collection_date={collection_date}]
```

```
>CY086966 [organism=Influenza A virus (A/New York/3197/2009(N1))] [strain=A/New York/3197/2009] [serotype=N1] [segment=3] [host=Homo sapiens] [country=USA] [collection_date=2009-04-29]
```

Uses `{accession}` rather than `{patric_id}` for a clean, pipe-free SeqID.

### 4. GISAID / augur, influenza A — `genome_feature`

Field order from `augur parse`
(https://docs.nextstrain.org/projects/augur/en/stable/usage/cli/parse.html):
`strain type subtype date season country host accession`, separator `|`.

```
{strain}|A|{subtype}|{collection_date}||{isolation_country}|{host_common_name}|{accession}
```

```
>A/New York/3197/2009|A|N1|2009-04-29||USA|Human|CY086966
```

Parses cleanly with `augur parse --fields strain type subtype date season country host accession`.

### 5. GISAID / augur, influenza B — `genome_feature`

`subtype` holds the literal `Influenza B` for type-B records, so the B preset reads `{lineage}`
in that position instead.

```
{strain}|B|{lineage}|{collection_date}||{isolation_country}|{host_common_name}|{accession}
```

```
>B/Houston/B86/2003|B|Victoria|2003-01-21||USA|Human|CY018277
>B/Houston/B79/2003|B|Victoria|2003||USA|Human|CY018253
```

### 6. GISAID-style, sequence level — `genome_sequence`

```
{accession}|{segment}|{strain}|{collection_date}|{isolation_country}|{host_common_name}
```

```
>CY086966|3|A/New York/3197/2009|2009-04-29|USA|Human
```

### 7. H5 clade — `genome_feature`

```
{strain}|{subtype}|clade={h5_clade}|{segment}
```

```
>A/reassortant/IDCDC_RG29(Egypt/N03072/2010 x Puerto Rico/8/1934)|H5N1|clade=2.2.1|4
```

### 8. Bacterial, metadata-rich — `genome_feature`

```
{patric_id} {product} [{genome_name}] [{strain}] [{host_name}] [{isolation_country}]
```

```
>fig|1545742.911.peg.9 hypothetical protein [uncultured Christensenella sp. MGYG-HGUT-00869] [MGYG-HGUT-00869] [Human] [USA]
```

### 9. Zone mode for comparison (no template)

The same content without a format string, using the new description delimiter:

```
http_fasta_id_fields=accession
http_fasta_description_fields=strain,subtype,host_common_name
http_fasta_description_delimiter=" | "
```

```
>CY086966| A/New York/3197/2009 | N1 | Human [Influenza A virus (A/New York/3197/2009(N1)) | 646741.3]
```

Shows why templates matter: zone mode forces the trailing `|` after the ID and the bracketed
context block. Neither is removable.

---

## Field reference

Values observed on the test records.

| `{field}` | Source | Example | Notes |
|---|---|---|---|
| `{patric_id}` | native | `fig\|646741.3.CDS.1` | **contains `\|`** — avoid in pipe-delimited formats |
| `{feature_id}` | native | `RefSeq.646741.3.CY086966.CDS.1.1108.fwd` | >25 chars; not NCBI SeqID-safe |
| `{accession}` | native | `CY086966` | clean ID for flu presets |
| `{product}` | native | `putative polymerase PA, fragment` | contains commas |
| `{genome_name}` | native | `Influenza A virus (A/New York/3197/2009(N1))` | parens + spaces |
| `{genome_id}` | native | `646741.3` | |
| `{taxon_id}` | native | `646741` | |
| `{go}` | native, multi | `GO:0005215\|transporter activity,GO:0006810\|transport` | array → `,` joined, **no space**; values contain `\|` |
| `{segments}` | native | `1..1108` | ⚠ **coordinate spans, not flu segments** |
| `{strain}` | enriched | `A/New York/3197/2009` | **may be `""`** — see below |
| `{host_name}` | enriched | `Homo sapiens` | also seen as `Human, Homo sapiens` (comma) |
| `{host_common_name}` | enriched | `Human` | matches GISAID convention |
| `{host_group}` | enriched | `Human` | controlled vocabulary |
| `{isolation_country}` | enriched | `USA` | |
| `{geographic_group}` | enriched | `North America` | |
| `{collection_date}` | enriched | `2009-04-29` *or* `2003` | **variable precision** |
| `{collection_year}` | enriched | `2009` | fixed width |
| `{genome_status}` | enriched | `WGS` | |
| `{subtype}` | **new** | `N1`, `H5N1`, `Influenza B` | ⚠ not always a subtype |
| `{segment}` | **new**, multi | `3` | renders bare when single-valued |
| `{lineage}` | **new** | `Yamagata`, `Victoria` | flu B lineage |
| `{clade}` | **new** | — | sparse |
| `{h5_clade}` | **new**, multi | `2.2.1` | H5 only |
| `{genbank_accessions}` | **new** | `CY086966` | genome-level |
| `{species}` | **new** | `Alphainfluenzavirus influenzae` | ICTV name, not `Influenza A virus` |

Multi-value rendering confirmed — arrays join with `,` and **no space**:

```
{patric_id} GO={go}
  -> >fig|83332.12.peg.1032 GO=GO:0005215|transporter activity,GO:0006810|transport,GO:0016020|membrane
```

---

## Five findings that shape the UI

### 1. An unknown field still renders empty with HTTP 200

Unchanged by this update, and the most important item here:

```
{accession} {hostname}    ->  >CY086966        HTTP 200
```

A typo of `host_name` produces a plausible-looking truncated header and no error anywhere.
The documented contract (`util/fastaHeaderFormatter.js:267`, decision 4) says this should be
a 400. **Client-side validation against `/fields` is therefore load-bearing, not cosmetic.**
Syntax validation does work — unbalanced braces and `{}` both 400 correctly.

### 2. `subtype` is not always a subtype

Influenza B records carry the literal string `Influenza B`, with the real discriminator in
`lineage`:

```
1727158.4 -> subtype="Influenza B"  lineage="Yamagata"
```

A single GISAID preset using `{subtype}` emits `|B|Influenza B|`. Hence separate A and B
presets. `type` is likewise hardcoded `A`/`B` in the template because BV-BRC has no type field
distinct from subtype — **presets must be per-organism, not one generic "GISAID" entry.**

### 3. `strain` can be empty even when the name is known

```
1727158.4  strain=""  genome_name="Influenza B virus (B/California/NHRC_27301/2015)"
  -> >|B|Yamagata|2015-06-12||USA|Human|KT819406
      ^ leading empty field
```

4 of a 200-genome influenza sample. For a positional parser a leading empty field is worse
than a missing record. Worth considering whether the B preset should lead with `{accession}`,
or whether the UI should warn when a template *starts* with a frequently-empty field.

### 4. Empty values produce malformed NCBI modifiers

```
>fig|1545742.911.peg.9 ... [collection_date=]
```

NCBI's format does not define an empty modifier value, and submission tooling may reject it.
Per contract decision 1 this is intended — a template cannot drop surrounding literals without
conditional syntax. But it means **the NCBI modifier preset must be labelled "NCBI-shaped, not
submission-ready."** Zone mode does not have this problem: it skips absent fields and collapses
the delimiter.

### 5. `{patric_id}` carries a pipe

`fig|646741.3.CDS.1` inside a `|`-delimited header hands augur an extra field. Flu presets use
`{accession}`. The UI should warn when `{patric_id}` appears in a template whose delimiter is
`|`.

---

## Still open

- **`species` is the ICTV name** (`Alphainfluenzavirus influenzae`), not `Influenza A virus`.
  Correct, but surprising in an `[organism=…]` modifier; `{genome_name}` is closer to what
  submitters expect. Worth a decision before the preset ships.
- **`/fields` 404s on production.** Any client that consumes it needs a fallback or must ship
  with the API release.

## Resolved by this update

`genome_sequence` FASTA **now enriches**. It previously had no join at all
(`serializeGenomeSequenceStream`, `media/dna+fasta.js:379`, *"no join needed"*), so every
genome-level field in a sequence FASTA header came back empty. Verified with two
enriched-only fields — neither is native on `genome_sequence`:

```
{accession}|{segment}|{subtype}|{host_common_name}
  -> >CY086966|3|N1|Human
```

This also removes the concern that the download wizard's `genome`/`genome_sequence` branch
was advertising fields that could never populate on that format.
