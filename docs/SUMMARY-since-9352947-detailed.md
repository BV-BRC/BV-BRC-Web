# Detailed Summary of Changes Since 9352947b58

**124 files changed, 6,172 insertions, 985 deletions**

---

## 1. Job Manager Overhaul

### Server-Side Pagination and Filtering
- **New `PaginatedJobStore`** (`public/js/p3/store/PaginatedJobStore.js`) - Replaces in-memory store with server-side pagination using `enumerate_tasks_filtered` API
- **`SimpleTaskFilter` support** - Server-side filtering by status, app, search keyword, and archive flag
- **Sort parameters** - `sort_field` and `sort_order` passed to API for server-side sorting
- **Cache management** - Results cached per-page with automatic cleanup (keeps last 10 pages)

### URL State Persistence
- **Hash-based state** - Filter state encoded in URL hash (e.g., `#status=completed&app=GenomeAnnotation&keyword=test&page=2&sort=submit_time&sortDesc=true`)
- **Page restoration** - Navigating back restores exact page, sort, and selected job
- **Selected job persistence** - `selectedJob` parameter in URL restores row selection

### Improved Loading UX
- **Dynamic loading message** - Shows "Job search in progress..." when keyword search is active, "Loading..." otherwise
- **Request cancellation** - When filters change mid-request, old request is canceled immediately instead of waiting for timeout
- **Deferred error suppression** - "This deferred has already been resolved" errors suppressed via `Deferred.instrumentRejected` wrapper

### Request Management
- **`_setQuery` override** in `JobsGrid.js` - Cancels in-progress requests, clears loading state, starts new request immediately
- **`gotoPage` override** - Tracks request IDs, suppresses callbacks from canceled requests
- **Debounced query execution** - 50ms debounce in `setGridQuerySafe` prevents overlapping queries

### Key Files Modified
- `public/js/p3/JobManager.js` - Polling, status updates, store management
- `public/js/p3/widget/JobManager.js` - UI, filter handling, URL state, event subscriptions
- `public/js/p3/widget/JobsGrid.js` - Grid configuration, request cancellation
- `public/js/p3/widget/JobContainerActionBar.js` - Filter controls, keyword search, archive toggle
- `public/js/p3/store/PaginatedJobStore.js` - New paginated store implementation

---

## 2. Security Fixes (Synack 2025-12)

### XSS Vulnerability Remediation
- **Reflected XSS fixes**:
  - `PathwayList` - Keyword parameter sanitization
  - `Taxonomy` - Filter parameter sanitization
  - `SpecialtyVFGeneList` - DOM XSS prevention
  - `TaxonList`, `StrainList`, `SurveillanceList`, etc. - Input validation

- **DOM-based XSS fixes**:
  - `CreateWorkspace`/`CreateFolder` - Error message injection prevention
  - `WorkspaceGrid` - Filename display sanitization
  - `Genome browser` - Fixed `a.split` bug with untrusted input
  - Various viewers - Output encoding for user-controlled data

- **Server-side sanitization**:
  - `routes/google.js` - Google news data source sanitization (26 lines changed)
  - `routes/linkedin.js` - Input validation (13 lines changed)
  - `routes/reportProblem.js` - Form data sanitization (48 lines changed)
  - `routes/notifySubmitSequence.js` - Sequence submission sanitization (20 lines changed)

### Security Headers
- **X-Frame-Options** - Prevents clickjacking
- **X-Content-Type-Options** - Prevents MIME sniffing
- **Strict-Transport-Security** - Enforces HTTPS
- **X-DNS-Prefetch-Control** - DNS prefetch control
- **Referrer-Policy** - Referrer information control
- **Note**: CSP disabled due to Dojo framework incompatibility

### Infrastructure
- **Security utilities** added for common sanitization tasks
- **Dependabot alerts** addressed for vulnerable dependencies
- **Express trust proxy** configuration fixed (`ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`)

### Key Files Modified
- `app.js` - Security header middleware
- `lib/security.js` (new) - Sanitization utilities
- Multiple widget files - Input/output sanitization
- Route handlers - Server-side validation

---

## 3. Workspace Enhancements

### Favorite/Starred Folders
- **Star column** added to workspace browser columns
- **Star in breadcrumbs** - Visual indicator for starred folders
- **Per-user tracking** - Favorites stored per-user to support sudo functionality
- **Merge support** - Changes from other browsers merged on refresh

### Recent Folders
- **Recently visited list** - Tracks folder navigation history
- **Per-user basis** - Supports sudo users with separate histories
- **Folder-only tracking** - Filters to ensure only folders are tracked

### Disk Usage Display
- **Side panel widget** - Shows workspace disk usage
- **Timeout support** - Shows "Very large" for workspaces that timeout
- **Cached results** - Caches timeout results to avoid repeated slow queries

### Bug Fixes
- **Special characters** (Issue #900) - Fixed workspace browser breaking on special characters in filenames
- **Object selector validation** - Fixed folder name not appearing in dropdown after selection for users with many workspace objects
- **Mouseover for feature groups** - Fixed tooltip display in workspace listing

### Key Files Modified
- `public/js/p3/widget/WorkspaceGrid.js` - Star column, recent folders
- `public/js/p3/WorkspaceManager.js` - Favorites/recent storage
- `public/js/p3/widget/WorkspaceBrowser.js` - UI integration

---

## 4. TreeSort Service (New Feature)

### Menu Integration
- Added TreeSort to organism/tools menu

### FASTA Validation
- **Auto-detection** - Automatically detects match type used to parse strain names from FASTA headers
- **Validation results** - Displays summary beneath input file control
- **Actionable feedback** - Provides user with specific information about validation issues

### Key Files
- `public/js/p3/widget/app/TreeSort.js` - Service form implementation
- Menu configuration files - Service registration

---

## 5. MSA Viewer Improvements

### Visual Enhancements
- **Gene name display** - Shows gene names at side of MSA view
- **Y-axis positioning** - Adjusted based on user feedback

### Compatibility
- **Non-PATRIC IDs** - Viewer now displays feature/genome list even with non-PATRIC feature IDs
- **Feature group creation** - Allows creating feature groups when selected IDs are valid PATRIC IDs

### Bigwig Support
- **File type added** - Bigwig files recognized in workspace
- **Genome browser integration** - Bigwig files viewable in genome browser
- **Y-axis positioning** - Bigwig plot y-axis placed at right end

### Key Files Modified
- `public/js/p3/widget/viewer/MSA.js`
- `public/js/p3/widget/GenomeBrowser.js`

---

## 6. Genome/Taxon View Improvements

### Context-Aware Tabs
- **Bacterial vs Viral** - Genome List view tabs customized based on context
- **Phage genomes** - Added protein feature and specialty gene summary

### Taxon Overview
- **AMR summary graph** - Performance improved by removing genome_id from pivot facet query
- **Tooltip fix** - Fixed newline issue in AMR summary graph tooltip
- **CSS update** - Genome counts display on same line as taxon lineage in breadcrumbs

### Genome Overview
- **Protein summary optimization** - Single API query instead of multiple
- **Feature links** - Links from genomic feature summary open in new tab
- **Removed counts** - GO and FigFam counts removed from display
- **DrugBank link** - Updated in feature overview

### Organism Menu
- **Bacteriophages link** - Updated to show only viral genomes

### Facet Labels
- **H1 Clade** - Changed "H1 Clade Us" to "H1 Clade US"

### Key Files Modified
- `public/js/p3/widget/GenomeOverview.js`
- `public/js/p3/widget/TaxonomyOverview.js`
- `public/js/p3/widget/viewer/Taxonomy.js`
- `public/js/p3/widget/viewer/_GenomeList.js`

---

## 7. Performance & Infrastructure

### Static Asset Caching
- **Cache headers** - Production vs development caching rules
- **PATRIC static assets** - Appropriate cache headers added

### JavaScript Loading Optimization
- **Layer-based loading** - Only load core layer globally, load other layers based on route
- **MSA optimization** - Load `msa.min.js` only for MSA pages instead of globally
- **Hotmap CSS** - Load only for pages using heatmap

### Facet Filter Optimization
- **Single query** - Retrieve all facets in single query instead of separate queries for each facet
- **Debouncing** - FilterContainerActionBar debounced to prevent rapid-fire queries

### Build System
- **Dojo build optimizer** - Modifications to enable optimizer success
- **Release profile** - Updated `public/js/release.profile.js` (291 lines added)
- **Production layers** - Cleaned up layer configuration

### Key Files Modified
- `views/javascript.ejs` - Layer loading logic (156 lines changed)
- `public/js/release.profile.js` - Build configuration
- `public/js/p3/widget/FilterContainerActionBar.js` - Debouncing

---

## 8. Service Updates

### Viral Assembly
- **ONT option** - Added Oxford Nanopore Technology option

### SFVT (Sequence Feature Variant Type)
- **Chikungunya virus** - Enabled for analysis

### Flye Assembler
- **Meta-flye** - Added to assembler options (alphabetical order)

---

## 9. Bug Fixes

### UI/UX Fixes
- **Dialog flip animation** (Issue reported) - Fixed animation glitch
- **Workspace object selector** - Fixed folder name not appearing after selection
- **Job result viewer** - Fixed "Loading job results..." text overlap with "Name" label for jobs with missing autometadata
- **Autometadata handling** - Work around missing autometadata fields

### Grid Fixes
- **Surveillance/Serology grid** - Fixed `date_updated` column to use `date_modified`
- **Jobs pagination** - Fixed Service dropdown filter not working
- **Duplicate API calls** - Removed duplicate `enumerate_tasks` calls

### Infrastructure Fixes
- **Express trust proxy** - Fixed `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` error
- **User profile form** - Fixed `userServiceURL` initialization timing
- **Console logging** - Removed auth token dump to console log

### Specific Issues Resolved
- Issue #850 - Fixed (details in commit c36348c90)
- Issue #620 - Fixed (details in commit 4e37e422a)
- Issue #900 - Workspace browser special characters
- Issue #1414 - Blast downloads
- Issue #1470 - XSS injection fix extension
- Issue #1471 - Label cleanup on genome summary page
- Issue #1472 - Fixed (2 commits)
- Issue #1473 - Fixed (details in commit 096619927)

---

## 10. Header/Navigation Changes

### Workspaces Menu
- **Top nav bar** - Updated workspaces menu
- **File selector widget** - Updated workspace menu

### Header Updates
- `views/bv-brc-header.ejs` - 63 lines changed
- `views/header.ejs` - 9 lines changed
- Google Analytics removed

---

## 11. Documentation

- **README.md** - Updated
- **Package.json** - Multiple version bumps throughout development
