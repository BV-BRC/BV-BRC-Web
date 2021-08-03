define([
  'dojo/_base/declare',
  './SearchBase',
  'dojo/text!./templates/GenomeSearch.html',
  'dojo/store/Memory'
], function (
  declare,
  SearchBase,
  template,
  Memory
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

      this.buildPathogenGroup()
      this.buildHostGroup()
    },
    buildPathogenGroup: function () {
      this.pathogenGroupNode.store = new Memory({
        data: [
          { name: '----- Bacteria -----', id: '' },
          { name: 'Acinetobacter', id: 469 },
          { name: 'Bacillus', id: 1386 },
          { name: 'Bartonella', id: 773 },
          { name: 'Borreliella', id: 64895 },
          { name: 'Brucella', id: 234 },
          { name: 'Burkholderia', id: 32008 },
          { name: 'Campylobacter', id: 194 },
          { name: 'Chlamydia', id: 810 },
          { name: 'Clostridium', id: 1485 },
          { name: 'Coxiella', id: 776 },
          { name: 'Ehrlichia', id: 943 },
          { name: 'Escherichia', id: 561 },
          { name: 'Francisella', id: 262 },
          { name: 'Helicobacter', id: 209 },
          { name: 'Listeria', id: 1637 },
          { name: 'Mycobacterium', id: 1763 },
          { name: 'Pseudomonas', id: 286 },
          { name: 'Rickettsia', id: 780 },
          { name: 'Salmonella', id: 590 },
          { name: 'Shigella', id: 620 },
          { name: 'Staphylococcus', id: 1279 },
          { name: 'Streptococcus', id: 1301 },
          { name: 'Vibrio', id: 662 },
          { name: 'Yersinia', id: 629 },

          { name: '----- Virus -----', id: '' },
          { name: 'Adenoviridae', id: 10508 },
          { name: 'Asfarviridae', id: 137992 },
          { name: 'Bunyavirales', id: 1980410 },
          { name: 'Caliciviridae', id: 11974 },
          { name: 'Coronaviridae', id: 11118 },
          { name: 'Filoviridae', id: 11266 },
          { name: 'Flaviviridae', id: 11050 },
          { name: 'Hepadnaviridae', id: 10404 },
          { name: 'Hepeviridae', id: 291484 },
          { name: 'Herpesviridae', id: 10292 },
          { name: 'Orthomyxoviridae', id: 11308 },
          { name: 'Paramyxoviridae', id: 11158 },
          { name: 'Paravoviridae', id: 10780 },
          { name: 'Picornaviridae', id: 12058 },
          { name: 'Pneumoviridae', id: 11244 },
          { name: 'Polyomaviridae', id: 151341 },
          { name: 'Poxviridae', id: 10240 },
          { name: 'Reoviridae', id: 10880 },
          { name: 'Rhabdoviridae', id: 11270 },
          { name: 'Togaviridae', id: 11018 },

          { name: '----- Featured Virus -----', id: '' },
          { name: 'Dengue virus', id: 12637 },
          { name: 'Ebolavirus', id: 186536 },
          { name: 'Enterovirus', id: 12059 },
          { name: 'Hepatitis C virus', id: 63746 },
          { name: 'Influenza A virus', id: 11320 },
          { name: 'Lassa mammarenavirus', id: 11620 },
          { name: 'SARS-CoV-2', id: 2697049 },
          { name: 'Zika virus', id: 64320 },
        ]
      })
    },
    buildHostGroup: function () {
      this.hostGroupNode.store = new Memory({
        data: [
          { name: '', id: '' },
          { name: 'Human', id: 'Human' },
          { name: 'Non-human Mammal', id: 'Non-human Mammal' },
          { name: 'Avian', id: 'Avian' },
          { name: 'Insect', id: 'Insect' },
          { name: 'Fish', id: 'Fish' },
          { name: 'Plant', id: 'Plant' },
          { name: 'Environment', id: 'Environment' },
          { name: 'Sea Mammal', id: 'Sea Mammal' },
          { name: 'Crustaceans', id: 'Crustaceans' },
          { name: 'Lab host', id: 'Lab host' },
          { name: 'Amphibian', id: 'Amphibian' },
        ]
      })
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
