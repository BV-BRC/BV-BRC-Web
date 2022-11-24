define([
  'dojo/_base/declare',
  './SearchBase',
  'dojo/text!./templates/TranscriptomicExperimentSearch.html',
], function (
  declare,
  SearchBase,
  template,
) {

  function sanitizeInput(str) {
    return str.replace(/\(|\)|\.|\*|\||\[|\]/g, '')
  }

  return declare([SearchBase], {
    templateString: template,
    searchAppName: 'Transcriptomic Experiment Search',
    pageTitle: 'Transcriptomic Experiment Search | BV-BRC',
    dataKey: 'genome',
    resultUrlBase: '/view/GenomeList/?',
    resultUrlHash: '#view_tab=genomes',
    buildQuery: function () {
      let queryArr = []

      const hostNameValue = this.hostNameNode.get('value')
      if (hostNameValue !== '') {
        queryArr.push(`eq(host_name,${sanitizeInput(hostNameValue)})`)
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
