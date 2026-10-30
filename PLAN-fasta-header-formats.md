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

### Two deployed behaviours diverge from that contract

Measured on alpha after the restart. Both affect the UI design, so they are worth settling
before item 3 is built.

**(a) An unknown field renders empty rather than 400** — contract decision 4 does not hold:

```
http_fasta_header={patric_id} {bogus_field}   -> HTTP 200,  >fig|1545742.911.peg.9
http_fasta_header={patric_id} {hostname}      -> HTTP 200,  >fig|1545742.911.peg.9
```

That second one is the realistic case: `{hostname}` instead of `{host_name}`. The user gets a
silently truncated header — exactly the failure mode decision 4 was written to prevent ("how
the original enrichment bug hid for weeks"). *Syntax* validation does fire correctly:

```
{patric_id        -> 400  "unbalanced braces (use {{ and }} for literal braces)"
{patric_id}{}     -> 400  "contains an empty field reference {}"
```

So the validator runs; the field-name check against the collection registry is what is
missing. **Client-side validation against `/fields` is therefore required, not just nice** —
it is currently the only thing standing between a typo and a bad download. Worth reporting
upstream regardless.

**(b) `{{` / `}}` do not round-trip** — the escaped content is dropped:

```
A{{x}}B   -> >A{}B        expected  >A{x}B
{{lit}}   -> >{}          expected  >{lit}
```

The inner text is lost and only the braces survive. Minor, but it means the UI should not
advertise `{{...}}` as a way to emit literal braces until it is fixed.

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

Three inputs, in the respective sections: ID, description, context. Short text fields, not
dropdowns — the useful values (`|`, ` | `, `_`, `;`, tab) do not enumerate well, and the API
takes an arbitrary string.

Leading/trailing spaces are significant and users cannot see them. Render the current value
with visible markers in the preview legend (e.g. `"·|·"`) or show the delimiter inside the
live preview — the preview already updates on change, which handles most of it.

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

Three text inputs + preview wiring. Still no API dependency.

### 3. Format-string mode

`http_fasta_header` is live on alpha, so this is unblocked. Radio switch, textarea,
field-reference helper (clicking a field in the picker inserts `{name}` at the cursor),
client-side validation against `/fields`, seed-from-zones on first switch.

Do not surface `{{...}}` escaping in the UI help text until divergence (b) is fixed.

### 4. `util/FastaFormatStore.js` + save/load UI

Independent of item 3 — it can store zone configs before templates exist. Build it after 2,
ship with whichever of 2/3 is ready.

### 5. Replace the hardcoded field list with `/fields`

Out of scope for the reported bug but adjacent: `_getDefaultFieldsForDataType()`
(`FASTAConfiguratorStep.js:92-133`) hardcodes fields that already drifted from the server
twice. `/<collection>/fields` now reports `source: native|enriched` with labels.

**Two cautions:**
- `/fields` **404s on production** — needs a fallback to the current hardcoded list, or must
  ship in lockstep with the API release.
- The `genome`/`genome_sequence` branch currently offers Species/Strain/Host/Country/Collection
  Date. `/fields` reports `genome_sequence` as having 33 enriched fields now, but **its FASTA
  serializer still has no join** (`media/dna+fasta.js:379`, *"no join needed"*), so those stay
  inert on a sequence FASTA download even though `select()` and CSV resolve them. Consuming
  `/fields` naively would keep advertising them. Either the serializer gains a join or the UI
  filters them for that one format.

---

## Testing

- [ ] Default (no delimiters touched) produces **byte-identical** output to before item 1
- [ ] Each delimiter independently; `|`, ` | `, `_`, empty string, a literal space
- [ ] Preview matches the downloaded header **exactly**, both modes — this is the regression
      that started this work
- [ ] Missing field value: zones collapse the delimiter, template leaves a gap (per contract)
- [ ] Template with an unknown field is caught client-side — the server returns 200 with an
      empty substitution, so nothing else will catch it
- [ ] `{{literal}}` braces survive round-trip (**currently fails server-side** — divergence (b))
- [ ] Save, reload the page, load the format back
- [ ] Two tabs saving different formats — neither is lost (mod-time merge)
- [ ] Logged out: delimiters/templates work, save UI absent, no console error
- [ ] Format saved for `genome_feature` is marked unavailable on a `genome_sequence` download
- [ ] First-ever save creates `.preferences/` when it does not exist
- [ ] Both FASTA data types (protein and DNA) and both grid sources

---

## Open questions

1. **Should a saved format be shareable?** The preferences file is private by design. If
   sharing is wanted, add an explicit "Export…" writing a single-format file (the
   `SavedSearchManager.exportToWorkspace` pattern) rather than moving the primary store.
2. **Ship built-in named formats?** "NCBI style", "Legacy BV-BRC", "ID only" as read-only
   entries alongside the user's own would teach the template syntax by example.
3. **`genome_sequence` FASTA enrichment** — serializer gains a join, or the UI keeps filtering
   those fields out? Affects item 5 and is an API-side call.
4. **Report divergences (a) and (b) upstream?** (a) in particular undercuts a decision the API
   authors made deliberately, and the client workaround only protects users coming through the
   wizard — anyone calling the API directly still gets a silent empty substitution.
