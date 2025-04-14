define(['./formatter'], function (formatter) {

  return {
    genome_id: {
      label: 'Genome ID',
      field: 'genome_id',
      hidden: true,
      group: 'General Info'
    },
    // General Info
    genome_name: {
      label: 'Genome Name',
      // field: 'genome_name',
      get: function (item) {
        return item;
      },
      formatter: formatter.genomeName,
      hidden: false,
      group: 'General Info'
    },
    other_names: {
      label: 'Other Names',
      field: 'other_names',
      hidden: true,
      group: 'General Info'
    },

    // Taxonomy Info
    taxon_id: {
      label: 'NCBI Taxon ID',
      field: 'taxon_id',
      hidden: true,
      group: 'Taxonomy Info'
    },
    taxon_lineage_ids: {
      label: 'Taxon Lineage IDs',
      field: 'taxon_lineage_ids',
      hidden: true,
      group: 'Taxonomy Info'
    },
    taxon_lineage_names: {
      label: 'Taxon Lineage Names',
      field: 'taxon_lineage_names',
      hidden: true,
      group: 'Taxonomy Info'
    },
    superkingdom: {
      label: 'Superkingdom',
      field: 'superkingdom',
      hidden: true,
      group: 'Taxonomy Info'
    },
    kingdom: {
      label: 'Kingdom',
      field: 'kingdom',
      hidden: true,
      group: 'Taxonomy Info'
    },
    phylum: {
      label: 'Phylum',
      field: 'phylum',
      hidden: true,
      group: 'Taxonomy Info'
    },
    class: {
      label: 'Class',
      field: 'class',
      hidden: true,
      group: 'Taxonomy Info'
    },
    order: {
      label: 'Order',
      field: 'order',
      hidden: true,
      group: 'Taxonomy Info'
    },
    family: {
      label: 'Family',
      field: 'family',
      hidden: true,
      group: 'Taxonomy Info'
    },
    genus: {
      label: 'Genus',
      field: 'genus',
      hidden: true,
      group: 'Taxonomy Info'
    },
    species: {
      label: 'Species',
      field: 'species',
      hidden: true,
      group: 'Taxonomy Info'
    },

    // Status
    genome_status: {
      label: 'Genome Status',
      field: 'genome_status',
      hidden: true,
      group: 'Status'
    },

    // Type Info
    strain: {
      label: 'Strain',
      field: 'strain',
      hidden: false,
      group: 'Type Info'
    },
    serovar: {
      label: 'Serovar',
      field: 'serovar',
      hidden: true,
      group: 'Type Info'
    },
    biovar: {
      label: 'Biovar',
      field: 'biovar',
      hidden: true,
      group: 'Type Info'
    },
    pathovar: {
      label: 'Pathovar',
      field: 'pathovar',
      hidden: true,
      group: 'Type Info'
    },
    mlst: {
      label: 'MLST',
      field: 'mlst',
      hidden: true,
      group: 'Type Info'
    },
    segment: {
      label: 'Segment',
      field: 'segment',
      hidden: true,
      group: 'Type Info'
    },
    subtype: {
      label: 'Subtype',
      field: 'subtype',
      hidden: true,
      group: 'Type Info'
    },
    h_type: {
      label: 'H_type',
      field: 'h_type',
      hidden: true,
      group: 'Type Info'
    },
    n_type: {
      label: 'N_type',
      field: 'n_type',
      hidden: true,
      group: 'Type Info'
    },
    h1_clade_gobal: {
      label: 'H1 Clade Global',
      field: 'h1_clade_global',
      hidden: true,
      group: 'Type Info'
    },
    h1_clade_us: {
      label: 'H1 Clade US',
      field: 'h1_clade_us',
      hidden: true,
      group: 'Type Info'
    },
    h3_clade: {
      label: 'H3 Clade',
      field: 'h3_clade',
      hidden: true,
      group: 'Type Info'
    },
    h5_clade: {
      label: 'H5 Clade',
      field: 'h5_clade',
      hidden: true,
      group: 'Type Info'
    },
    ph1n1_like: {
      label: 'pH1N1-like',
      field: 'ph1n1_like',
      hidden: true,
      group: 'Type Info'
    },
    lineage: {
      label: 'Lineage',
      field: 'lineage',
      hidden: true,
      group: 'Type Info'
    },
    clade: {
      label: 'Clade',
      field: 'clade',
      hidden: true,
      group: 'Type Info'
    },
    subclade: {
      label: 'Subclade',
      field: 'subclade',
      hidden: true,
      group: 'Type Info'
    },
    other_typing: {
      label: 'Other Typing',
      field: 'other_typing',
      hidden: true,
      group: 'Type Info'
    },
    culture_collection: {
      label: 'Culture Collection',
      field: 'culture_collection',
      hidden: true,
      group: 'Type Info'
    },
    type_strain: {
      label: 'Type Strain',
      field: 'type_strain',
      hidden: true,
      group: 'Type Info'
    },
    reference_genome: {
      label: 'Reference',
      field: 'reference_genome',
      hidden: true,
      group: 'Type Info'
    },

    // Genome Quality
    genome_quality: {
      label: 'Genome Quality',
      field: 'genome_quality',
      hidden: true,
      group: 'Genome Quality'
    },

    // Database Cross Reference
    completion_date: {
      label: 'Completion Date',
      field: 'completion_date',
      formatter: formatter.dateOnly,
      hidden: true,
      group: 'DB Cross Reference'
    },
    publication: {
      label: 'Publication',
      field: 'publication',
      hidden: true,
      group: 'DB Cross Reference'
    },
    authors: {
      label: 'Authors',
      field: 'authors',
      hidden: true,
      group: 'DB Cross Reference'
    },
    bioproject_accession: {
      label: 'BioProject Accession',
      field: 'bioproject_accession',
      hidden: true,
      group: 'DB Cross Reference'
    },
    biosample_accession: {
      label: 'BioSample Accession',
      field: 'biosample_accession',
      hidden: true,
      group: 'DB Cross Reference'
    },
    assembly_accession: {
      label: 'Assembly Accession',
      field: 'assembly_accession',
      hidden: true,
      group: 'DB Cross Reference'
    },
    sra_accession: {
      label: 'SRA Accession',
      name: 'sra_accession',
      hidden: true,
      group: 'DB Cross Reference'
    },
    genbank_accessions: {
      label: 'GenBank Accessions',
      field: 'genbank_accessions',
      hidden: false,
      group: 'DB Cross Reference'
    },

    // Sequence Info
    sequencing_centers: {
      label: 'Sequencing Center',
      field: 'sequencing_centers',
      hidden: true,
      group: 'Sequence Info'
    },
    sequencing_status: {
      label: 'Sequencing Status',
      name: 'sequencing_status',
      hidden: true,
      group: 'Sequence Info'
    },
    sequencing_platform: {
      label: 'Sequencing Platform',
      field: 'sequencing_platform',
      hidden: true,
      group: 'Sequence Info'
    },
    sequencing_depth: {
      label: 'Sequencing Depth',
      field: 'sequencing_depth',
      hidden: true,
      group: 'Sequence Info'
    },
    assembly_method: {
      label: 'Assembly Method',
      field: 'assembly_method',
      hidden: true,
      group: 'Sequence Info'
    },

    // Genome Statistics
    chromosomes: {
      label: 'Chromosome',
      field: 'chromosomes',
      hidden: true,
      group: 'Genome Statistics'
    },
    plasmids: {
      label: 'Plasmids',
      field: 'plasmids',
      hidden: true,
      group: 'Genome Statistics'
    },
    // segments: {
    //   label: 'Segments',
    //   field: 'Segments',
    //   hidden: true,
    //   group: 'Genome Statistics'
    // },
    contigs: {
      label: 'Contigs',
      field: 'contigs',
      hidden: true,
      group: 'Genome Statistics'
    },
    genome_length: {
      label: 'Size',
      field: 'genome_length',
      hidden: false,
      group: 'Genome Statistics'
    },
    gc_content: {
      label: 'GC Content',
      field: 'gc_content',
      hidden: true,
      group: 'Genome Statistics'
    },
    contig_l50: {
      label: 'Contig L50',
      name: 'contig_l50',
      hidden: true,
      group: 'Genome Statistics'
    },
    contig_n50: {
      label: 'Contig N50',
      name: 'contig_n50',
      hidden: true,
      group: 'Genome Statistics'
    },

    // Annotation Statistics
    trna: {
      label: 'TRNA',
      name: 'trna',
      hidden: true,
      group: 'Annotation Statistics'
    },
    rrna: {
      label: 'RRNA',
      name: 'rrna',
      hidden: true,
      group: 'Annotation Statistics'
    },
    mat_peptide: {
      label: 'Mat Peptide',
      field: 'mat_peptide',
      hidden: true,
      group: 'Annotation Statistics'
    },
    cds: {
      label: 'CDS',
      name: 'cds',
      hidden: false,
      group: 'Annotation Statistics'
    },

    // Genome Quality
    coarse_consistency: {
      label: 'Coarse Consistency',
      field: 'coarse_consistency',
      hidden: true,
      group: 'Genome Quality'
    },
    fine_consistency: {
      label: 'Fine Consistency',
      field: 'fine_consistency',
      hidden: true,
      group: 'Genome Quality'
    },
    checkm_completeness: {
      label: 'CheckM Completeness',
      field: 'checkm_completeness',
      hidden: true,
      group: 'Genome Quality'
    },
    checkm_contamination: {
      label: 'CheckM Contamination',
      field: 'checkm_contamination',
      hidden: true,
      group: 'Genome Quality'
    },
    genome_quality_flags: {
      label: 'Genome Quality Flags',
      field: 'genome_quality_flags',
      hidden: true,
      sortable: false,
      group: 'Genome Quality'
    },

    // Isolate Info
    isolation_source: {
      label: 'Isolation Source',
      field: 'isolation_source',
      hidden: true,
      group: 'Isolate Info'
    },
    isolation_comments: {
      label: 'Isolation Comments',
      field: 'isolation_comments',
      hidden: true,
      sortable: false,
      group: 'Isolate Info'
    },
    collection_date: {
      label: 'Collection Date',
      field: 'collection_date',
      hidden: true,
      group: 'Isolate Info'
    },
    collection_year: {
      label: 'Collection Year',
      field: 'collection_year',
      hidden: false,
      group: 'Isolate Info'
    },
    season: {
      label: 'Season',
      field: 'season',
      hidden: true,
      group: 'Isolate Info'
    },
    isolation_country: {
      label: 'Isolation Country',
      field: 'isolation_country',
      hidden: false,
      group: 'Isolate Info'
    },
    state_province: {
      label: 'State/Province',
      field: 'state_province',
      hidden: true,
      group: 'Isolate Info'
    },
    geographic_group: {
      label: 'Geographic Group',
      field: 'geographic_group',
      hidden: true,
      group: 'Isolate Info'
    },
    geographic_location: {
      label: 'Geographic Location',
      field: 'geographic_location',
      hidden: true,
      group: 'Isolate Info'
    },
    other_environmental: {
      label: 'Other Environmental',
      field: 'other_environmental',
      hidden: true,
      sortable: false,
      group: 'Isolate Info'
    },

    // Host Info
    host_name: {
      label: 'Host Name',
      field: 'host_name',
      hidden: true,
      group: 'Host Info'
    },
    host_common_name: {
      label: 'Host Common Name',
      field: 'host_common_name',
      hidden: false,
      group: 'Host Info'
    },
    host_gender: {
      label: 'Host Sex',
      field: 'host_gender',
      hidden: true,
      group: 'Host Info'
    },
    host_age: {
      label: 'Host Age',
      field: 'host_age',
      hidden: true,
      group: 'Host Info'
    },
    host_health: {
      label: 'Host Health',
      field: 'host_health',
      hidden: true,
      group: 'Host Info'
    },
    host_group: {
      label: 'Host Group',
      field: 'host_group',
      hidden: true,
      group: 'Host Info'
    },
    lab_host: {
      label: 'Lab Host',
      field: 'lab_host',
      hidden: true,
      group: 'Host Info'
    },
    passage: {
      label: 'Passage',
      field: 'passage',
      hidden: true,
      group: 'Host Info'
    },
    other_clinical: {
      label: 'Other Clinical',
      field: 'other_clinical',
      hidden: true,
      group: 'Host Info'
    },

    // Additon Info
    additional_metadata: {
      label: 'Additional Metadata',
      field: 'additional_metadata',
      hidden: true,
      sortable: false,
      group: 'Additional Info'
    },
    comments: {
      label: 'Comments',
      field: 'comments',
      hidden: true,
      sortable: false,
      group: 'Additional Info'
    },
    date_inserted: {
      label: 'Date Inserted',
      field: 'date_inserted',
      hidden: true,
      formatter: formatter.dateOnly,
      group: 'Additional Info'
    },
    date_modified: {
      label: 'Date Modified',
      field: 'date_modified',
      hidden: true,
      formatter: formatter.dateOnly,
      group: 'Additional Info'
    },
    'public': {
      label: 'Public',
      field: 'public',
      hidden: true,
      group: 'Additional Info'
    },
    owner: {
      label: 'Owner',
      field: 'owner',
      formatter: formatter.baseUsername,
      hidden: true,
      group: 'Additional Info'
    },
    members: {
      label: 'Members (shared with)',
      get: function (item) {
        return item;
      },
      formatter: formatter.genomeMembers,
      hidden: true,
      group: 'Additional Info'
    },
  };
});
