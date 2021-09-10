define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/when',
  './SearchBase',
  'dojo/text!./templates/ProteinStructureSearch.html',
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
    searchAppName: 'Protein Structure Search',
    dataKey: 'protein_structure',
    resultUrlBase: '/view/ProteinStructureList/?',
    resultUrlHash: '#view_tab=structures',
    postCreate: function () {
      this.inherited(arguments);

      when(storeBuilder('protein_structure', 'method'), lang.hitch(this, function (store) {
        this.methodNode.store = store
      }))
    },
    buildQuery: function () {
      let queryArr = []

      const keywordValue = this.keywordNode.get('value')
      if (keywordValue !== '') {
        queryArr.push(`keyword(${sanitizeInput(keywordValue)})`)
      }

      const taxonNameValue = this.taxonNameNode.get('value')
      if (taxonNameValue !== '') {
        queryArr.push(`eq(taxon_name,${sanitizeInput(taxonNameValue)})`)
      }

      const pdbIDValue = this.pdbIDNode.get('value')
      if (pdbIDValue !== '') {
        queryArr.push(`eq(pdb_id,${sanitizeInput(pdbIDValue)})`)
      }

      const descriptionValue = this.descriptionNode.get('value')
      if (descriptionValue !== '') {
        queryArr.push(`eq(description,${sanitizeInput(descriptionValue)})`)
      }

      const geneValue = this.geneNode.get('value')
      if (geneValue !== '') {
        queryArr.push(`eq(gene,${sanitizeInput(geneValue)})`)
      }

      const productValue = this.productNode.get('value')
      if (productValue !== '') {
        queryArr.push(`eq(product,${sanitizeInput(productValue)})`)
      }

      const methodValue = this.methodNode.get('value')
      if (methodValue !== '') {
        queryArr.push(`eq(method,${sanitizeInput(methodValue)})`)
      }

      const advancedQueryArr = this._buildAdvancedQuery()
      if (advancedQueryArr.length > 0) {
        queryArr = queryArr.concat(advancedQueryArr)
      }

      return queryArr.join('&')
    }
  })
})
