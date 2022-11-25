define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './SearchBase',
  'dojo/text!./templates/SpecialtyGeneSearch.html',
  './TextInputEncoder',
  './FacetStoreBuilder',
  './PathogenGroups',
], function (
  declare,
  lang,
  SearchBase,
  template,
  TextInputEncoder,
  storeBuilder,
  pathogenGroupStore,
) {

  function sanitizeInput(str) {
    return str.replace(/\(|\)|\.|\*|\||\[|\]/g, '')
  }

  return declare([SearchBase], {
    templateString: template,
    searchAppName: 'Specialty Gene Search',
    pageTitle: 'Specialty Gene Search | BV-BRC',
    dataKey: 'sp_gene',
    resultUrlBase: '/view/SpecialtyGeneList/?',
    resultUrlHash: '#view_tab=specialtyGenes&filter=false',
    postCreate: function () {
      this.inherited(arguments)

      this.pathogenGroupNode.store = pathogenGroupStore

      storeBuilder('genome', 'host_common_name').then(lang.hitch(this, (store) => {
        this.hostNameNode.store = store
      }))

      storeBuilder('sp_gene', 'property').then(lang.hitch(this, (store) => {
        this.propertyNode.store = store
      }))

      storeBuilder('sp_gene', 'source').then(lang.hitch(this, (store) => {
        this.sourceNode.store = store
      }))

      storeBuilder('sp_gene', 'evidence').then(lang.hitch(this, (store) => {
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
        queryArr.push(`keyword(${TextInputEncoder(sanitizeInput(keywordValue))})`)
      }

      const genomeIDValue = this.genomeIDNode.get('value')
      if (genomeIDValue !== '') {
        queryArr.push(`eq(genome_id,${TextInputEncoder(genomeIDValue)})`)
      }

      const brcIDValue = this.brcIDNode.get('value')
      if (brcIDValue !== '') {
        queryArr.push(`eq(patric_id,${TextInputEncoder(brcIDValue)})`)
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
        queryArr.push(`eq(gene,"${TextInputEncoder(sanitizeInput(geneValue))}")`)
      }

      const productValue = this.productNode.get('value')
      if (productValue !== '') {
        queryArr.push(`eq(product,"${TextInputEncoder(sanitizeInput(productValue))}")`)
      }

      const advancedQueryArr = this._buildAdvancedQuery()
      if (advancedQueryArr.length > 0) {
        queryArr = queryArr.concat(advancedQueryArr)
      }

      const query = queryArr.join('&')
      if (genomeQuery !== '') {
        return query + genomeQuery
      } else {
        return query
      }
    }
  })
})
