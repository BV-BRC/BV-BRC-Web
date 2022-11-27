define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './SearchBase',
  'dojo/text!./templates/DomainAndMotifSearch.html',
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
    searchAppName: 'Domain and Motif Search',
    pageTitle: 'Domain and Motif Search | BV-BRC',
    dataKey: 'protein_feature',
    resultUrlBase: '/view/DomainsAndMotifsList/?',
    resultUrlHash: '#view_tab',
    postCreate: function () {
      this.inherited(arguments)

      this.pathogenGroupNode.store = pathogenGroupStore
      storeBuilder('protein_feature', 'source').then(lang.hitch(this, (store) => {
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
        queryArr.push(`eq(description,"${TextInputEncoder(sanitizeInput(descriptionValue))}")`)
      }

      const advancedQueryArr = this._buildAdvancedQuery()
      if (advancedQueryArr.length > 0) {
        queryArr = queryArr.concat(advancedQueryArr)
      }

      const query = queryArr.join('&')
      if (genomeQuery !== '') {
        return query + `eq(genome_id,*)&${genomeQuery}`
      } else {
        return query
      }
    }
  })
})
