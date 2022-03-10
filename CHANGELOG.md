# Changelog
## 3.9.6 - March 10, 2022
* [Minor] Point Announcements header link to docs site newsfeed
* [Enhancement] Update Publications Page
* [Bug] Fix RNA-Seq tutorial link
* [Bug] Fix dead link from genomes tab to quick reference guide
* [Bug] Fix the search functionality of WorkspaceObjectSelector objects

## 3.9.5 - March 8, 2022
* [Enhancement] Enhancements for Archaeopteryx tree
* [Enhancement] Update archaeopteryx.js to 2.0.0a3 and bundle2.js
* [Enhancement] Modify global search results summary

## 3.9.4 - March 4, 2022
* [Enhancement] Add Interactions tab to Genome View

## 3.9.3 - March 3, 2022
* [Enhancement] Make lineage a default facet for genomes

## 3.9.2 - March 2, 2022
* [Enhancement] Update Phylogeny Tree Viewer data .xml file to Iteration 13
* [Enhancement] Add Experiments / Change Genomic Features label to Proteins
* [Enhancement] Remove feature_id from features detail panel
* [Enhancement] Add Experiments tab to Genome View
* [Enhancement] Protein Structures Tab: Add organism_name as default facet and remove taxon_lineage_names
* [Minor] ESLint Fixes

## 3.9.1 - Feb 28, 2022
* [Minor] Remove homepage link and adjust CSS
* [Enhancement] add lineage_names to taxa detail pane
* [Enahncement] Change host_common_names to host_common_name for serology facets/adv search
* [Bug] Change CGA job submission message to Metagenomic Binning Job Submission message

## 3.9.0 - Feb 24, 2022
* [Release] Production Release of all previous changes

## 3.8.2 - Feb 24, 2022
* [Feature] Add facets to Epitope Assays tab
* [Feature] Add ADV Search to Epitope Assays tab
* [Enhancement] Add host_name / protein_name to Epitopes facets, adv search, details, columns
* [Bug] Partially resolve issue when genome viewer doesn't load with missing taxon data

## 3.8.1 - Feb 23, 2022
* [Update] Update to most recent archaeopteryx-js commit
* [Feature] Implementation of the submission form for the ComparativeSystems app service
* [Enhancement] Update calendar iframe

## 3.8.0 - February 16, 2022
* [Release] BV-BRC Public Beta Release

## 3.7.9 - Feb 16, 2022
* [Feature] Add 'Jobs List' link in all services submission message
* [Minor] Update Publications page
* [Minor] Change feedback links to report popup modal
* [Minor] Adjust config file
* [Minor] UI tweaks

## 3.7.8 - Feb 15, 2022
* [Minor] Update BRC Calendar page

## 3.7.7 - Feb 15, 2022
* [Feature] Add View buttons for services.
* [Enhancement] Update about, citation, brc calendar and related resources pagees
* [Enhancement] Update performance and usage metrics to January 2022
* [Feature] Change Outreach to BV-BRC Calendar and change route
* [Feature] Change Contact Us to /feedback route instead of Contact Us page

## 3.7.6 - Feb 14, 2022
* [Release] BV-BRC Mid February Update (Production)

## 3.7.5 - Feb 14, 2022
* [Minor] Bump follow-redirects from 1.14.6 to 1.14.8
* [Enhancement] Change Protein Features to Domains and Motifs in global search

## 3.7.4 - Feb 13, 2022
* [Enhancement] Update tooltips for all tab types
* [Enhancement] Add superkingdom to genome facets/adv search

## 3.7.3 - Feb 10, 2022
* [Enhancement] Add taxon_name and taxon_rank dropdown in tax search
* [Enhancement] Remove fields from taxa adv search
* [Enhancement] Hide species column in Genomes tab

## 3.7.2 - Feb 10, 2022
* [Enhancement] Display genome_name in Genomes tab
* [Enhancement] Add additional metadata attributes in MSA viewer
* [Enhancement] Update GeneTree UI
* [Bug] Fix GeneTree bugs

## 3.7.1 - Feb 9, 2022
* [Update] Bump follow-redirects from 1.14.6 to 1.14.7
* [Update] Bump node-fetch from 3.1.0 to 3.2.0
* [Feature] Add geographic_group to serology/surveillance areas
* [Feature] GeneTree GenomeGroup tooltips
* [Feature] Add limited fasta file types to generic file viewer

## 3.7.0 - Feb 8, 2022
* [Release] BV-BRC January Update

## 3.6.17 - Sep 30, 2021
* [Release] BVBRC Integration beta release


## 3.6.16 - Sep 8, 2021
* [Enhancement] Phylogenetic Tree update (iteration 6)
* [Enhancement] CrossBRC compatible authentication


## 3.6.15 - June 25, 2021
* [Minor] promote B.1.617.2 to VoC


## 3.6.14 - June 4, 2021
* [Enhancement] Phylogenetic Tree update (iteration 3) & archeaopteryx viewer


## 3.6.13 - May 19, 2021
* [Feature] Add Structure tab and 3D Structure Viewer (jsmol)
* [Feature] Add Lineage of Interest
* [Enhancement] Phylogenetic Tree update (iteration 2)
* [Minor] other updates


## 3.6.12 - Apr 16, 2021
* [Feature] Add Archaeopteryx Phylogenetic Tree Viewer


## 3.6.11 - Mar 26, 2021
* [Enhancement] Installed JBrowse plugin (MultiBigWig)

## 3.6.10 - Mar 19, 2021
* [Enhancement] Add One Codex option to the SARS-CoV-2 Genome Assembly and Annotation service
* [Enhancement] Send base_url for all App service submission


## 3.6.9 - Jan 19, 2021

* [Minor] Disable Reconstruct Metabolic Model service UI. [#1008](https://github.com/PATRIC3/p3_web/pull/1008)
* [Minor] Code refactoring. [#1007](https://github.com/PATRIC3/p3_web/pull/1007)


## 3.6.8 - Dec 8, 2020

* [Feature] Table viewer for CSV/TSV files in workspaces.  Allows filtering, sorting, etc.  Detects genome ids, feature ids, and more. [#1004](https://github.com/PATRIC3/p3_web/pull/1004)

* [Feature] New shortcut links on Taxon > Features view [#1004](https://github.com/PATRIC3/p3_web/pull/1004)

* [Minor] Update query for Data API upadate. [#fe383d2](https://github.com/PATRIC3/p3_web/commit/fe383d257024734d15c6e60c916eb78edbe7e838)

* [Bug Fixes] [#1005](https://github.com/PATRIC3/p3_web/pull/1005)


## 3.6.7 - Sept 22, 2020

* [Bug Fix] ID Mapping: fix handling of uniprotkb_accession. [#2370](https://github.com/PATRIC3/patric3_website/issues/2370)

* [Enhancement] TnSeq: add protocol and primer support for transit3 upgrade. [#1002](https://github.com/PATRIC3/p3_web/pull/1002)

* [Enhancement] Improve and enable all SRA validation; add SRA to Variation Service. [#1000](https://github.com/PATRIC3/p3_web/pull/1000), [#1001](https://github.com/PATRIC3/p3_web/pull/1001)


## 3.6.6 - August 14, 2020

* [Bug Fix] Allow SRA on most apps (pending validation fixes). [56cb481](https://github.com/PATRIC3/p3_web/commit/56cb481914410172c6a34b566541241f1231150d)

* [Bug Fix] Support newick files with no genome ids. [#985](https://github.com/PATRIC3/p3_web/pull/985)

* [Minor] Add BEI links; add dates to feature overview. [#992](https://github.com/PATRIC3/p3_web/pull/992)

* [Minor] Improve Pathway Summary error handling. [#977](https://github.com/PATRIC3/p3_web/pull/977)

* [Minor] Fix link (and auth) to ModelSEED.

* [Patch] Handle auth issue preventing re-login.

* [Dev Enhancement] Allow devs to specify build container IDs in app submissions; related improvements. [7a4ff1f](https://github.com/PATRIC3/p3_web/commit/7a4ff1fd47f7da545322d5a1240756fcabae1f2f)

* [Dev Enhancement] Navigate to default job result viewer if not implemented. [#994](https://github.com/PATRIC3/p3_web/pull/994)


## 3.6.5 - June 5, 2020

* [Bug Fix] Fix assembly job result viewer within Comprehensive Genome Analysis job results. [#970](https://github.com/PATRIC3/p3_web/pull/970)

* [Bug Fix] Fix tree button in Phylogenetic Tree job result viewer.  [#2361](https://github.com/PATRIC3/patric3_website/issues/2361)

* [Bug Fix] Prevent sending wrong query from initiation in transcriptomics tab; handle interaction tab correctly in genome_list viewer. [edc59e2](https://github.com/PATRIC3/p3_web/commit/edc59e287659e2c5b15e14f1addee872f7c9ee78), [7f6eb2f](https://github.com/PATRIC3/p3_web/commit/7f6eb2fe0f62424d486a3be85e9abab134efde3f)

* [Enhancement] Support gzip files in Similar Genome Finder service. [#972](https://github.com/PATRIC3/p3_web/pull/972)

* [Enhancement] Add video tutorial links to assembly, annotation, and family sorter. [#2360](https://github.com/PATRIC3/patric3_website/issues/2360)


## 3.6.4 - May 17, 2020

* [Feature] Save heatmap view as TSV or JSON.  [#2356](https://github.com/PATRIC3/patric3_website/issues/2356)
* [Enhancement] Set default distance to 1 for Similar Genome Finder. [#965](https://github.com/PATRIC3/p3_web/pull/965)

* [Bug Fix] Support for using latest host genomes in RNA-seq > HISAT2.
[#2357](https://github.com/PATRIC3/patric3_website/issues/2357)

* [Bug Fix] Fix numbers on circular viewer for private genomes.  [#2355](https://github.com/PATRIC3/patric3_website/issues/2355)

* [Bug Fix] Fix navigation in reloading circular viewer.  [#967](https://github.com/PATRIC3/p3_web/pull/967)

* [Minor]  [#2296](https://github.com/PATRIC3/patric3_website/issues/2296), [#2350](https://github.com/PATRIC3/patric3_website/issues/2350)
