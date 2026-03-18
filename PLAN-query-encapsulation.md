# Plan: Query Encapsulation for Saved Searches & Unified Downloads

## Overview
Design a system to encapsulate query descriptions that can be:
1. Saved for later re-execution
2. Used to configure a unified data download interface
3. Invoked from anywhere data sets are assembled in the GUI

---

# Part 1: Current Architecture Analysis

## Query System

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

## Download System

**Current Mechanisms** (fragmented):
1. `DownloadTooltipDialog.js` - Quick TSV/CSV/Excel from grids
2. `AdvancedDownload.js` - Dialog with format selection
3. GridContainer actions - Direct API calls
4. Viewer-specific exports - Heatmaps, MSA, FASTA

**Download Patterns**:
- **Server-side**: Hidden form POST to `/bundle/{dataType}/` or `/{dataType}/?http_download=true`
- **Client-side**: FileSaver.js with Blob from store data

**Gap**: No unified way to pass query + data type + format preferences between components.

---

# Part 2: Proposed Design

## Query Descriptor Object

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

  // Download configuration
  availableFormats: ['tsv', 'csv', 'excel', 'dna+fasta', 'protein+fasta'],

  // Cached results (optional)
  resultCount: 1234,
  countTimestamp: Date.now()
}
```

## Storage Options

| Option | Pros | Cons |
|--------|------|------|
| **LocalStorage** | Simple, immediate | Browser-specific, limited size |
| **Workspace** | Persistent, shareable | Requires API calls |
| **User preferences API** | Centralized | May not exist yet |

**Decision**: Both LocalStorage and Workspace
- LocalStorage for quick access and recent searches
- Workspace export for persistence and sharing (save as `.search` files)

## Saved Search Naming

**Decision**: Auto-generate with override
- Auto-generate from query (e.g., "Genomes: Influenza, 2020-2024")
- Allow user to edit name at save time
- Show generated name as placeholder/suggestion

## Unified Download Interface Goals

**Decision**: All three priorities
1. **Consistency** - Same UI everywhere, replace fragmented implementations
2. **Capabilities** - Add batch downloads, scheduled exports
3. **Query-based** - Download from saved/shared queries

## Unified Download Interface

A single dialog/panel that:
1. Accepts a QueryDescriptor
2. Shows available formats based on dataType
3. Handles both selection-based and full-query downloads
4. Provides consistent UI across all data views

---

# Part 3: Implementation Steps

## Phase 1: Core Infrastructure

### Step 1.1: Create QueryDescriptor Module
**File**: `public/js/p3/util/QueryDescriptor.js`
- Factory function `createFromQuery(dataType, rqlQuery, source)`
- Auto-generate display name using QueryToEnglish
- Serialization/deserialization for storage
- Validation of required fields

### Step 1.2: Create SavedSearchManager
**File**: `public/js/p3/util/SavedSearchManager.js`
- LocalStorage backend with key prefix `bvbrc_saved_searches_`
- CRUD operations: `save()`, `get()`, `list()`, `delete()`, `update()`
- Event publishing via `topic.publish()` for UI updates
- Auto-generate names from QueryToEnglish output

### Step 1.3: Workspace Integration
**File**: `public/js/p3/util/SavedSearchManager.js` (extend)
- Export to workspace: `exportToWorkspace(searchId, path)`
- Import from workspace: `importFromWorkspace(path)`
- File type: `.search` (JSON content)
- Use WorkspaceManager for file operations

## Phase 2: Unified Download System

### Step 2.1: Create UnifiedDownloadDialog
**File**: `public/js/p3/widget/UnifiedDownloadDialog.js`
- Accept QueryDescriptor or build from current grid state
- Format selection based on dataType configuration
- Selection vs full results toggle
- Progress indication for large downloads
- Consolidate patterns from DownloadTooltipDialog and AdvancedDownload

### Step 2.2: Download Format Registry
**File**: `public/js/p3/util/DownloadFormats.js`
- Centralized format definitions per data type
- Server-side vs client-side flags
- MIME types and file extensions
- Replace scattered `downloadableConfig` objects

### Step 2.3: Batch Download Support
- Queue multiple queries for sequential download
- Archive creation for multiple files
- Progress tracking across batch

## Phase 3: UI Integration

### Step 3.1: Save Search UI
- Add "Save Search" button to search result headers
- Save dialog with auto-generated name (editable)
- Option to save to LocalStorage or Workspace

### Step 3.2: Saved Search Browser
**File**: `public/js/p3/widget/SavedSearchBrowser.js`
- List view of saved searches
- Re-execute, edit, delete actions
- Import/export to workspace
- Integrate into user menu or sidebar

### Step 3.3: Replace Existing Download UIs
- Update GridContainer to use UnifiedDownloadDialog
- Update viewer headers
- Deprecate (but don't remove) old dialogs initially

---

# Part 4: Key Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `public/js/p3/util/QueryDescriptor.js` | **Create** | Query encapsulation with factory methods |
| `public/js/p3/util/SavedSearchManager.js` | **Create** | Storage management (LocalStorage + Workspace) |
| `public/js/p3/util/DownloadFormats.js` | **Create** | Centralized format registry |
| `public/js/p3/widget/UnifiedDownloadDialog.js` | **Create** | Unified download UI |
| `public/js/p3/widget/SavedSearchBrowser.js` | **Create** | Browse/manage saved searches |
| `public/js/p3/widget/SaveSearchDialog.js` | **Create** | Save search dialog with name editing |
| `public/js/p3/widget/search/SearchBase.js` | **Modify** | Add save capability to search results |
| `public/js/p3/widget/viewer/*List.js` | **Modify** | Integrate unified download dialog |
| `public/js/p3/widget/GridContainer.js` | **Modify** | Add to action bar |
| `public/js/p3/util/QueryToEnglish.js` | **Modify** | Add plain-text output option for names |

---

# Part 5: Reference Files (Existing Code to Leverage)

| File | Purpose |
|------|---------|
| `public/js/p3/util/QueryToEnglish.js` | RQL → human-readable conversion |
| `public/js/p3/util/QueryToSearchInput.js` | RQL → editable text |
| `public/js/p3/widget/DownloadTooltipDialog.js` | Current download patterns |
| `public/js/p3/widget/AdvancedDownload.js` | Format selection patterns |
| `public/js/p3/widget/FacetFilterPanel.js` | Filter → RQL conversion |
| `public/js/p3/widget/search/SearchBase.js` | Query building patterns |
| `public/js/p3/store/P3JsonRest.js` | Data service query execution |
| `public/js/p3/WorkspaceManager.js` | Workspace file operations |

