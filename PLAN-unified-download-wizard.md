# Plan: NCBI-Style Unified Download Wizard

## Overview

This plan extends PLAN-query-encapsulation.md to implement an NCBI Virus-style multi-step download wizard as the unified download mechanism for BV-BRC. The wizard provides a structured, step-by-step workflow that handles all download scenarios consistently across the application.

---

## Part 1: NCBI Download Dialog Analysis

### Step-by-Step Workflow

**Step 1: Select Data Type**
| Category | Options | Output Format |
|----------|---------|---------------|
| Sequence Data | Nucleotide, Coding Region, Protein | FASTA |
| Accession List | Nucleotide, Protein, Assembly | Text list |
| Results Table | CSV, TSV, XML | Tabular |

**Step 2: Select Records**
| Option | Description |
|--------|-------------|
| Download Selected | Only manually selected records (disabled if none selected) |
| Download All | All records matching current query |
| Download Randomized Subset | Random sample, limited to N entries |

**Step 3: Configure Output (FASTA-specific)**
| Option | Description |
|--------|-------------|
| Use Default | Predefined FASTA definition line fields |
| Build Custom | User selects fields for definition line |

---

## Part 2: BV-BRC Mapping

### Data Type Mapping (Step 1)

**For Genomes:**
| BV-BRC Category | Options | Format |
|-----------------|---------|--------|
| Sequence Data | Genomic (fna), Proteins (faa), CDS (ffn), RNA (frn) | FASTA |
| Annotation Data | GFF, Features Tab | Structured |
| Pathway Data | Pathway Tab | Tabular |
| Results Table | TSV, CSV, Excel | Tabular |

**For Features:**
| BV-BRC Category | Options | Format |
|-----------------|---------|--------|
| Sequence Data | DNA FASTA, Protein FASTA | FASTA |
| Results Table | TSV, CSV, Excel | Tabular |

**For Other Data Types:**
Each data type has its own format options defined in the format registry.

### Record Selection Mapping (Step 2)

| NCBI Option | BV-BRC Implementation |
|-------------|----------------------|
| Selected Records | Current grid selection (`this.selection`) |
| All Records | Full query results (from QueryDescriptor) |
| Randomized Subset | Add `&limit(N)&select(random)` to query |

### Output Configuration (Step 3)

| Data Type | Configuration Options |
|-----------|----------------------|
| FASTA | Definition line fields, line width |
| Tabular | Column selection, sort order |
| Genome Bundle | Annotation type (PATRIC/RefSeq/All), Archive type (zip/tgz) |

---

## Part 3: Component Architecture

### 3.1 UnifiedDownloadWizard (Main Dialog)

```
┌─────────────────────────────────────────────────────────┐
│  Download Data                                     [X]  │
├─────────────────────────────────────────────────────────┤
│  ┌───────┐   ┌───────┐   ┌───────┐                     │
│  │ Step 1│ → │ Step 2│ → │ Step 3│    (Progress)       │
│  │ Type  │   │Records│   │Options│                     │
│  └───────┘   └───────┘   └───────┘                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Step Content Area - dynamically loaded]               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                        [Back]  [Next/Download]          │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Step Components

**Step 1: DataTypeSelector**
- Radio button groups for data categories
- Dynamic options based on source dataType
- Icons for visual clarity

**Step 2: RecordSelector**
- Radio buttons: Selected / All / Random Subset
- Shows counts for each option
- Random subset has numeric input for limit

**Step 3: OutputConfigurator**
- Varies by data type selected in Step 1
- FASTA: Definition line builder
- Tabular: Column selector
- Genome Bundle: Annotation/archive type

### 3.3 Supporting Components

**DefinitionLineBuilder** (for FASTA Step 3)
- Available fields list (drag source)
- Selected fields list (drop target + reorder)
- Preview of resulting definition line

**ColumnSelector** (for Tabular Step 3)
- Checkbox list of available columns
- Drag-to-reorder selected columns
- Select All / Select None shortcuts

---

## Part 4: Integration with Query Encapsulation

### QueryDescriptor Extensions

```javascript
{
  // ... existing fields from PLAN-query-encapsulation.md ...

  // Download-specific extensions
  downloadConfig: {
    // Last-used settings per data type (for user convenience)
    lastUsedFormat: 'tsv',
    lastUsedRecordScope: 'all',
    fastaDefLineFields: ['accession', 'organism', 'product'],
    tableColumns: ['genome_id', 'genome_name', 'species', ...]
  }
}
```

### Invocation Points

The wizard can be invoked with:
1. **QueryDescriptor** - For saved searches or full query downloads
2. **Selection + containerType** - For current grid selection
3. **Grid reference** - For context-aware downloads

```javascript
// From saved search
UnifiedDownloadWizard.open({
  queryDescriptor: savedSearch
});

// From grid selection
UnifiedDownloadWizard.open({
  selection: grid.selection,
  containerType: 'genome_data',
  grid: grid  // For column info
});

// From viewer action
UnifiedDownloadWizard.open({
  queryDescriptor: currentViewQuery,
  preselectedFormat: 'dna+fasta'
});
```

---

## Part 5: Implementation Plan

### Phase 1: Core Wizard Framework

#### Step 1.1: Create DownloadFormats Registry
**File**: `public/js/p3/util/DownloadFormats.js`

```javascript
{
  // Format definitions
  formats: {
    'tsv': {
      label: 'Tab-separated (TSV)',
      mimeType: 'text/tab-separated-values',
      extension: '.tsv',
      category: 'table',
      serverSide: true
    },
    'csv': { ... },
    'dna+fasta': {
      label: 'DNA FASTA',
      mimeType: 'application/fasta',
      extension: '.fna',
      category: 'sequence',
      serverSide: true,
      configurable: true,  // Has Step 3 options
      configurator: 'FASTAConfigurator'
    },
    ...
  },

  // Data type → available formats mapping
  dataTypeFormats: {
    'genome': {
      categories: {
        'sequence': ['dna+fasta', 'protein+fasta', 'cds+fasta', 'rna+fasta'],
        'annotation': ['gff', 'features.tab'],
        'pathway': ['pathway.tab'],
        'table': ['tsv', 'csv', 'excel']
      },
      bundleSupport: true,  // Can download as archive
      secondaryDataType: 'genome_sequence',
      pk: 'genome_id'
    },
    'genome_feature': {
      categories: {
        'sequence': ['dna+fasta', 'protein+fasta'],
        'table': ['tsv', 'csv', 'excel']
      },
      pk: 'feature_id'
    },
    ...
  }
}
```

#### Step 1.2: Create Wizard Base Infrastructure
**File**: `public/js/p3/widget/download/UnifiedDownloadWizard.js`

- Extends `dijit/Dialog`
- Step navigation logic (next/back/skip)
- Step validation before proceeding
- State management across steps
- Download execution coordination

#### Step 1.3: Create Step Base Class
**File**: `public/js/p3/widget/download/WizardStepBase.js`

- Common step interface: `validate()`, `getData()`, `reset()`
- Step state storage
- Event publishing for step changes

### Phase 2: Step Implementations

#### Step 2.1: DataTypeSelector Step
**File**: `public/js/p3/widget/download/DataTypeSelectorStep.js`

- Radio button groups by category
- Dynamic population from DownloadFormats registry
- Visual category icons
- Emits `format-selected` event

#### Step 2.2: RecordSelector Step
**File**: `public/js/p3/widget/download/RecordSelectorStep.js`

- Three radio options: Selected / All / Random Subset
- Real-time count display (async fetch for "All" count)
- Numeric input for random subset limit
- Validation: at least one record must be available

#### Step 2.3: OutputConfigurator Steps
**Files**:
- `public/js/p3/widget/download/FASTAConfiguratorStep.js`
- `public/js/p3/widget/download/TableConfiguratorStep.js`
- `public/js/p3/widget/download/GenomeBundleConfiguratorStep.js`

Each configurator:
- Specific options for that format type
- Preview of output
- Save as default option

### Phase 3: FASTA Definition Line Builder

#### Step 3.1: Field Registry
**File**: `public/js/p3/util/FASTADefLineFields.js`

```javascript
{
  genome: [
    { id: 'genome_id', label: 'Genome ID', example: '12345.6' },
    { id: 'genome_name', label: 'Genome Name', example: 'Escherichia coli str. K-12' },
    { id: 'species', label: 'Species', example: 'Escherichia coli' },
    { id: 'strain', label: 'Strain', example: 'K-12' },
    ...
  ],
  feature: [
    { id: 'feature_id', label: 'Feature ID', example: 'fig|12345.6.peg.1' },
    { id: 'patric_id', label: 'PATRIC ID', example: 'fig|12345.6.peg.1' },
    { id: 'product', label: 'Product', example: 'DNA gyrase subunit A' },
    { id: 'gene', label: 'Gene Symbol', example: 'gyrA' },
    ...
  ]
}
```

#### Step 3.2: Definition Line Builder Widget
**File**: `public/js/p3/widget/download/DefinitionLineBuilder.js`

- Two-panel drag-drop interface
- Available fields (left) → Selected fields (right)
- Reorderable selected list
- Live preview: `>genome_id|organism|product` → `>12345.6|E. coli|DNA gyrase`
- Delimiter selector (pipe, space, tab)

### Phase 4: Download Execution

#### Step 4.1: Download Executor
**File**: `public/js/p3/util/DownloadExecutor.js`

Consolidates download logic from existing code:
- Server-side downloads (form POST)
- Client-side downloads (FileSaver.js)
- Bundle downloads (archive creation)
- Progress tracking for large downloads

```javascript
{
  execute: function(downloadSpec) {
    // downloadSpec from wizard
    // {
    //   format: 'dna+fasta',
    //   recordScope: 'selected',  // or 'all', 'random'
    //   query: 'eq(genome_id,...)',
    //   selection: [...],
    //   config: { defLineFields: [...], delimiter: '|' }
    // }
  }
}
```

#### Step 4.2: Progress Dialog
**File**: `public/js/p3/widget/download/DownloadProgressDialog.js`

- Indeterminate progress for server-side
- Determinate progress for client-side batch
- Cancel support where possible
- Error display and retry option

### Phase 5: Integration

#### Step 5.1: Replace Existing Download UIs

**Modify**: `public/js/p3/widget/GridContainer.js`
- Replace download button handler to open wizard
- Pass selection and containerType

**Modify**: `public/js/p3/widget/DownloadTooltipDialog.js`
- "More Options" opens wizard instead of AdvancedDownload
- Keep quick TSV/CSV for simple cases (optional)

**Deprecate**: `public/js/p3/widget/AdvancedDownload.js`
- Replace with wizard, keep for compatibility during transition

#### Step 5.2: Viewer Integration

**Modify**: Various viewer headers
- Add "Download" button that opens wizard with current query
- Pass QueryDescriptor when available

#### Step 5.3: Saved Search Integration

**Modify**: `public/js/p3/widget/SavedSearchBrowser.js` (from query-encapsulation plan)
- Add "Download" action for each saved search
- Opens wizard with saved QueryDescriptor

---

## Part 6: File Summary

### New Files

| File | Description |
|------|-------------|
| `public/js/p3/util/DownloadFormats.js` | Centralized format registry |
| `public/js/p3/util/DownloadExecutor.js` | Download execution logic |
| `public/js/p3/util/FASTADefLineFields.js` | FASTA definition line field definitions |
| `public/js/p3/widget/download/UnifiedDownloadWizard.js` | Main wizard dialog |
| `public/js/p3/widget/download/WizardStepBase.js` | Base class for steps |
| `public/js/p3/widget/download/DataTypeSelectorStep.js` | Step 1: Format selection |
| `public/js/p3/widget/download/RecordSelectorStep.js` | Step 2: Record scope |
| `public/js/p3/widget/download/FASTAConfiguratorStep.js` | Step 3: FASTA options |
| `public/js/p3/widget/download/TableConfiguratorStep.js` | Step 3: Table options |
| `public/js/p3/widget/download/GenomeBundleConfiguratorStep.js` | Step 3: Bundle options |
| `public/js/p3/widget/download/DefinitionLineBuilder.js` | FASTA def line builder |
| `public/js/p3/widget/download/DownloadProgressDialog.js` | Progress indicator |
| `public/js/p3/widget/download/templates/*.html` | Templates for all widgets |

### Modified Files

| File | Changes |
|------|---------|
| `public/js/p3/widget/GridContainer.js` | Integrate wizard invocation |
| `public/js/p3/widget/DownloadTooltipDialog.js` | Link to wizard for "More Options" |
| `public/js/p3/widget/viewer/*List.js` | Add download button using wizard |

### Deprecated Files

| File | Replacement |
|------|-------------|
| `public/js/p3/widget/AdvancedDownload.js` | UnifiedDownloadWizard |

---

## Part 7: UI/UX Considerations

### Step Indicators
- Visual breadcrumb showing current step
- Completed steps show checkmark
- Future steps grayed out
- Click on completed step to go back

### Validation
- Step 1: Must select a format
- Step 2: Must have records available (disable "Selected" if none)
- Step 3: Format-specific validation (e.g., at least one def line field)

### Keyboard Navigation
- Tab through options within step
- Enter to proceed to next step
- Escape to close dialog (with confirmation if changes made)

### Responsive Behavior
- Dialog min-width: 600px
- Step content scrollable if needed
- Mobile: Stack step indicators vertically

### Loading States
- Show spinner while fetching record counts
- Disable "Next" until data loaded
- Show estimated download size when possible

---

## Part 8: Server-Side Considerations

### FASTA Definition Line Support

The server-side download endpoints may need enhancement to support custom definition lines:

**Option A: Client-side generation**
- Fetch data, generate FASTA client-side
- Works for smaller datasets
- No server changes needed

**Option B: Server parameter**
- Pass `defline_fields` parameter to server
- Server formats FASTA accordingly
- Better for large datasets

**Recommendation**: Implement Option A first, add Option B as optimization.

### Random Subset

Server should support:
- `limit(N)` - Already supported
- `select(random)` - May need to be added

---

## Part 9: Relationship to Query Encapsulation Plan

This plan **extends** PLAN-query-encapsulation.md:

1. **QueryDescriptor** is the input format for the wizard
2. **SavedSearchManager** can trigger downloads via wizard
3. **DownloadFormats** replaces scattered `downloadableConfig` objects
4. **UnifiedDownloadWizard** replaces the planned `UnifiedDownloadDialog`

### Merge Points

| Query Encapsulation Plan | This Plan |
|-------------------------|-----------|
| Step 2.1: UnifiedDownloadDialog | → UnifiedDownloadWizard (multi-step) |
| Step 2.2: DownloadFormats | → Same, expanded |
| Step 2.3: Batch Download Support | → DownloadExecutor with queue |

### Implementation Order

1. **Phase 1** of Query Encapsulation (QueryDescriptor, SavedSearchManager)
2. **Phase 1-4** of this plan (Download infrastructure)
3. **Phase 2-3** of Query Encapsulation (UI integration)
4. **Phase 5** of this plan (Integration, replacement)

---

## Part 10: Summary

The NCBI-style download wizard provides:

1. **Consistent UX** - Same workflow everywhere downloads are offered
2. **Flexibility** - Users can customize output format, record scope, and configuration
3. **Discoverability** - Step-by-step reveals all options without overwhelming
4. **Integration** - Works with QueryDescriptor for saved searches
5. **Extensibility** - New formats easily added to registry

This replaces the fragmented download system (DownloadTooltipDialog, AdvancedDownload, viewer-specific exports) with a unified, user-friendly wizard.
