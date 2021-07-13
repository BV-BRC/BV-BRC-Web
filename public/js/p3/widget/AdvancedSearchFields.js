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
    ],
    'genomic_feature': [
      {
        field: 'genome_id', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'genome_name', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'taxon_id', type: 'numeric', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'accession', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'annotation', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'feature_type', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'patric_id', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'brc_id', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'refseq_locus_tag', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'protein_id', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'gene_id', type: 'numeric', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'uniprotkb_accession', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'pdb_accesion', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'start', type: 'int', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'end', type: 'int', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'strand', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'na_length', type: 'int', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'aa_length', type: 'int', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'na_sequence_md5', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'aa_sequence_md5', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'gene', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'product', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'plfam', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'pgfam', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'sog_id', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'go', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'property', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'notes', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'date_inserted', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'public', type: 'str', facet: true, facet_hidden: false, search: true
      },
    ],
    'protein_feature': [
      {
        field: 'taxon_id', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'genome_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'genome_name', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'feature_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'patric_id', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'refseq_locus_tag', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'gene', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'product', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'aa_sequence_md5', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'feature_type', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'source', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'source_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'name', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'description', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'classification', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'score', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'e_value', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'evidence', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'publication', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'start', type: 'numeric', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'end', type: 'numeric', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'segments', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'length', type: 'numeric', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'sequence', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'comments', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'date_inserted', type: 'numeric', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'public', type: 'str', facet: false, facet_hidden: true, search: false
      },
    ]
  }
})
