define([], function () {
  // column configuraion for facet and advanced search
  return {
    'genome': [
      {
        field: 'public', type: 'str', facet: true, facet_hidden: false
      },
      {
        field: 'genome_status', type: 'str', facet: true, facet_hidden: false
      },
      {
        field: 'reference_genome', type: 'str', facet: true, facet_hidden: false
      },
      {
        field: 'antimicrobial_resistance', type: 'str', facet: true, facet_hidden: false
      },
      {
        field: 'isolation_country', type: 'str', facet: true, facet_hidden: false
      },
      {
        field: 'host_name', type: 'str', facet: true, facet_hidden: false
      },
      {
        field: 'collection_year', type: 'str', facet: true, facet_hidden: false
      },
      {
        field: 'genome_quality', type: 'str', facet: true, facet_hidden: false
      },
      // more facets for example, hidden by default
      {
        field: 'mlst', type: 'str', facet: true, facet_hidden: true
      },
      {
        field: 'sequencing_centers', type: 'str', facet: true, facet_hidden: true
      },
      {
        field: 'cds', type: 'numeric', facet: true, facet_hidden: true
      }
    ]
  }
})
