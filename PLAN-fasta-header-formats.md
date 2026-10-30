# PLAN — FASTA header: delimiters, format strings, and saved named formats

**Branch:** `feature/fasta-header-formats` (from `alpha/alpha` @ `54b459f5e`)
**Scope:** `widget/download/FASTAConfiguratorStep.js`, its template, `util/DownloadExecutor.js`,
and a new `util/FastaFormatStore.js`. Client-side only; the API work is already done.

---

## What the API now offers

Three capabilities, two of which the client does not use at all:

| parameter | status on alpha | client sends it? |
|---|---|---|
| `http_fasta_id_fields` | live | yes |
| `http_fasta_id_delimiter` (default `\|`) | live | **no** |
| `http_fasta_description_fields` | live | yes |
| `http_fasta_description_delimiter` | **live** (new) | **no** |
| `http_fasta_context_fields` | live | no |
| `http_fasta_context_delimiter` (default `' \| '`) | live | **no** |
| `http_fasta_header` (format string) | live | **no** |

Verified against `genome_feature`, genome `1545742.911`, after the 2026-10-30 alpha restart:

```
&http_fasta_description_delimiter=%20%7C%20
  -> >fig|1545742.911.peg.9| MGYG-HGUT-00869 | Human | USA [...]

&http_fasta_header={patric_id}|{genome_id} {product} [{host_name}]
  -> >fig|1545742.911.peg.9|1545742.911 hypothetical protein [Human]
```

### Format-string contract (from `util/fastaHeaderFormatter.js:243-333`)

Four decisions that drive the UI design, not implementation trivia:

1. **Missing values render empty**, and the template is not rewritten around them. The zone
   scheme collapses the delimiter with an absent field; a template leaves a visible gap.
2. **Exclusive.** When `http_fasta_header` is present the zone parameters are *ignored*, not
   merged. This is why the UI must switch modes rather than offer both.
3. `{{` and `}}` are literal braces.
4. **An unknown field is a 400**, not an empty string — validated before the response starts.
   So the client can and should validate against `/fields` first.

The leading `>` is added by the server; the template supplies everything after it.

### One deployed behaviour still diverges from that contract

**An unknown field renders empty rather than 400** — contract decision 4 does not hold.
Re-verified 2026-10-30 after the field update:

```
http_fasta_header={accession} {hostname}   -> HTTP 200,  >CY086966
```

That is the realistic case: `{hostname}` instead of `{host_name}`. The user gets a silently
truncated header — exactly the failure mode decision 4 was written to prevent ("how the
original enrichment bug hid for weeks"). *Syntax* validation does fire correctly:

```
{patric_id        -> 400  "unbalanced braces (use {{ and }} for literal braces)"
{patric_id}{}     -> 400  "contains an empty field reference {}"
```

So the validator runs; the field-name check against the collection registry is what is
missing. **Client-side validation against `/fields` is therefore required, not just nice** —
it is currently the only thing standing between a typo and a bad download. Worth reporting
upstream regardless, since a direct API caller gets no protection from our validation.

*(A second divergence — `{{`/`}}` dropping their contents — was fixed in the same update.
`A{{x}}B` now renders `>A{x}B`, so brace escaping can be documented in the UI.)*

---

## The bug that prompted this

The preview promised `|`-separated description fields and the download delivered spaces:

```javascript
// FASTAConfiguratorStep.js:358   — preview
previewParts.push(descFields.join(' | '));

// p3_api util/fastaHeaderFormatter.js:268   — server, before the fix
const description = formatFields(doc, config.descriptionFields, ' ')
```

The server now accepts a delimiter. **The client must send one, or the preview stays a lie** —
the default remains `' '` for backward compatibility. This is the smallest shippable piece of
this plan and should land first.

---

## Design

### Two modes, exclusive, mirroring the API

```
( ) Build from fields          -> zone parameters
(•) Custom format string       -> http_fasta_header
```

Selecting *Custom format* disables the field pickers rather than hiding them, so the user can
see what they are leaving behind, and switching back restores the previous zone config.

**Seed the template from the current zone selection** when the user first switches. Someone
who has picked ID=`patric_id`, description=`strain, host_name` gets
`{patric_id} {strain} | {host_name}` to edit rather than a blank box. That turns the template
from a separate feature into a power-user escape hatch from the picker — and it is the single
most useful thing we can do to make the format string approachable.

### Delimiters

~~Three inputs: ID, description, context.~~ **Revised during item 2** — only two of the three
are meaningful in this UI, and one of them is not a delimiter at all:

- **Description delimiter.** Real, and the one the bug was about. Needs a control.
- **"ID delimiter" is a trailing character here.** The ID selector is a single-select
  (`<select>`, template line 14), so there is never a second ID field to delimit. The server
  appends it unconditionally after the ID section ("matches legacy format"), so all it
  controls is whether the header reads `>fig|...peg.9|` or `>fig|...peg.9`. Measured:

  ```
  id_delimiter='|'   -> >fig|1545742.911.peg.9| MGYG-HGUT-00869
  id_delimiter=''    -> >fig|1545742.911.peg.9 MGYG-HGUT-00869
  id_delimiter='_'   -> >fig|1545742.911.peg.9_ MGYG-HGUT-00869
  ```

  Worth exposing — the trailing pipe is legacy noise some users will want gone — but
  **labelling it "ID delimiter" would be a lie**. Label it for what it does.

- **No context delimiter.** `DownloadExecutor` hardcodes `http_fasta_context_fields=` empty
  and the configurator has no context concept, so there are no context fields to separate.
  The server supports them (`...&http_fasta_context_fields=genome_name,genome_id` →
  `[... | 1545742.911]`), so this is unexposed capability, not a dead end — but a delimiter
  control for fields that cannot be chosen would adjust nothing. Revisit if context fields
  are ever surfaced.

**Dropdown with a Custom escape, not a bare text field.** The plan originally called for text
inputs on the grounds that useful values do not enumerate. They mostly do — and a text field
makes `' | '` and `'|'` indistinguishable on screen, which is exactly the invisible-whitespace
problem flagged below. Named options (`Pipe ( | )`, `Space`, `Comma`) make the whitespace
legible; `Custom…` reveals a text input for anything else.

### Preview

The preview must be generated **from the same values the request will carry**. It is currently
a hand-built string that happens to disagree with the server; that is the whole bug. Build it
by the same rules in both modes:

- *zones*: `>` + id fields joined by idDelimiter + trailing idDelimiter + ` ` +
  description fields joined by descriptionDelimiter + ` [` + context + `]`
  (note the server appends a trailing ID delimiter — `fastaHeaderFormatter.js:262`)
- *template*: substitute field names with example values; leave unknown fields visibly marked

`util/FASTADefLineFields.js` carries per-field `example` values and is **currently dead code**
(its only consumer, `widget/download/DefinitionLineBuilder.js`, is never instantiated). Reuse
those examples for the preview, then delete the rest of the module — or fold the examples into
whatever replaces it. Do not leave two field registries behind.

### Field naming differs between the two modes

**Measured while building item 3, and it constrains seed-from-zones directly.**

Zone mode accepts *either* naming for an enriched field; template mode accepts only the
bare name:

```
zone      http_fasta_description_fields=genome_metadata.strain  -> MGYG-HGUT-00869
zone      http_fasta_description_fields=strain                  -> MGYG-HGUT-00869
template  {genome_metadata.strain}                              -> (empty)
template  {strain}                                              -> MGYG-HGUT-00869
```

The picker's hardcoded list uses the **prefixed** form for five fields
(`FASTAConfiguratorStep.js:247-251`), so seeding a template straight from the current zone
selection would produce `{genome_metadata.strain}` — silently empty, the exact failure this
feature exists to prevent.

**Fix: normalise to the bare name.** Both forms work in zone mode, so stripping
`genome_metadata.` is safe for the existing path and required for the template path.
`/fields` lists only bare names, which is also what item 5 will adopt.

### Three offered fields are not joinable at all

`assembly_accession`, `bioproject_accession` and `biosample_accession` are in the picker but
**absent from `/fields`** on both `genome_feature` and `genome_sequence`, and resolve under
neither naming in either mode — though the genome record has values:

```
genome 1545742.911 -> assembly_accession=GCA_902466705.1, bioproject_accession=PRJEB33885
select(feature_id,assembly_accession)  -> (field absent from the response)
```

So the picker advertises three fields that always produce nothing. Same bug class as the
original report, still live in the hardcoded list. Either the API adds them to
`GENOME_METADATA_FIELDS` or item 5 drops them when it switches to `/fields` — item 5 fixes
it for free, which is an argument for doing it sooner. `genbank_accessions` *is* enriched and
may be the intended substitute.

### Validation

- Template: balanced braces, no `{}`, non-empty — mirror `validateTemplate()`. The server does
  enforce these, so this is only to fail faster.
- Field names: check each `{name}` against `/<collection>/fields`. **This is load-bearing, not
  a nicety** — per divergence (a) above, the deployed server renders an unknown field as empty
  and returns 200, so a typo'd `{hostname}` produces a silently truncated header with no error
  anywhere. Suggest a correction ("did you mean `host_name`?") from the `/fields` list.
- Name on save: non-empty, and warn before overwriting an existing name.

---

## Saved named formats

**Decision: one preferences file, matching `util/FavoriteFolders.js`.**

```
/<user>/home/.preferences/fasta-formats.json
```

```json
{
  "formats": [
    {
      "name": "NCBI style",
      "dataType": "genome_feature",
      "mode": "template",
      "template": "{patric_id}|{genome_id} {product} [{genome_name}]",
      "created": "2026-10-30T12:00:00Z"
    },
    {
      "name": "Host + country",
      "dataType": "genome_feature",
      "mode": "zones",
      "idFields": ["patric_id"],
      "idDelimiter": "|",
      "descriptionFields": ["strain", "host_name"],
      "descriptionDelimiter": " | "
    }
  ]
}
```

New module `util/FastaFormatStore.js`, lifting the proven parts of `FavoriteFolders`:

- `_ensurePreferencesDir()` — `getObject(dir, true)`, create on failure
- read-modify-write with a **mod-time merge**, so a save from a second tab is not clobbered
  (`FavoriteFolders` compares `result.metadata.creation_time`)
- in-memory cache keyed by user id, invalidated on logout
- `WorkspaceManager.saveFile(path, content, 'json')`

`list()` / `save(format)` / `remove(name)` / `load(name)`, all returning Deferreds.

**Filter the list by `dataType`.** A `genome_feature` template referencing `{product}` is
meaningless on a `genome_sequence` download and would 400. Show matching formats; keep the
others but mark them unavailable rather than hiding them, so a user does not think their saved
format vanished.

### Logged out

**Decision: hide the save/load section entirely.** Delimiters and templates still work for
everyone — only persistence requires an account. `FavoriteFolders._getFilePath()` returns null
with no `window.App.user.id`, so the guard is the same one-liner. No dead buttons.

---

## Work items

Ordered so each step is shippable on its own.

### 1. Send the delimiters — fixes the reported bug

`DownloadExecutor.js:223` and `:380` build the FASTA params. Add the three delimiters, defaulted
to the server's own defaults so nothing changes for a user who does not touch them. Fix the
preview (`FASTAConfiguratorStep.js:358`) to use the actual description delimiter.

Small, no API dependency, resolves the complaint. **Land this first.**

### 2. Delimiter controls in the UI

Two controls (see *Delimiters* above — the third would adjust nothing): a description
delimiter dropdown with a Custom escape, and a checkbox for the trailing ID character.
Preview wiring comes free, since item 1 made the preview derive from these values.

### 3. Format-string mode

`http_fasta_header` is live on alpha, so this is unblocked. Radio switch, textarea,
field-reference helper (clicking a field in the picker inserts `{name}` at the cursor),
client-side validation against `/fields`, seed-from-zones on first switch.

### 4. `util/FastaFormatStore.js` + save/load UI

Independent of item 3 — it can store zone configs before templates exist. Build it after 2,
ship with whichever of 2/3 is ready.

### 5. Replace the hardcoded field list with `/fields`

Out of scope for the reported bug but adjacent: `_getDefaultFieldsForDataType()`
(`FASTAConfiguratorStep.js:92-133`) hardcodes fields that already drifted from the server
twice. `/<collection>/fields` now reports `source: native|enriched` with labels.

**One caution:** `/fields` **404s on production** — needs a fallback to the current hardcoded
list, or must ship in lockstep with the API release.

The `genome_sequence` concern is resolved: that serializer now enriches (verified with two
enriched-only fields, `{subtype}` and `{host_common_name}` → `>CY086966|3|N1|Human`), so
consuming `/fields` directly is safe for every FASTA data type.

---

## Testing

- [ ] Default (no delimiters touched) produces **byte-identical** output to before item 1
- [ ] Each delimiter independently; `|`, ` | `, `_`, empty string, a literal space
- [ ] Preview matches the downloaded header **exactly**, both modes — this is the regression
      that started this work
- [ ] Missing field value: zones collapse the delimiter, template leaves a gap (per contract)
- [ ] Template with an unknown field is caught client-side — the server returns 200 with an
      empty substitution, so nothing else will catch it
- [ ] `{{literal}}` braces survive round-trip
- [ ] Each built-in preset renders exactly the header recorded in `REPORT-fasta-header-presets.md`
- [ ] Flu B preset on a record with empty `strain` — leading empty field is visible, not silent
- [ ] `{patric_id}` in a `|`-delimited template triggers the pipe warning
- [ ] Save, reload the page, load the format back
- [ ] Two tabs saving different formats — neither is lost (mod-time merge)
- [ ] Logged out: delimiters/templates work, save UI absent, no console error
- [ ] Format saved for `genome_feature` is marked unavailable on a `genome_sequence` download
- [ ] First-ever save creates `.preferences/` when it does not exist
- [ ] Both FASTA data types (protein and DNA) and both grid sources

---

## Built-in format presets

**All verified against live alpha** — see [`REPORT-fasta-header-presets.md`](REPORT-fasta-header-presets.md)
for the full output, field reference and reproduction commands. The API update of 2026-10-30
added the seven virology fields (`genome_feature` enrichment 35 → 42), so every preset below
works today.

Ship them **per data type**, since `{product}` is meaningless on `genome_sequence`:

| # | preset | data type | format string |
|---|---|---|---|
| 1 | Classic NCBI / BLAST | genome_feature | `{patric_id} {product} [{genome_name}]` |
| 2 | NCBI source modifiers | genome_feature | `{patric_id} [organism={genome_name}] [strain={strain}] [host={host_name}] [country={isolation_country}] [collection_date={collection_date}]` |
| 3 | NCBI source modifiers, influenza | genome_feature | `{accession} [organism={genome_name}] [strain={strain}] [serotype={subtype}] [segment={segment}] [host={host_name}] [country={isolation_country}] [collection_date={collection_date}]` |
| 4 | GISAID / augur, influenza A | genome_feature | `{strain}\|A\|{subtype}\|{collection_date}\|\|{isolation_country}\|{host_common_name}\|{accession}` |
| 5 | GISAID / augur, influenza B | genome_feature | `{strain}\|B\|{lineage}\|{collection_date}\|\|{isolation_country}\|{host_common_name}\|{accession}` |
| 6 | GISAID-style, sequence level | genome_sequence | `{accession}\|{segment}\|{strain}\|{collection_date}\|{isolation_country}\|{host_common_name}` |
| 7 | Bacterial, metadata-rich | genome_feature | `{patric_id} {product} [{genome_name}] [{strain}] [{host_name}] [{isolation_country}]` |

Real output for #4 and #1:

```
>A/New York/3197/2009|A|N1|2009-04-29||USA|Human|CY086966
>fig|83332.12.peg.1000 Beta-carotene ketolase [Mycobacterium tuberculosis H37Rv]
```

GISAID field order is pinned by `augur parse`
(https://docs.nextstrain.org/projects/augur/en/stable/usage/cli/parse.html):
`strain type subtype date season country host accession`, separator `|`.
NCBI's defline rules are at https://www.ncbi.nlm.nih.gov/genbank/fastaformat/.

### Four data facts that constrain preset design

1. **`subtype` is not always a subtype.** Influenza B records carry the literal string
   `Influenza B`, with the discriminator in `lineage` (`Yamagata`/`Victoria`). Hence separate
   A and B presets, and `type` hardcoded in each — BV-BRC has no type field distinct from
   subtype. **Presets are per-organism, not one generic "GISAID" entry.**
2. **`strain` can be empty** (4 of a 200-genome influenza sample) even when `genome_name`
   carries the name, and it *leads* the GISAID format: `>|B|Yamagata|2015-06-12|...`. A
   leading empty field is worse for a positional parser than a missing record.
3. **An absent value yields a malformed NCBI modifier**: `[collection_date=]`. Per contract
   decision 1 this is intended, but it means preset #2/#3 must be labelled **"NCBI-shaped,
   not submission-ready"**. Zone mode does not have this problem — it skips absent fields.
4. **`{patric_id}` contains a pipe** (`fig|646741.3.CDS.1`), which hands `augur parse` an
   extra field. Flu presets use `{accession}`. **Warn when `{patric_id}` appears in a template
   whose delimiter is `|`.**

Built-ins are read-only entries in the same picker as saved formats, with "duplicate and
edit" — the cheapest way to make the template syntax discoverable.

## Open questions

1. **Should a saved format be shareable?** The preferences file is private by design. If
   sharing is wanted, add an explicit "Export…" writing a single-format file (the
   `SavedSearchManager.exportToWorkspace` pattern) rather than moving the primary store.
2. **Should the NCBI modifier presets enforce their own rules, or just warn?** NCBI requires a
   SeqID ≤25 chars from a restricted charset, and does not define an empty modifier value —
   we produce `[collection_date=]`. Current plan is to label them "NCBI-shaped"; enforcing
   would mean rejecting templates rather than describing them.
3. **Report the unknown-field divergence upstream?** It undercuts a decision the API authors
   made deliberately, and our validation only protects users coming through the wizard —
   a direct API caller still gets a silent empty substitution.
4. **`species` returns the ICTV name** (`Alphainfluenzavirus influenzae`), not
   `Influenza A virus`. Correct, but surprising inside `[organism=…]`; `{genome_name}` is
   closer to submitter expectation. Decide before preset #3 ships.

### Resolved since first draft

- ~~Ship built-in named formats?~~ Yes — seven, all verified. See above.
- ~~Add the virology fields to `GENOME_METADATA_FIELDS`?~~ Done, 2026-10-30.
- ~~`genome_sequence` FASTA enrichment?~~ Done — that serializer now joins.
- ~~`{{`/`}}` escaping broken?~~ Fixed in the same update.
