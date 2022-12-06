define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './SearchBase',
  'dojo/text!./templates/GenomicFeatureSearch.html',
  './TextInputEncoder',
  './FacetStoreBuilder',
  './PathogenGroups',
  './HostGroups',
], function (
  declare,
  lang,
  SearchBase,
  template,
  TextInputEncoder,
  storeBuilder,
  pathogenGroupStore,
  hostGroupStore,
) {

  function sanitizeInput(str) {
    return str.replace(/\(|\)|\.|\*|\||\[|\]/g, '')
  }

  return declare([SearchBase], {
    templateString: template,
    searchAppName: 'Feature Search',
    dataKey: 'genome_feature',
    resultUrlBase: '/view/FeatureList/?',
    resultUrlHash: '#view_tab=features',
    postCreate: function () {
      this.inherited(arguments)

      this.pathogenGroupNode.store = pathogenGroupStore
      this.hostGroupNode.store = hostGroupStore

      storeBuilder('genome', 'host_common_name').then(lang.hitch(this, (store) => {
        this.hostNameNode.store = store
      }))

      storeBuilder('genome', 'geographic_group').then(lang.hitch(this, (store) => {
        this.geographicGroupNode.store = store
      }))

      storeBuilder('genome', 'isolation_country').then(lang.hitch(this, (store) => {
        this.isolationCountryNode.store = store
      }))

      storeBuilder('genome', 'subtype').then(lang.hitch(this, (store) => {
        this.subtypeNode.store = store
      }))

      storeBuilder('genome', 'segment').then(lang.hitch(this, (store) => {
        this.segmentNode.store = store
      }))

      storeBuilder('genome', 'season').then(lang.hitch(this, (store) => {
        this.seasonNode.store = store
      }))

      storeBuilder('genome', 'lineage').then(lang.hitch(this, (store) => {
        this.lineageNode.store = store
      }))

    },
    onPathogenGroupChange: function () {
      if (this.pathogenGroupNode.get('value') === '11320') {
        this.influenzaCriteriaNode.style.display = 'block'
        this.sarsCoV2CriteriaNode.style.display = 'none'
      }
      else if (this.pathogenGroupNode.get('value') === '2697049') {
        this.influenzaCriteriaNode.style.display = 'none'
        this.sarsCoV2CriteriaNode.style.display = 'block'
      }
      else {
        this.influenzaCriteriaNode.style.display = 'none'
        this.sarsCoV2CriteriaNode.style.display = 'none'
      }
    },
    onGenomeCompleteChecked: function () {
      if (this.genomeCompleteNode.checked) {
        this.genomeLengthFromNode.setAttribute('disabled', true)
        this.genomeLengthToNode.setAttribute('disabled', true)
      }
      else {
        this.genomeLengthFromNode.setAttribute('disabled', false)
        this.genomeLengthToNode.setAttribute('disabled', false)
      }
    },
    buildQuery: function () {
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

      const genomeCompleteCheckbox = this.genomeCompleteNode.get('value')
      if (genomeCompleteCheckbox) {
        genomeQueryArr.push(`eq(genome_status,${'Complete'})`)
      }

      const subtypeValue = this.subtypeNode.get('value')
      if (subtypeValue !== '') {
        genomeQueryArr.push(`eq(subtype,${sanitizeInput(subtypeValue)})`)
      }

      const segmentValue = this.segmentNode.get('value')
      if (segmentValue !== '') {
        genomeQueryArr.push(`eq(segment,${sanitizeInput(segmentValue)})`)
      }

      const seasonValue = this.seasonNode.get('value')
      if (seasonValue !== '') {
        genomeQueryArr.push(`eq(season,${sanitizeInput(seasonValue)})`)
      }

      const lineageValue = this.lineageNode.get('value')
      if (lineageValue !== '') {
        genomeQueryArr.push(`eq(lineage,${lineageValue})`)
      }

      if (genomeQueryArr.length > 0) {
        genomeQuery = `genome(${genomeQueryArr.join(',')})`
      }

      // genome feature specific search
      const keywordValue = this.keywordNode.get('value')
      if (keywordValue !== '') {
        queryArr.push(`keyword(${TextInputEncoder(sanitizeInput(keywordValue))})`)
      }

      // const featureTypeValue = this.featureTypeNode.get('value')
      // if (featureTypeValue !== '') {
      //   queryArr.push(`eq(feature_type,${sanitizeInput(featureTypeValue)})`)
      // }
      queryArr.push('eq(feature_type,CDS)')

      const genomeIDValue = this.genomeIDNode.get('value')
      if (genomeIDValue !== '') {
        queryArr.push(`eq(genome_id,${TextInputEncoder(genomeIDValue)})`)
      }

      const brcIDValue = this.brcIDNode.get('value')
      if (brcIDValue !== '') {
        queryArr.push(`eq(patric_id,${TextInputEncoder(brcIDValue)})`)
      }

      const geneValue = this.geneNode.get('value')
      if (geneValue !== '') {
        queryArr.push(`eq(gene,${TextInputEncoder(sanitizeInput(geneValue))})`)
      }

      const productValue = this.productNode.get('value')
      if (productValue !== '') {
        queryArr.push(`eq(product,${TextInputEncoder(sanitizeInput(productValue))})`)
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
