# Summary of Changes Since 9352947b58

**124 files changed, 6,172 insertions, 985 deletions**

## Major Feature Areas

### 1. Job Manager Overhaul
- **Server-side pagination and filtering** - Jobs grid now uses `enumerate_tasks_filtered` API for efficient pagination
- **URL state persistence** - Sort order, page, filters, and selected job are preserved in URL hash
- **Server-side keyword search** - Full-text search via `SimpleTaskFilter`
- **Improved loading UX** - Shows "Job search in progress..." during searches
- **Fixed deferred errors** - Graceful handling of request cancellation when filters change rapidly

### 2. Security Fixes (Synack 2025-12)
- **XSS vulnerability fixes** across multiple files:
  - PathwayList, Taxonomy, SpecialtyVFGeneList endpoints
  - CreateWorkspace/CreateFolder error messages
  - Outbreak pages, Google news data source
  - Genome browser, various viewers
- **Security headers** - Added X-Frame-Options, HSTS, X-Content-Type-Options
- **Input sanitization** - Server-side sanitization utilities added
- **Dependabot security alerts** addressed

### 3. Workspace Enhancements
- **Favorite/starred folders** - Star folders for quick access
- **Recent folders list** - Track recently visited folders
- **Disk usage display** - Show workspace usage in side panel
- **Special character handling** - Fixed workspace browser for filenames with special characters
- **Large workspace timeout** - Better handling of very large workspaces

### 4. TreeSort Service (New)
- Added TreeSort to the menu
- Auto-detection of strain names from FASTA headers
- FASTA validation with user feedback

### 5. MSA Viewer Improvements
- Gene name display at side of MSA view
- Support for non-PATRIC feature IDs
- Feature group creation from valid PATRIC IDs

### 6. Genome/Taxon Views
- Customized tabs for bacterial vs viral context
- Protein/specialty gene summary for phage genomes
- AMR summary graph performance improvements
- Bigwig file type support in genome browser

### 7. Performance & Infrastructure
- **Caching headers** for static assets (production vs dev)
- **Facet filter optimization** - Single query instead of per-facet queries
- **Layer-based JavaScript loading** - Load modules based on route
- **Dojo build optimizer** compatibility fixes

### 8. Bug Fixes
- Dialog flip animation fix
- Workspace object selector validation
- Express trust proxy configuration
- Surveillance/Serology grid date column fix
- Viral Assembly ONT option
- Chikungunya virus enabled in SFVT
