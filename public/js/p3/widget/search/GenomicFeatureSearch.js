define([
  'dojo/_base/declare',
  './SearchBase',
  'dojo/text!./templates/GenomicFeatureSearch.html',
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
    searchAppName: 'Genomic Feature Search',
    dataKey: 'genome_feature',
    resultUrlBase: '/view/FeatureList/?',
    resultUrlHash: '#view_tab=features&filter=false',
    buildQuery: function () {
      let queryArr = []
      let genomeQuery

      // genome metadata
      let genomeQueryArr = []
      const hostNameValue = this.hostNameNode.get('value')
      if (hostNameValue !== '') {
        genomeQueryArr.push(`(eq,host_name,${sanitizeInput(hostNameValue)})`)
      }

      const geographicGroupValue = this.geographicGroupNode.get('value')
      if (geographicGroupValue !== '') {
        genomeQueryArr.push(`(eq,geographic_group,${sanitizeInput(geographicGroupValue)})`)
      }

      const isolationCountryValue = this.isolationCountryNode.get('value')
      if (isolationCountryValue !== '') {
        genomeQueryArr.push(`(eq,isolation_country,${sanitizeInput(isolationCountryValue)})`)
      }

      const collectionYearFromValue = parseInt(this.collectionYearFromNode.get('value'))
      const collectionYearToValue = parseInt(this.collectionYearToNode.get('value'))
      if (!isNaN(collectionYearFromValue) && !isNaN(collectionYearToValue)) {
        // between
        genomeQueryArr.push(`(between,collection_year,${collectionYearFromValue},${collectionYearToValue})`)
      } else if (!isNaN(collectionYearFromValue)) {
        // gt
        genomeQueryArr.push(`(gt,collection_year,${collectionYearFromValue})`)
      } else if (!isNaN(collectionYearToValue)) {
        // lt
        genomeQueryArr.push(`(lt,collection_year,${collectionYearToValue})`)
      }

      if (genomeQueryArr.length > 0) {
        genomeQuery = `genome(${genomeQueryArr.join(',')})`
      }

      // genome feature specific search
      const featureTypeValue = this.featureTypeNode.get('value')
      if (featureTypeValue !== '') {
        queryArr.push(`eq(feature_type,${sanitizeInput(featureTypeValue)})`)
      }
      const geneValue = this.geneNode.get('value')
      if (geneValue !== '') {
        queryArr.push(`eq(gene,${sanitizeInput(geneValue)})`)
      }
      const productValue = this.productNode.get('value')
      if (productValue !== '') {
        queryArr.push(`eq(product,${sanitizeInput(productValue)})`)
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
