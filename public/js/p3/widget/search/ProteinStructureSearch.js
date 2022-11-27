define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './SearchBase',
  'dojo/text!./templates/ProteinStructureSearch.html',
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
    searchAppName: 'Protein Structure Search',
    pageTitle: 'Protein Structure Search | BV-BRC',
    dataKey: 'protein_structure',
    resultUrlBase: '/view/ProteinStructureList/?',
    resultUrlHash: '#view_tab=structures',
    postCreate: function () {
      this.inherited(arguments);

      storeBuilder('protein_structure', 'method').then(lang.hitch(this, (store) => {
        this.methodNode.store = store
      }))
    },
    buildQuery: function () {
      let queryArr = []

      const keywordValue = this.keywordNode.get('value')
      if (keywordValue !== '') {
        queryArr.push(`keyword(${TextInputEncoder(sanitizeInput(keywordValue))})`)
      }

      const taxonNameValue = this.taxonNameNode.get('value')
      if (taxonNameValue !== '') {
        queryArr.push(`eq(taxon_lineage_ids,${sanitizeInput(taxonNameValue)})`)
      }

      const pdbIDValue = this.pdbIDNode.get('value')
      if (pdbIDValue !== '') {
        queryArr.push(`eq(pdb_id,${sanitizeInput(pdbIDValue)})`)
      }

      const genomeIDValue = this.genomeIDNode.get('value')
      if (genomeIDValue !== '') {
        queryArr.push(`eq(genome_id,${TextInputEncoder(genomeIDValue)})`)
      }

      const brcIDValue = this.brcIDNode.get('value')
      if (brcIDValue !== '') {
        queryArr.push(`eq(patric_id,${TextInputEncoder(brcIDValue)})`)
      }

      const descriptionValue = this.descriptionNode.get('value')
      if (descriptionValue !== '') {
        queryArr.push(`eq(description,${TextInputEncoder(sanitizeInput(descriptionValue))})`)
      }

      const geneValue = this.geneNode.get('value')
      if (geneValue !== '') {
        queryArr.push(`eq(gene,${TextInputEncoder(sanitizeInput(geneValue))})`)
      }

      const productValue = this.productNode.get('value')
      if (productValue !== '') {
        queryArr.push(`eq(product,${TextInputEncoder(sanitizeInput(productValue))})`)
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
