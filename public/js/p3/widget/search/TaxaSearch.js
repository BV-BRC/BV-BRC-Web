define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './SearchBase',
  'dojo/text!./templates/TaxaSearch.html',
  './TextInputEncoder',
  './FacetStoreBuilder',
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
    searchAppName: 'Taxa Search',
    dataKey: 'taxa',
    pageTitle: 'Taxa Search | BV-BRC',
    resultUrlBase: '/view/TaxonList/?',
    resultUrlHash: '#view_tab',
    postCreate: function () {
      storeBuilder('taxonomy', 'taxon_rank').then(lang.hitch(this, (store) => {
        this.inherited(arguments)
        this.taxonRankNode.store = store
      }))
    },
    buildQuery: function () {
      let queryArr = []

      const keywordValue = this.keywordNode.get('value')
      if (keywordValue !== '') {
        queryArr.push(`keyword(${TextInputEncoder(sanitizeInput(keywordValue))})`)
      }

      const taxonIDValue = this.taxonIDNode.get('value')
      if (taxonIDValue !== '') {
        queryArr.push(`eq(taxon_id,${sanitizeInput(taxonIDValue)})`)
      }

      const taxonNameValue = this.taxonNameNode.get('value')
      if (taxonNameValue !== '') {
        queryArr.push(`eq(taxon_name,${TextInputEncoder(sanitizeInput(taxonNameValue))})`)
      }

      const taxonRankValue = this.taxonRankNode.get('value')
      if (taxonRankValue !== '') {
        queryArr.push(`eq(taxon_rank,${sanitizeInput(taxonRankValue)})`)
      }

      const advancedQueryArr = this._buildAdvancedQuery()
      if (advancedQueryArr.length > 0) {
        queryArr = queryArr.concat(advancedQueryArr)
      }

      return queryArr.join('&')
    }
  })
})
