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
        field: 'species', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'strain', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'serovar', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'biovar', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'pathovar', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'mlst', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'sequencing_centers', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'sequencing_status', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'sequencing_platform', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'sequencing_depth', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'assembly_method', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'chromosomes', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'plasmids', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'segments', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'contigs', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'genome_length', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'isolation_source', type: 'str', facet: true, facet_hidden: true, search: false
      },
      {
        field: 'geographic_group', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'geographic_location', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'host_common_name', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'host_gender', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'host_age', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'host_health', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'host_group', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'lab_host', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'passage', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'gram_strain', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'cell_shape', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'motility', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'sporulation', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'salinity', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'oxygen_requirement', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'habitat', type: 'str', facet: true, facet_hidden: true, search: true
      },
    ]
  }
})
