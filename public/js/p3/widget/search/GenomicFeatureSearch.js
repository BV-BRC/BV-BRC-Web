define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/when',
  './SearchBase',
  'dojo/text!./templates/GenomicFeatureSearch.html',
  './FacetStoreBuilder',
  './PathogenGroups',
  './HostGroups',
], function (
  declare,
  lang,
  when,
  SearchBase,
  template,
  storeBuilder,
  pathogenGroupStore,
  hostGroupStore,
) {

  function sanitizeInput(str) {
    return str.replace(/\(|\)|\.|\*|\||\[|\]/g, '')
  }

  return declare([SearchBase], {
    templateString: template,
    searchAppName: 'Gene/Protein Search',
    dataKey: 'genome_feature',
    resultUrlBase: '/view/FeatureList/?',
    resultUrlHash: '#view_tab=features&filter=false',
    postCreate: function () {
      this.inherited(arguments)

      this.pathogenGroupNode.store = pathogenGroupStore
      this.hostGroupNode.store = hostGroupStore

      when(storeBuilder('genome', 'host_common_name'), lang.hitch(this, function (store) {
        this.hostNameNode.store = store
      }))

      when(storeBuilder('genome', 'geographic_group'), lang.hitch(this, function (store) {
        this.geographicGroupNode.store = store
      }))

      when(storeBuilder('genome', 'isolation_country'), lang.hitch(this, function (store) {
        this.isolationCountryNode.store = store
      }))

      when(storeBuilder('genome_feature', 'feature_type'), lang.hitch(this, function (store) {
        this.featureTypeNode.store = store
      }))
    },
    buildQuery: function () {
      console.log(
        'buildQuery',
      );
      let queryArr = []
      let genomeQuery = ''

      // genome metadata
      let genomeQueryArr = []

      const pathogenGroupValue = this.pathogenGroupNode.get('value')
      if (pathogenGroupValue !== '') {
        genomeQueryArr.push(`eq(taxon_lineage_ids,${sanitizeInput(pathogenGroupValue)})`)
      }

      const taxonNameValue = this.taxonNameNode.get('value')
      if (taxonNameValue !== '') {
        genomeQueryArr.push(`eq(taxon_lineage_ids,${sanitizeInput(taxonNameValue)})`)
      }

      const hostGroupValue = this.hostGroupNode.get('value')
      if (hostGroupValue !== '') {
        genomeQueryArr.push(`eq(host_group,${sanitizeInput(hostGroupValue)})`)
      }

      const hostNameValue = this.hostNameNode.get('value')
      if (hostNameValue !== '') {
        genomeQueryArr.push(`eq(host_common_name,${sanitizeInput(hostNameValue)})`)
      }

      const geographicGroupValue = this.geographicGroupNode.get('value')
      if (geographicGroupValue !== '') {
        genomeQueryArr.push(`eq(geographic_group,${sanitizeInput(geographicGroupValue)})`)
      }

      const isolationCountryValue = this.isolationCountryNode.get('value')
      if (isolationCountryValue !== '') {
        genomeQueryArr.push(`eq(isolation_country,${sanitizeInput(isolationCountryValue)})`)
      }

      const collectionYearFromValue = parseInt(this.collectionYearFromNode.get('value'))
      const collectionYearToValue = parseInt(this.collectionYearToNode.get('value'))
      if (!isNaN(collectionYearFromValue) && !isNaN(collectionYearToValue)) {
        // between
        genomeQueryArr.push(`between(collection_year,${collectionYearFromValue},${collectionYearToValue})`)
      } else if (!isNaN(collectionYearFromValue)) {
        // gt
        genomeQueryArr.push(`gt(collection_year,${collectionYearFromValue})`)
      } else if (!isNaN(collectionYearToValue)) {
        // lt
        genomeQueryArr.push(`lt(collection_year,${collectionYearToValue})`)
      }

      const genomeLengthFromValue = parseInt(this.genomeLengthFromNode.get('value'))
      const genomeLengthToValue = parseInt(this.genomeLengthToNode.get('value'))
      if (!isNaN(genomeLengthFromValue) && !isNaN(genomeLengthToValue)) {
        genomeQueryArr.push(`betweeen(genome_length,${genomeLengthFromValue},${genomeLengthToValue})`)
      } else if (!isNaN(genomeLengthFromValue)) {
        genomeQueryArr.push(`gt(genome_length,${genomeLengthFromValue})`)
      } else if (!isNaN(genomeLengthToValue)) {
        genomeQueryArr.push(`lt(genome_length,${genomeLengthToValue})`)
      }

      if (genomeQueryArr.length > 0) {
        genomeQuery = `genome(${genomeQueryArr.join(',')})`
      }

      // genome feature specific search
      const keywordValue = this.keywordNode.get('value')
      if (keywordValue !== '') {
        queryArr.push(`keyword(${sanitizeInput(keywordValue)})`)
      }

      const featureTypeValue = this.featureTypeNode.get('value')
      if (featureTypeValue !== '') {
        queryArr.push(`eq(feature_type,${sanitizeInput(featureTypeValue)})`)
      }

      const geneValue = this.geneNode.get('value')
      if (geneValue !== '') {
        queryArr.push(`eq(gene,${sanitizeInput(geneValue)})`)
      }

      const productValue = this.productNode.get('value')
      if (productValue !== '') {
        queryArr.push(`eq(product,${sanitizeInput(productValue)})`)
      }

      const advancedQueryArr = this._buildAdvancedQuery()
      if (advancedQueryArr.length > 0) {
        queryArr = queryArr.concat(advancedQueryArr)
      }

      const query = queryArr.join('&')
      if (genomeQuery !== '') {
        return query + genomeQuery
      } else {
        return query
      }
    }
  })
})
