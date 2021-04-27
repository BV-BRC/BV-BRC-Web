define(['./formatter'], function (formatter) {

  return {
    genome_id: {
      label: 'Genome ID',
      field: 'genome_id',
      hidden: false
    },
    genome_name: {
      label: 'Genome Name',
      // field: 'genome_name',
      get: function (item) {
        return item;
      },
      formatter: formatter.genomeName,
      hidden: false
    },
    other_names: {
      label: 'Other Names',
      field: 'other_names',
      hidden: true
    },

    taxon_id: {
      label: 'NCBI Taxon ID',
      field: 'taxon_id',
      hidden: true
    },
    taxon_lineage_ids: {
      label: 'Taxon Lineage IDs',
      field: 'taxon_lineage_ids',
      hidden: true
    },
    taxon_lineage_names: {
      label: 'Taxon Lineage Names',
      field: 'taxon_lineage_names',
      hidden: true
    },

    kingdom: {
      label: 'Kingdom',
      field: 'kingdom',
      hidden: true
    },
    phylum: {
      label: 'Phylum',
      field: 'phylum',
      hidden: true
    },
    class: {
      label: 'Class',
      field: 'class',
      hidden: true
    },
    order: {
      label: 'Order',
      field: 'order',
      hidden: true
    },
    family: {
      label: 'Family',
      field: 'family',
      hidden: true
    },
    genus: {
      label: 'Genus',
      field: 'genus',
      hidden: true
    },
    species: {
      label: 'Species',
      field: 'species',
      hidden: true
    },

    genome_status: {
      label: 'Genome Status',
      field: 'genome_status',
      hidden: false
    },

    strain: {
      label: 'Strain',
      field: 'strain',
      hidden: true
    },
    serovar: {
      label: 'Serovar',
      field: 'serovar',
      hidden: true
    },
    biovar: {
      label: 'Biovar',
      field: 'biovar',
      hidden: true
    },
    pathovar: {
      label: 'Pathovar',
      field: 'pathovar',
      hidden: true
    },
    mlst: {
      label: 'MLST',
      field: 'mlst',
      hidden: true
    },
    other_typing: {
      label: 'Other Typing',
      field: 'other_typing',
      hidden: true
    },

    culture_collection: {
      label: 'Culture Collection',
      field: 'culture_collection',
      hidden: true
    },
    type_strain: {
      label: 'Type Strain',
      field: 'type_strain',
      hidden: true
    },
    reference_genome: {
      label: 'Reference',
      field: 'reference_genome',
      hidden: true
    },

    completion_date: {
      label: 'Completion Date',
      field: 'completion_date',
      formatter: formatter.dateOnly,
      hidden: true
    },
    publication: {
      label: 'Publication',
      field: 'publication',
      hidden: true
    },
    authors: {
      label: 'Authors',
      field: 'authors',
      hidden: true
    },

    bioproject_accession: {
      label: 'BioProject Accession',
      field: 'bioproject_accession',
      hidden: true
    },
    biosample_accession: {
      label: 'BioSample Accession',
      field: 'biosample_accession',
      hidden: true
    },
    assembly_accession: {
      label: 'Assembly Accession',
      field: 'assembly_accession',
      hidden: true
    },
    sra_accession: {
      label: 'SRA Accession',
      name: 'sra_accession',
      hidden: true
    },
    genbank_accessions: {
      label: 'GenBank Accessions',
      field: 'genbank_accessions',
      hidden: false
    },

    sequencing_centers: {
      label: 'Sequencing Center',
      field: 'sequencing_centers',
      hidden: true
    },
    sequencing_status: {
      label: 'Sequencing Status',
      name: 'sequencing_status',
      hidden: true
    },
    sequencing_platform: {
      label: 'Sequencing Platform',
      field: 'sequencing_platform',
      hidden: true
    },
    sequencing_depth: {
      label: 'Sequencing Depth',
      field: 'sequencing_depth',
      hidden: true
    },
    assembly_method: {
      label: 'Assembly Method',
      field: 'assembly_method',
      hidden: true
    },



    chromosomes: {
      label: 'Chromosome',
      field: 'chromosomes',
      hidden: true
    },
    plasmids: {
      label: 'Plasmids',
      field: 'plasmids',
      hidden: true
    },
    segments: {
      label: 'Segments',
      field: 'Segments',
      hidden: true
    },
    contigs: {
      label: 'Contigs',
      field: 'contigs',
      hidden: false
    },
    genome_length: {
      label: 'Size',
      field: 'genome_length',
      hidden: false
    },
    gc_content: {
      label: 'GC Content',
      field: 'gc_content',
      hidden: true
    },
    contig_l50: {
      label: 'Contig L50',
      name: 'contig_l50',
      hidden: true
    },
    contig_n50: {
      label: 'Contig N50',
      name: 'contig_n50',
      hidden: true
    },

    trna: {
      label: 'TRNA',
      name: 'trna',
      hidden: true
    },
    rrna: {
      label: 'RRNA',
      name: 'rrna',
      hidden: true
    },
    mat_peptide: {
      label: 'Mat Peptide',
      field: 'mat_peptide',
      hidden: true
    },
    cds: {
      label: 'CDS',
      name: 'cds',
      hidden: false
    },
    cds_ratio: {
      label: 'CDS Ratio',
      name: 'cds_ratio',
      hidden: true
    },
    hypothethical_cds: {
      label: 'Hypothethical CDS',
      name: 'hypothethical_cds',
      hidden: true
    },
    hypothethical_cds_ratio: {
      label: 'Hypothethical CDS Ratio',
      name: 'hypothethical_cds_ratio',
      hidden: true
    },
    partial_cds: {
      label: 'Partial CDS',
      name: 'partial_cds',
      hidden: true
    },
    partial_cds_ratio: {
      label: 'Partial CDS Ratio',
      name: 'partial_cds_ratio',
      hidden: true
    },
    plfam_cds: {
      label: 'PLFam CDS',
      name: 'plfam_cds',
      hidden: true
    },
    plfam_cds_ratio: {
      label: 'PLFam CDS Ratio',
      name: 'plfam_cds_ratio',
      hidden: true
    },
    core_families: {
      label: 'Core Families',
      name: 'core_families',
      hidden: true
    },
    core_families_ratio: {
      label: 'Core Families Ratio',
      name: 'core_families_ratio',
      hidden: true
    },
    missing_core_family_ids: {
      label: 'Missing Core Family IDs',
      name: 'missing_core_family_ids',
      hidden: true
    },

    coarse_consistency: {
      label: 'Coarse Consistency',
      field: 'coarse_consistency',
      hidden: true
    },
    fine_consistency: {
      label: 'Fine Consistency',
      field: 'fine_consistency',
      hidden: true
    },
    checkm_completeness: {
      label: 'CheckM Completeness',
      field: 'checkm_completeness',
      hidden: true
    },
    checkm_contamination: {
      label: 'CheckM Contamination',
      field: 'checkm_contamination',
      hidden: true
    },
    genome_quality_flags: {
      label: 'Genome Quality Flags',
      field: 'genome_quality_flags',
      hidden: true,
      sortable: false
    },
    genome_quality: {
      label: 'Genome Quality',
      field: 'genome_quality',
      hidden: true
    },
    outgroup_genomes: {
      label: 'Outgroup Genomes',
      name: 'outgroup_genomes',
      hidden: true
    },

    isolation_source: {
      label: 'Isolation Source',
      field: 'isolation_source',
      hidden: true
    },
    isolation_comments: {
      label: 'Isolation Comments',
      field: 'isolation_comments',
      hidden: true,
      sortable: false
    },
    collection_date: {
      label: 'Collection Date',
      field: 'collection_date',
      hidden: false
    },
    collection_year: {
      label: 'Collection Year',
      field: 'collection_year',
      hidden: true
    },
    season: {
      label: 'Season',
      field: 'season',
      hidden: true
    },

    isolation_country: {
      label: 'Isolation Country',
      field: 'isolation_country',
      hidden: false
    },
    geographic_location: {
      label: 'Geographic Location',
      field: 'geographic_location',
      hidden: true
    },
    other_environmental: {
      label: 'Other Environmental',
      field: 'other_environmental',
      hidden: true,
      sortable: false
    },


    host_name: {
      label: 'Host Name',
      field: 'host_name',
      hidden: false
    },
    host_common_name: {
      label: 'Host Common Name',
      field: 'host_common_name',
      hidden: true
    },
    host_gender: {
      label: 'Host Gender',
      field: 'host_gender',
      hidden: true
    },
    host_age: {
      label: 'Host Age',
      field: 'host_age',
      hidden: true
    },
    host_health: {
      label: 'Host Health',
      field: 'host_health',
      hidden: true
    },
    other_clinical: {
      label: 'Other Clinical',
      field: 'other_clinical',
      hidden: true
    },

    phenotype: {
      label: 'Phenotype',
      field: 'phenotype',
      hidden: true
    },

    gram_stain: {
      label: 'Gram Stain',
      field: 'gram_stain',
      hidden: true
    },
    cell_shape: {
      label: 'Cell Shape',
      field: 'cell_shape',
      hidden: true
    },
    motility: {
      label: 'Motility',
      field: 'motility',
      hidden: true
    },
    sporulation: {
      label: 'Sporulation',
      field: 'sporulation',
      hidden: true
    },
    temperature_range: {
      label: 'Temperature Range',
      field: 'temperature_range',
      hidden: true
    },
    optimal_temperature: {
      label: 'Optimal Temperature',
      field: 'optimal_temperature',
      hidden: true
    },
    salinity: {
      label: 'Salinity',
      field: 'salinity',
      hidden: true
    },
    oxygen_requirement: {
      label: 'Oxygen Requirement',
      field: 'oxygen_requirement',
      hidden: true
    },
    habitat: {
      label: 'Habitat',
      field: 'habitat',
      hidden: true
    },

    disease: {
      label: 'Disease',
      field: 'disease',
      hidden: true,
      sortable: false
    },

    additional_metadata: {
      label: 'Additional Metadata',
      field: 'additional_metadata',
      hidden: true,
      sortable: false
    },

    comments: {
      label: 'Comments',
      field: 'comments',
      hidden: true,
      sortable: false
    },

    date_inserted: {
      label: 'Date Inserted',
      field: 'date_inserted',
      hidden: false,
      formatter: formatter.dateOnly
    },
    date_modified: {
      label: 'Date Modified',
      field: 'date_modified',
      hidden: true,
      formatter: formatter.dateOnly
    },

    'public': {
      label: 'Public',
      field: 'public',
      hidden: true
    },
    owner: {
      label: 'Owner',
      field: 'owner',
      formatter: formatter.baseUsername,
      hidden: true
    },
    members: {
      label: 'Members (shared with)',
      get: function (item) {
        return item;
      },
      formatter: formatter.genomeMembers,
      hidden: true
    },
  };
});
