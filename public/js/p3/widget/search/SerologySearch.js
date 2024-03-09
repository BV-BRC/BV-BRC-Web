define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './SearchBase',
  'dojo/text!./templates/SerologySearch.html',
  './TextInputEncoder',
  './FacetStoreBuilder'
], function (
  declare,
  lang,
  SearchBase,
  template,
  TextInputEncoder,
  storeBuilder,
) {

  function sanitizeInput(str) {
    return str.replace(/\(|\)|\.|\*|\||\[|\]/g, '')
  }

  return declare([SearchBase], {
    templateString: template,
    searchAppName: 'Serology Search',
    pageTitle: 'Serology Search | BV-BRC',
    dataKey: 'serology',
    resultUrlBase: '/view/SerologyList/?',
    resultUrlHash: '#view_tab=serology',
    postCreate: function () {
      this.inherited(arguments);

      storeBuilder('serology', 'test_type').then(lang.hitch(this, (store) => {
        this.testTypeNode.store = store
      }))

      storeBuilder('serology', 'test_result').then(lang.hitch(this, (store) => {
        this.testResultNode.store = store
      }))

      storeBuilder('serology', 'serotype').then(lang.hitch(this, (store) => {
        this.serotypeNode.store = store
      }))

      storeBuilder('serology', 'host_type').then(lang.hitch(this, (store) => {
        this.hostTypeNode.store = store
      }))

      storeBuilder('serology', 'host_common_name').then(lang.hitch(this, (store) => {
        this.hostCommonNameNode.store = store
      }))

      storeBuilder('serology', 'host_species').then(lang.hitch(this, (store) => {
        this.hostSpeciesNode.store = store
      }))

      storeBuilder('serology', 'geographic_group').then(lang.hitch(this, (store) => {
        this.geographicGroupNode.store = store
      }))

      storeBuilder('serology', 'collection_country').then(lang.hitch(this, (store) => {
        this.collectionCountryNode.store = store
      }))
    },
    buildQuery: function () {
      let queryArr = []

      const keywordValue = this.keywordNode.get('value')
      if (keywordValue !== '') {
        queryArr.push(`keyword(${TextInputEncoder(sanitizeInput(keywordValue))})`)
      }

      const testTypeValue = this.testTypeNode.get('value')
      if (testTypeValue !== '') {
        queryArr.push(`eq(test_type,"${TextInputEncoder(sanitizeInput(testTypeValue))}")`)
      }

      const testResultValue = this.testResultNode.get('value')
      if (testResultValue !== '') {
        queryArr.push(`eq(test_result,"${TextInputEncoder(sanitizeInput(testResultValue))}")`)
      }

      const serotypeValue = this.serotypeNode.get('value')
      if (serotypeValue !== '') {
        queryArr.push(`eq(serotype,"${TextInputEncoder(sanitizeInput(serotypeValue))}")`)
      }

      const hostTypeValue = this.hostTypeNode.get('value')
      if (hostTypeValue !== '') {
        queryArr.push(`eq(host_type,"${TextInputEncoder(sanitizeInput(hostTypeValue))}")`)
      }

      const hostCommonNameValue = this.hostCommonNameNode.get('value')
      if (hostCommonNameValue !== '') {
        queryArr.push(`eq(host_common_name,"${TextInputEncoder(sanitizeInput(hostCommonNameValue))}")`)
      }

      const hostSpeciesValue = this.hostSpeciesNode.get('value')
      if (hostSpeciesValue !== '') {
        queryArr.push(`eq(host_species,"${TextInputEncoder(sanitizeInput(hostSpeciesValue))}")`)
      }

      const geographicGroupValue = this.geographicGroupNode.get('value')
      if (geographicGroupValue !== '') {
        queryArr.push(`eq(geographic_group,"${TextInputEncoder(sanitizeInput(geographicGroupValue))}")`)
      }

      const collectionCountryValue = this.collectionCountryNode.get('value')
      if (collectionCountryValue !== '') {
        queryArr.push(`eq(collection_country,"${TextInputEncoder(sanitizeInput(collectionCountryValue))}")`)
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

      if (queryArr.length === 0) {
        return 'eq(id,*)'
      }
      else {
        return queryArr.join('&')
      }
      // return queryArr.join('&')
      // return `eq(test_type,*)&${queryArr.join('&')}`
    }
  })
})
