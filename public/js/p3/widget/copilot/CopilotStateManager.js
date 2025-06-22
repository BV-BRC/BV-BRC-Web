/**
 * @module p3/widget/copilot/CopilotStateManager
 * @description Manages state-related functionality for the copilot system,
 * including path state analysis and prompt generation.
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang'
], function (
    declare,
    lang
) {

    /**
     * Creates a state prompt from the given path state
     * @param {Object} pathState - The path state object containing state information
     * @returns {string} A formatted prompt string based on the path state
     */
    function createStatePrompt(pathState) {
        if (!pathState || !pathState.view_type) {
            let fallbackPrompt = "Currently viewing data, but the specific view type is not available.";
            if (pathState && pathState.path) {
                fallbackPrompt += ` Currently viewing at URL path: ${pathState.path}.`;
            }
            return fallbackPrompt;
        }

        // Dispatch to appropriate helper function based on view_type
        switch (pathState.view_type.toLowerCase()) {
            case 'taxonomy':
                return createTaxonomyStatePrompt(pathState);
            case 'genome':
                return createGenomeStatePrompt(pathState);
            case 'feature':
                return createFeatureStatePrompt(pathState);
            case 'antibiotic':
                return createAntibioticStatePrompt(pathState);
            case 'protein_structure':
                return createProteinStructureStatePrompt(pathState);
            case 'epitope':
                return createEpitopeStatePrompt(pathState);
            case 'pathway_summary':
                return createBasicStatePrompt(pathState);
            case 'experiment_comparison':
                return createExperimentStatePrompt(pathState);
            case 'bioset_result':
                return createBiosetStatePrompt(pathState);

            default:
                // Generic fallback for unknown view types
                let genericPrompt = `Currently viewing ${pathState.view_type} data`;
                if (pathState.state && Array.isArray(pathState.state)) {
                    genericPrompt += ` with ${pathState.state.length} data item(s)`;
                }
                if (pathState.path) {
                    genericPrompt += `. Currently viewing at URL path: ${pathState.path}`;
                }
                return genericPrompt + ".";
        }
    }

    /**
     * Creates a basic state prompt from the given path state data
     * @param {Object} pathState - The path state object containing state information
     * @returns {string} A formatted prompt string based on the state data
     */
    function createBasicStatePrompt(pathState) {
        if (!pathState.state) {
            let fallbackPrompt = "Currently viewing data, but no specific state information is available.";
            if (pathState.path) {
                fallbackPrompt += ` Currently viewing at URL path: ${pathState.path}.`;
            }
            return fallbackPrompt;
        }

        let prompt = "Currently viewing data";

        // Handle string state data
        if (typeof pathState.state === 'string') {
            const stateContent = pathState.state.trim();
            if (stateContent) {
                prompt += `: ${stateContent}`;
            }
        }

        prompt += ".";

        // Add URL path context
        if (pathState.path) {
            prompt += ` Currently viewing at URL path: ${pathState.path}.`;
        }

        prompt += " If the content is relevant to the query, include this content in your response. Otherwise, ignore it.";

        return prompt;
    }

    /**
     * Creates a taxonomy-specific state prompt
     * @param {Object} pathState - The path state object for taxonomy view
     * @returns {string} A formatted prompt string for taxonomy data
     */
    function createTaxonomyStatePrompt(pathState) {
        if (!pathState.state || !Array.isArray(pathState.state) || pathState.state.length === 0) {
            return "Currently viewing taxonomy data, but no specific taxonomy information is available.";
        }

        const taxonomyData = pathState.state[0];
        let prompt = `Currently viewing taxonomy information for ${taxonomyData.taxon_name}`;

        if (taxonomyData.taxon_rank) {
            prompt += ` (${taxonomyData.taxon_rank})`;
        }

        if (taxonomyData.taxon_id) {
            prompt += ` with ID ${taxonomyData.taxon_id}`;
        }

        prompt += ".";

        // Add lineage information if available
        if (taxonomyData.lineage) {
            prompt += ` This organism belongs to the taxonomic lineage: ${taxonomyData.lineage}.`;
        }

        // Add genome count if available
        if (taxonomyData.genomes) {
            prompt += ` There are ${taxonomyData.genomes} genomes associated with this taxonomy.`;
        }

        // Add division information if available
        if (taxonomyData.division) {
            prompt += ` It belongs to the ${taxonomyData.division} division.`;
        }

        // Add genetic code information if available
        if (taxonomyData.genetic_code) {
            prompt += ` It uses genetic code ${taxonomyData.genetic_code}.`;
        }

        // Add URL path context
        if (pathState.path) {
            prompt += ` Currently viewing at URL path: ${pathState.path}.`;
        }

        prompt += "If the content is relevant to the query, include this content in your response. Otherwise, ignore it.";

        return prompt;
    }

    /**
     * Creates a genome-specific state prompt
     * @param {Object} pathState - The path state object for genome view
     * @returns {string} A formatted prompt string for genome data
     */
    function createGenomeStatePrompt(pathState) {
        if (!pathState.state || !Array.isArray(pathState.state) || pathState.state.length === 0) {
            return "Currently viewing genome data, but no specific genome information is available.";
        }

        const genomeData = pathState.state[0];
        let prompt = `Currently viewing genome information for ${genomeData.genome_name || 'Unknown genome'}`;

        if (genomeData.genome_id) {
            prompt += ` (ID: ${genomeData.genome_id})`;
        }

        prompt += ".";

        // Add species and strain information
        if (genomeData.species) {
            prompt += ` This is a ${genomeData.species} genome`;
            if (genomeData.strain) {
                prompt += ` of strain ${genomeData.strain}`;
            }
            prompt += ".";
        }

        // Add genome status and quality
        if (genomeData.genome_status) {
            prompt += ` The genome status is ${genomeData.genome_status}`;
            if (genomeData.genome_quality) {
                prompt += ` with ${genomeData.genome_quality} quality`;
            }
            prompt += ".";
        }

        // Add genome size and composition
        if (genomeData.genome_length) {
            prompt += ` The genome is ${genomeData.genome_length.toLocaleString()} base pairs long`;
            if (genomeData.gc_content) {
                prompt += ` with ${genomeData.gc_content.toFixed(1)}% GC content`;
            }
            prompt += ".";
        }

        // Add structural information
        const structuralInfo = [];
        if (genomeData.chromosomes) {
            structuralInfo.push(`${genomeData.chromosomes} chromosome(s)`);
        }
        if (genomeData.plasmids) {
            structuralInfo.push(`${genomeData.plasmids} plasmid(s)`);
        }
        if (genomeData.contigs) {
            structuralInfo.push(`${genomeData.contigs} contig(s)`);
        }
        if (structuralInfo.length > 0) {
            prompt += ` It contains ${structuralInfo.join(', ')}.`;
        }

        // Add gene information
        if (genomeData.cds) {
            prompt += ` The genome has ${genomeData.cds} protein-coding sequences`;
            if (genomeData.hypothetical_cds) {
                const hypotheticalPercent = ((genomeData.hypothetical_cds / genomeData.cds) * 100).toFixed(1);
                prompt += `, of which ${genomeData.hypothetical_cds} (${hypotheticalPercent}%) are hypothetical`;
            }
            prompt += ".";
        }

        // Add RNA information
        const rnaInfo = [];
        if (genomeData.rrna) {
            rnaInfo.push(`${genomeData.rrna} rRNA genes`);
        }
        if (genomeData.trna) {
            rnaInfo.push(`${genomeData.trna} tRNA genes`);
        }
        if (rnaInfo.length > 0) {
            prompt += ` It also contains ${rnaInfo.join(' and ')}.`;
        }

        // Add taxonomic information
        if (genomeData.taxon_lineage_names && Array.isArray(genomeData.taxon_lineage_names)) {
            prompt += ` Taxonomically, it belongs to: ${genomeData.taxon_lineage_names.join(' > ')}.`;
        }

        // Add isolation and collection information
        if (genomeData.isolation_source) {
            prompt += ` This genome was isolated from ${genomeData.isolation_source}`;
            if (genomeData.isolation_country) {
                prompt += ` in ${genomeData.isolation_country}`;
            }
            prompt += ".";
        }

        // Add sequencing information
        if (genomeData.sequencing_platform) {
            prompt += ` It was sequenced using ${genomeData.sequencing_platform}`;
            if (genomeData.sequencing_depth) {
                prompt += ` with ${genomeData.sequencing_depth} coverage`;
            }
            prompt += ".";
        }

        // Add quality metrics
        if (genomeData.checkm_completeness || genomeData.checkm_contamination) {
            prompt += ` Quality metrics:`;
            if (genomeData.checkm_completeness) {
                prompt += ` ${genomeData.checkm_completeness}% completeness`;
            }
            if (genomeData.checkm_contamination) {
                prompt += `, ${genomeData.checkm_contamination}% contamination`;
            }
            prompt += ".";
        }

        // Add URL path context
        if (pathState.path) {
            prompt += ` Currently viewing at URL path: ${pathState.path}.`;
        }

        prompt += " If the content is relevant to the query, include this content in your response. Otherwise, ignore it.";

        return prompt;
    }

    /**
     * Creates a feature-specific state prompt
     * @param {Object} pathState - The path state object for feature view
     * @returns {string} A formatted prompt string for feature data
     */
    function createFeatureStatePrompt(pathState) {
        if (!pathState.state || !Array.isArray(pathState.state) || pathState.state.length === 0) {
            return "Currently viewing feature data, but no specific feature information is available.";
        }

        const featureData = pathState.state[0];
        let prompt = `Currently viewing genomic feature information`;

        // Add feature identification
        if (featureData.feature_id) {
            prompt += ` for feature ${featureData.feature_id}`;
        } else if (featureData.patric_id) {
            prompt += ` for feature ${featureData.patric_id}`;
        }

        prompt += ".";

        // Add feature type and product information
        if (featureData.feature_type) {
            prompt += ` This is a ${featureData.feature_type} feature`;
            if (featureData.product) {
                prompt += ` encoding ${featureData.product}`;
            }
            prompt += ".";
        }

        // Add genomic location information
        if (featureData.start && featureData.end) {
            prompt += ` It is located at positions ${featureData.start.toLocaleString()} to ${featureData.end.toLocaleString()}`;
            if (featureData.strand) {
                prompt += ` on the ${featureData.strand === '+' ? 'forward' : 'reverse'} strand`;
            }
            if (featureData.location) {
                prompt += ` (${featureData.location})`;
            }
            prompt += ".";
        }

        // Add sequence information
        if (featureData.sequence_id || featureData.accession) {
            const seqId = featureData.sequence_id || featureData.accession;
            prompt += ` The feature is found on sequence ${seqId}.`;
        }

        // Add length information
        if (featureData.na_length || featureData.aa_length) {
            prompt += ` Sequence lengths:`;
            if (featureData.na_length) {
                prompt += ` ${featureData.na_length.toLocaleString()} nucleotides`;
            }
            if (featureData.aa_length) {
                if (featureData.na_length) {
                    prompt += `,`;
                }
                prompt += ` ${featureData.aa_length} amino acids`;
            }
            prompt += ".";
        }

        // Add genome context
        if (featureData.genome_name) {
            prompt += ` This feature belongs to the genome ${featureData.genome_name}`;
            if (featureData.genome_id) {
                prompt += ` (ID: ${featureData.genome_id})`;
            }
            prompt += ".";
        }

        // Add protein identification
        if (featureData.protein_id) {
            prompt += ` The protein product has ID ${featureData.protein_id}`;
            if (featureData.refseq_locus_tag) {
                prompt += ` and RefSeq locus tag ${featureData.refseq_locus_tag}`;
            }
            prompt += ".";
        }

        // Add family classification information
        const familyInfo = [];
        if (featureData.figfam_id) {
            familyInfo.push(`FIGfam ${featureData.figfam_id}`);
        }
        if (featureData.pgfam_id) {
            familyInfo.push(`PGfam ${featureData.pgfam_id}`);
        }
        if (featureData.plfam_id && featureData.plfam_id.trim()) {
            familyInfo.push(`PLfam ${featureData.plfam_id}`);
        }
        if (familyInfo.length > 0) {
            prompt += ` Family classifications: ${familyInfo.join(', ')}.`;
        }

        // Add annotation source
        if (featureData.annotation) {
            prompt += ` This feature was annotated by ${featureData.annotation}.`;
        }

        // Add taxonomic information
        if (featureData.taxon_id) {
            prompt += ` The organism has taxonomic ID ${featureData.taxon_id}.`;
        }

        // Add timestamps if available
        if (featureData.date_inserted) {
            const insertDate = new Date(featureData.date_inserted).toLocaleDateString();
            prompt += ` This feature record was created on ${insertDate}.`;
        }

        // Add URL path context
        if (pathState.path) {
            prompt += ` Currently viewing at URL path: ${pathState.path}.`;
        }

        prompt += " If the content is relevant to the query, include this content in your response. Otherwise, ignore it.";

        return prompt;
    }

    /**
     * Creates an antibiotic-specific state prompt
     * @param {Object} pathState - The path state object for antibiotic view
     * @returns {string} A formatted prompt string for antibiotic data
     */
    function createAntibioticStatePrompt(pathState) {
        if (!pathState.state || !Array.isArray(pathState.state) || pathState.state.length === 0) {
            return "Currently viewing antibiotic data, but no specific antibiotic information is available.";
        }

        const antibioticData = pathState.state[0];
        let prompt = `Currently viewing antibiotic information`;

        // Add antibiotic name
        if (antibioticData.antibiotic_name) {
            prompt += ` for ${antibioticData.antibiotic_name}`;
        }

        prompt += ".";

        // Add chemical properties
        if (antibioticData.molecular_formula || antibioticData.molecular_weight) {
            prompt += ` Chemical properties:`;
            if (antibioticData.molecular_formula) {
                prompt += ` molecular formula ${antibioticData.molecular_formula}`;
            }
            if (antibioticData.molecular_weight) {
                if (antibioticData.molecular_formula) {
                    prompt += `,`;
                }
                prompt += ` molecular weight ${antibioticData.molecular_weight}`;
            }
            prompt += ".";
        }

        // Add chemical identifiers
        const chemicalIds = [];
        if (antibioticData.cas_id) {
            chemicalIds.push(`CAS ID ${antibioticData.cas_id}`);
        }
        if (antibioticData.pubchem_cid) {
            chemicalIds.push(`PubChem CID ${antibioticData.pubchem_cid}`);
        }
        if (antibioticData.inchi_key) {
            chemicalIds.push(`InChI Key ${antibioticData.inchi_key}`);
        }
        if (chemicalIds.length > 0) {
            prompt += ` Chemical identifiers: ${chemicalIds.join(', ')}.`;
        }

        // Add pharmacological classification
        if (antibioticData.pharmacological_classes && Array.isArray(antibioticData.pharmacological_classes) && antibioticData.pharmacological_classes.length > 0) {
            prompt += ` Pharmacological classification: ${antibioticData.pharmacological_classes.join(', ')}.`;
        }

        // Add ATC classification
        if (antibioticData.atc_classification && Array.isArray(antibioticData.atc_classification) && antibioticData.atc_classification.length > 0) {
            prompt += ` ATC classification hierarchy: ${antibioticData.atc_classification.join(' > ')}.`;
        }

        // Add synonyms/alternative names
        if (antibioticData.synonyms && Array.isArray(antibioticData.synonyms) && antibioticData.synonyms.length > 0) {
            const synonymList = antibioticData.synonyms.slice(0, 5); // Limit to first 5 to avoid overwhelming
            prompt += ` Alternative names include: ${synonymList.join(', ')}`;
            if (antibioticData.synonyms.length > 5) {
                prompt += ` and ${antibioticData.synonyms.length - 5} others`;
            }
            prompt += ".";
        }

        // Add mechanism of action (clean up HTML and truncate if very long)
        if (antibioticData.mechanism_of_action && Array.isArray(antibioticData.mechanism_of_action) && antibioticData.mechanism_of_action.length > 0) {
            const mechanism = antibioticData.mechanism_of_action[0]
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();

            if (mechanism.length > 300) {
                prompt += ` Mechanism of action: ${mechanism.substring(0, 300)}...`;
            } else {
                prompt += ` Mechanism of action: ${mechanism}`;
            }
            prompt += ".";
        }

        // Add pharmacology summary (clean up HTML and truncate if very long)
        if (antibioticData.pharmacology && Array.isArray(antibioticData.pharmacology) && antibioticData.pharmacology.length > 0) {
            const pharmacology = antibioticData.pharmacology[0]
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();

            if (pharmacology.length > 300) {
                prompt += ` Pharmacology: ${pharmacology.substring(0, 300)}...`;
            } else {
                prompt += ` Pharmacology: ${pharmacology}`;
            }
            prompt += ".";
        }

        // Add description summary (clean up HTML and truncate if very long)
        if (antibioticData.description && Array.isArray(antibioticData.description) && antibioticData.description.length > 0) {
            const description = antibioticData.description[0]
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();

            if (description.length > 400) {
                prompt += ` Description: ${description.substring(0, 400)}...`;
            } else {
                prompt += ` Description: ${description}`;
            }
            prompt += ".";
        }

        // Add chemical structure information
        if (antibioticData.canonical_smiles) {
            prompt += ` Chemical structure (SMILES): ${antibioticData.canonical_smiles}.`;
        }

        // Add timestamps if available
        if (antibioticData.date_inserted) {
            const insertDate = new Date(antibioticData.date_inserted).toLocaleDateString();
            prompt += ` This antibiotic record was created on ${insertDate}.`;
        }

        // Add URL path context
        if (pathState.path) {
            prompt += ` Currently viewing at URL path: ${pathState.path}.`;
        }

        prompt += " If the content is relevant to the query, include this content in your response. Otherwise, ignore it.";

        return prompt;
    }

    /**
     * Creates a protein structure-specific state prompt
     * @param {Object} pathState - The path state object for protein structure view
     * @returns {string} A formatted prompt string for protein structure data
     */
    function createProteinStructureStatePrompt(pathState) {
        if (!pathState.state || !Array.isArray(pathState.state) || pathState.state.length === 0) {
            return "Currently viewing protein structure data, but no specific structure information is available.";
        }

        const structureData = pathState.state[0];
        let prompt = `Currently viewing protein structure information`;

        // Add structure identification
        if (structureData.pdb_id) {
            prompt += ` for structure ${structureData.pdb_id}`;
        }

        prompt += ".";

        // Add title and product information
        if (structureData.title) {
            prompt += ` ${structureData.title}.`;
        } else if (structureData.product && Array.isArray(structureData.product) && structureData.product.length > 0) {
            prompt += ` This structure represents ${structureData.product[0]}.`;
        }

        // Add organism information
        if (structureData.organism_name && Array.isArray(structureData.organism_name) && structureData.organism_name.length > 0) {
            prompt += ` The protein is from ${structureData.organism_name[0]}`;
            if (structureData.genome_id) {
                prompt += ` (genome ID: ${structureData.genome_id})`;
            }
            prompt += ".";
        }

        // Add structural determination method
        if (structureData.method && Array.isArray(structureData.method) && structureData.method.length > 0) {
            prompt += ` Structure determination method: ${structureData.method[0]}.`;
        }

        // Add institutional and authorship information
        if (structureData.institution) {
            prompt += ` The structure was determined by ${structureData.institution}`;
            if (structureData.authors && Array.isArray(structureData.authors) && structureData.authors.length > 0) {
                prompt += ` (authors: ${structureData.authors.join(', ')})`;
            }
            prompt += ".";
        }

        // Add protein identification
        if (structureData.patric_id) {
            prompt += ` PATRIC protein ID: ${structureData.patric_id}.`;
        }

        // Add UniProt accession
        if (structureData.uniprotkb_accession && Array.isArray(structureData.uniprotkb_accession) && structureData.uniprotkb_accession.length > 0) {
            prompt += ` UniProt accession: ${structureData.uniprotkb_accession[0]}.`;
        }

        // Add taxonomic information
        if (structureData.taxon_lineage_names && Array.isArray(structureData.taxon_lineage_names) && structureData.taxon_lineage_names.length > 0) {
            prompt += ` Taxonomic lineage: ${structureData.taxon_lineage_names.join(' > ')}.`;
        } else if (structureData.taxon_id && Array.isArray(structureData.taxon_id) && structureData.taxon_id.length > 0) {
            prompt += ` Taxonomic ID: ${structureData.taxon_id[0]}.`;
        }

        // Add sequence information
        if (structureData.sequence_md5 && Array.isArray(structureData.sequence_md5) && structureData.sequence_md5.length > 0) {
            prompt += ` Protein sequence MD5 hash: ${structureData.sequence_md5[0]}.`;
        }

        // Add file information
        if (structureData.file_path) {
            prompt += ` Structure file path: ${structureData.file_path}.`;
        }

        // Add timestamps
        if (structureData.date_inserted) {
            const insertDate = new Date(structureData.date_inserted).toLocaleDateString();
            prompt += ` This structure record was created on ${insertDate}`;
            if (structureData.date_modified && structureData.date_modified !== structureData.date_inserted) {
                const modDate = new Date(structureData.date_modified).toLocaleDateString();
                prompt += ` and last modified on ${modDate}`;
            }
            prompt += ".";
        }

        // Add URL path context
        if (pathState.path) {
            prompt += ` Currently viewing at URL path: ${pathState.path}.`;
        }

        prompt += " If the content is relevant to the query, include this content in your response. Otherwise, ignore it.";

        return prompt;
    }

    /**
     * Creates an epitope-specific state prompt
     * @param {Object} pathState - The path state object for epitope view
     * @returns {string} A formatted prompt string for epitope data
     */
    function createEpitopeStatePrompt(pathState) {
        if (!pathState.state || !Array.isArray(pathState.state) || pathState.state.length === 0) {
            return "Currently viewing epitope data, but no specific epitope information is available.";
        }

        const epitopeData = pathState.state[0];
        let prompt = `Currently viewing epitope information`;

        // Add epitope identification
        if (epitopeData.epitope_id) {
            prompt += ` for epitope ${epitopeData.epitope_id}`;
        }

        prompt += ".";

        // Add epitope sequence and type
        if (epitopeData.epitope_sequence) {
            prompt += ` The epitope sequence is ${epitopeData.epitope_sequence}`;
            if (epitopeData.epitope_type) {
                prompt += ` (${epitopeData.epitope_type})`;
            }
            prompt += ".";
        }

        // Add protein location information
        if (epitopeData.start && epitopeData.end) {
            prompt += ` This epitope is located at positions ${epitopeData.start}-${epitopeData.end}`;
            if (epitopeData.protein_name) {
                prompt += ` on the ${epitopeData.protein_name}`;
                if (epitopeData.protein_id) {
                    prompt += ` (protein ID: ${epitopeData.protein_id})`;
                }
            }
            prompt += ".";
        }

        // Add organism information
        if (epitopeData.organism) {
            prompt += ` The epitope originates from ${epitopeData.organism}`;
            if (epitopeData.taxon_id) {
                prompt += ` (taxonomic ID: ${epitopeData.taxon_id})`;
            }
            prompt += ".";
        }

        // Add taxonomic lineage
        if (epitopeData.taxon_lineage_names && Array.isArray(epitopeData.taxon_lineage_names) && epitopeData.taxon_lineage_names.length > 0) {
            prompt += ` Taxonomic lineage: ${epitopeData.taxon_lineage_names.join(' > ')}.`;
        }

        // Add assay information
        if (epitopeData.assay_results && Array.isArray(epitopeData.assay_results) && epitopeData.assay_results.length > 0) {
            prompt += ` Assay results: ${epitopeData.assay_results.join(', ')}.`;
        }

        // Add B-cell assay specifics
        if (epitopeData.bcell_assays) {
            prompt += ` B-cell assay results: ${epitopeData.bcell_assays}.`;
        }

        // Add total assay count
        if (epitopeData.total_assays) {
            prompt += ` Total number of assays performed: ${epitopeData.total_assays}.`;
        }

        // Add host information
        if (epitopeData.host_name && Array.isArray(epitopeData.host_name) && epitopeData.host_name.length > 0) {
            const hosts = epitopeData.host_name.filter(host => host && host.trim());
            if (hosts.length > 0) {
                prompt += ` Host organism(s) used in assays: ${hosts.join(', ')}.`;
            }
        }

        // Add protein accession if available
        if (epitopeData.protein_accession && epitopeData.protein_accession.trim()) {
            prompt += ` Protein accession: ${epitopeData.protein_accession}.`;
        }

        // Add comments if available and meaningful
        if (epitopeData.comments && Array.isArray(epitopeData.comments)) {
            const meaningfulComments = epitopeData.comments.filter(comment => comment && comment.trim());
            if (meaningfulComments.length > 0) {
                prompt += ` Comments: ${meaningfulComments.join('; ')}.`;
            }
        }

        // Add timestamps
        if (epitopeData.date_inserted) {
            const insertDate = new Date(epitopeData.date_inserted).toLocaleDateString();
            prompt += ` This epitope record was created on ${insertDate}`;
            if (epitopeData.date_modified && epitopeData.date_modified !== epitopeData.date_inserted) {
                const modDate = new Date(epitopeData.date_modified).toLocaleDateString();
                prompt += ` and last modified on ${modDate}`;
            }
            prompt += ".";
        }

        // Add URL path context
        if (pathState.path) {
            prompt += ` Currently viewing at URL path: ${pathState.path}.`;
        }

        prompt += " If the content is relevant to the query, include this content in your response. Otherwise, ignore it.";

        return prompt;
    }

    /**
     * Creates an experiment comparison-specific state prompt
     * @param {Object} pathState - The path state object for experiment comparison view
     * @returns {string} A formatted prompt string for experiment comparison data
     */
    function createExperimentStatePrompt(pathState) {
        if (!pathState.state || !Array.isArray(pathState.state) || pathState.state.length === 0) {
            return "Currently viewing experiment comparison data, but no specific experiment information is available.";
        }

        const experimentData = pathState.state[0];
        let prompt = `Currently viewing experiment comparison information`;

        // Add experiment identification
        if (experimentData.exp_name || experimentData.exp_id) {
            const expIdentifier = experimentData.exp_name || experimentData.exp_id;
            prompt += ` for experiment ${expIdentifier}`;
            if (experimentData.exp_name && experimentData.exp_id && experimentData.exp_name !== experimentData.exp_id) {
                prompt += ` (ID: ${experimentData.exp_id})`;
            }
        }

        prompt += ".";

        // Add experiment title
        if (experimentData.exp_title) {
            prompt += ` Title: "${experimentData.exp_title}".`;
        }

        // Add experiment type and measurement technique
        if (experimentData.exp_type) {
            prompt += ` This is a ${experimentData.exp_type} experiment`;
            if (experimentData.measurement_technique) {
                prompt += ` using ${experimentData.measurement_technique}`;
            }
            prompt += ".";
        }

        // Add organism and strain information
        if (experimentData.organism && Array.isArray(experimentData.organism) && experimentData.organism.length > 0) {
            prompt += ` The experiment was conducted on ${experimentData.organism[0]}`;
            if (experimentData.strain && Array.isArray(experimentData.strain) && experimentData.strain.length > 0) {
                prompt += ` strain ${experimentData.strain[0]}`;
            }
            if (experimentData.genome_id && Array.isArray(experimentData.genome_id) && experimentData.genome_id.length > 0) {
                prompt += ` (genome ID: ${experimentData.genome_id[0]})`;
            }
            prompt += ".";
        }

        // Add biosets information
        if (experimentData.biosets) {
            prompt += ` The experiment contains ${experimentData.biosets} biosets.`;
        }

        // Add treatment information
        if (experimentData.treatment_name && Array.isArray(experimentData.treatment_name) && experimentData.treatment_name.length > 0) {
            prompt += ` Treatment conditions: ${experimentData.treatment_name.join(', ')}`;
            if (experimentData.treatment_duration && Array.isArray(experimentData.treatment_duration) && experimentData.treatment_duration.length > 0) {
                prompt += ` with durations: ${experimentData.treatment_duration.join(', ')}`;
            }
            prompt += ".";
        }

        // Add study information
        if (experimentData.study_pi || experimentData.study_institution) {
            prompt += ` Study details:`;
            if (experimentData.study_pi) {
                prompt += ` Principal Investigator: ${experimentData.study_pi}`;
            }
            if (experimentData.study_institution) {
                if (experimentData.study_pi) {
                    prompt += `,`;
                }
                prompt += ` Institution: ${experimentData.study_institution}`;
            }
            prompt += ".";
        }

        // Add repository information
        if (experimentData.public_repository && experimentData.public_identifier) {
            prompt += ` This experiment is available in the ${experimentData.public_repository} repository with identifier ${experimentData.public_identifier}`;
            if (experimentData.pmid) {
                prompt += ` and is associated with PubMed ID ${experimentData.pmid}`;
            }
            prompt += ".";
        }

        // Add experiment description (truncate if very long)
        if (experimentData.exp_description) {
            const description = experimentData.exp_description.trim();
            if (description.length > 500) {
                prompt += ` Experiment description: ${description.substring(0, 500)}...`;
            } else {
                prompt += ` Experiment description: ${description}`;
            }
            prompt += ".";
        }

        // Add taxonomic information
        if (experimentData.taxon_id && Array.isArray(experimentData.taxon_id) && experimentData.taxon_id.length > 0) {
            prompt += ` Taxonomic ID: ${experimentData.taxon_id[0]}.`;
        }

        // Add timestamps
        if (experimentData.date_inserted) {
            const insertDate = new Date(experimentData.date_inserted).toLocaleDateString();
            prompt += ` This experiment record was created on ${insertDate}`;
            if (experimentData.date_modified && experimentData.date_modified !== experimentData.date_inserted) {
                const modDate = new Date(experimentData.date_modified).toLocaleDateString();
                prompt += ` and last modified on ${modDate}`;
            }
            prompt += ".";
        }

        // Add URL path context
        if (pathState.path) {
            prompt += ` Currently viewing at URL path: ${pathState.path}.`;
        }

        prompt += " If the content is relevant to the query, include this content in your response. Otherwise, ignore it.";

        return prompt;
    }

    /**
     * Creates a bioset result-specific state prompt
     * @param {Object} pathState - The path state object for bioset result view
     * @returns {string} A formatted prompt string for bioset result data
     */
    function createBiosetStatePrompt(pathState) {
        if (!pathState.state || !Array.isArray(pathState.state) || pathState.state.length === 0) {
            return "Currently viewing bioset result data, but no specific bioset information is available.";
        }

        const biosetData = pathState.state[0];
        let prompt = `Currently viewing bioset results`;

        // Add experiment identification
        if (biosetData.exp_name || biosetData.exp_id) {
            const expIdentifier = biosetData.exp_name || biosetData.exp_id;
            prompt += ` from experiment ${expIdentifier}`;
            if (biosetData.exp_name && biosetData.exp_id && biosetData.exp_name !== biosetData.exp_id) {
                prompt += ` (ID: ${biosetData.exp_id})`;
            }
        }

        prompt += ".";

        // Add experiment title
        if (biosetData.exp_title) {
            prompt += ` Experiment title: "${biosetData.exp_title}".`;
        }

        // Add biosets count
        if (biosetData.biosets) {
            prompt += ` This view contains ${biosetData.biosets} biosets.`;
        }

        // Add experiment type and measurement technique
        if (biosetData.exp_type) {
            prompt += ` The experiment type is ${biosetData.exp_type}`;
            if (biosetData.measurement_technique) {
                prompt += ` using ${biosetData.measurement_technique}`;
            }
            prompt += ".";
        }

        // Add organism and strain information
        if (biosetData.organism && Array.isArray(biosetData.organism) && biosetData.organism.length > 0) {
            prompt += ` The biosets are from ${biosetData.organism[0]}`;
            if (biosetData.strain && Array.isArray(biosetData.strain) && biosetData.strain.length > 0) {
                prompt += ` strain ${biosetData.strain[0]}`;
            }
            if (biosetData.genome_id && Array.isArray(biosetData.genome_id) && biosetData.genome_id.length > 0) {
                prompt += ` (genome ID: ${biosetData.genome_id[0]})`;
            }
            prompt += ".";
        }

        // Add treatment information
        if (biosetData.treatment_name && Array.isArray(biosetData.treatment_name) && biosetData.treatment_name.length > 0) {
            prompt += ` Treatment conditions analyzed: ${biosetData.treatment_name.join(', ')}`;
            if (biosetData.treatment_duration && Array.isArray(biosetData.treatment_duration) && biosetData.treatment_duration.length > 0) {
                const validDurations = biosetData.treatment_duration.filter(duration => duration && duration.trim());
                if (validDurations.length > 0) {
                    prompt += ` with durations: ${validDurations.join(', ')}`;
                }
            }
            prompt += ".";
        }

        // Add study information
        if (biosetData.study_pi || biosetData.study_institution) {
            prompt += ` Study conducted by`;
            if (biosetData.study_pi) {
                prompt += ` ${biosetData.study_pi}`;
            }
            if (biosetData.study_institution) {
                if (biosetData.study_pi) {
                    prompt += ` at`;
                }
                prompt += ` ${biosetData.study_institution}`;
            }
            prompt += ".";
        }

        // Add repository information
        if (biosetData.public_repository && biosetData.public_identifier) {
            prompt += ` The experiment data is available in the ${biosetData.public_repository} repository with identifier ${biosetData.public_identifier}`;
            if (biosetData.pmid) {
                prompt += ` and is associated with PubMed ID ${biosetData.pmid}`;
            }
            prompt += ".";
        }

        // Add experiment description (truncate if very long)
        if (biosetData.exp_description) {
            const description = biosetData.exp_description.trim();
            if (description.length > 500) {
                prompt += ` Experiment description: ${description.substring(0, 500)}...`;
            } else {
                prompt += ` Experiment description: ${description}`;
            }
            prompt += ".";
        }

        // Add taxonomic information
        if (biosetData.taxon_id && Array.isArray(biosetData.taxon_id) && biosetData.taxon_id.length > 0) {
            prompt += ` Taxonomic ID: ${biosetData.taxon_id[0]}.`;
        }

        // Add timestamps
        if (biosetData.date_inserted) {
            const insertDate = new Date(biosetData.date_inserted).toLocaleDateString();
            prompt += ` This bioset data was created on ${insertDate}`;
            if (biosetData.date_modified && biosetData.date_modified !== biosetData.date_inserted) {
                const modDate = new Date(biosetData.date_modified).toLocaleDateString();
                prompt += ` and last modified on ${modDate}`;
            }
            prompt += ".";
        }

        // Add URL path context
        if (pathState.path) {
            prompt += ` Currently viewing at URL path: ${pathState.path}.`;
        }

        prompt += " If the content is relevant to the query, include this content in your response. Otherwise, ignore it.";

        return prompt;
    }

    // Export the functions for use by other modules
    return {
        createStatePrompt: createStatePrompt
    };
});