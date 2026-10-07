# BV-BRC Alpha Site Testing Checklist
**Testing Period:** December 2025 - January 2026
**Commits Analyzed:** December 1, 2025 - January 6, 2026 (130+ commits)

---

## 1. SECURITY & XSS VULNERABILITY FIXES (CRITICAL)
**PRs:** #1095, #1094, #1087, #1085, #1084, #1080
**Developer:** Robert Olson

Multiple XSS (Cross-Site Scripting) vulnerabilities were identified and fixed throughout the application.

### Test Cases:
- [ ] **Pathway List XSS** - Navigate to `/view/PathwayList` and test with malicious input in the `keyword` parameter
  - Try URL: `/view/PathwayList?keyword=<script>alert('xss')</script>`
  - Verify no JavaScript execution occurs

- [ ] **Taxonomy Filter XSS** - Navigate to any `/view/Taxonomy/<ID>` endpoint and test `filter` parameter
  - Try URL: `/view/Taxonomy/2?filter=<img src=x onerror=alert(1)>`
  - Verify input is properly sanitized

- [ ] **Specialty Gene List DOM XSS** - Visit `https://alpha.bv-brc.org/view/SpecialtyVFGeneList`
  - Test various input fields and URL parameters with XSS payloads
  - Verify no DOM-based XSS execution

- [ ] **Workspace/Folder Creation** - Test error message injection
  - Create workspace/folder with invalid characters or malicious names
  - Verify error messages don't execute scripts

- [ ] **Google News Feed** - Verify server-side sanitization of RSS feed content
  - Check news sections on the homepage
  - Inspect HTML to ensure no unsanitized content from external feeds

- [ ] **Outbreak Pages** - Test all outbreak-related pages for proper sanitization
  - Navigate through outbreak data and visualizations
  - Test any user input fields

- [ ] **General XSS Sweep** - Test common XSS vectors across the site:
  - Search boxes
  - Filter inputs
  - URL parameters
  - Form fields

---

## 2. GENOME OVERVIEW & VISUALIZATION
**Developer:** Maulik Shukla

### Test Cases:
- [ ] **Phage Genome Support** - Test protein feature and specialty gene summaries for phage genomes
  - Navigate to a bacteriophage genome overview page
  - Verify protein features are displayed correctly
  - Verify specialty gene counts and summaries are accurate

- [ ] **GO and FigFam Counts Removal** - Check genome overview pages
  - Verify GO (Gene Ontology) counts are no longer displayed
  - Verify FigFam counts are no longer displayed

- [ ] **Links Open in New Tab** - On genome overview, test genomic feature summary links
  - Click on various feature links
  - Verify they open in new tabs/windows

- [ ] **Protein Summary Optimization** - Check performance of genome overview page load
  - Monitor network requests - should see single API query for protein summary (not multiple)
  - Verify all protein data loads correctly

- [ ] **Genomes Action Bar Button** - From various data views with genomes button
  - Click the "Genomes" button in the action bar
  - Verify it links to the proteins tab

---

## 3. GENOME LIST VIEW IMPROVEMENTS
**Developer:** Maulik Shukla

### Test Cases:
- [ ] **Bacterial vs Viral Context Tabs** - Test customized tabs based on genome type
  - Navigate to bacterial genome lists - verify appropriate tabs are shown
  - Navigate to viral genome lists - verify appropriate tabs are shown
  - Document which tabs appear for each context

- [ ] **H1 Clade Label Fix** - On influenza genome list views
  - Find facet labeled "H1 Clade US" (not "H1 Clade Us")
  - Verify capitalization is correct

---

## 4. GENOME BROWSER
**Developers:** Chunhong Mao, Maulik Shukla, Robert Olson, Nicole Bowers

### Test Cases:
- [ ] **BigWig File Support** - Upload and view BigWig files in genome browser
  - Upload a BigWig (.bw) file to workspace
  - Add it as a custom track in genome browser
  - Verify it displays correctly with proper visualization

- [ ] **BigWig Y-Axis Position** - Check BigWig track display
  - Verify y-axis is positioned on the left side of the plot
  - Verify axis labels are readable

- [ ] **Small Viral Genome Fix** - Test with small viral genomes
  - Load a small viral genome (<10kb) in the genome browser
  - Verify entire genome loads completely (no partial loading issue)
  - Test navigation and zoom functions

- [ ] **Large BAM File Support** - Test with large BAM files
  - Upload/load a large BAM file
  - Verify increased chunk size allows proper loading
  - Check performance and display

- [ ] **Split Bug Fix** - General genome browser functionality
  - Test various genome browser operations
  - Verify no JavaScript errors related to `a.split` function

---

## 5. JOBS & WORKSPACE
**Developers:** Chris Escobar, David Gelerinter, Maulik Shukla

### Test Cases:
- [ ] **Jobs Pagination** - Navigate to Jobs page
  - Verify pagination controls are present
  - Test navigating through multiple pages of jobs
  - Verify page size options work correctly
  - Check that API properly handles pagination parameters
  - Test with large number of jobs (>100)

- [ ] **PollJobs Timeout** - Monitor job status updates
  - Submit a job and watch the polling behavior
  - Verify appropriate timeout intervals
  - Check that updates happen at expected frequency

- [ ] **Workspace Feature Groups Mouseover** - In workspace listing
  - Hover over feature groups
  - Verify tooltips/mouseover information displays correctly
  - Verify no JavaScript errors in console

---

## 6. TAXON OVERVIEW
**Developer:** Maulik Shukla

### Test Cases:
- [ ] **Breadcrumb Layout** - On taxon overview pages
  - Check that genome counts appear on the same line as taxon lineage in breadcrumbs
  - Verify no awkward line breaks
  - Test with long taxonomy names

- [ ] **AMR Summary Graph Tooltip** - On taxon pages with AMR data
  - Hover over AMR summary graph elements
  - Verify tooltip text doesn't have improper newlines
  - Verify tooltip formatting is clean and readable

- [ ] **AMR Summary Performance** - Check AMR graph loading performance
  - Navigate to taxon with significant AMR data
  - Monitor API calls - should not include genome ID in pivot facet queries
  - Verify faster load times compared to previous version

---

## 7. FACET FILTERS & SEARCH
**Developer:** Maulik Shukla

### Test Cases:
- [ ] **Single Query Facet Retrieval** - Test any page with facet filters
  - Open developer tools network tab
  - Load a filtered view (genomes, proteins, etc.)
  - Verify facet data loads in a single API query (not separate queries per facet)
  - Check performance improvement

---

## 8. FEATURE OVERVIEW
**Developer:** Maulik Shukla

### Test Cases:
- [ ] **DrugBank Link Update** - On feature overview pages
  - Find features with DrugBank references
  - Click DrugBank links
  - Verify links point to correct DrugBank URLs
  - Verify links work and open correctly

---

## 9. NAVIGATION & MENUS
**Developers:** Maulik Shukla, Don Dempsey

### Test Cases:
- [ ] **Bacteriophages Link** - In organism menu
  - Click on "Bacteriophages" link
  - Verify it filters to show ONLY viral genomes
  - Verify no bacterial genomes appear in results

- [ ] **TreeSort Removal** - Check application menus
  - Verify "Influenza Reassortment Analysis (TreeSort)" is removed from menus
  - Check that no broken links to TreeSort remain

---

## 10. VIRAL ASSEMBLY SERVICE
**Developers:** Mehmet Kuscuoglu, Nicole Bowers

### Test Cases:
- [ ] **IRMA Flu Options** - In Viral Assembly Service
  - Select IRMA as assembly method for influenza data
  - Verify "AD" (Assembly Details) option is available
  - Verify "UTR" (Untranslated Region) option is available
  - Test job submission with these new options

- [ ] **Meta-Flye Assembly Option** - In assembly service
  - Check assembly method dropdown
  - Verify "meta-flye" is available as an option
  - Verify options are in alphabetical order
  - Test job submission with meta-flye

---

## 11. PERFORMANCE OPTIMIZATIONS
**Developers:** Dustin Machi, Mehmet Kuscuoglu, Andrew Warren, cucinellclark

### Test Cases:
- [ ] **Static Asset Caching** - Check browser caching behavior
  - Clear browser cache
  - Load the site and inspect network headers
  - Verify appropriate cache headers for static assets (js, css, images)
  - Verify different headers for production vs development
  - Reload page and verify assets load from cache

- [ ] **Conditional Script Loading** - Throughout the site
  - **MSA Pages:** Verify msa.min.js only loads on MSA-related pages
  - **Heatmap Pages:** Verify heatmap.css only loads on pages with heatmaps
  - **Layer Loading:** Verify appropriate dojo layers load per route
  - Use browser dev tools to monitor which scripts load on different pages

- [ ] **Filter Container Debouncing** - Test filter inputs
  - Type rapidly in filter/search boxes
  - Verify action bar doesn't update too frequently (debounced)
  - Check for smooth user experience without lag

---

## 12. ANALYTICS & TRACKING
**Developer:** Mehmet Kuscuoglu

### Test Cases:
- [ ] **Google Analytics Removal** - Throughout the site
  - Check page source code
  - Verify no Google Analytics tracking scripts are present
  - Verify no GA tracking calls in network tab
  - Verify no GA-related cookies are set

---

## 13. GOOGLE NEWS FEED SECURITY
**Developer:** Mehmet Kuscuoglu

### Test Cases:
- [ ] **Secure Google News Endpoint** - Check news sections
  - Verify news feeds load correctly
  - Verify server-side parsing is working
  - Check that feed keys are being used for security
  - Inspect HTML to ensure content is sanitized

---

## 14. BUILD & DEPLOYMENT
**Developers:** Dustin Machi, Robert Olson

### Test Cases:
- [ ] **Dojo Build Optimization** - General site functionality
  - Navigate through major sections of the site
  - Verify no JavaScript errors in console
  - Verify page loads are smooth
  - Check that all modules load correctly

- [ ] **Production Layers** - Check JavaScript loading
  - Verify clean production layer configuration
  - Verify appropriate layer loading based on routes
  - Check for no duplicate module loading

---

## REGRESSION TESTING

### Critical Workflows:
- [ ] **User Authentication**
  - Login/logout
  - Session persistence
  - Password reset

- [ ] **Workspace Operations**
  - Create folders
  - Upload files
  - Delete items
  - Share workspaces

- [ ] **Search Functionality**
  - Global search
  - Faceted search
  - Advanced search

- [ ] **Data Downloads**
  - Download genomes
  - Download features
  - Download analysis results

- [ ] **Job Submission**
  - Submit various service jobs
  - Monitor job status
  - Retrieve job results

---

## CROSS-BROWSER TESTING
Test critical functionality on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## MOBILE RESPONSIVENESS
- [ ] Test on tablet (iPad/Android)
- [ ] Test on mobile phone
- [ ] Verify key workflows work on mobile

---

## NOTES FOR TESTERS:

1. **Security Testing Priority:** The XSS fixes are CRITICAL - thoroughly test all input fields and URL parameters with common XSS payloads

2. **Performance Monitoring:** Use browser DevTools to monitor:
   - Network requests (should see reduced API calls)
   - Console errors
   - Cache behavior
   - Load times

3. **Documentation:** For each failed test, document:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser/environment details
   - Screenshots/console errors

4. **Test Data:** Ensure you test with:
   - Bacterial genomes
   - Viral genomes (especially small ones)
   - Phage genomes
   - Influenza genomes
   - Various file types (BAM, BigWig, etc.)

5. **Comparison Testing:** If possible, compare behavior with production site to identify differences

---

**Total Commits Analyzed:** 130+
**Date Range:** December 1, 2025 - January 6, 2026
**Primary Focus Areas:** Security (XSS Fixes), Performance Optimization, Genome Visualization, User Experience Enhancements
