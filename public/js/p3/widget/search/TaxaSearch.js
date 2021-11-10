define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './SearchBase',
  'dojo/text!./templates/TaxaSearch.html',
  './TextInputEncoder',
], function (
  declare,
  lang,
  SearchBase,
  template,
  TextInputEncoder,
) {

  function sanitizeInput(str) {
    return str.replace(/\(|\)|\.|\*|\||\[|\]/g, '')
  }

  return declare([SearchBase], {
    templateString: template,
    searchAppName: 'Taxa Search',
    dataKey: 'taxa',
    resultUrlBase: '/view/TaxonList/?',
    resultUrlHash: '#view_tab',
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
        queryArr.push(`eq(taxon_id,${sanitizeInput(taxonNameValue)})`)
      }

      const taxonRankValue = this.taxonRankNode.get('value')
      if (taxonRankValue !== '') {
        queryArr.push(`eq(taxon_rank,${sanitizeInput(taxonRankValue)})`)
      }

      const divisionValue = this.divisionNode.get('value')
      if (divisionValue !== '') {
        queryArr.push(`eq(division,${sanitizeInput(divisionValue)})`)
      }

      return queryArr.join('&')
    }
  })
})
