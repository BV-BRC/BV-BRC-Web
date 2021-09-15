define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/when',
  './SearchBase',
  'dojo/text!./templates/ProteinFeatureSearch.html',
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
    searchAppName: 'Protein Feature Search',
    dataKey: 'protein_feature',
    resultUrlBase: '/view/ProteinFeaturesList/?',
    resultUrlHash: '#view_tab',
    postCreate: function () {
      this.inherited(arguments)

      this.pathogenGroupNode.store = pathogenGroupStore

      when(storeBuilder('protein_feature', 'source'), lang.hitch(this, function (store) {
        this.sourceNode.store = store
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

      // protein feature specific search
      const keywordValue = this.keywordNode.get('value')
      if (keywordValue !== '') {
        queryArr.push(`keyword(${sanitizeInput(keywordValue)})`)
      }

      const sourceValue = this.sourceNode.get('value')
      if (sourceValue !== '') {
        queryArr.push(`eq(source,"${sanitizeInput(sourceValue)}")`)
      }

      const sourceIDValue = this.sourceIDNode.get('value')
      if (sourceIDValue !== '') {
        queryArr.push(`eq(source_id,"${sanitizeInput(sourceIDValue)}")`)
      }

      const descriptionValue = this.descriptionNode.get('value')
      if (descriptionValue !== '') {
        queryArr.push(`eq(description,"${sanitizeInput(descriptionValue)}")`)
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
