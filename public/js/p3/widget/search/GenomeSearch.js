define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './SearchBase',
  'dojo/text!./templates/GenomeSearch.html',
  './TextInputEncoder',
  './FacetStoreBuilder',
  './PathogenGroups',
  './HostGroups'
], function (
  declare,
  lang,
  SearchBase,
  template,
  TextInputEncoder,
  storeBuilder,
  pathogenGroupStore,
  hostGroupStore
) {

  function sanitizeInput(str) {
    return str.replace(/\(|\)|\.|\*|\||\[|\]/g, '')
  }

  return declare([SearchBase], {
    templateString: template,
    searchAppName: 'Genome Search',
    pageTitle: 'Genome Search | BV-BRC',
    dataKey: 'genome',
    resultUrlBase: '/view/GenomeList/?',
    resultUrlHash: '#view_tab=genomes',
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

      storeBuilder('genome', 'state_province').then(lang.hitch(this, (store) => {
        this.stateProvinceNode.store = store
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

      const keywordValue = this.keywordNode.get('value')
      if (keywordValue !== '') {
        queryArr.push(`keyword(${TextInputEncoder(sanitizeInput(keywordValue))})`)
      }

      const pathogenGroupValue = this.pathogenGroupNode.get('value')
      if (pathogenGroupValue !== '') {
        queryArr.push(`eq(taxon_lineage_ids,${sanitizeInput(pathogenGroupValue)})`)
      }

      const taxonNameValue = this.taxonNameNode.get('value')
      if (taxonNameValue !== '') {
        queryArr.push(`eq(taxon_lineage_ids,${sanitizeInput(taxonNameValue)})`)
      }

      const genomeIDValue = this.genomeIDNode.get('value')
      if (genomeIDValue !== '') {
        queryArr.push(`eq(genome_id,${TextInputEncoder(genomeIDValue)})`)
      }

      const genomeNameValue = this.genomeNameNode.get('value')
      if (genomeNameValue !== '') {
        queryArr.push(`eq(genome_name,${TextInputEncoder(sanitizeInput(genomeNameValue))})`)
      }

      const hostGroupValue = this.hostGroupNode.get('value')
      if (hostGroupValue !== '') {
        queryArr.push(`eq(host_group,${sanitizeInput(hostGroupValue)})`)
      }

      const hostNameValue = this.hostNameNode.get('value')
      if (hostNameValue !== '') {
        queryArr.push(`eq(host_common_name,${sanitizeInput(hostNameValue)})`)
      }

      const geographicGroupValue = this.geographicGroupNode.get('value')
      if (geographicGroupValue !== '') {
        queryArr.push(`eq(geographic_group,${geographicGroupValue})`)
      }

      const isolationCountryValue = this.isolationCountryNode.get('value')
      if (isolationCountryValue !== '') {
        queryArr.push(`eq(isolation_country,${sanitizeInput(isolationCountryValue)})`)
      }

      const stateProvinceValue = this.stateProvinceNode.get('value')
      if (stateProvinceValue !== '') {
        queryArr.push(`eq(state_province,${sanitizeInput(stateProvinceValue)})`)
      }

      const collectionYearFromValue = parseInt(this.collectionYearFromNode.get('value'))
      const collectionYearToValue = parseInt(this.collectionYearToNode.get('value'))
      if (!isNaN(collectionYearFromValue) && !isNaN(collectionYearToValue)) {
        // between
        queryArr.push(`between(collection_year,${collectionYearFromValue},${collectionYearToValue})`)
      } else if (!isNaN(collectionYearFromValue)) {
        // gt
        queryArr.push(`gt(collection_year,${collectionYearFromValue})`)
      } else if (!isNaN(collectionYearToValue)) {
        // lt
        queryArr.push(`lt(collection_year,${collectionYearToValue})`)
      }

      const genomeLengthFromValue = parseInt(this.genomeLengthFromNode.get('value'))
      const genomeLengthToValue = parseInt(this.genomeLengthToNode.get('value'))
      if (!isNaN(genomeLengthFromValue) && !isNaN(genomeLengthToValue)) {
        queryArr.push(`between(genome_length,${genomeLengthFromValue},${genomeLengthToValue})`)
      } else if (!isNaN(genomeLengthFromValue)) {
        queryArr.push(`gt(genome_length,${genomeLengthFromValue})`)
      } else if (!isNaN(genomeLengthToValue)) {
        queryArr.push(`lt(genome_length,${genomeLengthToValue})`)
      }

      const genomeCompleteCheckbox = this.genomeCompleteNode.get('value')
      if (genomeCompleteCheckbox) {
        queryArr.push(`eq(genome_status,${'Complete'})`)
      }

      const advancedQueryArr = this._buildAdvancedQuery()
      if (advancedQueryArr.length > 0) {
        queryArr = queryArr.concat(advancedQueryArr)
      }

      const subtypeValue = this.subtypeNode.get('value')
      if (subtypeValue !== '') {
        queryArr.push(`eq(subtype,${sanitizeInput(subtypeValue)})`)
      }

      const segmentValue = this.segmentNode.get('value')
      if (segmentValue !== '') {
        queryArr.push(`eq(segment,${sanitizeInput(segmentValue)})`)
      }

      const seasonValue = this.seasonNode.get('value')
      if (seasonValue !== '') {
        queryArr.push(`eq(season,${sanitizeInput(seasonValue)})`)
      }

      const lineageValue = this.lineageNode.get('value')
      if (lineageValue !== '') {
        queryArr.push(`eq(lineage,${lineageValue})`)
      }

      // return queryArr.join('&')
      return `eq(genome_id,*)&genome(${queryArr.join(',')})`
    }
  })
})
