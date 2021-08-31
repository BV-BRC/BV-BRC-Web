define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/when',
  './SearchBase',
  'dojo/text!./templates/SpecialtyGeneSearch.html',
  './FacetStoreBuilder',
  './PathogenGroups',
], function (
  declare,
  lang,
  when,
  SearchBase,
  template,
  storeBuilder,
  pathogenGroupStore,
) {

  function sanitizeInput(str) {
    return str.replace(/\(|\)|\.|\*|\||\[|\]/g, '')
  }

  return declare([SearchBase], {
    templateString: template,
    searchAppName: 'Specialty Gene Search',
    dataKey: 'sp_gene',
    resultUrlBase: '/view/SpecialtyGeneList/?',
    resultUrlHash: '#view_tab=specialtyGenes&filter=false',
    postCreate: function () {
      this.inherited(arguments)

      this.pathogenGroupNode.store = pathogenGroupStore

      when(storeBuilder('genome', 'host_common_name'), lang.hitch(this, function (store) {
        this.hostNameNode.store = store
      }))

      when(storeBuilder('sp_gene', 'property'), lang.hitch(this, function (store) {
        this.propertyNode.store = store
      }))

      when(storeBuilder('sp_gene', 'source'), lang.hitch(this, function (store) {
        this.sourceNode.store = store
      }))

      when(storeBuilder('sp_gene', 'evidence'), lang.hitch(this, function (store) {
        this.evidenceNode.store = store
      }))
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

      if (genomeQueryArr.length > 0) {
        genomeQuery = `genome(${genomeQueryArr.join(',')})`
      }

      // specialty gene specific search
      const keywordValue = this.keywordNode.get('value')
      if (keywordValue !== '') {
        queryArr.push(`keyword(${sanitizeInput(keywordValue)})`)
      }

      const propertyValue = this.propertyNode.get('value')
      if (propertyValue !== '') {
        queryArr.push(`eq(property,"${sanitizeInput(propertyValue)}")`)
      }

      const sourceValue = this.sourceNode.get('value')
      if (sourceValue !== '') {
        queryArr.push(`eq(source,"${sanitizeInput(sourceValue)}")`)
      }

      const evidenceValue = this.evidenceNode.get('value')
      if (evidenceValue !== '') {
        queryArr.push(`eq(evidence,"${sanitizeInput(evidenceValue)}")`)
      }

      const geneValue = this.geneNode.get('value')
      if (geneValue !== '') {
        queryArr.push(`eq(gene,"${sanitizeInput(geneValue)}")`)
      }

      const productValue = this.productNode.get('value')
      if (productValue !== '') {
        queryArr.push(`eq(product,"${sanitizeInput(productValue)}")`)
      }

      const advancedQueryArr = this._buildAdvancedQuery()
      if (advancedQueryArr.length > 0) {
        queryArr = queryArr.concat(advancedQueryArr)
      }

      const query = queryArr.join('&')
      if (query !== '') {
        return query + genomeQuery
      } else {
        return query
      }
    }
  })
})
