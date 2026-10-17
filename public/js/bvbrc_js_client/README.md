# BV-BRC Javascript Client

bvbrc_js_client is a javascript client library for accessing the BV-BRC Data API

## Installation

```
npm install bvbrc_js_client
```

## Build

Running a build will create a dist/bvbrc_client.js file that can be loaded independantly in the browser. This creates a 'BVBRCClient' class on the global (window) object when included in browser.

```
npm run build
```


## Tests
```
npm run test
```

## Instantiation

### NodeJS

```
const Service = require('bvbrc_js_client')
const svc = new Service("https://patricbrc.org/api")
```

### Browser

There is a pre-built standalone version of this library in the 'dist' folder.  Of course, one may include the source in other JS projects and use those project's build tools to bundle with other software.

```
<script src="/path/to/bvbrc_js_client/dist/bvbrc_client.js"></script>

<script>
    const svc = new BVBRCClient("https://patricbrc.org/api")
</script>
```

The BVBRCCLient class takes the user's token as a second optional parameter, which is of course required when trying to access any private data.

Additionally the BVBRCClient class can be instantiated with no parameters and later initialized with an endpoint and token.  This allows lazy instantiation of the class so that it is easily integrated into the singleton pattern p3_web is currently using.

```
  const svc = new BVBRCClient();

  /* later */

  svc.init(endpoint, token)

```

If API calls are made while the class is not initialized, a `ClientNotInitialized` error will be thrown

## Base API

The base API call methods are `get`,`query`,and `getSchema`.  Most other methods are built atop these.  They are all data type independent and take the data type as the first parameter.  The data type parameter is the SOLR collection name.  The code contains a white list of valid data types and will throw an `InvalidDataType` error if an invalid one is provided.  

Most methods are asyncronous and will work using either `await` syntax or with  Promises (e.g., `.then(callback)`). `await` syntax can only be used in `async` functions.

### getSchema()

`getSchema()` returns the SOLR schema associated with the provided data type
```
var schema = await svc.getSchema('genome')
```

### get()

`get()` retrieves a single item of the provided datatype.  It uses the data type as its first parameter and its second parameter is the ID of the item to retrieve.  The specific ID property for a data type is its SOLR unique key.  It returns a single item.

```
# GET using async/await
var genome = await svc.get("genome","227377.26")
console.log(`Genome: ${genome}`)

# GET using promises
svc.get("genome","227377.26").then((genome)=>{
    console.log(`Genome: ${genome}`)
})
```

### query()

`query()` takes the data_type, a query string, and an optional options object as parameters and returns a set of data. The query string defaults to expecting an RQL query, but may also accept a SOLR query if the `"query_lang"` option is set to `"solr"`. The default return type is `application/json` and this is mapped to a `QueryResult` object. This object contains two properties: `items` and `meta`.  The metadata contains data such as  `start` and `total_items`.   `items` is the array of returned objects.

The query method will automatically switch between `GET` requests and `POST` requests based on the size of the query.  If the provided query is greater than 2000 characters, the `POST` will be used.  Otherwise, `GET` will be used.  This is transparent to the caller.

#### Query Options

- `query_lang` - `solr` or `rql`
- `limit` - Maximum number of records to return
- `start` - start/offset within query to begin returning records
- `accept` - Defaults to `application/json`.  The appropriate transformers are available:
  - `application/solr+json`
  - `text/tsv`
  - `text/csv`
  - TODO: fill out the rest
- `select` - Array of columns to include in the response. By default the whole object is returned, this will limit the properties returned.  

>Note that `limit`,`start`, and `select` will automatically append data onto the query you provide. Adding the limit option, for example, will add &row=VALUE for a SOLR query and &limit(VALUE) for an RQL query.  You may elect not to use these options and add these operators into the actual query yourself.

```
# QUERY with RQL using async/await
var result = await svc.query("genome","eq(genome_id,227377.26)")
console.log(`Query Metadata -  Total Items: ${result.meta.total_items} Start: ${result.meta.start}`)
console.log("Genomes: ", result.items)

# QUERY with RQL using promises
svc.query("genome","eq(genome_id,227377.26)").then((result)=>{
    console.log(`Query Metadata -  Total Items: ${result.meta.total_items} Start: ${result.meta.start}`)
    console.log("Genomes: ", result.items)
})

# QUERY with SOLR queries 
var result = await svc.query("genome","genome_id:227377.26")
console.log(`Query Metadata -  Total Items: ${result.meta.total_items} Start: ${result.meta.start}`)
console.log("Genomes: ", result.items)
```

## DataType Specific Methods

In addition to the base methods described above, each of the specific data types also has  associated wrapper methods.  For example, `getGenome()` and `queryGenomes()`.  These methods work the same as the `get()` and `query()` methods above, but do not require the first parameter or to know the solr collection name for specific data type. 
```
# Get Genome
const genome = await svc.getGenome("227377.26")

# Queries for Genomes
const result = await svc.queryGenomes("eq(genome_id,227377.26)")
const result = await svc.queryGenomes("keyword(coxiella)",{limit: 10})
const result = await svc.queryGenomes("coxiella",{limit: 10, start:5, query_lang: "solr"})
```

## Extended API

In addition to the base method calls and the common method calls for each data type, some specialized methods also exist.  These may be simple shortcuts, specialized calls  specific to a data type or they may be made up of a complex set of queries.  If you add new methods, be sure to document them here and in the All Methods section below. 

- `getGenomeFeatures(<array of genome IDs>,<query opts>)` - Get the `genome_features` for a given set of genome IDs.  Standard query options apply to the results.
- `getGenomeFeaturesByQuery(<genome query>,<feature filter>,<query opts>)` - Query for a set of genomes and then with that set of genomes find all of the `genome_features` filtered by the feature filter (if present).  Standard query options apply to the final query. 
- `getGenomeSequences(<array of genome IDS>,<query opts>)` - Get the `genome_sequences` for a given set of genome IDs.  Standard query options apply to the results.
- `setGenomePermissions(<ids>, <perms>)` - Sets the provided permissions on the genomes identified by `<ids>`
- `solrPermsToObjs(<array of genome objects>)` - Maps the permissions on provided genome objects to objects for processing.  This is a synchronous method and does not communicate with the server.

## All Methods

- Base Methods
  - `get(<data type>,<id>)`
  - `query(<data type>, <query>, <query opts>)`
  - `getSchema(<data type>)`
- Antibiotic
  - `getAntibiotic(<id>)`
  - `queryAntibiotics(<query>, <query opts>)`
- FeatureSequence
  - `getFeatureSequence(<id>)`
  - `queryFeatureSequences(<query>, <query opts>)`
- GeneOntologyRef
  - `getGeneOntologyRef(<id>)`
  - `queryGeneOntologyRefs(<query>, <query opts>)`
- GenomeAMR
  - `getGenomeAMR(<id>)`
  - `queryGenomeAMRs(<query>, <query opts>)`
- GenomeFeature
  - `getGenomeFeature(<id>)`
  - `queryGenomeFeatures(<query>, <query opts>)`
  - `getGenomeFeatures(<array of genome IDs>,<query opts>)`
  - `getGenomeFeaturesByQuery(<genome query>,<feature filter>,<query opts>)`
- GenomeSequence
  - `getGenomeSequence(<id>)`
  - `queryGenomeSequences(<query>, <query opts>)`
  - `getGenomeSequences(<array of genome IDS>,<query opts>)`
- Genome
  - `getGenome(<id>)`
  - `queryGenomes(<query>, <query opts>)`
  - `setGenomePermissions(<ids>, <perms>)`
  - `solrPermsToObjs(<array of genome objects>)`
- IDRef
  - `getIDRef(<id>)`
  - `queryIDRefs(<query>, <query opts>)`
- MiscNIAIDSGC
  - `getMiscNIAIDSGC(<id>)`
  - `queryMiscNIAIDSGCs(<query>, <query opts>)`
- Pathway
  - `getPathway(<id>)`
  - `queryPathways(<query>, <query opts>)`
- PathwayRef
  - `getPathwayRef(<id>)`
  - `queryPathwayRefs(<query>, <query opts>)`
- PPI
  - `getPPI(<id>)`
  - `queryPPIs(<query>, <query opts>)`
- ProteinFamilyRef
  - `getProteinFamilyRef(<id>)`
  - `queryProteinFamilyRefs(<query>, <query opts>)`
- SpecialtyGene
  - `getSpecialtyGene(<id>)`
  - `querySpecialtyGenes(<query>, <query opts>)`
- SpecialtyGeneRef
  - `getSpecialtyGeneRef(<id>)`
  - `querySpecialtyGeneRefs(<query>, <query opts>)`
- SpecialtyGeneEvidence
  - `getSpecialtyGeneEvidence(<id>)`
  - `querySpecialtyGeneEvidences(<query>, <query opts>)`
- Subsystem
  - `getSubsystem(<id>)`
  - `querySubsystems(<query>, <query opts>)`
- SubsystemRef
  - `getSubsystemRef(<id>)`
  - `querySubsystemRefs(<query>, <query opts>)`
- Taxonomy
  - `getTaxonomy(<id>)`
  - `queryTaxonomys(<query>, <query opts>)`
- TranscriptomicsExperiment
  - `getTranscriptomicsExperiment(<id>)`
  - `queryTranscriptomicsExperiments(<query>, <query opts>)`
- TranscriptomicsGene
  - `getTranscriptomicsGene(<id>)`
  - `queryTranscriptomicsGenes(<query>, <query opts>)`
- TranscriptomicsSample
  - `getTranscriptomicsSample(<id>)`
  - `queryTranscriptomicsSamples(<query>, <query opts>)`
---

## Vendored in BV-BRC-Web

This directory was a symlink to `node_modules/bvbrc_js_client`, installed from
`github:bv-brc/bvbrc_js_client`. It is now vendored directly into this repo.

Why: upstream has been dormant since 2021-08-10 (the pinned commit `3847d9c5` was
also HEAD of `main`), BV-BRC-Web is its only consumer, and 429 retry handling has
to be added to `src/index.js`. Patching a `node_modules` symlink target is not
possible from this repo, so the code lives here instead.

**This copy is now the source of truth.** Upstream is not kept in sync. If another
consumer ever appears, port changes back rather than re-adding the dependency.

### Rebuilding `dist/bvbrc_client.js`

`dist/` is generated and **must not be hand-edited** — the next build silently
overwrites it. After changing anything under `src/`:

```sh
cd public/js/bvbrc_js_client
npm install          # devDeps only: browserify, tinyify, derequire
npm run build
```

`views/javascript.ejs` loads `dist/bvbrc_client.js` as a plain script tag, so the
bundle must be committed alongside the `src/` change.

The bundle is self-contained: `node-fetch` is a build-time dependency only, and the
browser build uses the native `fetch`.

### node-fetch is pinned to v2 on purpose

The original `>=2.6.1` range resolved to node-fetch 3.x, which is ESM-only.
browserify cannot parse it, so `npm run build` failed — and because the build
pipes through `derequire`, the failure **truncated `dist/bvbrc_client.js` to
zero bytes** rather than leaving the previous bundle intact. Pinned to `^2.7.0`
(CJS), which is what the committed bundle has always been built against.

If you change this, check `dist/` is non-empty afterwards; a broken build here
is silent until the page fails to load.
