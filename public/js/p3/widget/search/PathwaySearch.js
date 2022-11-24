define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './SearchBase',
  'dojo/text!./templates/PathwaySearch.html',
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
    searchAppName: 'Pathway Search',
    pageTitle: 'Pathway Search | BV-BRC',
    dataKey: 'pathway',
    resultUrlBase: '/view/PathwayList/?',
    resultUrlHash: '#view_tab',
    postCreate: function () {
      this.inherited(arguments)

      this.pathogenGroupNode.store = pathogenGroupStore
      storeBuilder('pathway_ref', 'pathway_name').then(lang.hitch(this, (store) => {
        this.pathwayNameNode.store = store
      }))
      storeBuilder('pathway_ref', 'pathway_class').then(lang.hitch(this, (store) => {
        this.pathwayClassNode.store = store
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

      // pathway specific search
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

      const pathwayIDValue = this.pathwayIDNode.get('value')
      if (pathwayIDValue !== '') {
        queryArr.push(`eq(pathway_id,"${sanitizeInput(pathwayIDValue)}")`)
      }

      const pathwayNameValue = this.pathwayNameNode.get('value')
      if (pathwayNameValue !== '') {
        queryArr.push(`eq(pathway_name,"${TextInputEncoder(sanitizeInput(pathwayNameValue))}")`)
      }

      const pathwayClassValue = this.pathwayClassNode.get('value')
      if (pathwayClassValue !== '') {
        queryArr.push(`eq(pathway_class,"${sanitizeInput(pathwayClassValue)}")`)
      }

      const ecNumberValue = this.ecNumberNode.get('value')
      if (ecNumberValue !== '') {
        queryArr.push(`eq(ec_number,"${sanitizeInput(ecNumberValue)}")`)
      }

      const ecDescriptionValue = this.ecDescriptionNode.get('value')
      if (ecDescriptionValue !== '') {
        queryArr.push(`eq(ec_description,"${TextInputEncoder(sanitizeInput(ecDescriptionValue))}")`)
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
