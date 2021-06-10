define([], function () {
  // column configuraion for facet and advanced search
  return {
    'genome': [
      {
        field: 'public', type: 'str', facet: true, facet_hidden: false, search: false
      },
      {
        field: 'genome_status', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'reference_genome', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'antimicrobial_resistance', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'isolation_country', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'host_name', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'collection_year', type: 'numeric', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'genome_quality', type: 'str', facet: true, facet_hidden: false, search: true
      },
      // more facets for example, hidden by default
      {
        field: 'mlst', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'sequencing_centers', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'cds', type: 'numeric', facet: true, facet_hidden: true, search: false
      }
    ]
  }
})
