define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/when',
  './SearchBase',
  'dojo/text!./templates/SurveillanceSearch.html',
  './FacetStoreBuilder'
], function (
  declare,
  lang,
  when,
  SearchBase,
  template,
  storeBuilder,
) {

  function sanitizeInput(str) {
    return str.replace(/\(|\)|\.|\*|\||\[|\]/g, '')
  }

  return declare([SearchBase], {
    templateString: template,
    searchAppName: 'Surveillance Search',
    dataKey: 'surveillance',
    resultUrlBase: '/view/SurveillanceList/?',
    resultUrlHash: '#view_tab=surveillance',
    postCreate: function () {
      this.inherited(arguments);

      when(storeBuilder('surveillance', 'pathogen_test_type'), lang.hitch(this, function (store) {
        this.pathogenTestTypeNode.store = store
      }))

      when(storeBuilder('surveillance', 'pathogen_test_result'), lang.hitch(this, function (store) {
        this.pathogenTestResultNode.store = store
      }))

      when(storeBuilder('surveillance', 'subtype'), lang.hitch(this, function (store) {
        this.serotypeNode.store = store
      }))

      when(storeBuilder('surveillance', 'host_group'), lang.hitch(this, function (store) {
        this.hostGroupNode.store = store
      }))

      when(storeBuilder('surveillance', 'host_common_name'), lang.hitch(this, function (store) {
        this.hostCommonNameNode.store = store
      }))

      when(storeBuilder('surveillance', 'host_species'), lang.hitch(this, function (store) {
        this.hostSpeciesNode.store = store
      }))

      when(storeBuilder('surveillance', 'geographic_group'), lang.hitch(this, function (store) {
        this.geographicGroupNode.store = store
      }))

      when(storeBuilder('surveillance', 'collection_country'), lang.hitch(this, function (store) {
        this.collectionCountryNode.store = store
      }))

    },
    buildQuery: function () {
      let queryArr = []

      const keywordValue = this.keywordNode.get('value')
      if (keywordValue !== '') {
        queryArr.push(`keyword(${sanitizeInput(keywordValue)})`)
      }

      const pathogenTestTypeValue = this.pathogenTestTypeNode.get('value')
      if (pathogenTestTypeValue !== '') {
        queryArr.push(`eq(pathogen_test_type,${sanitizeInput(pathogenTestTypeValue)})`)
      }

      const pathogenTestResultValue = this.pathogenTestResultNode.get('value')
      if (pathogenTestResultValue !== '') {
        queryArr.push(`eq(pathogen_test_result,${sanitizeInput(pathogenTestResultValue)})`)
      }

      const subtypeValue = this.subtypeNode.get('value')
      if (subtypeValue !== '') {
        queryArr.push(`eq(subtype,${sanitizeInput(subtypeValue)})`)
      }

      const hostGroupValue = this.hostGroupNode.get('value')
      if (hostGroupValue !== '') {
        queryArr.push(`eq(host_group,${sanitizeInput(hostGroupValue)})`)
      }

      const hostCommonNameValue = this.hostCommonNameNode.get('value')
      if (hostCommonNameValue !== '') {
        queryArr.push(`eq(host_common_name,${sanitizeInput(hostCommonNameValue)})`)
      }

      const hostSpeciesValue = this.hostSpeciesNode.get('value')
      if (hostSpeciesValue !== '') {
        queryArr.push(`eq(host_species,${sanitizeInput(hostSpeciesValue)})`)
      }

      const geographicGroupValue = this.geographicGroupNode.get('value')
      if (geographicGroupValue !== '') {
        queryArr.push(`eq(geographic_group,${sanitizeInput(geographicGroupValue)})`)
      }

      const collectionCountryValue = this.collectionCountryNode.get('value')
      if (collectionCountryValue !== '') {
        queryArr.push(`eq(collection_country,${sanitizeInput(collectionCountryValue)})`)
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

      const advancedQueryArr = this._buildAdvancedQuery()
      if (advancedQueryArr.length > 0) {
        queryArr = queryArr.concat(advancedQueryArr)
      }

      return queryArr.join('&')
    }
  })
})
