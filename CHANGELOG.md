
# Changelog

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
