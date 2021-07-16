define([], function () {
  // column configuraion for facet and advanced search
  return {
    'genome': [
      {
        field: 'genome_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'genome_name', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'other_name', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_id', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_lineage_ids', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_lineage_names', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'kingdom', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'phylum', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'class', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'order', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'family', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'genus', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'species', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'genome_status', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'completion_date', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'strain', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'serovar', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'biovar', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'pathovar', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'mlst', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'other_typing', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'culture_collection', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'type_strain', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'reference_genome', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'publication', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'authors', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'bioproject_accession', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'biosample_accession', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'assembly_accession', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'sra_accession', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'genbank_accession', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'sequencing_centers', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'sequencing_platform', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'sequencing_depth', type: 'str', facet: false, facet_hidden: true, search: true
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
        field: 'gc_content', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'contig_l50', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'contig_n50', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'coarse_consistency', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'fine_consistency', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'checkm_completeness', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'checkm_contamination', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'genome_quality_flags', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'genome_quality', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'nearest_genomes', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'outgroup_genomes', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'isolation_source', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'isolation_comments', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'collection_date', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'collection_year', type: 'numeric', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'season', type: 'str', facet: true, facet_hidden: true, search: false
      },
      {
        field: 'isolation_country', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'geographic_location', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'host_name', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'host_common_name', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'host_group', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'host_gender', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'host_age', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'host_health', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'other_clinical', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'phenotype', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'lab_host', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'passage', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'gram_strain', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'cell_shape', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'motility', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'sporulation', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'temperature_range', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'optimal_temperature', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'salinity', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'oxygen_requirement', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'habitat', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'disease', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'additional_metadata', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'comments', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'date_inserted', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'public', type: 'str', facet: true, facet_hidden: false, search: true
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
    'genomic_sequence': [
      {
        field: 'genome_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'genome_name', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_id', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'sequence_id', type: 'string', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'accession', type: 'string', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'gi', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'sequence_type', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'sequence_status', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'mol_type', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'topology', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'description', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'chromosome', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'plasmid', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'segment', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'gc_content', type: 'int', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'length', type: 'int', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'release_date', type: 'int', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'date_inserted', type: 'int', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'public', type: 'str', facet: true, facet_hidden: true, search: true
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
        field: 'public', type: 'str', facet: false, facet_hidden: true, search: true
      },
    ],
    'protein_structure': [
      {
        field: 'pdb_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'title', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'organism_name', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'taxon_id', type: 'int', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_lineage_ids', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_lineage_names', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'genome_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'feature_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'patric_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'uniprotkb_accession', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'gene', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'product', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'sequence_md5', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'sequence', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'alignments', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'method', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'resolution', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'pmid', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'institution', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'authors', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'release_date', type: 'str', facet: false, facet_hidden: true, search: true
      },
    ],
    'surveillance': [
      {
        field: 'project_identifier', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'contributing_institution', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'sample_identifier', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'sample_accession', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'sample_material', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'sample_transport_medium', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'sample_receipt_date', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'last_update_date', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'longitudinal_study', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'embargo_end_date', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'collector_name', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'collector_institution', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'contact_email_address', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'collection_date', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'collection_year', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'collection_season', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'days_elapsed_to_sample_collection', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'collection_country', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'collector_state_province', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'collection_city', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'collection_poi', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'collection_latitude', type: 'str', facet: false, facet_hidden: true, search: false
      },
      {
        field: 'collection_longitude', type: 'str', facet: false, facet_hidden: true, search: false
      },
      {
        field: 'pathogen_test_type', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'pathogen_test_result', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'pathogen_test_interpretation', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'species', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'type', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'subtype', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'strain', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'sequence_accession', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'host_indentifier', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'host_id_type', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'host_species', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'host_common_name', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'host_group', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'host_sex', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'host_age', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'host_height', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'host_weight', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'host_habitat', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'host_natural_state', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'host_capture_status', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'host_health', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'exposure', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'duration_of_exposure', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'exposure_type', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'use_of_personal_protective_equipment', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'primary_living_situtation', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'nursing_home_residence', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'daycare_attendance', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'travel_history', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'profession', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'education', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'pregnancy', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'trimester_of_pregnancy', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'breastfeeding', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'hospitalized', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'hospitalization_duration', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'intensive_care_unit', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'chest_imaging_interpretation', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'ventilation', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'oxygen_saturation', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'ecmo', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'dialysis', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'disease_status', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'days_elapsed_to_disease_status', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'disease_severity', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'alcohol_or_other_drug_dependence', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'tobacco_use', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'packs_per_day_for_how_many_years', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'chronic_conditions', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'maintenance_medications', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'types_of_allergies', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'influenza_like_illiness_over_the_past_year', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'infections_within_five_years', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'human_leukocyte_antigens', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'symptoms', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'onset_hours', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'sudden_onset', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'diagnosis', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'pre_visit_medications', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'post_visit_medications', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'treatment', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'initiation_of_treament', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'duration_of_treatment', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'treatment_dosage', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'vaccination_type', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'days_elapsed_to_vaccination', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'source_of_vaccine_information', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'vaccine_lot_number', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'vaccine_manufacturer', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'vaccine_dosage', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'other_vaccinations', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'additional_metadata', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'comments', type: 'str', facet: false, facet_hidden: true, search: true
      },
    ],
    'serology': [
      {
        field: 'project_indentifier', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'contributing_institution', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'sample_identifier', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'host_indentifier', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'host_type', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'host_species', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'host_common_names', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'host_sex', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'host_age', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'host_age_group', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'host_health', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'collection_country', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'collection_state', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'collection_city', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'collection_date', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'collection_year', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'test_type', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'test_result', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'test_interpretation', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'serotype', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'comments', type: 'str', facet: false, facet_hidden: false, search: true
      },
    ],
  }
})
