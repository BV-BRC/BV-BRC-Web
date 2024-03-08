define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './SearchBase',
  'dojo/text!./templates/SurveillanceSearch.html',
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
    searchAppName: 'Surveillance Search',
    pageTitle: 'Surveillance Search | BV-BRC',
    dataKey: 'surveillance',
    resultUrlBase: '/view/SurveillanceList/?',
    resultUrlHash: '#view_tab=surveillance',
    postCreate: function () {
      this.inherited(arguments);

      storeBuilder('surveillance', 'pathogen_test_type').then(lang.hitch(this, (store) => {
        this.pathogenTestTypeNode.store = store
      }))

      storeBuilder('surveillance', 'pathogen_test_result').then(lang.hitch(this, (store) => {
        this.pathogenTestResultNode.store = store
      }))

      storeBuilder('surveillance', 'subtype').then(lang.hitch(this, (store) => {
        this.subtypeNode.store = store
      }))

      storeBuilder('surveillance', 'host_group').then(lang.hitch(this, (store) => {
        this.hostGroupNode.store = store
      }))

      storeBuilder('surveillance', 'host_common_name').then(lang.hitch(this, (store) => {
        this.hostCommonNameNode.store = store
      }))

      storeBuilder('surveillance', 'host_species').then(lang.hitch(this, (store) => {
        this.hostSpeciesNode.store = store
      }))

      storeBuilder('surveillance', 'geographic_group').then(lang.hitch(this, (store) => {
        this.geographicGroupNode.store = store
      }))

      storeBuilder('surveillance', 'collection_country').then(lang.hitch(this, (store) => {
        this.collectionCountryNode.store = store
      }))

    },
    buildQuery: function () {
      let queryArr = []

      const keywordValue = this.keywordNode.get('value')
      if (keywordValue !== '') {
        queryArr.push(`keyword(${TextInputEncoder(sanitizeInput(keywordValue))})`)
      }

      const pathogenTestTypeValue = this.pathogenTestTypeNode.get('value')
      if (pathogenTestTypeValue !== '') {
        queryArr.push(`eq(pathogen_test_type,"${TextInputEncoder(sanitizeInput(pathogenTestTypeValue))}")`)
      }

      const pathogenTestResultValue = this.pathogenTestResultNode.get('value')
      if (pathogenTestResultValue !== '') {
        queryArr.push(`eq(pathogen_test_result,"${TextInputEncoder(sanitizeInput(pathogenTestResultValue))}")`)
      }

      const subtypeValue = this.subtypeNode.get('value')
      if (subtypeValue !== '') {
        queryArr.push(`eq(subtype,"${TextInputEncoder(sanitizeInput(subtypeValue))}")`)
      }

      const hostGroupValue = this.hostGroupNode.get('value')
      if (hostGroupValue !== '') {
        queryArr.push(`eq(host_group,"${TextInputEncoder(sanitizeInput(hostGroupValue))}")`)
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

      const advancedQueryArr = this._buildAdvancedQuery()
      if (advancedQueryArr.length > 0) {
        queryArr = queryArr.concat(advancedQueryArr)
      }

      return queryArr.join('&')
    }
  })
})
