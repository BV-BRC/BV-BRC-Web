define(["dojo/date/locale","dojo/dom-construct","dojo/dom-class"],function(locale,domConstruct,domClass){

	var formatters = {
		"default": function(item, options){
			console.log("item: ", item);
			options = options || {}

			var table = domConstruct.create("table");
			var tbody = domConstruct.create("tbody",{},table);
			
			Object.keys(item).sort().forEach(function(key){
				var tr = domConstruct.create("tr",{},tbody)
				var tda = domConstruct.create("td",{innerHTML: key}, tr);
				var tdb = domConstruct.create("td",{innerHTML: item[key]}, tr);
			},this);		

			return table;
		},

		"feature_data": function(item, options){
			options = options || {}

			//console.log("Running feature_data formatter");
			//return domConstruct.create("div", {innerHTML: "hello"});

			var featureColumns = {};
			featureColumns = [{
				name : 'Genome Name',
				text : 'genome_name'
			}, {
				name : 'Annotation',
				text : 'annotation'
			}, {
				name : 'Feature Type',
				text : 'feature_type'
			}, {
				name : 'PATRIC ID',
				text : 'patric_id',
				mini :	true
			}, {
				name : 'RefSeq Locus Tag',
				text : 'refseq_locus_tag',
				link : 'http://www.ncbi.nlm.nih.gov/gene/?term=',
				mini :	true
			}, {
				name : 'Alt Locus Tag',
				text : 'alt_locus_tag'
			}, {
				name : 'Gene Symbol',
				text : 'gene',
				mini :	true
			}, {
				name : 'Product',
				text : 'product',
				mini :	true
			}, {
				name : 'NA Length',
				text : 'na_length'
			}, {
				name : 'AA Length',
				text : 'aa_length'
			}, {
				name : 'Start',
				text : 'start'
			}, {
				name : 'End',
				text : 'end'
			}, {
				name : 'Strand',
				text : 'strand'
			}, {
				name : 'Figfam ID',
				text : 'figfam_id'
			}, {
				name : 'plfam ID',
				text : 'plfam_id'
			}, {
				name : 'pgfam ID',
				text : 'pgfam_id'
			}, {
				name : 'EC',
				text : 'ec'
			}, {
				name : 'Pathway',
				text : 'pathway'
			}, {
				name : 'GO',
				text : 'go'
			}, {
				name : 'Location',
				text : 'location',
				mini :	true
			}, {
				name : 'Segments',
				text : 'segments'
			}, {
				name : 'Feature ID',
				text : 'feature_id'
			}, {
				name : 'Protein ID',
				text : 'protein_id',
				link : 'http://www.ncbi.nlm.nih.gov/protein/'
			}, {
				name : 'Gene ID',
				text : 'gene_id',
				link : 'http://www.ncbi.nlm.nih.gov/gene/?term='
			}, {
				name : 'gi',
				text : 'gi',
				link : 'http://www.ncbi.nlm.nih.gov/protein/'
			}, {
				name : 'Pos Group',
				text : 'pos_group',
				data_hide: true
			}, {
				name : 'NA Sequence',
				text : 'na_sequence',
				data_hide: true
			}, {
				name : 'AA Sequence',
				text : 'aa_sequence',
				data_hide: true
			}, {
				name : 'aa_sequence_md5',
				text : 'aa_sequence_md5',
				data_hide: true
			}, {
				name : 'Uniprotkb Accession',
				text : 'uniprotkb_accession'
			}, {
				name : 'P2 Feature ID',
				text : 'p2_feature_id',
				data_hide: true
			}, {
				name : 'Annotation Sort',
				text : 'annotation_sort',
				data_hide: true
			}, {
				name : 'Genome ID',
				text : 'genome_id',
				data_hide: true
			}, {			
				name : 'Taxon ID',
				text : 'taxon_id',
				link : 'http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id='
			}, {
				name : 'Sequence ID',
				text : 'sequence_id',
				data_hide: true
			}, {
				name : 'Accession',
				text : 'accession',
				data_hide: true
			}, {
				name : 'text',
				text : 'text',
				data_hide: true
			}, {
				name : 'Version',
				text : '_version_',
				data_hide: true
			}, {
				name : 'Date Inserted',
				text : 'date_inserted'
			}, {
				name : 'Date Modified',
				text : 'date_modified'
			}, {
				name : 'Public',
				text : 'public'
			}, {
				name : 'Owner',
				text : 'owner'
			}, {
				name : 'User Read',
				text : 'user_read'
			}, {
				name : 'User Write',
				text : 'user_write'
			}, {
				name : 'Document Type',
				text : 'document_type',
				data_hide: true
			}, {
				name : 'Document ID',
				text : 'document_id',
				data_hide: true			
			}];

			var feature_name = "";
			if (item.patric_id)
			{
				feature_name = item.patric_id;
			}
			else if (item.refseq_locus_tag)
			{
				feature_name = item.refseq_locus_tag;			
			}
			else
			{
				feature_name = item.alt_locus_tag;						
			}

			var div = domConstruct.create("div");			
			var tbody = displayHeader(div, feature_name, "fa icon-genome-features fa-2x", "/view/Feature/"+item.feature_id, options);
			displayDetail(item, featureColumns, tbody, options);

			return div;
		},

		"spgene_data": function(item, options){
			options = options || {}

			//console.log("Running spgene_data formatter");
			//return domConstruct.create("div", {innerHTML: "hello"});

			var featureColumns = {};
			featureColumns = [{
				name : 'Genome Name',
				text : 'genome_name'
			}, {
				name : 'PATRIC ID',
				text : 'patric_id'
			}, {
				name : 'RefSeq Locus Tag',
				text : 'refseq_locus_tag',
				link : 'http://www.ncbi.nlm.nih.gov/gene/?term='
			}, {
				name : 'Alt Locus Tag',
				text : 'alt_locus_tag'
			}, {
				name : 'Gene',
				text : 'gene'
			}, {
				name : 'Product',
				text : 'product'
			}, {
				name : 'Property',
				text : 'property'
			}, {
				name : 'Source',
				text : 'source'
			}, {
				name : 'Property Source',
				text : 'property_source',
				data_hide: true
			}, {
				name : 'Source ID',
				text : 'source_id'
			}, {
				name : 'Organism',
				text : 'organism'
			}, {
				name : 'Function',
				text : 'function'
			}, {
				name : 'Classification',
				text : 'classification'
			}, {
				name : 'Assertion',
				text : 'assertion'
			}, {
				name : 'Evidence',
				text : 'evidence'
			}, {
				name : 'PubMed',
				text : 'pmid',
				link : 'http://www.ncbi.nlm.nih.gov/pubmed/'								
			}, {
				name : 'BLASP Query Coverage',
				text : 'query_coverage'
			}, {
				name : 'BLASP Subject Coverage',
				text : 'subject_coverage'
			}, {
				name : 'BLASP Identity',
				text : 'identity'
			}, {
				name : 'BLASP E-Value',
				text : 'e_value'
			}, {
				name : 'Same Species',
				text : 'same_species'
			}, {
				name : 'Same Genus',
				text : 'same_genus'
			}, {
				name : 'Same Genome',
				text : 'same_genome'
			}, {
				name : 'Feature ID',
				text : 'feature_id',
				data_hide: true
			}, {
				name : 'Genome ID',
				text : 'genome_id',
				data_hide: true
			}, {			
				name : 'Taxon ID',
				text : 'taxon_id',
				link : 'http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id='
			}, {
				name : 'text',
				text : 'text',
				data_hide: true
			}, {
				name : 'Version',
				text : '_version_',
				data_hide: true
			}, {
				name : 'Date Inserted',
				text : 'date_inserted'
			}, {
				name : 'Date Modified',
				text : 'date_modified'
			}, {
				name : 'Public',
				text : 'public'
			}, {
				name : 'Owner',
				text : 'owner'
			}, {
				name : 'User Read',
				text : 'user_read'
			}, {
				name : 'User Write',
				text : 'user_write'
			}];

			var feature_name = "";
			if (item.patric_id)
			{
				feature_name = item.patric_id;
			}
			else if (item.refseq_locus_tag)
			{
				feature_name = item.refseq_locus_tag;			
			}
			else
			{
				feature_name = item.alt_locus_tag;						
			}

			var div = domConstruct.create("div");			
			var tbody = displayHeader(div, feature_name, "fa icon-genome-features fa-2x", "/view/SpecialtyGene/"+item.feature_id, options);
			displayDetail(item, featureColumns, tbody, options);

			return div;
		},

		"pathway_data": function(item, options){
			options = options || {}

			//console.log("Running pathway_data formatter");
			//return domConstruct.create("div", {innerHTML: "hello"});

			var featureColumns = {};
			featureColumns = [{
				name : 'Pathway ID',
				text : 'pathway_id'
			}, {
				name : 'Pathway Name',
				text : 'pathway_name'
			}, {
				name : 'Pathway Class',
				text : 'pathway_class'
			}, {
				name : 'Annotation',
				text : 'annotation'
			}, {
				name : 'Unique Genome Count',
				text : 'genome_count'
			}, {
				name : 'Unique Gene Count',
				text : 'gene_count'
			}, {
				name : 'Unique EC Count',
				text : 'ec_count'
			}, {
				name : 'EC Conservation',
				text : 'ec_cons'
			}, {
				name : 'Gene Conservation',
				text : 'gene_cons'
			}, {
				name : 'Count',
				text : 'count',
				data_hide: true
			}, {
				name : 'Genome EC',
				text : 'genome_ec',
				data_hide: true
			}];

			var div = domConstruct.create("div");			
			var tbody = displayHeader(div, item.pathway_name, "fa icon-genome-features fa-2x", "/view/Pathways/"+item.pathway_id, options);
			displayDetail(item, featureColumns, tbody, options);

			return div;
		},

		"proteinfamily_data": function(item, options){
			options = options || {}

			//console.log("Running pathway_data formatter");
			//return domConstruct.create("div", {innerHTML: "hello"});

			var featureColumns = {};
			featureColumns = [{
				name : 'ID',
				text : 'family_id'
			}, {
				name : 'Proteins',
				text : 'feature_count'
			}, {
				name : 'Genomes',
				text : 'genome_count'
			}, {
				name : 'Description',
				text : 'description'
			}, {
				name : 'Min AA Length',
				text : 'aa_length_min'
			}, {
				name : 'Max AA Length',
				text : 'aa_length_max'
			}, {
				name : 'Mean',
				text : 'aa_length_mean'
			}, {
				name : 'Std',
				text : 'aa_length_std'
			}, {
				name : 'Count',
				text : 'count',
				data_hide: true
			}, {
				name : 'Genomes',
				text : 'genomes',
				data_hide: true
			}];

			var div = domConstruct.create("div");			
			var tbody = displayHeader(div, item.family_id, "fa icon-genome-features fa-2x", "/view/ProteinFamilies/"+item.family_id, options);
			displayDetail(item, featureColumns, tbody, options);

			return div;
		},

		"sequence_data": function(item, options){
			options = options || {}

			//console.log("Running spgene_data formatter");
			//return domConstruct.create("div", {innerHTML: "hello"});

			var featureColumns = {};
			featureColumns = [{
				name : 'Genome Name',
				text : 'genome_name',
				mini :	true
			}, {
				name : 'Genome ID',
				text : 'genome_id'
			}, {
				name : 'Accession',
				text : 'accession'
			}, {
				name : 'Sequence ID',
				text : 'sequence_id',
				link : 'http://www.ncbi.nlm.nih.gov/nuccore/',
				mini :	true
			}, {
				name : 'Length',
				text : 'length',
				mini :	true
			}, {
				name : 'GC Content',
				text : 'gc_content',
				mini :	true
			}, {
				name : 'Sequence Type',
				text : 'sequence_type'
			}, {
				name : 'Topology',
				text : 'topology'
			}, {
				name : 'Description',
				text : 'description'
			}, {
				name : 'Chromosome',
				text : 'chromosome'
			}, {
				name : 'Plasmid',
				text : 'plasmid'
			}, {
				name : 'GI',
				text : 'gi',
				link : 'http://www.ncbi.nlm.nih.gov/nuccore/'
			}, {
				name : 'Taxon ID',
				text : 'taxon_id',
				link : 'http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id='
			}, {
				name : 'text',
				text : 'text',
				data_hide: true
			}, {
				name : 'Version',
				text : '_version_',
				data_hide: true
			}, {
				name : 'Version',
				text : 'version'
			}, {
				name : 'Release Date',
				text : 'release_date'
			}, {
				name : 'Date Inserted',
				text : 'date_inserted'
			}, {
				name : 'Date Modified',
				text : 'date_modified'
			}, {
				name : 'Public',
				text : 'public'
			}, {
				name : 'Owner',
				text : 'owner'
			}, {
				name : 'User Read',
				text : 'user_read'
			}, {
				name : 'User Write',
				text : 'user_write'
			}];

			var div = domConstruct.create("div");			
			var tbody = displayHeader(div, item.sequence_id, "fa icon-contigs fa-2x", "/view/Genome/"+item.genome_id, options);
			displayDetail(item, featureColumns, tbody, options);

			return div;
		},

		"transcriptomics_experiment_data": function(item, options){
			options = options || {}

			//console.log("Running spgene_data formatter");
			//return domConstruct.create("div", {innerHTML: "hello"});

			var featureColumns = {};
			featureColumns = [{
				name : 'Experiment ID',
				text : 'eid'
			}, {
				name : 'EXPID',
				text : 'expid',
				data_hide: true
			}, {
				name : 'Title',
				text : 'title'
			}, {
				name : 'Comparisons',
				text : 'samples'
			}, {
				name : 'Genes',
				text : 'genes'
			}, {
				name : 'PubMed',
				text : 'pmid',
				link : 'http://www.ncbi.nlm.nih.gov/pubmed/'								
			}, {
				name : 'Link Out',
				text : 'accession',
				link : 'http://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc='
			}, {
				name : 'Organism',
				text : 'organism'
			}, {
				name : 'Strain',
				text : 'strain'
			}, {
				name : 'Gene Modification',
				text : 'mutant'
			}, {
				name : 'Experimental Condition',
				text : 'condition'
			}, {
				name : 'Time Series',
				text : 'timeseries'
			}, {
				name : 'Platforms',
				text : 'platforms'
			}, {
				name : 'Genome IDs',
				text : 'genome_ids'
			}, {
				name : 'Release Date',
				text : 'release_date'
			}, {
				name : 'Author',
				text : 'author'
			}, {
				name : 'PI',
				text : 'pi'
			}, {
				name : 'Institution',
				text : 'institution'
			}, {
				name : 'Description',
				text : 'description'
			}, {
				name : 'text',
				text : 'text',
				data_hide: true
			}, {
				name : 'Version',
				text : '_version_',
				data_hide: true
			}, {
				name : 'Date Inserted',
				text : 'date_inserted'
			}, {
				name : 'Date Modified',
				text : 'date_modified'
			}, {
				name : 'Document Type',
				text : 'document_type',
				data_hide: true
			}, {
				name : 'Document ID',
				text : 'document_id',
				data_hide: true			
			}];

			var div = domConstruct.create("div");			
			var tbody = displayHeader(div, item.title, "fa icon-experiments fa-2x", "/view/TranscriptomicsExperiment/"+item.eid, options);
			displayDetail(item, featureColumns, tbody, options);

			return div;
		},

		"transcriptomics_sample_data": function(item, options){
			options = options || {}

			//console.log("Running spgene_data formatter");
			//return domConstruct.create("div", {innerHTML: "hello"});

			var featureColumns = {};
			featureColumns = [{
				name : 'Sample ID',
				text : 'pid'
			}, {
				name : 'Experiment ID',
				text : 'eid'
			}, {
				name : 'EXPID',
				text : 'expid',
				data_hide: true
			}, {
				name : 'Title',
				text : 'expname'
			}, {
				name : 'Samples',
				text : 'samples'
			}, {
				name : 'Genes',
				text : 'genes'
			}, {
				name : 'Significant Genes (Log Ratio)',
				text : 'sig_log_ratio',
			}, {
				name : 'Significant Genes (Z Score)',
				text : 'sig_z_score',
			}, {
				name : 'PubMed',
				text : 'pmid',
				link : 'http://www.ncbi.nlm.nih.gov/pubmed/'								
			}, {
				name : 'Link Out',
				text : 'accession',
				link : 'http://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc='
			}, {
				name : 'Organism',
				text : 'organism'
			}, {
				name : 'Strain',
				text : 'strain'
			}, {
				name : 'Gene Modification',
				text : 'mutant'
			}, {
				name : 'Experimental Condition',
				text : 'condition'
			}, {
				name : 'Time Point',
				text : 'timepoint'
			}, {
				name : 'Channels',
				text : 'channels'
			}, {
				name : 'Platform',
				text : 'platform'
			}, {
				name : 'Genome IDs',
				text : 'genome_ids'
			}, {
				name : 'Release Date',
				text : 'release_date'
			}, {
				name : 'Exp Mean',
				text : 'expmean',
				data_hide: true
			}, {
				name : 'Exp Stddev',
				text : 'expstddev',
				data_hide: true
			}, {
				name : 'text',
				text : 'text',
				data_hide: true
			}, {
				name : 'Version',
				text : '_version_',
				data_hide: true
			}, {
				name : 'Date Inserted',
				text : 'date_inserted'
			}, {
				name : 'Date Modified',
				text : 'date_modified'
			}, {
				name : 'Document Type',
				text : 'document_type',
				data_hide: true
			}, {
				name : 'Document ID',
				text : 'document_id',
				data_hide: true			
			}];

			var div = domConstruct.create("div");			
			var tbody = displayHeader(div, item.expname, "fa icon-experiments fa-2x", "/view/TranscriptomicsComparison/"+item.pid, options);
			displayDetail(item, featureColumns, tbody, options);

			return div;
		},
		
		"genome_data": function(item, options){
			// do some other type formatting here and return it
			//console.log("Running genome_data formatter");
			//return domConstruct.create("div", {innerHTML: "hello"});
			options = options || {}

			var metadataGenomeSummaryID = ['Organism Info', 'Isolate Info', 'Host Info', 'Sequence Info', 'Phenotype Info', 'Project Info', 'Others'];
			var metadataGenomeSummaryValue = {};
			metadataGenomeSummaryValue['Organism Info'] = [{
				name : 'Genome ID',
				text : 'genome_id',
				mini :	true
			}, {
				name : 'Genome Name',
				text : 'genome_name',
				mini :	true
			}, {
				name : 'NCBI Taxon ID',
				text : 'taxon_id',
				link : 'http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id='								
			}, {
				name : 'Genome Status',
				text : 'genome_status',
				mini :	true
			}, {
				name : 'Organism Name',
				text : 'organism_name'
			}, {
				name : 'Strain',
				text : 'strain'
			}, {
				name : 'Serovar',
				text : 'serovar'
			}, {
				name : 'Biovar',
				text : 'biovar'
			}, {
				name : 'Pathovar',
				text : 'pathovar'
			}, {
				name : 'MLST',
				text : 'mlst'
			}, {
				name : 'Other Typing',
				text : 'other_typing'
			}, {
				name : 'Culture Collection',
				text : 'culture_collection'
			}, {
				name : 'Type Strain',
				text : 'type_strain'
			}, {
				name : 'Antimicrobial Resistance',
				text : 'antimicrobial_resistance'
			}, {
				name : 'Antimicrobial Resistance Evidence',
				text : 'antimicrobial_resistance_evidence'
			}];
			
			metadataGenomeSummaryValue['Project Info'] = [{
				name : 'Sequencing Center',
				text : 'sequencing_centers'
			}, {
				name : 'Completion Date',
				text : 'completion_date'
			}, {
				name : 'Publication',
				text : 'publication',
				link : 'http://www.ncbi.nlm.nih.gov/pubmed/'				
			}, {
				name : 'BioProject Accession',
				text : 'bioproject_accession',
				link : 'http://www.ncbi.nlm.nih.gov/bioproject/?term=',
				mini :	true
			}, {
				name : 'BioSample Accession',
				text : 'biosample_accession',
				link : 'http://www.ncbi.nlm.nih.gov/biosample/',
				mini :	true
			}, {
				name : 'Assembly Accession',
				text : 'assembly_accession',
				link : 'http://www.ncbi.nlm.nih.gov/assembly/'
			}, {
				name : 'GenBank Accessions',
				text : 'genbank_accessions',
				link : 'http://www.ncbi.nlm.nih.gov/nuccore/'
			}, {
				name : 'RefSeq Accessions',
				text : 'refseq_accessions',
				link : 'http://www.ncbi.nlm.nih.gov/nuccore/'
			}];

			metadataGenomeSummaryValue['Sequence Info'] = [{
				name : 'Sequencing Status',
				text : 'sequencing_status'
			}, {
				name : 'Sequencing Platform',
				text : 'sequencing_platform'
			}, {
				name : 'Sequencing Depth',
				text : 'sequencing_depth'
			}, {
				name : 'Assembly Method',
				text : 'assembly_method'
			}, {
				name : 'Chromosomes',
				text : 'chromosomes'
			}, {
				name : 'Plasmids',
				text : 'plasmids'
			}, {
				name : 'Contigs',
				text : 'contigs'
			}, {
				name : 'Sequences',
				text : 'sequences'
			}, {
				name : 'Genome Length',
				text : 'genome_length'
			}, {
				name : 'GC Content',
				text : 'gc_content'
			}, {
				name : 'PATRIC CDS',
				text : 'patric_cds'
			}, {
				name : 'RefSeq CDS',
				text : 'refseq_cds'
			}];

			metadataGenomeSummaryValue['Isolate Info'] = [{
				name : 'Isolation Site',
				text : 'isolation_site'
			}, {
				name : 'Isolation Source',
				text : 'isolation_source'
			}, {
				name : 'Isolation Comments',
				text : 'isolation_comments'
			}, {
				name : 'Collection Date',
				text : 'collection_date'
			}, {
				name : 'Isolation Country',
				text : 'isolation_country'
			}, {
				name : 'Geographic Location',
				text : 'geographic_location'
			}, {
				name : 'Latitude',
				text : 'latitude'
			}, {
				name : 'Longitude',
				text : 'longitude'
			}, {
				name : 'Altitude',
				text : 'altitude'
			}, {
				name : 'Depth',
				text : 'depth'
			}, {
				name : 'Other Environmental',
				text : 'other_environmental'
			}];

			metadataGenomeSummaryValue['Host Info'] = [{
				name : 'Host Name',
				text : 'host_name'
			}, {
				name : 'Host Gender',
				text : 'host_gender'
			}, {
				name : 'Host Age',
				text : 'host_age'
			}, {
				name : 'Host Health',
				text : 'host_health'
			}, {
				name : 'Body Sample Site',
				text : 'body_sample_site'
			}, {
				name : 'Body Sample Subsite',
				text : 'body_sample_subsite'
			}, {
				name : 'Other Clinical',
				text : 'other_clinical'
			}];
			
			metadataGenomeSummaryValue['Phenotype Info'] = [{
				name : 'Gram Stain',
				text : 'gram_stain'
			}, {
				name : 'Cell Shape',
				text : 'cell_shape'
			}, {
				name : 'Motility',
				text : 'motility'
			}, {
				name : 'Sporulation',
				text : 'sporulation'
			}, {
				name : 'Temperature Range',
				text : 'temperature_range'
			}, {
				name : 'Optimal Temperature',
				text : 'optimal_temperature'
			}, {
				name : 'Salinity',
				text : 'salinity'
			}, {
				name : 'Oxygen Requirement',
				text : 'oxygen_requirement'
			}, {
				name : 'Habitat',
				text : 'habitat'
			}, {
				name : 'Disease',
				text : 'disease'
			}];

			metadataGenomeSummaryValue['Others'] = [{
				name : 'Comments',
				text : 'comments'
			}, {
				name : 'Additional Metadata',
				text : 'additional_metadata'
			}];
	
			var div = domConstruct.create("div");
			var tbody = displayHeader(div, item.genome_name, "fa icon-genome fa-2x", "/view/Genome/"+item.genome_id, options);

			var summary = "Length: " + item.genome_length + "bp, Chromosomes: " + item.chromosomes + ", Plasmids: " + item.plasmids + ", Contigs: " + item.contigs;
			var tr = domConstruct.create("tr", {},tbody);
			var tda = domConstruct.create("td", {innerHTML: "Summary:", style: "font-weight: bold", nowrap: "nowrap" }, tr);
			var tdb = domConstruct.create("td", {innerHTML: summary}, tr);

			displayDetailBySections(item, metadataGenomeSummaryID, metadataGenomeSummaryValue, tbody, options);

			return div;

		}	
	}

	function displayHeader(div, item_name, icon_name, url, options) {
			var linkTitle = false;
			if (options)
			{
				if (options.linkTitle == true)
				{
					linkTitle = true;
				}
			}
			//console.log("url=" + url + ", linkTitle=" + linkTitle);
	
			var hdr_div = domConstruct.create("div", {}, div);

			var hdr_table = domConstruct.create("table", {} , div);
			var hdr_tbody = domConstruct.create("tbody",{}, hdr_table);
			var hdr_th = domConstruct.create("tr",{},hdr_tbody);
			var hdr_tda = domConstruct.create("td",{}, hdr_th);
			var span = domConstruct.create("span", {class: icon_name}, hdr_tda);
			var hdr_tdb; 
			
			if (linkTitle == true)
			{
				hdr_tdb = domConstruct.create("td",{innerHTML: "<a href='" + url + "'>" + item_name + "</a>", style: "font-weight: bold"}, hdr_th);
			}
			else
			{
				hdr_tdb= domConstruct.create("td",{innerHTML: item_name, style: "font-weight: bold"}, hdr_th);
			}

			var dtl_div = domConstruct.create("div", {}, div);
			var table = domConstruct.create("table", {} , dtl_div);
			var tbody = domConstruct.create("tbody",{},table);

			var	tr = domConstruct.create("tr", {},tbody);
			var	tda = domConstruct.create("td", {innerHTML: "<hr>"}, tr);
			var	tdb = domConstruct.create("td", {innerHTML: "<hr>"}, tr);
			
			return tbody;		
	}

	function displayDetailBySections(item, meta_data_section, meta_data, tbody, options) {	
			var diaplayColumns = {};
			var tr;
			var tda;
			var tdb;

			var mini = false;
			var hideExtra = false;
			
			if (options)
			{
				if (options.mini == true)
				{
					mini = true;
				}
				if (options.hideExtra == true)
				{
					hideExtra = true;
				}
			}
			
			for(var i=0; i< meta_data_section.length; i++)
			{
				if (mini == false)
				{
					tr = domConstruct.create("tr", {},tbody);
					tda = domConstruct.create("td", {innerHTML: "<hr>"}, tr);
					tdb = domConstruct.create("td", {innerHTML: "<hr>"}, tr);

					tr = domConstruct.create("tr", {},tbody);
					tda = domConstruct.create("td", {innerHTML: meta_data_section[i]+":", style: "font-weight: bold", nowrap: "nowrap" }, tr);
					tdb = domConstruct.create("td", {innerHTML: ""}, tr);
				}				

				var value = meta_data[meta_data_section[i]];

				for(var j=0; j<value.length; j++) {
					var column = value[j].text;
					//console.log("column=", column);
					//console.log("item[column]=", item[column]);
					
					if (column)
					{
						diaplayColumns[column] = 1;
					}
										
					if (column && item[column])
					{
						//console.log("column=", column);
						//console.log("item[column]=", item[column]);
						//console.log("value[j].name=", value[j].name);

						if (mini == false)
						{						
							if (value[j].link && item[column] != "-")
							{
								tr = domConstruct.create("tr",{},tbody);
								tda = domConstruct.create("td",{innerHTML: value[j].name, nowrap: "nowrap" }, tr);
								tdb = domConstruct.create("td",{innerHTML: "<a href='" + value[j].link + item[column] + "' target ='_blank'>" + item[column] + "</a>"}, tr);
							}
							else
							{
								tr = domConstruct.create("tr",{},tbody);
								tda = domConstruct.create("td",{innerHTML: value[j].name, nowrap: "nowrap" }, tr);
								tdb = domConstruct.create("td",{innerHTML: item[column]}, tr);						
							}
						}
						else if (value[j].mini == true)
						{
							if (value[j].link && item[column] != "-")
							{
								tr = domConstruct.create("tr",{},tbody);
								tda = domConstruct.create("td",{innerHTML: value[j].name, nowrap: "nowrap" }, tr);
								tdb = domConstruct.create("td",{innerHTML: "<a href='" + value[j].link + item[column] + "' target ='_blank'>" + item[column] + "</a>"}, tr);
							}
							else
							{
								tr = domConstruct.create("tr",{},tbody);
								tda = domConstruct.create("td",{innerHTML: value[j].name, nowrap: "nowrap" }, tr);
								tdb = domConstruct.create("td",{innerHTML: item[column]}, tr);						
							}						
						}
					}
				}
				
			}

			console.log("diaplayColumns[column]=", diaplayColumns);

			var additional = 0;
			
			if (hideExtra == false && mini == false)
			{	 
			
				Object.keys(item).sort().forEach(function(key){
					if (diaplayColumns[key] != 1 && item[key])
					{
						if (additional ==0)
						{
							tr = domConstruct.create("tr", {},tbody);
							tda = domConstruct.create("td", {innerHTML: "<hr>"}, tr);
							tdb = domConstruct.create("td", {innerHTML: "<hr>"}, tr);
					
							tr = domConstruct.create("tr", {},tbody);
							tda = domConstruct.create("td", {innerHTML: "Additional Info:", style: "font-weight: bold", nowrap: "nowrap" }, tr);
							tdb = domConstruct.create("td", {innerHTML: ""}, tr);					
						}
						additional ++;
						tr = domConstruct.create("tr",{},tbody)
						tda = domConstruct.create("td",{innerHTML: key, nowrap: "nowrap" }, tr);
						tdb = domConstruct.create("td",{innerHTML: item[key]}, tr);
					}
				},this);
			}
	}	


	function displayDetail(item, column_data, tbody, options) {	
			var diaplayColumns = {};
			var tr;
			var tda;
			var tdb;
			var mini = false;
			var hideExtra = false;
			
			if (options)
			{
				if (options.mini == true)
				{
					mini = true;
				}
				if (options.hideExtra == true)
				{
					hideExtra = true;
				}
			}

			for(var i=0; i<column_data.length; i++) {
				var column = column_data[i].text;
				console.log("column_data.length=" + column_data.length + " column=", column);
				console.log("item[column]=", item.column);
			
				if (column) 
				{
					diaplayColumns[column] = 1;
				}		
				
				if (column && item[column] && !column_data[i].data_hide)
				{
					//console.log("column=", column);
					//console.log("item[column]=", item[column]);
					
					if (mini == false)
					{
						if (column_data[i].link && item[column] != "-")
						{
							tr = domConstruct.create("tr",{},tbody);
							tda = domConstruct.create("td",{innerHTML: column_data[i].name, nowrap: "nowrap" }, tr);
							tdb = domConstruct.create("td",{innerHTML: "<a href='" + column_data[i].link + item[column] + "' target ='_blank'>" + item[column] + "</a>"}, tr);
						}
						else
						{
							tr = domConstruct.create("tr",{},tbody);
							tda = domConstruct.create("td",{innerHTML: column_data[i].name, nowrap: "nowrap" }, tr);
							tdb = domConstruct.create("td",{innerHTML: item[column]}, tr);						
						}
					}
					else if (column_data[i].mini == true)
					{
						if (column_data[i].link && item[column] != "-")
						{
							tr = domConstruct.create("tr",{},tbody);
							tda = domConstruct.create("td",{innerHTML: column_data[i].name, nowrap: "nowrap" }, tr);
							tdb = domConstruct.create("td",{innerHTML: "<a href='" + column_data[i].link + item[column] + "' target ='_blank'>" + item[column] + "</a>"}, tr);
						}
						else
						{
							tr = domConstruct.create("tr",{},tbody);
							tda = domConstruct.create("td",{innerHTML: column_data[i].name, nowrap: "nowrap" }, tr);
							tdb = domConstruct.create("td",{innerHTML: item[column]}, tr);						
						}
					}
				}
				
			}	
			
			var additional = 0;
			console.log("diaplayColumns=", diaplayColumns);
			
			if (hideExtra == false && mini == false)
			{	 
				Object.keys(item).sort().forEach(function(key){
					if (diaplayColumns[key] != 1 && item[key])
					{
						if (additional ==0)
						{
							tr = domConstruct.create("tr", {},tbody);
							tda = domConstruct.create("td", {innerHTML: "<hr>"}, tr);
							tdb = domConstruct.create("td", {innerHTML: "<hr>"}, tr);
					
							tr = domConstruct.create("tr", {},tbody);
							tda = domConstruct.create("td", {innerHTML: "Additional Info:", style: "font-weight: bold"}, tr);
							tdb = domConstruct.create("td", {innerHTML: ""}, tr);					
						}
						additional ++;
						tr = domConstruct.create("tr",{},tbody)
						tda = domConstruct.create("td",{innerHTML: key, nowrap: "nowrap" }, tr);
						tdb = domConstruct.create("td",{innerHTML: item[key]}, tr);
					}
				},this);
			}												
	}
	
	return function(item, type, options) {
		console.log("Format Data: ", type, item);
		var out;
		if (type && formatters[type]) {
			out = formatters[type](item,options)
		}else{
			out = formatters["default"](item,options);
		}

		console.log("output: ", out);
		return out;
	}
});
