define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/when',
  './SearchBase',
  'dojo/text!./templates/SubsystemSearch.html',
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
    searchAppName: 'Subsystem Search',
    dataKey: 'subsystem',
    resultUrlBase: '/view/SubsystemList/?',
    resultUrlHash: '#view_tab',
    postCreate: function () {
      this.inherited(arguments)

      this.pathogenGroupNode.store = pathogenGroupStore
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

      // subsystem specific search
      const keywordValue = this.keywordNode.get('value')
      if (keywordValue !== '') {
        queryArr.push(`keyword(${sanitizeInput(keywordValue)})`)
      }

      const subsystemIDValue = this.subsystemIDNode.get('value')
      if (subsystemIDValue !== '') {
        queryArr.push(`eq(subsystem_id,"${sanitizeInput(subsystemIDValue)}")`)
      }

      const subsystemNameValue = this.subsystemNameNode.get('value')
      if (subsystemNameValue !== '') {
        queryArr.push(`eq(subsystem_name,"${sanitizeInput(subsystemNameValue)}")`)
      }

      const subsystemRoleValue = this.subsystemRoleNode.get('value')
      if (subsystemRoleValue !== '') {
        queryArr.push(`eq(subsystem_role,"${sanitizeInput(subsystemRoleValue)}")`)
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
