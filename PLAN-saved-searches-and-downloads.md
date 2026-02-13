# Plan: Saved Searches & Unified Download System

## Overview

A unified system for BV-BRC that provides:
1. **Query Encapsulation** - Capture and save search queries for re-execution and sharing
2. **NCBI-Style Download Wizard** - Step-by-step download interface with format selection, record scoping, and output configuration
3. **Consistent Integration** - Same experience across all data views and saved searches

---

# Part 1: Current Architecture Analysis

## 1.1 Query System

**Format**: RQL (Resource Query Language) strings
- Example: `eq(genome_id,*)&genome(eq(taxon_lineage_ids,11320),keyword(test))`
- Operators: `eq()`, `ne()`, `in()`, `gt()`, `lt()`, `between()`, `keyword()`, `and()`, `or()`

**Query Construction Points**:
| Location | Method | Purpose |
|----------|--------|---------|
| `public/js/p3/widget/search/*.js` | `buildQuery()` | Tab-specific search forms |
| `public/js/p3/widget/FacetFilterPanel.js` | `toggleInFilter()` | Filter sidebar |
| `public/js/p3/widget/AdvancedSearchRowForm.js` | Row conditions | Advanced search rows |
| `public/js/p3/util/searchToQuery*.js` | Keyword parsing | Natural language → RQL |

**Query Flow**:
```
UI Input → Search Widget.buildQuery() → RQL String
    → Router.go(url, {search: rql})
    → State Object → Viewer
    → DataStore.query() → POST to Data Service
```

**Existing Utilities**:
- `QueryToEnglish.js` - RQL → human-readable HTML
- `QueryToSearchInput.js` - RQL → editable search text
- `rql/parser` - RQL string → AST

## 1.2 Download System (Current - Fragmented)

**Current Mechanisms**:
1. `DownloadTooltipDialog.js` - Quick TSV/CSV/Excel from grids
2. `AdvancedDownload.js` - Dialog with format selection for genomes
3. GridContainer actions - Direct API calls
4. Viewer-specific exports - Heatmaps, MSA, FASTA

**Download Patterns**:
- **Server-side**: Hidden form POST to `/bundle/{dataType}/` or `/{dataType}/?http_download=true`
- **Client-side**: FileSaver.js with Blob from store data

**Gap**: No unified way to pass query + data type + format preferences between components.

---

# Part 2: Design Overview

## 2.1 QueryDescriptor Object

The central data structure for saved searches and download configuration:

```javascript
{
  // Core identity
  id: 'uuid',
  name: 'User-provided name',
  description: 'Optional notes',

  // Query definition
  dataType: 'genome',                    // Primary data type
  rqlQuery: 'genome(eq(taxon_id,...))',  // Full RQL string
  baseQuery: 'eq(genome_id,*)',          // Type prefix (for joining)

  // Display
  displayQuery: 'Genomes where...',      // Human-readable (from QueryToEnglish)

  // Metadata
  source: 'advanced_search',             // Where it was created
  created: Date.now(),
  lastUsed: Date.now(),

  // Download configuration (persisted user preferences)
  downloadConfig: {
    lastUsedFormat: 'tsv',
    lastUsedRecordScope: 'all',
    fastaDefLineFields: ['accession', 'organism', 'product'],
    tableColumns: ['genome_id', 'genome_name', 'species']
  },

  // Cached results (optional)
  resultCount: 1234,
  countTimestamp: Date.now()
}
```

## 2.2 Storage Strategy

| Storage | Purpose | Use Case |
|---------|---------|----------|
| **LocalStorage** | Quick access, recent searches | `bvbrc_saved_searches_` prefix |
| **Workspace** | Persistence, sharing | `.search` JSON files |

## 2.3 Download Wizard (NCBI-Style)

Three-step wizard workflow:

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

**Step 1: Select Data Type**
| Category | Options | Output Format |
|----------|---------|---------------|
| Sequence Data | Nucleotide, Coding Region, Protein | FASTA |
| Annotation Data | GFF, Features Tab | Structured |
| Results Table | CSV, TSV, Excel | Tabular |

**Step 2: Select Records**
| Option | Description |
|--------|-------------|
| Download Selected | Only manually selected records (disabled if none) |
| Download All | All records matching current query |
| Download Randomized Subset | Random sample, limited to N entries |

**Step 3: Configure Output**
| Data Type | Configuration Options |
|-----------|----------------------|
| FASTA | Definition line fields (drag-drop builder), delimiter, line width |
| Tabular | Column selection, sort order |
| Genome Bundle | Annotation type (PATRIC/RefSeq/All), Archive type (zip/tgz) |

---

# Part 3: Data Type Format Mapping

## 3.1 Format Registry Structure

```javascript
{
  formats: {
    'tsv': {
      label: 'Tab-separated (TSV)',
      mimeType: 'text/tab-separated-values',
      extension: '.tsv',
      category: 'table',
      serverSide: true
    },
    'csv': {
      label: 'Comma-separated (CSV)',
      mimeType: 'text/csv',
      extension: '.csv',
      category: 'table',
      serverSide: true
    },
    'excel': {
      label: 'Excel Spreadsheet',
      mimeType: 'application/vnd.openxmlformats',
      extension: '.xlsx',
      category: 'table',
      serverSide: true
    },
    'dna+fasta': {
      label: 'DNA FASTA',
      mimeType: 'application/fasta',
      extension: '.fna',
      category: 'sequence',
      serverSide: true,
      configurable: true,
      configurator: 'FASTAConfigurator'
    },
    'protein+fasta': {
      label: 'Protein FASTA',
      mimeType: 'application/fasta',
      extension: '.faa',
      category: 'sequence',
      serverSide: true,
      configurable: true,
      configurator: 'FASTAConfigurator'
    },
    'gff': {
      label: 'GFF3 Annotation',
      mimeType: 'text/gff3',
      extension: '.gff',
      category: 'annotation',
      serverSide: true
    }
  }
}
```

## 3.2 Data Type Mappings

**Genomes (`genome`)**:
| Category | Formats |
|----------|---------|
| Sequence | Genomic FASTA (fna), Protein FASTA (faa), CDS FASTA (ffn), RNA FASTA (frn) |
| Annotation | GFF, Features Tab |
| Pathway | Pathway Tab |
| Table | TSV, CSV, Excel |

**Features (`genome_feature`)**:
| Category | Formats |
|----------|---------|
| Sequence | DNA FASTA, Protein FASTA |
| Table | TSV, CSV, Excel |

**Specialty Genes (`sp_gene`)**:
| Category | Formats |
|----------|---------|
| Sequence | DNA FASTA, Protein FASTA (via genome_feature join) |
| Table | TSV, CSV, Excel |

**Other Data Types**: Each has table formats; sequence formats only where applicable.

---

# Part 4: Implementation Phases

## Phase 1: Core Infrastructure

### Step 1.1: QueryDescriptor Module
**File**: `public/js/p3/util/QueryDescriptor.js`

```javascript
define([
  'dojo/_base/lang',
  './QueryToEnglish'
], function(lang, QueryToEnglish) {
  return {
    create: function(options) {
      // Factory function
      return {
        id: this._generateId(),
        name: options.name || this._generateName(options.dataType, options.rqlQuery),
        description: options.description || '',
        dataType: options.dataType,
        rqlQuery: options.rqlQuery,
        baseQuery: options.baseQuery || '',
        displayQuery: QueryToEnglish.toPlainText(options.rqlQuery),
        source: options.source || 'unknown',
        created: Date.now(),
        lastUsed: Date.now(),
        downloadConfig: options.downloadConfig || {},
        resultCount: options.resultCount || null,
        countTimestamp: null
      };
    },

    _generateId: function() {
      return 'search_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    _generateName: function(dataType, rqlQuery) {
      // Auto-generate human-readable name from query
      var english = QueryToEnglish.toPlainText(rqlQuery);
      var typeName = this._dataTypeLabels[dataType] || dataType;
      return typeName + ': ' + (english.length > 40 ? english.substr(0, 40) + '...' : english);
    },

    validate: function(descriptor) {
      return descriptor.dataType && descriptor.rqlQuery;
    },

    serialize: function(descriptor) {
      return JSON.stringify(descriptor);
    },

    deserialize: function(json) {
      return JSON.parse(json);
    }
  };
});
```

### Step 1.2: SavedSearchManager
**File**: `public/js/p3/util/SavedSearchManager.js`

- LocalStorage backend with key prefix `bvbrc_saved_searches_`
- CRUD operations: `save()`, `get()`, `list()`, `delete()`, `update()`
- Event publishing via `topic.publish('SavedSearch/changed')` for UI updates
- Workspace export/import: `exportToWorkspace(searchId, path)`, `importFromWorkspace(path)`
- File type: `.search` (JSON content)

### Step 1.3: DownloadFormats Registry
**File**: `public/js/p3/util/DownloadFormats.js`

- Centralized format definitions (as shown in 3.1)
- Data type → available formats mapping (as shown in 3.2)
- Methods: `getFormatsForDataType(dataType)`, `getFormatInfo(formatId)`
- Replaces scattered `downloadableConfig` objects

### Step 1.4: Modify QueryToEnglish
**File**: `public/js/p3/util/QueryToEnglish.js` (modify)

- Add `toPlainText()` method for generating names (no HTML)
- Used by QueryDescriptor for auto-naming

## Phase 2: Download Wizard Framework

### Step 2.1: Wizard Base Infrastructure
**File**: `public/js/p3/widget/download/UnifiedDownloadWizard.js`

- Extends `dijit/Dialog`
- Step navigation logic (next/back/skip)
- Step validation before proceeding
- State management across steps
- Download execution coordination

**Invocation API**:
```javascript
// From saved search
UnifiedDownloadWizard.open({
  queryDescriptor: savedSearch
});

// From grid selection
UnifiedDownloadWizard.open({
  selection: grid.selection,
  containerType: 'genome_data',
  grid: grid
});

// From viewer with preselected format
UnifiedDownloadWizard.open({
  queryDescriptor: currentViewQuery,
  preselectedFormat: 'dna+fasta'
});
```

### Step 2.2: Wizard Step Base Class
**File**: `public/js/p3/widget/download/WizardStepBase.js`

- Common interface: `validate()`, `getData()`, `reset()`, `onShow()`, `onHide()`
- Step state storage
- Event publishing for step changes

### Step 2.3: Step 1 - DataTypeSelector
**File**: `public/js/p3/widget/download/DataTypeSelectorStep.js`

- Radio button groups by category (Sequence, Annotation, Table)
- Dynamic population from DownloadFormats registry
- Visual category icons
- Emits `format-selected` event

### Step 2.4: Step 2 - RecordSelector
**File**: `public/js/p3/widget/download/RecordSelectorStep.js`

- Three radio options: Selected / All / Random Subset
- Real-time count display (async fetch for "All" count)
- Numeric input for random subset limit (default: 2000, max: configurable)
- Validation: at least one record must be available
- Disables "Selected" option if no selection

### Step 2.5: Step 3 - Output Configurators
**Files**:
- `public/js/p3/widget/download/FASTAConfiguratorStep.js`
- `public/js/p3/widget/download/TableConfiguratorStep.js`
- `public/js/p3/widget/download/GenomeBundleConfiguratorStep.js`

Each configurator provides format-specific options with preview and "save as default" capability.

## Phase 3: FASTA Definition Line Builder

### Step 3.1: Field Registry
**File**: `public/js/p3/util/FASTADefLineFields.js`

```javascript
{
  genome: [
    { id: 'genome_id', label: 'Genome ID', example: '12345.6' },
    { id: 'genome_name', label: 'Genome Name', example: 'Escherichia coli str. K-12' },
    { id: 'species', label: 'Species', example: 'Escherichia coli' },
    { id: 'strain', label: 'Strain', example: 'K-12' },
    { id: 'accession', label: 'Accession', example: 'GCF_000005845' },
    { id: 'isolation_country', label: 'Country', example: 'USA' },
    { id: 'collection_date', label: 'Collection Date', example: '2020-01-15' }
  ],
  feature: [
    { id: 'feature_id', label: 'Feature ID', example: 'fig|12345.6.peg.1' },
    { id: 'patric_id', label: 'PATRIC ID', example: 'fig|12345.6.peg.1' },
    { id: 'product', label: 'Product', example: 'DNA gyrase subunit A' },
    { id: 'gene', label: 'Gene Symbol', example: 'gyrA' },
    { id: 'locus_tag', label: 'Locus Tag', example: 'b0001' },
    { id: 'genome_name', label: 'Genome Name', example: 'Escherichia coli str. K-12' },
    { id: 'accession', label: 'Accession', example: 'NC_000913' }
  ]
}
```

### Step 3.2: Definition Line Builder Widget
**File**: `public/js/p3/widget/download/DefinitionLineBuilder.js`

- Two-panel drag-drop interface
- Available fields (left) → Selected fields (right)
- Reorderable selected list
- Live preview: `>genome_id|organism|product` → `>12345.6|E. coli|DNA gyrase`
- Delimiter selector (pipe `|`, space, tab, semicolon)

## Phase 4: Download Execution

### Step 4.1: Download Executor
**File**: `public/js/p3/util/DownloadExecutor.js`

Consolidates download logic from existing code:

```javascript
{
  execute: function(downloadSpec) {
    // downloadSpec structure:
    // {
    //   format: 'dna+fasta',
    //   recordScope: 'selected',  // 'selected', 'all', 'random'
    //   randomLimit: 2000,        // only if recordScope is 'random'
    //   dataType: 'genome',
    //   query: 'eq(genome_id,...)',
    //   selection: [...],         // only if recordScope is 'selected'
    //   config: {                 // format-specific config
    //     defLineFields: ['accession', 'organism'],
    //     delimiter: '|'
    //   }
    // }
  },

  _executeServerSide: function(spec) {
    // Hidden form POST
  },

  _executeClientSide: function(spec) {
    // FileSaver.js with Blob
  },

  _executeBundleDownload: function(spec) {
    // Archive creation for genomes
  }
}
```

### Step 4.2: Progress Dialog
**File**: `public/js/p3/widget/download/DownloadProgressDialog.js`

- Indeterminate progress for server-side downloads
- Determinate progress for client-side batch operations
- Cancel support where possible
- Error display and retry option

### Step 4.3: Batch Download Support

- Queue multiple queries for sequential download
- Archive creation for multiple files
- Progress tracking across batch
- Integrated into DownloadExecutor

## Phase 5: Saved Search UI

### Step 5.1: Save Search Dialog
**File**: `public/js/p3/widget/SaveSearchDialog.js`

- Auto-generated name (editable)
- Optional description field
- Storage choice: LocalStorage only / Also save to Workspace
- Workspace path selector (if workspace option chosen)

### Step 5.2: Saved Search Browser
**File**: `public/js/p3/widget/SavedSearchBrowser.js`

- List view of saved searches (sorted by lastUsed)
- Actions per search:
  - **Run** - Navigate to search results
  - **Download** - Open download wizard with QueryDescriptor
  - **Edit** - Rename, update description
  - **Delete** - Remove from storage
  - **Export** - Save to workspace
- Import from workspace
- Integrate into user menu or sidebar panel

### Step 5.3: Save Search Button Integration
**Modify**: `public/js/p3/widget/search/SearchBase.js`

- Add "Save Search" button to search result headers
- Creates QueryDescriptor from current state
- Opens SaveSearchDialog

## Phase 6: System Integration

### Step 6.1: Replace Existing Download UIs

**Modify**: `public/js/p3/widget/GridContainer.js`
- Replace download button handler to open wizard
- Pass selection and containerType
- Keep quick TSV/CSV in tooltip for power users (optional)

**Modify**: `public/js/p3/widget/DownloadTooltipDialog.js`
- "More Options" opens wizard instead of AdvancedDownload
- Keep quick TSV/CSV for simple cases

**Deprecate**: `public/js/p3/widget/AdvancedDownload.js`
- Replace with wizard
- Keep for compatibility during transition

### Step 6.2: Viewer Integration

**Modify**: Various viewer headers (`public/js/p3/widget/viewer/*List.js`)
- Add "Download" button that opens wizard with current query
- Pass QueryDescriptor when available

### Step 6.3: Saved Search Integration

- SavedSearchBrowser "Download" action opens wizard
- Wizard receives QueryDescriptor directly

---

# Part 5: File Summary

## New Files

| File | Description |
|------|-------------|
| `public/js/p3/util/QueryDescriptor.js` | Query encapsulation with factory methods |
| `public/js/p3/util/SavedSearchManager.js` | Storage management (LocalStorage + Workspace) |
| `public/js/p3/util/DownloadFormats.js` | Centralized format registry |
| `public/js/p3/util/DownloadExecutor.js` | Unified download execution logic |
| `public/js/p3/util/FASTADefLineFields.js` | FASTA definition line field definitions |
| `public/js/p3/widget/download/UnifiedDownloadWizard.js` | Main wizard dialog |
| `public/js/p3/widget/download/WizardStepBase.js` | Base class for wizard steps |
| `public/js/p3/widget/download/DataTypeSelectorStep.js` | Step 1: Format selection |
| `public/js/p3/widget/download/RecordSelectorStep.js` | Step 2: Record scope |
| `public/js/p3/widget/download/FASTAConfiguratorStep.js` | Step 3: FASTA options |
| `public/js/p3/widget/download/TableConfiguratorStep.js` | Step 3: Table options |
| `public/js/p3/widget/download/GenomeBundleConfiguratorStep.js` | Step 3: Bundle options |
| `public/js/p3/widget/download/DefinitionLineBuilder.js` | FASTA def line builder |
| `public/js/p3/widget/download/DownloadProgressDialog.js` | Progress indicator |
| `public/js/p3/widget/download/templates/*.html` | Templates for wizard widgets |
| `public/js/p3/widget/SaveSearchDialog.js` | Save search dialog |
| `public/js/p3/widget/SavedSearchBrowser.js` | Browse/manage saved searches |

## Modified Files

| File | Changes |
|------|---------|
| `public/js/p3/util/QueryToEnglish.js` | Add `toPlainText()` method |
| `public/js/p3/widget/search/SearchBase.js` | Add save capability to search results |
| `public/js/p3/widget/GridContainer.js` | Integrate wizard invocation |
| `public/js/p3/widget/DownloadTooltipDialog.js` | Link to wizard for "More Options" |
| `public/js/p3/widget/viewer/*List.js` | Add download button using wizard |

## Deprecated Files

| File | Replacement |
|------|-------------|
| `public/js/p3/widget/AdvancedDownload.js` | UnifiedDownloadWizard |

---

# Part 6: Reference Files (Existing Code to Leverage)

| File | Purpose |
|------|---------|
| `public/js/p3/util/QueryToEnglish.js` | RQL → human-readable conversion |
| `public/js/p3/util/QueryToSearchInput.js` | RQL → editable text |
| `public/js/p3/widget/DownloadTooltipDialog.js` | Current download patterns, `downloadableConfig` |
| `public/js/p3/widget/AdvancedDownload.js` | Format selection patterns |
| `public/js/p3/widget/FacetFilterPanel.js` | Filter → RQL conversion |
| `public/js/p3/widget/search/SearchBase.js` | Query building patterns |
| `public/js/p3/store/P3JsonRest.js` | Data service query execution |
| `public/js/p3/WorkspaceManager.js` | Workspace file operations |

---

# Part 7: UI/UX Considerations

## Wizard Step Indicators
- Visual breadcrumb showing current step
- Completed steps show checkmark
- Future steps grayed out
- Click on completed step to go back

## Validation
- Step 1: Must select a format
- Step 2: Must have records available (disable "Selected" if none)
- Step 3: Format-specific validation (e.g., at least one def line field for FASTA)

## Keyboard Navigation
- Tab through options within step
- Enter to proceed to next step
- Escape to close dialog (with confirmation if changes made)

## Loading States
- Show spinner while fetching record counts
- Disable "Next" until data loaded
- Show estimated download size when possible

## Saved Search UX
- Auto-generate names from QueryToEnglish output
- Allow user to edit name at save time
- Show generated name as placeholder/suggestion
- Recent searches sorted by lastUsed at top

---

# Part 8: Server-Side Considerations

## FASTA Definition Line Support

**Option A: Client-side generation** (implement first)
- Fetch data, generate FASTA client-side
- Works for smaller datasets
- No server changes needed

**Option B: Server parameter** (optimization for large datasets)
- Pass `defline_fields` parameter to server
- Server formats FASTA accordingly
- Better for large datasets

## Random Subset Support

Server should support:
- `limit(N)` - Already supported
- `select(random)` or equivalent - May need to be added

---

# Part 9: Implementation Order

| Phase | Dependencies | Components |
|-------|--------------|------------|
| **Phase 1** | None | QueryDescriptor, SavedSearchManager, DownloadFormats, QueryToEnglish mod |
| **Phase 2** | Phase 1 | Wizard framework, all step components |
| **Phase 3** | Phase 2 | FASTA definition line builder |
| **Phase 4** | Phase 2 | DownloadExecutor, ProgressDialog, batch support |
| **Phase 5** | Phase 1 | SaveSearchDialog, SavedSearchBrowser |
| **Phase 6** | Phases 2-5 | Integration into existing UI components |

**Recommended Approach**:
1. Build Phases 1-4 (download infrastructure) as a cohesive unit
2. Build Phase 5 (saved search UI) in parallel or after
3. Phase 6 integration last, with gradual rollout

---

# Part 10: Summary

This unified plan delivers:

1. **Query Encapsulation** - QueryDescriptor captures all context needed to save, share, and re-execute searches

2. **NCBI-Style Download Wizard** - Three-step workflow (Data Type → Records → Options) that reveals all options without overwhelming users

3. **FASTA Definition Line Builder** - Drag-drop customization of FASTA output matching NCBI Virus functionality

4. **Saved Search Management** - LocalStorage for quick access, Workspace for persistence and sharing

5. **Consistent Experience** - Same download interface everywhere: grids, viewers, saved searches

6. **Extensible Architecture** - New formats easily added to registry; new data types plug into existing framework

This replaces the fragmented download system (DownloadTooltipDialog, AdvancedDownload, viewer-specific exports) with a unified, user-friendly system built around the QueryDescriptor abstraction.
