define([
  'dojo/_base/lang'
], function(
  lang
) {
  /**
   * Service-specific validation rules for BV-BRC workflows.
   * These validation functions are called by WorkflowEngine during step validation.
   *
   * All validation functions follow the same signature:
   * @param {Object} step - The workflow step being validated
   * @param {number} index - The step index in the workflow
   * @param {Object} params - The step parameters
   * @param {Object} workflow - The complete workflow object
   * @param {Object} result - The validation result object to populate
   * @param {Object} helpers - Helper functions from WorkflowEngine (toArrayValue, isEmptyValue, etc.)
   */

  return {
    /**
     * Validates taxonomic classification service parameters.
     * Requirements:
     * - At least one input library (paired_end_libs, single_end_libs, or srr_libs)
     * - All library objects must have valid structure
     * - Sample IDs must not contain invalid characters: - : @ " ' ; [ ] { } | `
     */
    runTaxonomicClassificationStrictValidation: function(step, index, params, workflow, result, helpers) {
      var hasPaired = helpers.toArrayValue(params.paired_end_libs).length > 0;
      var hasSingle = helpers.toArrayValue(params.single_end_libs).length > 0;
      var hasSrr = helpers.toArrayValue(params.srr_libs).length > 0;
      if (!hasPaired && !hasSingle && !hasSrr) {
        helpers.addValidationError(result, 'missing_inputs', 'At least one input library is required (paired_end_libs, single_end_libs, or srr_libs)', 'input');
      }

      helpers.validateLibraryObjects(result, 'paired_end_libs', params.paired_end_libs, true);
      helpers.validateLibraryObjects(result, 'single_end_libs', params.single_end_libs, true);

      var invalidSampleChars = /[-:@"';\[\]{}|`]/;
      helpers.toArrayValue(params.paired_end_libs).forEach(function(entry, idx) {
        if (entry && typeof entry === 'object' && !helpers.isEmptyValue(entry.sample_id) && invalidSampleChars.test(String(entry.sample_id))) {
          helpers.addValidationError(result, 'invalid_sample_id_chars', 'Invalid characters in paired_end_libs[' + idx + '].sample_id', 'paired_end_libs');
        }
      });
      helpers.toArrayValue(params.single_end_libs).forEach(function(entry, idx) {
        if (entry && typeof entry === 'object' && !helpers.isEmptyValue(entry.sample_id) && invalidSampleChars.test(String(entry.sample_id))) {
          helpers.addValidationError(result, 'invalid_sample_id_chars', 'Invalid characters in single_end_libs[' + idx + '].sample_id', 'single_end_libs');
        }
      });
      helpers.toArrayValue(params.srr_libs).forEach(function(entry, idx) {
        if (!entry || typeof entry !== 'object') {
          helpers.addValidationError(result, 'invalid_srr_entry', 'srr_libs[' + idx + '] must be an object', 'srr_libs');
          return;
        }
        if (helpers.isEmptyValue(entry.srr_accession)) {
          helpers.addValidationError(result, 'missing_srr_accession', 'Missing srr_accession in srr_libs[' + idx + ']', 'srr_libs');
        }
        if (helpers.isEmptyValue(entry.sample_id)) {
          helpers.addValidationError(result, 'missing_sample_id', 'Missing sample_id in srr_libs[' + idx + ']', 'srr_libs');
        } else if (invalidSampleChars.test(String(entry.sample_id))) {
          helpers.addValidationError(result, 'invalid_sample_id_chars', 'Invalid characters in srr_libs[' + idx + '].sample_id', 'srr_libs');
        }
      });
    },

    /**
     * Validates comprehensive genome analysis service parameters.
     * Requirements:
     * - input_type is required (reads or contigs)
     * - scientific_name is required
     * - taxonomy_id is required
     * - domain is required
     * - If input_type=reads: requires paired_end_libs, single_end_libs, or srr_ids
     * - If input_type=contigs: requires contigs
     * - If recipe=canu: requires genome_size
     */
    runComprehensiveGenomeAnalysisStrictValidation: function(step, index, params, workflow, result, helpers) {
      var inputType = params.input_type;
      if (helpers.isEmptyValue(inputType)) {
        helpers.addValidationError(result, 'missing_input_type', 'Missing required field: input_type', 'input_type');
      }

      if (helpers.isEmptyValue(params.scientific_name)) {
        helpers.addValidationError(result, 'missing_scientific_name', 'Missing required field: scientific_name', 'scientific_name');
      }
      if (helpers.isEmptyValue(params.taxonomy_id)) {
        helpers.addValidationError(result, 'missing_taxonomy_id', 'Missing required field: taxonomy_id', 'taxonomy_id');
      }
      if (helpers.isEmptyValue(params.domain)) {
        helpers.addValidationError(result, 'missing_domain', 'Missing required field: domain', 'domain');
      }

      if (inputType === 'reads') {
        var hasPaired = helpers.toArrayValue(params.paired_end_libs).length > 0;
        var hasSingle = helpers.toArrayValue(params.single_end_libs).length > 0;
        var hasSrr = helpers.toArrayValue(params.srr_ids).length > 0;
        if (!hasPaired && !hasSingle && !hasSrr) {
          helpers.addValidationError(result, 'missing_reads_input', 'input_type=reads requires paired_end_libs, single_end_libs, or srr_ids', 'input_type');
        }
      } else if (inputType === 'contigs') {
        if (helpers.isEmptyValue(params.contigs)) {
          helpers.addValidationError(result, 'missing_contigs', 'input_type=contigs requires contigs', 'contigs');
        }
      } else if (!helpers.isEmptyValue(inputType)) {
        helpers.addValidationError(result, 'invalid_input_type', 'input_type must be reads or contigs', 'input_type');
      }

      helpers.validateLibraryObjects(result, 'paired_end_libs', params.paired_end_libs, false);
      helpers.validateLibraryObjects(result, 'single_end_libs', params.single_end_libs, false);

      if (String(params.recipe || '').toLowerCase() === 'canu' && helpers.isEmptyValue(params.genome_size)) {
        helpers.addValidationError(result, 'missing_genome_size', 'recipe=canu requires genome_size', 'genome_size');
      }
    },

    /**
     * Validates genome assembly service parameters.
     * Requirements:
     * - At least one input library (paired_end_libs, single_end_libs, or srr_ids)
     * - All library objects must have valid structure
     * - If recipe=canu: requires genome_size
     */
    runGenomeAssemblyStrictValidation: function(step, index, params, workflow, result, helpers) {
      // Genome assembly requires at least one input source
      var hasPaired = helpers.toArrayValue(params.paired_end_libs).length > 0;
      var hasSingle = helpers.toArrayValue(params.single_end_libs).length > 0;
      var hasSrr = helpers.toArrayValue(params.srr_ids).length > 0;

      if (!hasPaired && !hasSingle && !hasSrr) {
        helpers.addValidationError(result, 'missing_inputs', 'At least one input library is required (paired_end_libs, single_end_libs, or srr_ids)', 'input');
      }

      // Validate library objects structure
      helpers.validateLibraryObjects(result, 'paired_end_libs', params.paired_end_libs, false);
      helpers.validateLibraryObjects(result, 'single_end_libs', params.single_end_libs, false);

      // Validate recipe-specific requirements
      if (String(params.recipe || '').toLowerCase() === 'canu' && helpers.isEmptyValue(params.genome_size)) {
        helpers.addValidationError(result, 'missing_genome_size', 'recipe=canu requires genome_size', 'genome_size');
      }
    },

    /**
     * Validates genome annotation service parameters.
     * Requirements:
     * - contigs is required (input contig file)
     * - scientific_name is required
     * - taxonomy_id is optional but recommended
     */
    runGenomeAnnotationStrictValidation: function(step, index, params, workflow, result, helpers) {
      // Contigs are required for genome annotation
      if (helpers.isEmptyValue(params.contigs)) {
        helpers.addValidationError(result, 'missing_contigs', 'Missing required field: contigs', 'contigs');
      }

      // Scientific name is required
      if (helpers.isEmptyValue(params.scientific_name)) {
        helpers.addValidationError(result, 'missing_scientific_name', 'Missing required field: scientific_name', 'scientific_name');
      }
    },

    /**
     * Validates BLAST/Homology service parameters.
     * Requirements:
     * - input_type is required (dna or aa)
     * - input_source is required
     * - Must have appropriate input based on input_source:
     *   - fasta_data: requires input_fasta_data
     *   - fasta_file: requires input_fasta_file
     *   - feature_group: requires input_feature_group
     *   - genome_group: requires input_genome_group
     * - db_type is required (faa/ffn/frn/fna)
     * - db_source is required
     * - Must have appropriate database based on db_source:
     *   - fasta_data: requires db_fasta_data
     *   - fasta_file: requires db_fasta_file
     *   - feature_group: requires db_feature_group
     *   - genome_group: requires db_genome_group
     *   - genome_list: requires db_genome_list
     *   - taxon_list: requires db_taxon_list
     *   - precomputed_database: requires db_precomputed_database
     */
    runBlastStrictValidation: function(step, index, params, workflow, result, helpers) {
      // input_type is required
      if (helpers.isEmptyValue(params.input_type)) {
        helpers.addValidationError(result, 'missing_input_type', 'Missing required field: input_type', 'input_type');
      }

      // input_source is required
      if (helpers.isEmptyValue(params.input_source)) {
        helpers.addValidationError(result, 'missing_input_source', 'Missing required field: input_source', 'input_source');
      }

      // Validate input based on input_source
      var inputSource = String(params.input_source || '').toLowerCase();
      if (inputSource === 'fasta_data') {
        if (helpers.isEmptyValue(params.input_fasta_data)) {
          helpers.addValidationError(result, 'missing_input_fasta_data', 'input_source=fasta_data requires input_fasta_data', 'input_fasta_data');
        }
      } else if (inputSource === 'fasta_file') {
        if (helpers.isEmptyValue(params.input_fasta_file)) {
          helpers.addValidationError(result, 'missing_input_fasta_file', 'input_source=fasta_file requires input_fasta_file', 'input_fasta_file');
        }
      } else if (inputSource === 'feature_group') {
        if (helpers.isEmptyValue(params.input_feature_group)) {
          helpers.addValidationError(result, 'missing_input_feature_group', 'input_source=feature_group requires input_feature_group', 'input_feature_group');
        }
      } else if (inputSource === 'genome_group') {
        if (helpers.isEmptyValue(params.input_genome_group)) {
          helpers.addValidationError(result, 'missing_input_genome_group', 'input_source=genome_group requires input_genome_group', 'input_genome_group');
        }
      }

      // db_type is required
      if (helpers.isEmptyValue(params.db_type)) {
        helpers.addValidationError(result, 'missing_db_type', 'Missing required field: db_type', 'db_type');
      }

      // db_source is required
      if (helpers.isEmptyValue(params.db_source)) {
        helpers.addValidationError(result, 'missing_db_source', 'Missing required field: db_source', 'db_source');
      }

      // Validate database based on db_source
      var dbSource = String(params.db_source || '').toLowerCase();
      if (dbSource === 'fasta_data') {
        if (helpers.isEmptyValue(params.db_fasta_data)) {
          helpers.addValidationError(result, 'missing_db_fasta_data', 'db_source=fasta_data requires db_fasta_data', 'db_fasta_data');
        }
      } else if (dbSource === 'fasta_file') {
        if (helpers.isEmptyValue(params.db_fasta_file)) {
          helpers.addValidationError(result, 'missing_db_fasta_file', 'db_source=fasta_file requires db_fasta_file', 'db_fasta_file');
        }
      } else if (dbSource === 'feature_group') {
        if (helpers.isEmptyValue(params.db_feature_group)) {
          helpers.addValidationError(result, 'missing_db_feature_group', 'db_source=feature_group requires db_feature_group', 'db_feature_group');
        }
      } else if (dbSource === 'genome_group') {
        if (helpers.isEmptyValue(params.db_genome_group)) {
          helpers.addValidationError(result, 'missing_db_genome_group', 'db_source=genome_group requires db_genome_group', 'db_genome_group');
        }
      } else if (dbSource === 'genome_list') {
        if (helpers.isEmptyValue(params.db_genome_list)) {
          helpers.addValidationError(result, 'missing_db_genome_list', 'db_source=genome_list requires db_genome_list', 'db_genome_list');
        }
      } else if (dbSource === 'taxon_list') {
        if (helpers.isEmptyValue(params.db_taxon_list)) {
          helpers.addValidationError(result, 'missing_db_taxon_list', 'db_source=taxon_list requires db_taxon_list', 'db_taxon_list');
        }
      } else if (dbSource === 'precomputed_database') {
        if (helpers.isEmptyValue(params.db_precomputed_database)) {
          helpers.addValidationError(result, 'missing_db_precomputed_database', 'db_source=precomputed_database requires db_precomputed_database', 'db_precomputed_database');
        }
      }
    },

    /**
     * Validates Primer Design service parameters.
     * Requirements:
     * - input_type is required (sequence_text/workplace_fasta/database_id)
     * - sequence_input is required (DNA sequence data)
     */
    runPrimerDesignStrictValidation: function(step, index, params, workflow, result, helpers) {
      // input_type is required
      if (helpers.isEmptyValue(params.input_type)) {
        helpers.addValidationError(result, 'missing_input_type', 'Missing required field: input_type', 'input_type');
      }

      // sequence_input is required
      if (helpers.isEmptyValue(params.sequence_input)) {
        helpers.addValidationError(result, 'missing_sequence_input', 'Missing required field: sequence_input', 'sequence_input');
      }
    },

    /**
     * Validates Variation Analysis service parameters.
     * Requirements:
     * - reference_genome_id is required
     * - At least one input library (paired_end_libs, single_end_libs, or srr_ids)
     * - All library objects must have valid structure
     */
    runVariationStrictValidation: function(step, index, params, workflow, result, helpers) {
      // reference_genome_id is required
      if (helpers.isEmptyValue(params.reference_genome_id)) {
        helpers.addValidationError(result, 'missing_reference_genome_id', 'Missing required field: reference_genome_id', 'reference_genome_id');
      }

      // At least one input library is required
      var hasPaired = helpers.toArrayValue(params.paired_end_libs).length > 0;
      var hasSingle = helpers.toArrayValue(params.single_end_libs).length > 0;
      var hasSrr = helpers.toArrayValue(params.srr_ids).length > 0;

      if (!hasPaired && !hasSingle && !hasSrr) {
        helpers.addValidationError(result, 'missing_inputs', 'At least one input library is required (paired_end_libs, single_end_libs, or srr_ids)', 'input');
      }

      // Validate library objects structure
      helpers.validateLibraryObjects(result, 'paired_end_libs', params.paired_end_libs, false);
      helpers.validateLibraryObjects(result, 'single_end_libs', params.single_end_libs, false);
    },

    /**
     * Validates Tn-Seq service parameters.
     * Requirements:
     * - reference_genome_id is required
     * - read_files is required (read file groups)
     */
    runTnSeqStrictValidation: function(step, index, params, workflow, result, helpers) {
      // reference_genome_id is required
      if (helpers.isEmptyValue(params.reference_genome_id)) {
        helpers.addValidationError(result, 'missing_reference_genome_id', 'Missing required field: reference_genome_id', 'reference_genome_id');
      }

      // read_files is required
      if (helpers.isEmptyValue(params.read_files)) {
        helpers.addValidationError(result, 'missing_read_files', 'Missing required field: read_files', 'read_files');
      }
    },

    /**
     * Validates Bacterial Genome Tree service parameters.
     * Requirements:
     * - At least one genome source (genome_ids or genome_groups)
     */
    runBacterialGenomeTreeStrictValidation: function(step, index, params, workflow, result, helpers) {
      // At least one genome source is required
      var hasGenomeIds = helpers.toArrayValue(params.genome_ids).length > 0;
      var hasGenomeGroups = helpers.toArrayValue(params.genome_groups).length > 0;

      if (!hasGenomeIds && !hasGenomeGroups) {
        helpers.addValidationError(result, 'missing_genome_source', 'At least one genome source is required (genome_ids or genome_groups)', 'input');
      }
    },

    /**
     * Validates Core Genome MLST service parameters.
     * Requirements:
     * - input_genome_type is required (genome_group or genome_fasta)
     * - input_schema_selection is required
     * - Must have appropriate input based on input_genome_type:
     *   - genome_group: requires input_genome_group
     *   - genome_fasta: requires input_genome_fasta
     */
    runCoreGenomeMLSTStrictValidation: function(step, index, params, workflow, result, helpers) {
      // input_genome_type is required
      if (helpers.isEmptyValue(params.input_genome_type)) {
        helpers.addValidationError(result, 'missing_input_genome_type', 'Missing required field: input_genome_type', 'input_genome_type');
      }

      // input_schema_selection is required
      if (helpers.isEmptyValue(params.input_schema_selection)) {
        helpers.addValidationError(result, 'missing_input_schema_selection', 'Missing required field: input_schema_selection', 'input_schema_selection');
      }

      // Validate input based on input_genome_type
      var inputGenomeType = String(params.input_genome_type || '').toLowerCase();
      if (inputGenomeType === 'genome_group') {
        if (helpers.isEmptyValue(params.input_genome_group)) {
          helpers.addValidationError(result, 'missing_input_genome_group', 'input_genome_type=genome_group requires input_genome_group', 'input_genome_group');
        }
      } else if (inputGenomeType === 'genome_fasta') {
        if (helpers.isEmptyValue(params.input_genome_fasta)) {
          helpers.addValidationError(result, 'missing_input_genome_fasta', 'input_genome_type=genome_fasta requires input_genome_fasta', 'input_genome_fasta');
        }
      }
    },

    /**
     * Validates Whole Genome SNP Analysis service parameters.
     * Requirements:
     * - input_genome_type is required (genome_group or genome_fasta)
     * - Must have appropriate input based on input_genome_type:
     *   - genome_group: requires input_genome_group
     *   - genome_fasta: requires input_genome_fasta
     */
    runWholeGenomeSNPStrictValidation: function(step, index, params, workflow, result, helpers) {
      // input_genome_type is required
      if (helpers.isEmptyValue(params.input_genome_type)) {
        helpers.addValidationError(result, 'missing_input_genome_type', 'Missing required field: input_genome_type', 'input_genome_type');
      }

      // Validate input based on input_genome_type
      var inputGenomeType = String(params.input_genome_type || '').toLowerCase();
      if (inputGenomeType === 'genome_group') {
        if (helpers.isEmptyValue(params.input_genome_group)) {
          helpers.addValidationError(result, 'missing_input_genome_group', 'input_genome_type=genome_group requires input_genome_group', 'input_genome_group');
        }
      } else if (inputGenomeType === 'genome_fasta') {
        if (helpers.isEmptyValue(params.input_genome_fasta)) {
          helpers.addValidationError(result, 'missing_input_genome_fasta', 'input_genome_type=genome_fasta requires input_genome_fasta', 'input_genome_fasta');
        }
      }
    },

    /**
     * Validates MSA and SNP Analysis service parameters.
     * Requirements:
     * - input_type is required (input_group is default)
     * - At least one input source (fasta_files, select_genomegroup, feature_groups, feature_list, or genome_list)
     * - alphabet is required (dna or protein)
     */
    runMSAandSNPAnalysisStrictValidation: function(step, index, params, workflow, result, helpers) {
      // input_type is required (but has a default)
      if (helpers.isEmptyValue(params.input_type)) {
        helpers.addValidationError(result, 'missing_input_type', 'Missing required field: input_type', 'input_type');
      }

      // At least one input source is required
      var hasFastaFiles = helpers.toArrayValue(params.fasta_files).length > 0;
      var hasGenomeGroup = helpers.toArrayValue(params.select_genomegroup).length > 0;
      var hasFeatureGroups = helpers.toArrayValue(params.feature_groups).length > 0;
      var hasFeatureList = helpers.toArrayValue(params.feature_list).length > 0;
      var hasGenomeList = helpers.toArrayValue(params.genome_list).length > 0;

      if (!hasFastaFiles && !hasGenomeGroup && !hasFeatureGroups && !hasFeatureList && !hasGenomeList) {
        helpers.addValidationError(result, 'missing_inputs', 'At least one input source is required (fasta_files, select_genomegroup, feature_groups, feature_list, or genome_list)', 'input');
      }

      // alphabet is required
      if (helpers.isEmptyValue(params.alphabet)) {
        helpers.addValidationError(result, 'missing_alphabet', 'Missing required field: alphabet (dna or protein)', 'alphabet');
      }
    },

    /**
     * Validates Meta-CATS (Metagenomic Clustering and Typing Service) parameters.
     * Requirements:
     * - input_type is required
     * - alphabet is required (na for nucleotide, aa for amino acid)
     * - Must have appropriate input based on input_type:
     *   - alignment_file: requires alignment_file
     *   - auto_groups: requires auto_groups
     *   - groups: requires groups and group_file
     */
    runMetaCATSStrictValidation: function(step, index, params, workflow, result, helpers) {
      // input_type is required
      if (helpers.isEmptyValue(params.input_type)) {
        helpers.addValidationError(result, 'missing_input_type', 'Missing required field: input_type', 'input_type');
      }

      // alphabet is required
      if (helpers.isEmptyValue(params.alphabet)) {
        helpers.addValidationError(result, 'missing_alphabet', 'Missing required field: alphabet (na or aa)', 'alphabet');
      }

      // Validate input based on input_type
      var inputType = String(params.input_type || '').toLowerCase();
      if (inputType === 'alignment_file') {
        if (helpers.isEmptyValue(params.alignment_file)) {
          helpers.addValidationError(result, 'missing_alignment_file', 'input_type=alignment_file requires alignment_file', 'alignment_file');
        }
      } else if (inputType === 'auto_groups') {
        if (helpers.isEmptyValue(params.auto_groups)) {
          helpers.addValidationError(result, 'missing_auto_groups', 'input_type=auto_groups requires auto_groups', 'auto_groups');
        }
      } else if (inputType === 'groups') {
        if (helpers.isEmptyValue(params.groups)) {
          helpers.addValidationError(result, 'missing_groups', 'input_type=groups requires groups', 'groups');
        }
        if (helpers.isEmptyValue(params.group_file)) {
          helpers.addValidationError(result, 'missing_group_file', 'input_type=groups requires group_file', 'group_file');
        }
      }
    },

    /**
     * Validates Gene Tree service parameters.
     * Requirements:
     * - sequences is required (sequence data inputs)
     * - alphabet is required (DNA or Protein)
     */
    runGeneTreeStrictValidation: function(step, index, params, workflow, result, helpers) {
      // sequences is required
      if (helpers.isEmptyValue(params.sequences)) {
        helpers.addValidationError(result, 'missing_sequences', 'Missing required field: sequences', 'sequences');
      }

      // alphabet is required
      if (helpers.isEmptyValue(params.alphabet)) {
        helpers.addValidationError(result, 'missing_alphabet', 'Missing required field: alphabet (DNA or Protein)', 'alphabet');
      }
    },

    /**
     * Validates Proteome Comparison service parameters.
     * Requirements:
     * - At least one genome source (genome_ids, user_genomes, or user_feature_groups)
     * - At least 2 genomes/proteomes are needed for comparison
     */
    runProteomeComparisonStrictValidation: function(step, index, params, workflow, result, helpers) {
      // At least one genome source is required
      var hasGenomeIds = helpers.toArrayValue(params.genome_ids).length > 0;
      var hasUserGenomes = helpers.toArrayValue(params.user_genomes).length > 0;
      var hasUserFeatureGroups = helpers.toArrayValue(params.user_feature_groups).length > 0;

      if (!hasGenomeIds && !hasUserGenomes && !hasUserFeatureGroups) {
        helpers.addValidationError(result, 'missing_genome_source', 'At least one genome source is required (genome_ids, user_genomes, or user_feature_groups)', 'input');
      }

      // Check if at least 2 genomes are provided
      var totalGenomes = helpers.toArrayValue(params.genome_ids).length +
                         helpers.toArrayValue(params.user_genomes).length +
                         helpers.toArrayValue(params.user_feature_groups).length;
      if (totalGenomes < 2) {
        helpers.addValidationError(result, 'insufficient_genomes', 'Proteome comparison requires at least 2 genomes/proteomes', 'input');
      }
    },

    /**
     * Validates Comparative Systems service parameters.
     * Requirements:
     * - At least one genome source (genome_ids or genome_groups)
     * - At least 2 genomes are needed for comparison
     */
    runComparativeSystemsStrictValidation: function(step, index, params, workflow, result, helpers) {
      // At least one genome source is required
      var hasGenomeIds = helpers.toArrayValue(params.genome_ids).length > 0;
      var hasGenomeGroups = helpers.toArrayValue(params.genome_groups).length > 0;

      if (!hasGenomeIds && !hasGenomeGroups) {
        helpers.addValidationError(result, 'missing_genome_source', 'At least one genome source is required (genome_ids or genome_groups)', 'input');
      }

      // Check if at least 2 genomes are provided
      var totalGenomes = helpers.toArrayValue(params.genome_ids).length +
                         helpers.toArrayValue(params.genome_groups).length;
      if (totalGenomes < 2) {
        helpers.addValidationError(result, 'insufficient_genomes', 'Comparative systems analysis requires at least 2 genomes', 'input');
      }
    },

    /**
     * Validates Docking service parameters.
     * Requirements:
     * - protein_input_type is required
     * - Must have appropriate protein input based on protein_input_type:
     *   - pdb_id: requires input_pdb
     *   - user_pdb_file: requires user_pdb_file
     * - ligand_library_type is required
     * - Must have appropriate ligand input based on ligand_library_type:
     *   - named_library: requires ligand_named_library
     *   - smiles_list: requires ligand_smiles_list
     *   - workspace_file: requires ligand_ws_file
     */
    runDockingStrictValidation: function(step, index, params, workflow, result, helpers) {
      // protein_input_type is required
      if (helpers.isEmptyValue(params.protein_input_type)) {
        helpers.addValidationError(result, 'missing_protein_input_type', 'Missing required field: protein_input_type', 'protein_input_type');
      }

      // Validate protein input based on protein_input_type
      var proteinInputType = String(params.protein_input_type || '').toLowerCase();
      if (proteinInputType === 'pdb_id') {
        if (helpers.isEmptyValue(params.input_pdb)) {
          helpers.addValidationError(result, 'missing_input_pdb', 'protein_input_type=pdb_id requires input_pdb', 'input_pdb');
        }
      } else if (proteinInputType === 'user_pdb_file') {
        if (helpers.isEmptyValue(params.user_pdb_file)) {
          helpers.addValidationError(result, 'missing_user_pdb_file', 'protein_input_type=user_pdb_file requires user_pdb_file', 'user_pdb_file');
        }
      }

      // ligand_library_type is required
      if (helpers.isEmptyValue(params.ligand_library_type)) {
        helpers.addValidationError(result, 'missing_ligand_library_type', 'Missing required field: ligand_library_type', 'ligand_library_type');
      }

      // Validate ligand input based on ligand_library_type
      var ligandLibraryType = String(params.ligand_library_type || '').toLowerCase();
      if (ligandLibraryType === 'named_library') {
        if (helpers.isEmptyValue(params.ligand_named_library)) {
          helpers.addValidationError(result, 'missing_ligand_named_library', 'ligand_library_type=named_library requires ligand_named_library', 'ligand_named_library');
        }
      } else if (ligandLibraryType === 'smiles_list') {
        if (helpers.isEmptyValue(params.ligand_smiles_list)) {
          helpers.addValidationError(result, 'missing_ligand_smiles_list', 'ligand_library_type=smiles_list requires ligand_smiles_list', 'ligand_smiles_list');
        }
      } else if (ligandLibraryType === 'workspace_file') {
        if (helpers.isEmptyValue(params.ligand_ws_file)) {
          helpers.addValidationError(result, 'missing_ligand_ws_file', 'ligand_library_type=workspace_file requires ligand_ws_file', 'ligand_ws_file');
        }
      }
    },

    /**
     * Validates Metagenomic Binning service parameters.
     * Requirements:
     * - At least one input source (paired_end_libs, single_end_libs, srr_ids, or contigs)
     * - All library objects must have valid structure
     */
    runMetagenomicBinningStrictValidation: function(step, index, params, workflow, result, helpers) {
      // At least one input source is required
      var hasPaired = helpers.toArrayValue(params.paired_end_libs).length > 0;
      var hasSingle = helpers.toArrayValue(params.single_end_libs).length > 0;
      var hasSrr = helpers.toArrayValue(params.srr_ids).length > 0;
      var hasContigs = !helpers.isEmptyValue(params.contigs);

      if (!hasPaired && !hasSingle && !hasSrr && !hasContigs) {
        helpers.addValidationError(result, 'missing_inputs', 'At least one input source is required (paired_end_libs, single_end_libs, srr_ids, or contigs)', 'input');
      }

      // Validate library objects structure
      helpers.validateLibraryObjects(result, 'paired_end_libs', params.paired_end_libs, false);
      helpers.validateLibraryObjects(result, 'single_end_libs', params.single_end_libs, false);
    },

    /**
     * Validates Metagenomic Read Mapping service parameters.
     * Requirements:
     * - gene_set_type is required (predefined_list, fasta_file, or feature_group)
     * - Must have appropriate gene set input based on gene_set_type:
     *   - predefined_list: requires gene_set_name
     *   - fasta_file: requires gene_set_fasta
     *   - feature_group: requires gene_set_feature_group
     * - At least one read input (paired_end_libs, single_end_libs, or srr_ids)
     * - All library objects must have valid structure
     */
    runMetagenomicReadMappingStrictValidation: function(step, index, params, workflow, result, helpers) {
      // gene_set_type is required
      if (helpers.isEmptyValue(params.gene_set_type)) {
        helpers.addValidationError(result, 'missing_gene_set_type', 'Missing required field: gene_set_type', 'gene_set_type');
      }

      // Validate gene set input based on gene_set_type
      var geneSetType = String(params.gene_set_type || '').toLowerCase();
      if (geneSetType === 'predefined_list') {
        if (helpers.isEmptyValue(params.gene_set_name)) {
          helpers.addValidationError(result, 'missing_gene_set_name', 'gene_set_type=predefined_list requires gene_set_name', 'gene_set_name');
        }
      } else if (geneSetType === 'fasta_file') {
        if (helpers.isEmptyValue(params.gene_set_fasta)) {
          helpers.addValidationError(result, 'missing_gene_set_fasta', 'gene_set_type=fasta_file requires gene_set_fasta', 'gene_set_fasta');
        }
      } else if (geneSetType === 'feature_group') {
        if (helpers.isEmptyValue(params.gene_set_feature_group)) {
          helpers.addValidationError(result, 'missing_gene_set_feature_group', 'gene_set_type=feature_group requires gene_set_feature_group', 'gene_set_feature_group');
        }
      }

      // At least one read input source is required
      var hasPaired = helpers.toArrayValue(params.paired_end_libs).length > 0;
      var hasSingle = helpers.toArrayValue(params.single_end_libs).length > 0;
      var hasSrr = helpers.toArrayValue(params.srr_ids).length > 0;

      if (!hasPaired && !hasSingle && !hasSrr) {
        helpers.addValidationError(result, 'missing_read_inputs', 'At least one read input is required (paired_end_libs, single_end_libs, or srr_ids)', 'input');
      }

      // Validate library objects structure
      helpers.validateLibraryObjects(result, 'paired_end_libs', params.paired_end_libs, false);
      helpers.validateLibraryObjects(result, 'single_end_libs', params.single_end_libs, false);
    },

    /**
     * Validates RNA-Seq service parameters.
     * Requirements:
     * - reference_genome_id is required
     * - At least one read input (paired_end_libs, single_end_libs, or srr_libs)
     * - All library objects must have valid structure
     */
    runRNASeqStrictValidation: function(step, index, params, workflow, result, helpers) {
      // reference_genome_id is required
      if (helpers.isEmptyValue(params.reference_genome_id)) {
        helpers.addValidationError(result, 'missing_reference_genome_id', 'Missing required field: reference_genome_id', 'reference_genome_id');
      }

      // At least one read input source is required
      var hasPaired = helpers.toArrayValue(params.paired_end_libs).length > 0;
      var hasSingle = helpers.toArrayValue(params.single_end_libs).length > 0;
      var hasSrr = helpers.toArrayValue(params.srr_libs).length > 0;

      if (!hasPaired && !hasSingle && !hasSrr) {
        helpers.addValidationError(result, 'missing_read_inputs', 'At least one read input is required (paired_end_libs, single_end_libs, or srr_libs)', 'input');
      }

      // Validate library objects structure
      helpers.validateLibraryObjects(result, 'paired_end_libs', params.paired_end_libs, false);
      helpers.validateLibraryObjects(result, 'single_end_libs', params.single_end_libs, false);
    },

    /**
     * Validates SARS-CoV-2 Genome Analysis service parameters.
     * Requirements:
     * - At least one read input (paired_end_libs, single_end_libs, or srr_ids)
     * - All library objects must have valid structure
     */
    runSARSGenomeAnalysisStrictValidation: function(step, index, params, workflow, result, helpers) {
      // At least one read input source is required
      var hasPaired = helpers.toArrayValue(params.paired_end_libs).length > 0;
      var hasSingle = helpers.toArrayValue(params.single_end_libs).length > 0;
      var hasSrr = helpers.toArrayValue(params.srr_ids).length > 0;

      if (!hasPaired && !hasSingle && !hasSrr) {
        helpers.addValidationError(result, 'missing_read_inputs', 'At least one read input is required (paired_end_libs, single_end_libs, or srr_ids)', 'input');
      }

      // Validate library objects structure
      helpers.validateLibraryObjects(result, 'paired_end_libs', params.paired_end_libs, false);
      helpers.validateLibraryObjects(result, 'single_end_libs', params.single_end_libs, false);
    },

    /**
     * Validates SARS-CoV-2 Wastewater Analysis service parameters.
     * Requirements:
     * - At least one read input (paired_end_libs, single_end_libs, or srr_libs)
     * - All library objects must have valid structure
     */
    runSARSWastewaterAnalysisStrictValidation: function(step, index, params, workflow, result, helpers) {
      // At least one read input source is required
      var hasPaired = helpers.toArrayValue(params.paired_end_libs).length > 0;
      var hasSingle = helpers.toArrayValue(params.single_end_libs).length > 0;
      var hasSrr = helpers.toArrayValue(params.srr_libs).length > 0;

      if (!hasPaired && !hasSingle && !hasSrr) {
        helpers.addValidationError(result, 'missing_read_inputs', 'At least one read input is required (paired_end_libs, single_end_libs, or srr_libs)', 'input');
      }

      // Validate library objects structure
      helpers.validateLibraryObjects(result, 'paired_end_libs', params.paired_end_libs, false);
      helpers.validateLibraryObjects(result, 'single_end_libs', params.single_end_libs, false);
    },

    /**
     * Validates Viral Assembly service parameters.
     * Requirements:
     * - At least one read input (paired_end_lib, single_end_lib, or srr_id)
     * Note: This service uses singular form for library parameters
     */
    runViralAssemblyStrictValidation: function(step, index, params, workflow, result, helpers) {
      // At least one read input source is required
      var hasPaired = !helpers.isEmptyValue(params.paired_end_lib);
      var hasSingle = !helpers.isEmptyValue(params.single_end_lib);
      var hasSrr = !helpers.isEmptyValue(params.srr_id);

      if (!hasPaired && !hasSingle && !hasSrr) {
        helpers.addValidationError(result, 'missing_read_inputs', 'At least one read input is required (paired_end_lib, single_end_lib, or srr_id)', 'input');
      }
    }
  };
});

