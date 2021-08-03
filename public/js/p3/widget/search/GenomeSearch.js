define([
  'dojo/_base/declare',
  './SearchBase',
  'dojo/text!./templates/GenomeSearch.html',
  './PathogenGroups',
  './HostGroups'
], function (
  declare,
  SearchBase,
  template,
  pathogenGroupStore,
  hostGroupStore
) {

  function sanitizeInput(str) {
    return str.replace(/\(|\)|\.|\*|\||\[|\]/g, '')
  }

  return declare([SearchBase], {
    templateString: template,
    searchAppName: 'Genome Search',
    dataKey: 'genome',
    resultUrlBase: '/view/GenomeList/?',
    resultUrlHash: '#view_tab=genomes',
    postCreate: function () {
      this.inherited(arguments)

      this.pathogenGroupNode.store = pathogenGroupStore
      this.hostGroupNode.store = hostGroupStore
    },
    buildQuery: function () {
      let queryArr = []

      const keywordValue = this.keywordNode.get('value')
      if (keywordValue !== '') {
        queryArr.push(`keyword(${sanitizeInput(keywordValue)})`)
      }

      const pathogenGroupValue = this.pathogenGroupNode.get('value')
      if (pathogenGroupValue !== '') {
        queryArr.push(`eq(taxon_lineage_ids,${sanitizeInput(pathogenGroupValue)})`)
      }

      const taxonNameValue = this.taxonNameNode.get('value')
      if (taxonNameValue !== '') {
        queryArr.push(`eq(taxon_lineage_ids,${sanitizeInput(taxonNameValue)})`)
      }

      const hostGroupValue = this.hostGroupNode.get('value')
      if (hostGroupValue !== '') {
        queryArr.push(`eq(host_group,${sanitizeInput(hostGroupValue)})`)
      }

      const hostNameValue = this.hostNameNode.get('value')
      if (hostNameValue !== '') {
        queryArr.push(`eq(host_common_name,${sanitizeInput(hostNameValue)})`)
      }

      const isolationCountryValue = this.isolationCountryNode.get('value')
      if (isolationCountryValue !== '') {
        queryArr.push(`eq(isolation_country,${sanitizeInput(isolationCountryValue)})`)
      }

      const collectionYearFromValue = parseInt(this.collectionYearFromNode.get('value'))
      const collectionYearToValue = parseInt(this.collectionYearToNode.get('value'))
      if (!isNaN(collectionYearFromValue) && !isNaN(collectionYearToValue)) {
        // between
        queryArr.push(`between(collection_year,${collectionYearFromValue},${collectionYearToValue})`)
      } else if (!isNaN(collectionYearFromValue)) {
        // gt
        queryArr.push(`gt(collection_year,${collectionYearFromValue})`)
      } else if (!isNaN(collectionYearToValue)) {
        // lt
        queryArr.push(`lt(collection_year,${collectionYearToValue})`)
      }

      const genomeLengthFromValue = parseInt(this.genomeLengthFromNode.get('value'))
      const genomeLengthToValue = parseInt(this.genomeLengthToNode.get('value'))
      if (!isNaN(genomeLengthFromValue) && !isNaN(genomeLengthToValue)) {
        queryArr.push(`betweeen(genome_length,${genomeLengthFromValue},${genomeLengthToValue})`)
      } else if (!isNaN(genomeLengthFromValue)) {
        queryArr.push(`gt(genome_length,${genomeLengthFromValue})`)
      } else if (!isNaN(genomeLengthToValue)) {
        queryArr.push(`lt(genome_length,${genomeLengthToValue})`)
      }

      const advancedQueryArr = this._buildAdvancedQuery()
      if (advancedQueryArr.length > 0) {
        queryArr = queryArr.concat(advancedQueryArr)
      }

      return queryArr.join('&')
    }
  })
})
