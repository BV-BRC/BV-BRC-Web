define([
  'dojo/text!./serviceFieldDefs.generated.json'
], function(
  serviceFieldDefsText
) {
  var serviceFieldDefs = {};
  try {
    serviceFieldDefs = JSON.parse(serviceFieldDefsText || '{}');
  } catch (err) {
    console.error('[ServiceFormRegistry] Failed to parse service field definitions JSON', err);
    serviceFieldDefs = {};
  }

  var serviceDisplayNames = {
    bacterial_genome_tree: 'Bacterial Genome Tree',
    blast: 'BLAST',
    comparative_systems: 'Comparative Systems',
    comprehensive_genome_analysis: 'Comprehensive Genome Analysis',
    core_genome_mlst: 'Core Genome MLST',
    date: 'Date',
    docking: 'Docking',
    expression_import: 'Expression Import',
    fastqutils: 'Fastq Utilities',
    gene_tree: 'Gene Tree',
    genome_alignment: 'Genome Alignment',
    genome_annotation: 'Genome Annotation',
    genome_assembly: 'Genome Assembly',
    influenza_ha_subtype_conversion: 'HA Subtype Numbering Conversion',
    metacats: 'Meta-CATS',
    metagenomic_binning: 'Metagenomic Binning',
    metagenomic_read_mapping: 'Metagenomic Read Mapping',
    msa_snp_analysis: 'MSA/SNP Analysis',
    primer_design: 'Primer Design',
    proteome_comparison: 'Proteome Comparison',
    rnaseq: 'RNA-Seq',
    sars_genome_analysis: 'SARS Genome Analysis',
    sars_wastewater_analysis: 'SARS Wastewater Analysis',
    sequence_submission: 'Sequence Submission',
    similar_genome_finder: 'Similar Genome Finder',
    subspecies_classification: 'Subspecies Classification',
    taxonomic_classification: 'Taxonomic Classification',
    tnseq: 'Tn-Seq',
    variation: 'Variation',
    viral_assembly: 'Viral Assembly',
    whole_genome_snp: 'Whole Genome SNP'
  };

  var serviceAliases = {
    assembly2: 'genome_assembly',
    assembly: 'genome_assembly',
    annotation: 'genome_annotation',
    comprehensivegenomeanalysis: 'comprehensive_genome_analysis',
    homology: 'blast',
    phylogenetictree: 'bacterial_genome_tree',
    viralgeneometree: 'bacterial_genome_tree',
    genedistance: 'similar_genome_finder',
    genomealignment: 'genome_alignment',
    variationanalysis: 'variation',
    tnseq: 'tnseq',
    genetree: 'gene_tree',
    coregenomemlst: 'core_genome_mlst',
    wholegenomesnpanalysis: 'whole_genome_snp',
    msa: 'msa_snp_analysis',
    metacats: 'metacats',
    seqcomparison: 'proteome_comparison',
    comparativesystems: 'comparative_systems',
    docking: 'docking',
    taxonomicclassification: 'taxonomic_classification',
    metagenomicbinning: 'metagenomic_binning',
    metagenomicreadmapping: 'metagenomic_read_mapping',
    rnaseq: 'rnaseq',
    expression: 'expression_import',
    fastqutil: 'fastqutils',
    sars2wastewater: 'sars_wastewater_analysis',
    comprehensivesars2analysis: 'sars_genome_analysis',
    sequencesubmission: 'sequence_submission',
    hasubtypenumberingconversion: 'influenza_ha_subtype_conversion',
    subspeciesclassification: 'subspecies_classification',
    viralassembly: 'viral_assembly',
    primersdesign: 'primer_design'
  };

  var serviceFieldOrderOverrides = {
    genome_assembly: ['paired_end_libs', 'single_end_libs', 'srr_ids', 'recipe', 'trim', 'output_path', 'output_file'],
    genome_annotation: ['contigs', 'scientific_name', 'tax_id', 'my_label', 'reference_genome_id', 'output_path', 'output_file', 'recipe'],
    rnaseq: ['reference_genome_id', 'genome_type', 'recipe', 'experimental_conditions', 'contrasts', 'paired_end_libs', 'single_end_libs', 'srr_libs', 'trimming', 'strand_specific', 'output_path', 'output_file'],
    blast: ['input_type', 'input_source', 'input_fasta_data', 'input_fasta_file', 'input_feature_group', 'input_genome_group', 'db_type', 'db_source', 'db_fasta_data', 'db_fasta_file', 'db_feature_group', 'db_genome_group', 'db_genome_list', 'blast_program', 'blast_evalue_cutoff', 'blast_max_hits', 'output_path', 'output_file']
  };

  var serviceAdvancedFieldOverrides = {
    genome_assembly: ['racon_iter', 'pilon_iter', 'target_depth', 'normalize', 'filtlong', 'genome_size', 'min_contig_len', 'min_contig_cov'],
    genome_annotation: ['public', 'queue_nowait', 'skip_indexing', 'skip_workspace_output', 'workflow', 'recipe'],
    rnaseq: ['host_ftp', 'unit_test', 'skip_sampling'],
    blast: ['blast_min_coverage', 'blast_evalue_cutoff', 'blast_max_hits']
  };

  function canonicalizeServiceName(value) {
    if (!value) return '';
    var raw = String(value).trim();
    if (!raw) return '';

    var stripped = raw.split('.').pop();
    var normalized = stripped
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');

    if (serviceFieldDefs[normalized]) return normalized;
    if (serviceAliases[normalized]) return serviceAliases[normalized];

    var compact = normalized.replace(/_/g, '');
    if (serviceAliases[compact]) return serviceAliases[compact];

    return normalized;
  }

  function getDefinition(appName) {
    var serviceKey = canonicalizeServiceName(appName);
    var fields = serviceFieldDefs[serviceKey] || [];
    fields = orderFields(serviceKey, fields);
    return {
      serviceKey: serviceKey,
      displayName: serviceDisplayNames[serviceKey] || serviceKey.replace(/_/g, ' '),
      fields: fields,
      groups: buildGroups(serviceKey, fields),
      isSupported: fields.length > 0
    };
  }

  function orderFields(serviceKey, fields) {
    var ordered = [];
    var used = {};
    var preferredOrder = serviceFieldOrderOverrides[serviceKey] || [];

    preferredOrder.forEach(function(fieldName) {
      for (var i = 0; i < fields.length; i++) {
        if (fields[i].name === fieldName) {
          ordered.push(fields[i]);
          used[fieldName] = true;
          break;
        }
      }
    });

    fields.forEach(function(field) {
      if (!used[field.name]) ordered.push(field);
    });
    return ordered;
  }

  function isOutputField(name) {
    return name === 'output_path' || name === 'output_file';
  }

  function isInputField(name) {
    return /(^input_|_libs$|_lib$|srr|contigs|reference_|genome_id|genome_group|feature_group|fasta|sequence_input|genome_list|taxon_list)/.test(name);
  }

  function isDesignField(name) {
    return /(condition|conditions|contrast|contrasts|group|groups|sample_id)/.test(name);
  }

  function isAdvancedField(serviceKey, name) {
    var overrides = serviceAdvancedFieldOverrides[serviceKey] || [];
    if (overrides.indexOf(name) !== -1) return true;
    return /(max_|min_|iter|threshold|depth|coverage|normalize|trim|filt|host_ftp|skip_|queue_|public$|unit_test|analyze_quality)/.test(name);
  }

  function classifyGroup(serviceKey, name) {
    if (isOutputField(name)) return isAdvancedField(serviceKey, name) ? 'advanced' : 'output';
    if (isDesignField(name)) return isAdvancedField(serviceKey, name) ? 'advanced' : 'design';
    if (isInputField(name)) return isAdvancedField(serviceKey, name) ? 'advanced' : 'input';
    if (isAdvancedField(serviceKey, name)) return 'advanced';
    return 'parameters';
  }

  function buildGroups(serviceKey, fields) {
    var groups = {
      input: [],
      parameters: [],
      design: [],
      output: [],
      advanced: []
    };
    fields.forEach(function(field) {
      var groupKey = classifyGroup(serviceKey, field.name);
      groups[groupKey].push(field);
    });

    return [
      { key: 'input', label: 'Input', fields: groups.input, collapsible: false, collapsed: false },
      { key: 'parameters', label: 'Parameters', fields: groups.parameters, collapsible: false, collapsed: false },
      { key: 'design', label: 'Groups/Conditions', fields: groups.design, collapsible: false, collapsed: false },
      { key: 'output', label: 'Output', fields: groups.output, collapsible: false, collapsed: false },
      { key: 'advanced', label: 'Advanced', fields: groups.advanced, collapsible: true, collapsed: true }
    ].filter(function(group) { return group.fields.length > 0; });
  }

  return {
    getDefinition: getDefinition,
    canonicalizeServiceName: canonicalizeServiceName,
    getSupportedServices: function() {
      return Object.keys(serviceFieldDefs);
    }
  };
});

