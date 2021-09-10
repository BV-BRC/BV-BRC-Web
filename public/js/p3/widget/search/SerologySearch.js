define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/when',
  './SearchBase',
  'dojo/text!./templates/SerologySearch.html',
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
    searchAppName: 'Serology Search',
    dataKey: 'serology',
    resultUrlBase: '/view/SerologyList/?',
    resultUrlHash: '#view_tab=serology',
    postCreate: function () {
      this.inherited(arguments);

      when(storeBuilder('serology', 'test_type'), lang.hitch(this, function (store) {
        this.testTypeNode.store = store
      }))

      when(storeBuilder('serology', 'test_result'), lang.hitch(this, function (store) {
        this.testResultNode.store = store
      }))

      when(storeBuilder('serology', 'serotype'), lang.hitch(this, function (store) {
        this.serotypeNode.store = store
      }))

      when(storeBuilder('serology', 'host_type'), lang.hitch(this, function (store) {
        this.hostTypeNode.store = store
      }))

      when(storeBuilder('serology', 'host_common_name'), lang.hitch(this, function (store) {
        this.hostCommonNameNode.store = store
      }))

      when(storeBuilder('serology', 'host_species'), lang.hitch(this, function (store) {
        this.hostSpeciesNode.store = store
      }))

      when(storeBuilder('serology', 'geographic_group'), lang.hitch(this, function (store) {
        this.geographicGroupNode.store = store
      }))

      when(storeBuilder('serology', 'collection_country'), lang.hitch(this, function (store) {
        this.collectionCountryNode.store = store
      }))
    },
    buildQuery: function () {
      let queryArr = []

      const keywordValue = this.keywordNode.get('value')
      if (keywordValue !== '') {
        queryArr.push(`keyword(${sanitizeInput(keywordValue)})`)
      }

      const testTypeValue = this.testTypeNode.get('value')
      if (testTypeValue !== '') {
        queryArr.push(`eq(test_type,${sanitizeInput(testTypeValue)})`)
      }

      const testResultValue = this.testResultNode.get('value')
      if (testResultValue !== '') {
        queryArr.push(`eq(test_result,${sanitizeInput(testResultValue)})`)
      }

      const serotypeValue = this.serotypeNode.get('value')
      if (serotypeValue !== '') {
        queryArr.push(`eq(serotype,${sanitizeInput(serotypeValue)})`)
      }

      const hostTypeValue = this.hostTypeNode.get('value')
      if (hostTypeValue !== '') {
        queryArr.push(`eq(host_type,${sanitizeInput(hostTypeValue)})`)
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

      const collectionDateFromValue = parseInt(this.collectionDateFromNode.get('value'))
      const collectionDateToValue = parseInt(this.collectionDateToNode.get('value'))
      if (!isNaN(collectionDateFromValue) && !isNaN(collectionDateToValue)) {
        // between
        queryArr.push(`between(collection_date,${collectionDateFromValue},${collectionDateToValue})`)
      } else if (!isNaN(collectionDateFromValue)) {
        // gt
        queryArr.push(`gt(collection_date,${collectionDateFromValue})`)
      } else if (!isNaN(collectionDateToValue)) {
        // lt
        queryArr.push(`lt(collection_date,${collectionDateToValue})`)
      }

      const advancedQueryArr = this._buildAdvancedQuery()
      if (advancedQueryArr.length > 0) {
        queryArr = queryArr.concat(advancedQueryArr)
      }

      return queryArr.join('&')
    }
  })
})
