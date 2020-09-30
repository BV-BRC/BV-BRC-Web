define("p3/widget/ColumnsGenome", ['./formatter'], function (formatter) {

  return {
    'public': {
      label: 'Public',
      field: 'public',
      hidden: true
    },
    reference_genome: {
      label: 'Reference',
      field: 'reference_genome',
      hidden: true
    },
    genome_name: {
      label: 'Genome Name',
      // field: 'genome_name',
      get: function (item) {
        return item;
      },
      formatter: formatter.genomeName
    },
    genome_id: {
      label: 'Genome ID',
      field: 'genome_id'
    },
    other_names: {
      label: 'Other Names',
      field: 'other_names',
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
    taxon_id: {
      label: 'NCBI Taxon ID',
      field: 'taxon_id',
      hidden: true
    },
    genome_status: {
      label: 'Genome Status',
      field: 'genome_status'
    },
    genome_length: {
      label: 'Size',
      field: 'genome_length',
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
      field: 'contigs'
    },
    isolation_country: {
      label: 'Isolation Country',
      field: 'isolation_country'
    },
    season: {
      label: 'Season',
      field: 'season',
      hidden: true
    },
    host_name: {
      label: 'Host Name',
      field: 'host_name'
    },
    host_common_name: {
      label: 'Host Common Name',
      field: 'host_common_name',
      hidden: true
    },
    disease: {
      label: 'Disease',
      field: 'disease',
      hidden: true,
      sortable: false
    },
    collection_year: {
      label: 'Collection Year',
      field: 'collection_year'
    },
    collection_date: {
      label: 'Collection Date',
      field: 'collection_date',
      hidden: true
    },
    completion_date: {
      label: 'Completion Date',
      field: 'completion_date',
      formatter: formatter.dateOnly
    },
    mlst: {
      label: 'MLST',
      field: 'mlst',
      hidden: true
    },
    other_typing: {
      label: 'Other Typing',
      field: 'other_typing',
      hidden: true,
      sortable: false
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
    sequencing_centers: {
      label: 'Sequencing Center',
      field: 'sequencing_centers',
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
    genbank_accessions: {
      label: 'GenBank Accessions',
      field: 'genbank_accessions',
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
    gc_content: {
      label: 'GC Content',
      field: 'gc_content',
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
    comments: {
      label: 'Comments',
      field: 'comments',
      hidden: true,
      sortable: false
    },
    additional_metadata: {
      label: 'Additional Metadata',
      field: 'additional_metadata',
      hidden: true,
      sortable: false
    },
    date_inserted: {
      label: 'Date Inserted',
      field: 'date_inserted',
      hidden: true,
      formatter: formatter.dateOnly
    },
    date_modified: {
      label: 'Date Modified',
      field: 'date_modified',
      hidden: true,
      formatter: formatter.dateOnly
    },
    genome_quality: {
      label: 'Genome Quality',
      field: 'genome_quality',
      hidden: true
    },
    mat_peptide: {
      label: 'Mat Peptide',
      field: 'mat_peptide',
      hidden: true
    },
    genome_quality_flags: {
      label: 'Genome Quality Flags',
      field: 'genome_quality_flags',
      hidden: true,
      sortable: false
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
    }
  };
});
