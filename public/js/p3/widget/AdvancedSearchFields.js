define([], function () {
  // column configuraion for facet and advanced search
  return {
    'taxa': [
      {
        field: 'taxon_id', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'taxon_name', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'taxon_rank', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'other_names', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'genetic_code', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'lineage', type: 'str', facet: true, facet_hidden: false, search: false
      },
      {
        field: 'lineage_ids', type: 'str', facet: true, facet_hidden: false, search: false
      },
      {
        field: 'lineage_names', type: 'str', facet: true, facet_hidden: false, search: false
      },
      {
        field: 'lineage_ranks', type: 'str', facet: true, facet_hidden: false, search: false
      },
      {
        field: 'parent_id', type: 'str', facet: true, facet_hidden: false, search: false
      },
      {
        field: 'division', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'description', type: 'str', facet: true, facet_hidden: false, search: false
      },
      {
        field: 'genomes', type: 'numeric', facet: true, facet_hidden: false, search: true
      },
    ],
    'genome': [
      {
        field: '----- General Info -----', type: 'str', facet: false, face_hidden: true, search: true
      },
      {
        field: 'public', type: 'str', facet: true, facet_hidden: false, search: true
      },
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
        field: '----- Taxonomy -----', type: 'str', facet: false, face_hidden: true, search: true
      },
      {
        field: 'taxon_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_lineage_ids', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_lineage_names', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'superkingdom', type: 'str', facet: true, facet_hidden: true, search: true
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
        field: '----- Status -----', type: 'str', facet: false, face_hidden: true, search: true
      },
      {
        field: 'genome_status', type: 'str', facet: true, facet_hidden: false, search: true
      },

      {
        field: '----- Type Info -----', type: 'str', facet: false, face_hidden: true, search: true
      },
      {
        field: 'strain', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'serovar', type: 'str', facet: true, facet_hidden: true, search: true
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
        field: 'segment', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'subtype', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'h_type', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'n_type', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'h1_clade_global', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'h1_clade_us', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'h3_clade', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'h5_clade', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'ph1n1_like', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'lineage', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'clade', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'subclade', type: 'str', facet: false, facet_hidden: true, search: true
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
        field: 'reference_genome', type: 'str', facet: true, facet_hidden: false, search: true
      },

      {
        field: '----- DB Cross Ref -----', type: 'str', facet: false, face_hidden: true, search: true
      },
      {
        field: 'completion_date', type: 'date', facet: false, facet_hidden: true, search: true
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
        field: 'genbank_accessions', type: 'str', facet: false, facet_hidden: true, search: true
      },

      {
        field: '----- Sequence Info -----', type: 'str', facet: false, face_hidden: true, search: true
      },
      {
        field: 'sequencing_centers', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'sequencing_platform', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'sequencing_depth', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'assembly_method', type: 'str', facet: false, facet_hidden: true, search: true
      },

      {
        field: '----- Genome Statistics -----', type: 'str', facet: false, face_hidden: true, search: true
      },
      {
        field: 'chromosomes', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'plasmids', type: 'numeric', facet: false, facet_hidden: true, search: true
      },
      // {
      //   field: 'segments', type: 'numeric', facet: false, facet_hidden: true, search: true
      // },
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
        field: '----- Genome Quality -----', type: 'str', facet: false, face_hidden: true, search: true
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
        field: '----- Isolate Info -----', type: 'str', facet: false, face_hidden: true, search: true
      },
      {
        field: 'isolation_source', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'isolation_comments', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'collection_date', type: 'date', facet: false, facet_hidden: true, search: true
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
        field: 'state_province', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'geographic_group', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'geographic_location', type: 'str', facet: false, facet_hidden: true, search: true
      },

      {
        field: '----- Host Info -----', type: 'str', facet: false, face_hidden: true, search: true
      },
      {
        field: 'host_name', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'host_common_name', type: 'str', facet: true, facet_hidden: false, search: true
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
        field: 'host_group', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'lab_host', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'passage', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'other_clinical', type: 'str', facet: false, facet_hidden: true, search: true
      },

      {
        field: '----- Additional Info -----', type: 'str', facet: false, face_hidden: true, search: true
      },
      {
        field: 'additional_metadata', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'comments', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'date_inserted', type: 'date', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'date_modified', type: 'date', facet: false, facet_hidden: true, search: true
      },
    ],
    'genome_feature': [
      {
        field: 'genome_id', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'genome_name', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'taxon_id', type: 'str', facet: false, facet_hidden: false, search: true
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
      // {
      //   field: 'brc_id', type: 'str', facet: false, facet_hidden: false, search: true
      // },
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
        field: 'na_length', type: 'numeric', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'aa_length', type: 'numeric', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'na_sequence_md5', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'aa_sequence_md5', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'gene', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'product', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'plfam_id', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'pgfam_id', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'sog_id', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'go', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'property', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'notes', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'date_inserted', type: 'date', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'public', type: 'str', facet: true, facet_hidden: false, search: true
      },
    ],
    'proteins': [
      {
        field: 'genome_id', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'genome_name', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'taxon_id', type: 'str', facet: false, facet_hidden: false, search: true
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
        field: 'na_length', type: 'numeric', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'aa_length', type: 'numeric', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'na_sequence_md5', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'aa_sequence_md5', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'gene', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'product', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'plfam_id', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'pgfam_id', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'sog_id', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'go', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'property', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'notes', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'date_inserted', type: 'date', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'public', type: 'str', facet: true, facet_hidden: false, search: true
      },
    ],
    'genome_sequence': [
      {
        field: 'genome_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'genome_name', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_id', type: 'str', facet: false, facet_hidden: true, search: true
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
        field: 'release_date', type: 'date', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'date_inserted', type: 'date', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'public', type: 'str', facet: true, facet_hidden: true, search: true
      },
    ],
    'sp_gene': [
      {
        field: 'evidence', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'property', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'source', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'patric_id', type: 'numeric', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'refseq_locus_tag', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'alt_locus_tag', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'source_id', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'organism', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'gene', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'product', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'classification', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'antibiotics_class', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'antibiotics', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'pubmed', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'subj_coverage', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'query_coverage', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'identity', type: 'str', facet: false, facet_hidden: false, search: true
      },
      {
        field: 'e_value', type: 'str', facet: false, facet_hidden: false, search: true
      },
    ],
    'protein_feature': [
      {
        field: 'taxon_id', type: 'str', facet: false, facet_hidden: true, search: true
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
        field: 'date_inserted', type: 'date', facet: false, facet_hidden: false, search: true
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
        field: 'taxon_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_lineage_ids', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_lineage_names', type: 'str', facet: false, facet_hidden: false, search: true
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
        field: 'gene', type: 'str', facet: true, facet_hidden: true, search: true
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
        field: 'release_date', type: 'date', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'file_path', type: 'str', facet: false, facet_hidden: true, search: true
      },
    ],
    'pathway': [
      {
        field: 'genome_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'genome_name', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'sequence_id', type: 'str', facet: false, facet_hidden: true, search: false
      },
      {
        field: 'accession', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'annotation', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'alt_locus_tag', type: 'str', facet: false, facet_hidden: true, search: false
      },
      {
        field: 'refseq_locus_tag', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'patric_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'gene', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'product', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'ec_number', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'ec_description', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'pathway_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'pathway_name', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'pathway_class', type: 'str', facet: true, facet_hidden: false, search: true
      }
    ],
    'sequence_feature': [
      {
        field: 'evidence_code', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'gene', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'sf_name', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'sf_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'length', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'variant_types', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'product', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'sf_category', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'source', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'source_sf_location', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'source_strain', type: 'str', facet: false, facet_hidden: false, search: false
      },
      {
        field: 'subtype', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'segment', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'additional_metadata', type: 'str', facet: true, facet_hidden: false, search: true
      },
    ],
    'subsystem': [
      {
        field: 'genome_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'genome_name', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'refseq_locus_tag', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'patric_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'gene', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'product', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'role_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'role_name', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'subsystem_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'superclass', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'class', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'subclass', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'subsystem_name', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'active', type: 'str', facet: true, facet_hidden: false, search: true
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
        field: 'last_update_date', type: 'date', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'longitudinal_study', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'embargo_end_date', type: 'date', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'collection_latitude', type: 'decimal', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'collection_longitude', type: 'decimal', facet: false, facet_hidden: true, search: true
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
        field: 'collection_date', type: 'date', facet: false, facet_hidden: true, search: true
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
        field: 'geographic_group', type: 'str', facet: true, facet_hidden: true, search: true
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
        field: 'pathogen_type', type: 'str', facet: false, facet_hidden: true, search: true
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
        field: 'treatment_type', type: 'str', facet: true, facet_hidden: true, search: true
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
        field: 'host_common_name', type: 'str', facet: true, facet_hidden: false, search: true
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
        field: 'collection_date', type: 'date', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'collection_year', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'geographic_group', type: 'str', facet: true, facet_hidden: true, search: true
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
    'strain': [
      {
        field: 'taxon_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_lineage_ids', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_lineage_names', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'family', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'genus', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'species', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'strain', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'subtype', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'h_type', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'n_type', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'genome_ids', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'genbank_accessions', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'segment_count', type: 'int', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'status', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'host_group', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'host_common_name', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'host_name', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'lab_host', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'passage', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'geographic_group', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'isolation_country', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'collection_year', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'collection_date', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'season', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: '1_pb2', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: '2_pb1', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: '3_pa', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: '4_ha', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: '5_np', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: '6_na', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: '7_mp', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: '8_ns', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 's', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'm', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'l', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'other_segments', type: 'str', facet: false, facet_hidden: true, search: true
      },
    ],
    'epitope': [
      {
        field: 'epitope_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'epitope_type', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'epitope_sequence', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'organism', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_lineage_ids', type: 'str', facet: false, facet_hidden: true, search: false
      },
      {
        field: 'taxon_lineage_names', type: 'str', facet: false, facet_hidden: true, search: false
      },
      {
        field: 'protein_name', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'protein_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'protein_accession', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'start', type: 'int', facet: false, facet_hidden: true, search: false
      },
      {
        field: 'end', type: 'int', facet: false, facet_hidden: true, search: false
      },
      {
        field: 'host_name', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'total_assays', type: 'int', facet: false, facet_hidden: true, search: false
      },
      {
        field: 'assay_results', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'bcell_assays', type: 'str', facet: false, facet_hidden: true, search: false
      },
      {
        field: 'tcell_assays', type: 'str', facet: false, facet_hidden: true, search: false
      },
      {
        field: 'mhc_assays', type: 'str', facet: false, facet_hidden: true, search: false
      },
      {
        field: 'comments', type: 'str', facet: false, facet_hidden: true, search: true
      },
    ],
    'epitope_assay': [
      {
        field: 'assay_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'assay_type', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'epitope_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'epitope_type', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'epitope_sequence', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'organism', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_lineage_ids', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'taxon_lineage_names', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'protein_name', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'protein_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'protein_accession', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'pdb_id', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'start', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'end', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'host_name', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'host_taxon_id', type: 'int', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'assay_group', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'assay_method', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'assay_result', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'assay_measurement', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'assay_measurement_unit', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'mhc_allele', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'mhc_allele_class', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'pmid', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'authors', type: 'str', facet: false, facet_hidden: true, search: true
      },
      {
        field: 'title', type: 'str', facet: false, facet_hidden: true, search: true
      },

    ],
    'experiment': [
      {
        field: 'exp_type', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'measurement_technique', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'organism', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'treatment_type', type: 'str', facet: true, facet_hidden: false, search: false
      },
      {
        field: 'treatment_duration', type: 'str', facet: true, facet_hidden: false, search: false
      }
    ],
    'genome_amr': [
      {
        field: 'taxon_id', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'genome_id', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'genome_name', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'genome_id', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'antibiotic', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'resistant_phenotype', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'measurement_sign', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'measurement_sign', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'measurement_unit', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'laboratory_typing_method', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'laboratory_typing_method_version', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'laboratory_typing_platform', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'vendor', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'testing_standard', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'testing_standard_year', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'computational_method', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'computational_method_version', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'computational_method_performance', type: 'str', facet: true, facet_hidden: true, search: true
      },
      {
        field: 'evidence', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'pmid', type: 'str', facet: true, facet_hidden: false, search: true
      },
      {
        field: 'public', type: 'str', facet: true, facet_hidden: false, search: true
      },
    ],
  }
})
