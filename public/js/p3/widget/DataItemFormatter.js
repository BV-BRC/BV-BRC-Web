define([
	"dojo/_base/lang", "dojo/date/locale", "dojo/dom-construct", "dojo/dom-class",
	"dijit/form/Button", "../JobManager", "dijit/TitlePane"
], function(lang, locale, domConstruct, domClass,
			Button, JobManager, TitlePane){

	var formatters = {
		"default": function(item, options){
			options = options || {};

			var table = domConstruct.create("table");
			var tbody = domConstruct.create("tbody", {}, table);

			Object.keys(item).sort().forEach(function(key){
				var tr = domConstruct.create("tr", {}, tbody);
				domConstruct.create("td", {innerHTML: key}, tr);
				domConstruct.create("td", {innerHTML: item[key]}, tr);
			}, this);

			return table;
		},

		"job_parameters": function(item, options){
			function renderObject(obj, target, depth){
				if(!depth){
					depth = 1
				}
				if(typeof obj == 'object'){
					var props = Object.keys(obj);
					props.forEach(function(p){
						if(typeof obj[p] == 'object'){
							var tr = domConstruct.create("tr", {}, tbody);
							domConstruct.create("td", {
								style: {"padding-left": (depth * 5) + "px"},
								innerHTML: p,
								nowrap: "nowrap"
							}, tr);
							domConstruct.create("td", {}, tr);
							renderObject(obj[p], tbody, depth + 1);
						}else{
							var tr = domConstruct.create("tr", {}, tbody);
							domConstruct.create("td", {
								style: {"padding-left": (depth * 10) + "px"},
								innerHTML: p,
								nowrap: "nowrap"
							}, tr);
							domConstruct.create("td", {innerHTML: obj[p]}, tr);
						}
					})
				}
			}
		},
		"completed_job": function(item, options){
			options = options || {};

			var columns = [{
				name: 'App',
				text: 'app'
			}, {
				name: 'Job ID',
				text: 'id'
			}, {
				name: "Status",
				text: "status"
			}, {
				name: 'Submitted',
				text: 'submit_time'
			}, {
				name: 'Start',
				text: 'start_time'
			}, {
				name: 'Completed',
				text: 'completed_time'
			}, {
				name: "Parameters",
				text: "parameters",
				data_hide: true
			}, {
				name: "_formatterType",
				text: "_formatterType",
				data_hide: true
			}, {
				name: "Parameters",
				text: "parameters",
				data_hide: true
			}];

			var div = domConstruct.create("div");
			displayHeader(div, item.id, "fa icon-flag-checkered fa-2x", "/workspace/", options);
			displayDetail(item, columns, div, options);

			return div;
		},

		"failed_job": function(item, options){
			options = options || {};

			var columns = [{
				name: 'App',
				text: 'app'
			}, {
				name: 'Job ID',
				text: 'id'
			}, {
				name: "Status",
				text: "status"
			}, {
				name: 'Submitted',
				text: 'submit_time'
			}, {
				name: 'Start',
				text: 'start_time'
			}, {
				name: 'Completed',
				text: 'completed_time'
			}, {
				name: "Parameters",
				text: "parameters",
				data_hide: true
			}, {
				name: "_formatterType",
				text: "_formatterType",
				data_hide: true
			}, {
				name: "Parameters",
				text: "parameters",
				data_hide: true
			}];

			var div = domConstruct.create("div");
			displayHeader(div, item.id, "fa icon-flag-checkered fa-2x", "/workspace/", options);
			displayDetail(item, columns, div, options);

			var tpDiv = domConstruct.create("div", {}, div);
			var dlg = new TitlePane({title: "Error Output", open: false}, tpDiv);
			dlg.watch("open", function(attr, oldVal, open){
				if(!open){
					return;
				}
				JobManager.queryTaskDetail(item.id, true, true).then(function(detail){
					//console.log("JOB DETAIL: ", detail);
					clearTimeout(timer);
					if(detail.stderr){
						dlg.set("content", "<pre>" + detail.stderr + "</pre>");
					}else{
						dlg.set("content", "Unable to retreive additional details about this task at this task.<br><pre>" + JSON.stringify(detail, null, 4) + "</pre>");
					}
				}, function(err){
					dlg.set("content", "Unable to retreive additional details about this task at this task.<br>" + err + "<br><pre></pre>");
				});
			});

			// displayDetailBySections(obj.parameters,"Parameters" , obj.parameters, tbody, options);

			return div;
		},

		"feature_data": function(item, options){
			options = options || {};

			var sectionList = ['Summary', 'Identifiers', 'Genome', 'Location', 'Sequences'];
			var section = {};

			section['Summary'] = [{
				name: 'RefSeq Locus Tag',
				text: 'refseq_locus_tag',
				link: 'http://www.ncbi.nlm.nih.gov/protein/?term=',
				mini: true
			},{
				name: 'Gene Symbol',
				text: 'gene',
				mini: true
			}, {
				name: 'Product',
				text: 'product',
				mini: true
			}, {
				name: 'Annotation',
				text: 'annotation'
			}, {
				name: 'Feature Type',
				text: 'feature_type'
			}];

			section['Identifiers'] = [{
				name: 'Protein ID',
				text: 'protein_id',
				link: 'http://www.ncbi.nlm.nih.gov/protein/'
			}, {
				name: 'Gene ID',
				text: 'gene_id',
				link: 'http://www.ncbi.nlm.nih.gov/gene/?term='
			}, {
				name: 'gi',
				text: 'gi',
				link: 'http://www.ncbi.nlm.nih.gov/protein/'
			}];

			section['Genome'] = [{
				name: 'Taxon ID',
				text: 'taxon_id',
				link: '/view/Taxonomy/'
			},{
				name: 'Genome ID',
				text: 'genome_id',
				link: "/view/Genome/"
			}, {
				name: 'Genome Name',
				text: 'genome_name',
				link: function(obj){
					return lang.replace('<a href="/view/Genome/{obj.genome_id}">{obj.genome_name}</a>', {obj: obj});
				}
			}];

			section['Location'] = [{
				name: 'Accession',
				text: 'accession'
			}, {
				name: 'Start',
				text: 'start'
			}, {
				name: 'End',
				text: 'end'
			}, {
				name: 'Strand',
				text: 'strand'
			}, {
				name: 'Location',
				text: 'location',
				mini: true
			}];

			section['Sequences'] = [{
				name: 'NA Length',
				text: 'na_length'
			}, {
				name: 'NA Sequence',
				text: 'na_sequence',
				link: function(obj){
					return obj.na_sequence.substr(0, 30) + '... ' + '<button onclick="window.open(\'/view/FASTA/dna/?in(feature_id,(' + obj.feature_id + '))\')">view</button>';
				}
			}, {
				name: 'AA Length',
				text: 'aa_length'
			}, {
				name: 'AA Sequence',
				text: 'aa_sequence',
				link: function(obj){
					return obj.aa_sequence.substr(0, 22) + '... ' + '<button onclick="window.open(\'/view/FASTA/protein/?in(feature_id,(' + obj.feature_id + '))\')">view</button>';
				}
			}];

			var label = (item.patric_id) ? item.patric_id : (item.refseq_locus_tag) ? item.refseq_locus_tag : item.feature_id;

			var div = domConstruct.create("div");
			displayHeader(div, label, "fa icon-genome-features fa-2x", "/view/Feature/" + item.feature_id, options);

			displayDetailBySections(item, sectionList, section, div, options);

			return div;
		},

		"spgene_data": function(item, options){
			options = options || {};

			var columns = [{
				name: 'Genome Name',
				text: 'genome_name'
			}, {
				name: 'PATRIC ID',
				text: 'patric_id'
			}, {
				name: 'RefSeq Locus Tag',
				text: 'refseq_locus_tag',
				link: 'http://www.ncbi.nlm.nih.gov/gene/?term='
			}, {
				name: 'Alt Locus Tag',
				text: 'alt_locus_tag'
			}, {
				name: 'Gene',
				text: 'gene'
			}, {
				name: 'Product',
				text: 'product'
			}, {
				name: 'Property',
				text: 'property'
			}, {
				name: 'Source',
				text: 'source',
				link: function(obj) {
						var sourcelink = obj.source;
						switch(obj.source){
							case "PATRIC_VF":
								sourcelink = '<a href="/view/SpecialtyGeneList/?keyword(*)#view_tab=specialtyGenes&filter=and(eq(source,%22PATRIC_VF%22),eq(evidence,%22Literature%22))" target="_blank">' + obj.source + '</a>';
								break; 
							case "Victors": 
								sourcelink = '<a href="http://www.phidias.us/victors" target="_blank">' + obj.source + '</a>';
								break;
							case "VFDB":
								sourcelink = '<a href="http://www.mgc.ac.cn/VFs" target="_blank">' + obj.source + '</a>';
								break;
							case "Human":
								sourcelink = '<a href="https://www.ncbi.nlm.nih.gov/assembly/GCF_000001405.26" target="_blank">' + obj.source + '</a>';
								break;
							case "ARDB":
								sourcelink = '<a href="http://ardb.cbcb.umd.edu" target="_blank">' + obj.source + '</a>';
								break;
							case "CARD":
								sourcelink = '<a href="https://card.mcmaster.ca/" target="_blank">' + obj.source + '</a>';
								break;
							case "DrugBank":
								sourcelink = '<a href="http://www.drugbank.ca/" target="_blank">' + obj.source + '</a>';
								break;
							case "TTD":
								sourcelink = '<a href="http://bidd.nus.edu.sg/group/cjttd/" target="_blank">' + obj.source + '</a>'; 
								break;
							default:
								break;
						}
						return sourcelink;
					}				
			}, {
				name: 'Source ID',
				text: 'source_id',
				link: function(obj) {
						var sourcelink = obj.source_id;
						switch(obj.source){
							case "PATRIC_VF":
								sourcelink = '<a href="/view/SpecialtyGeneEvidence/' + obj.source_id  + '" target="_blank">' + obj.source_id + '</a>';
								break;
							case "Victors": 
								sourcelink = '<a href="http://www.phidias.us/victors/gene_detail.php?c_mc_victor_id=' + obj.source_id + '" target="_blank">' + obj.source_id + '</a>';
								break;
							case "VFDB":
								sourcelink = '<a href="http://www.mgc.ac.cn/cgi-bin/VFs/gene.cgi?GeneID=' + obj.source_id + '" target="_blank">' + obj.source_id + '</a>';
								break;
							case "Human":
								sourcelink = '<a href="https://www.ncbi.nlm.nih.gov/protein/' + obj.source_id + '" target="_blank">' + obj.source_id + '</a>';
								break;
							case "ARDB":
								sourcelink = '<a href="http://ardb.cbcb.umd.edu/cgi/search.cgi?db=R&term=' + obj.source_id + '" target="_blank">' + obj.source_id + '</a>';
								break;
							case "DrugBank":
								var padding = "BE0000000";
								var id = padding.substring(0, padding.length-obj.source_id.length) + obj.source_id;
								sourcelink = '<a href="http://www.drugbank.ca/biodb/bio_entities/' + id + '" target="_blank">' + obj.source_id + '</a>';
								break;
							case "TTD":
								sourcelink = '<a href="http://bidd.nus.edu.sg/group/TTD/ZFTTDDetail.asp?ID=' + obj.source_id + '" target="_blank">' + obj.source_id + '</a>';
								break;
							default:
								break;
						}
						return sourcelink;
					}
			}, {
				name: 'Organism',
				text: 'organism'
			}, {
				name: 'Function',
				text: 'function'
			}, {
				name: 'Classification',
				text: 'classification'
			}, {
				name: 'Assertion',
				text: 'assertion'
			}, {
				name: 'Evidence',
				text: 'evidence'
			}, {
				name: 'PubMed',
				text: 'pmid',
				link: 'http://www.ncbi.nlm.nih.gov/pubmed/'
			}, {
				name: 'BLASP Query Coverage',
				text: 'query_coverage'
			}, {
				name: 'BLASP Subject Coverage',
				text: 'subject_coverage'
			}, {
				name: 'BLASP Identity',
				text: 'identity'
			}, {
				name: 'BLASP E-Value',
				text: 'e_value'
			}, {
				name: 'Same Species',
				text: 'same_species'
			}, {
				name: 'Same Genus',
				text: 'same_genus'
			}, {
				name: 'Same Genome',
				text: 'same_genome'
			}, {
				name: 'Taxon ID',
				text: 'taxon_id',
				link: 'http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id='
			}];

			var label = (item.patric_id) ? item.patric_id : (item.refseq_locus_tag) ? item.refseq_locus_tag : item.alt_locus_tag;

			var div = domConstruct.create("div");
			displayHeader(div, label, "fa icon-genome-features fa-2x", "/view/SpecialtyGene/" + item.feature_id, options);
			displayDetail(item, columns, div, options);

			return div;
		},

		"spgene_ref_data": function(item, options){
			options = options || {};

			var columns = [{
				name: 'Property',
				text: 'property'
			}, {
				name: 'Source',
				text: 'source'
			}, {
				name: 'Source ID',
				text: 'source_id'
			}, {
				name: 'Organism',
				text: 'organism'
			}, {
				name: 'Product',
				text: 'product'
			}, {
				name: 'Gene Name',
				text: 'gene_name'
			}, {
				name: 'Gene ID',
				text: 'gene_id',
				link: 'http://www.ncbi.nlm.nih.gov/gene/?term='
			}, {
				name: 'gi',
				text: 'gi',
				link: 'http://www.ncbi.nlm.nih.gov/protein/'
			}, {
				name: 'Function',
				text: 'function'
			}, {
				name: 'PubMed',
				text: 'pmid',
				link: 'http://www.ncbi.nlm.nih.gov/pubmed/'
			}];

			var div = domConstruct.create("div");
			displayDetail(item, columns, div, options);

			return div;
		},			
			
		"taxonomy_data": function(item, options){
			options = options || {};

			var columns = [{
				name: 'Taxonomy ID',
				text: 'taxon_id',
				link: 'http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id='
			}, {
				name: 'Rank',
				text: 'taxon_rank'
			}, {
				name: 'Lineage',
				text: 'lineage_names',
				link: function(obj){
					var ids = obj['lineage_ids'];
					return obj['lineage_names'].map(function(d, idx){
						return lang.replace('<a href="/view/Taxonomy/{0}">{1}</a>', [ids[idx], d]);
					}).join(", ");
				}
			}, {
				name: 'Genetic Code',
				text: 'genetic_code'
			}];

			var div = domConstruct.create("div");
			displayHeader(div, item.taxon_name, "fa icon-taxonomy fa-2x", "/view/Taxonomy/" + item.taxon_id, options);

			displayDetail(item, columns, div, options);

			return div;
		},

		"pathway_data": function(item, options){
			options = options || {};

			var columns = [{
				name: 'Pathway ID',
				text: 'pathway_id'
			}, {
				name: 'Pathway Name',
				text: 'pathway_name'
			}, {
				name: 'Pathway Class',
				text: 'pathway_class'
			}, {
				name: 'Annotation',
				text: 'annotation'
			}, {
				name: 'Unique Genome Count',
				text: 'genome_count'
			}, {
				name: 'Unique Gene Count',
				text: 'gene_count'
			}, {
				name: 'Unique EC Count',
				text: 'ec_count'
			}, {
				name: 'EC Conservation',
				text: 'ec_cons'
			}, {
				name: 'Gene Conservation',
				text: 'gene_cons'
			}];

			var div = domConstruct.create("div");
			displayHeader(div, item.pathway_name, "fa icon-git-pull-request fa-2x", "/view/Pathways/" + item.pathway_id, options);
			displayDetail(item, columns, div, options);

			return div;
		},

		"proteinfamily_data": function(item, options){
			options = options || {};

			var columns = [{
				name: 'ID',
				text: 'family_id'
			}, {
				name: 'Proteins',
				text: 'feature_count'
			}, {
				name: 'Genomes',
				text: 'genome_count'
			}, {
				name: 'Description',
				text: 'description'
			}, {
				name: 'Min AA Length',
				text: 'aa_length_min'
			}, {
				name: 'Max AA Length',
				text: 'aa_length_max'
			}, {
				name: 'Mean',
				text: 'aa_length_mean'
			}, {
				name: 'Std',
				text: 'aa_length_std'
			}];

			var div = domConstruct.create("div");
			displayHeader(div, item.family_id, "fa icon-tasks fa-2x", "/view/ProteinFamilies/" + item.family_id, options);
			displayDetail(item, columns, div, options);

			return div;
		},

        "msa_details": function(item, options){
            options = options || {};
            var columns =[{
                name: "No. of Members",
                text: "numFeatures"
            }, {
                name: "No. of Organisms",
                text: "numOrganisms"
            }, {
                name: "Min AA Length",
                text: "minLength"
            }, {
                name: "Max AA Length",
                text: "maxLength"
            }];
			var div = domConstruct.create("div");
			displayHeader(div, "MSA", "fa icon-alignment fa-2x", "/view/MSA/", options);
			displayDetail(item, columns, div, options);

			return div;
		},


		"sequence_data": function(item, options){
			options = options || {};

			var columns = [{
				name: 'Genome Name',
				text: 'genome_name',
				mini: true
			}, {
				name: 'Genome ID',
				text: 'genome_id'
			}, {
				name: 'Accession',
				text: 'accession'
			}, {
				name: 'Sequence ID',
				text: 'sequence_id',
				link: 'http://www.ncbi.nlm.nih.gov/nuccore/',
				mini: true
			}, {
				name: 'Length',
				text: 'length',
				mini: true
			}, {
				name: 'GC Content',
				text: 'gc_content',
				mini: true
			}, {
				name: 'Sequence Type',
				text: 'sequence_type'
			}, {
				name: 'Topology',
				text: 'topology'
			}, {
				name: 'Description',
				text: 'description'
			}, {
				name: 'Chromosome',
				text: 'chromosome'
			}, {
				name: 'Plasmid',
				text: 'plasmid'
			}, {
				name: 'GI',
				text: 'gi',
				link: 'http://www.ncbi.nlm.nih.gov/nuccore/'
			}, {
				name: 'Taxon ID',
				text: 'taxon_id',
				link: 'http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id='
			}, {
				name: 'Version',
				text: 'version'
			}, {
				name: 'Release Date',
				text: 'release_date'
			}];

			var div = domConstruct.create("div");
			displayHeader(div, item.sequence_id, "fa icon-contigs fa-2x", "/view/Genome/" + item.genome_id, options);
			displayDetail(item, columns, div, options);

			return div;
		},

		"transcriptomics_experiment_data": function(item, options){
			options = options || {};

			var columns = [{
				name: 'Experiment ID',
				text: 'eid'
			}, {
				name: 'Title',
				text: 'title'
			}, {
				name: 'Comparisons',
				text: 'samples'
			}, {
				name: 'Genes',
				text: 'genes'
			}, {
				name: 'PubMed',
				text: 'pmid',
				link: 'http://www.ncbi.nlm.nih.gov/pubmed/'
			}, {
				name: 'Link Out',
				text: 'accession',
				link: 'http://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc='
			}, {
				name: 'Organism',
				text: 'organism'
			}, {
				name: 'Strain',
				text: 'strain'
			}, {
				name: 'Gene Modification',
				text: 'mutant'
			}, {
				name: 'Experimental Condition',
				text: 'condition'
			}, {
				name: 'Time Series',
				text: 'timeseries'
			}, {
				name: 'Platforms',
				text: 'platforms'
			}, {
				name: 'Genome IDs',
				text: 'genome_ids'
			}, {
				name: 'Release Date',
				text: 'release_date'
			}, {
				name: 'Author',
				text: 'author'
			}, {
				name: 'PI',
				text: 'pi'
			}, {
				name: 'Institution',
				text: 'institution'
			}, {
				name: 'Description',
				text: 'description'
			}];

			var div = domConstruct.create("div");
			displayHeader(div, item.title, "fa icon-experiments fa-2x", "/view/TranscriptomicsExperiment/" + item.eid, options);
			displayDetail(item, columns, div, options);

			return div;
		},

		"transcriptomics_sample_data": function(item, options){
			options = options || {};

			var columns = [{
				name: 'Sample ID',
				text: 'pid'
			}, {
				name: 'Experiment ID',
				text: 'eid'
			}, {
				name: 'Title',
				text: 'expname'
			}, {
				name: 'Samples',
				text: 'samples'
			}, {
				name: 'Genes',
				text: 'genes'
			}, {
				name: 'Significant Genes (Log Ratio)',
				text: 'sig_log_ratio'
			}, {
				name: 'Significant Genes (Z Score)',
				text: 'sig_z_score'
			}, {
				name: 'PubMed',
				text: 'pmid',
				link: 'http://www.ncbi.nlm.nih.gov/pubmed/'
			}, {
				name: 'Link Out',
				text: 'accession',
				link: 'http://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc='
			}, {
				name: 'Organism',
				text: 'organism'
			}, {
				name: 'Strain',
				text: 'strain'
			}, {
				name: 'Gene Modification',
				text: 'mutant'
			}, {
				name: 'Experimental Condition',
				text: 'condition'
			}, {
				name: 'Time Point',
				text: 'timepoint'
			}, {
				name: 'Channels',
				text: 'channels'
			}, {
				name: 'Platform',
				text: 'platform'
			}, {
				name: 'Genome IDs',
				text: 'genome_ids'
			}, {
				name: 'Release Date',
				text: 'release_date'
			}];

			var div = domConstruct.create("div");
			displayHeader(div, item.expname, "fa icon-experiments fa-2x", "/view/TranscriptomicsComparison/" + item.pid, options);
			displayDetail(item, columns, div, options);

			return div;
		},

		"transcriptomics_gene_data": function(item, options){
			options = options || {};

			var columns = [{
				name: "Genome Name",
				text: "genome_name"
			},{
				name: "Accession",
				text: "accession"
			},{
				name: "PATRIC ID",
				text: "patric_id"
			},{
				name: "RefSeq Locus Tag",
				text: "refseq_locus_tag"
			},{
				name: "Alt Locus Tag",
				text: "alt_locus_tag"
			},{
				name: "Gene Symbol",
				text: "gene"
			},{
				name: "Product",
				text: "product"
			},{
				name: "Start",
				text: "start"
			},{
				name: "End",
				text: "end"
			},{
				name: "Strand",
				text: "strand"
			},{
				name: "Comparisons",
				text: "sample_size"
			},{
				name: "Up",
				text: "up"
			},{
				name: "Down",
				text: "down"
			}];

			var label = (item.patric_id) ? item.patric_id : (item.refseq_locus_tag) ? item.refseq_locus_tag : item.alt_locus_tag;
			var div = domConstruct.create("div");
			displayHeader(div, label, "fa icon-genome-features fa-2x", "/view/Feature/" + item.feature_id, options);
			displayDetail(item, columns, div, options);

			return div;
		},

		"genome_data": function(item, options){
			options = options || {};

			var metadataGenomeSummaryID = ['Organism Info', 'Isolate Info', 'Host Info', 'Sequence Info', 'Phenotype Info', 'Project Info', 'Others'];
			var metadataGenomeSummaryValue = {};
			metadataGenomeSummaryValue['Organism Info'] = [{
				name: 'Genome ID',
				text: 'genome_id',
				mini: true
			}, {
				name: 'Genome Name',
				text: 'genome_name',
				mini: true
			}, {
				name: 'NCBI Taxon ID',
				text: 'taxon_id',
				link: 'http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id='
			}, {
				name: 'Genome Status',
				text: 'genome_status',
				mini: true
			}, {
				name: 'Strain',
				text: 'strain'
			}, {
				name: 'Serovar',
				text: 'serovar'
			}, {
				name: 'Biovar',
				text: 'biovar'
			}, {
				name: 'Pathovar',
				text: 'pathovar'
			}, {
				name: 'MLST',
				text: 'mlst'
			}, {
				name: 'Other Typing',
				text: 'other_typing'
			}, {
				name: 'Culture Collection',
				text: 'culture_collection'
			}, {
				name: 'Type Strain',
				text: 'type_strain'
			}, {
				name: 'Antimicrobial Resistance',
				text: 'antimicrobial_resistance'
			}, {
				name: 'Antimicrobial Resistance Evidence',
				text: 'antimicrobial_resistance_evidence'
			}, {
				name: 'Reference Genome',
				text: 'reference_genome'
			}];

			metadataGenomeSummaryValue['Project Info'] = [{
				name: 'Sequencing Center',
				text: 'sequencing_centers'
			}, {
				name: 'Completion Date',
				text: 'completion_date'
			}, {
				name: 'Publication',
				text: 'publication',
				link: 'http://www.ncbi.nlm.nih.gov/pubmed/'
			}, {
				name: 'BioProject Accession',
				text: 'bioproject_accession',
				link: 'http://www.ncbi.nlm.nih.gov/bioproject/?term=',
				mini: true
			}, {
				name: 'BioSample Accession',
				text: 'biosample_accession',
				link: 'http://www.ncbi.nlm.nih.gov/biosample/',
				mini: true
			}, {
				name: 'Assembly Accession',
				text: 'assembly_accession',
				link: 'http://www.ncbi.nlm.nih.gov/assembly/'
			}, {
				name: "SRA Accession",
				text: "sra_accession",
				link: "http://www.ncbi.nlm.nih.gov/sra/?term="
			}, {
				name: 'GenBank Accessions',
				text: 'genbank_accessions',
				link: 'http://www.ncbi.nlm.nih.gov/nuccore/'
			}, {
				name: 'RefSeq Accessions',
				text: 'refseq_accessions',
				link: 'http://www.ncbi.nlm.nih.gov/nuccore/'
			}];

			metadataGenomeSummaryValue['Sequence Info'] = [{
				name: 'Sequencing Status',
				text: 'sequencing_status'
			}, {
				name: 'Sequencing Platform',
				text: 'sequencing_platform'
			}, {
				name: 'Sequencing Depth',
				text: 'sequencing_depth'
			}, {
				name: 'Assembly Method',
				text: 'assembly_method'
			}, {
				name: 'Chromosomes',
				text: 'chromosomes'
			}, {
				name: 'Plasmids',
				text: 'plasmids'
			}, {
				name: 'Contigs',
				text: 'contigs'
			}, {
				name: 'Sequences',
				text: 'sequences',
				link: function(obj){
					return lang.replace('<a href="/view/Genome/{obj.genome_id}#view_tab=sequences">{obj.sequences}</a>', {obj: obj});
				}
			}, {
				name: 'Genome Length',
				text: 'genome_length'
			}, {
				name: 'GC Content',
				text: 'gc_content'
			}, {
				name: 'PATRIC CDS',
				text: 'patric_cds',
				link: function(obj){
					return lang.replace('<a href="/view/Genome/{obj.genome_id}#view_tab=features&filter=and(eq(feature_type,CDS),eq(annotation,PATRIC))">{obj.patric_cds}</a>', {obj: obj});
				}
			}, {
				name: 'RefSeq CDS',
				text: 'refseq_cds'
			}];

			metadataGenomeSummaryValue['Isolate Info'] = [{
				name: 'Isolation Site',
				text: 'isolation_site'
			}, {
				name: 'Isolation Source',
				text: 'isolation_source'
			}, {
				name: 'Isolation Comments',
				text: 'isolation_comments'
			}, {
				name: 'Collection Year',
				text: 'collection_year'
			}, {
				name: 'Collection Date',
				text: 'collection_date'
			}, {
				name: 'Isolation Country',
				text: 'isolation_country'
			}, {
				name: 'Geographic Location',
				text: 'geographic_location'
			}, {
				name: 'Latitude',
				text: 'latitude'
			}, {
				name: 'Longitude',
				text: 'longitude'
			}, {
				name: 'Altitude',
				text: 'altitude'
			}, {
				name: 'Depth',
				text: 'depth'
			}, {
				name: 'Other Environmental',
				text: 'other_environmental'
			}];

			metadataGenomeSummaryValue['Host Info'] = [{
				name: 'Host Name',
				text: 'host_name'
			}, {
				name: 'Host Gender',
				text: 'host_gender'
			}, {
				name: 'Host Age',
				text: 'host_age'
			}, {
				name: 'Host Health',
				text: 'host_health'
			}, {
				name: 'Body Sample Site',
				text: 'body_sample_site'
			}, {
				name: 'Body Sample Subsite',
				text: 'body_sample_subsite'
			}, {
				name: 'Other Clinical',
				text: 'other_clinical'
			}];

			metadataGenomeSummaryValue['Phenotype Info'] = [{
				name: 'Gram Stain',
				text: 'gram_stain'
			}, {
				name: 'Cell Shape',
				text: 'cell_shape'
			}, {
				name: 'Motility',
				text: 'motility'
			}, {
				name: 'Sporulation',
				text: 'sporulation'
			}, {
				name: 'Temperature Range',
				text: 'temperature_range'
			}, {
				name: 'Optimal Temperature',
				text: 'optimal_temperature'
			}, {
				name: 'Salinity',
				text: 'salinity'
			}, {
				name: 'Oxygen Requirement',
				text: 'oxygen_requirement'
			}, {
				name: 'Habitat',
				text: 'habitat'
			}, {
				name: 'Disease',
				text: 'disease'
			}];

			metadataGenomeSummaryValue['Others'] = [{
				name: 'Comments',
				text: 'comments'
			}, {
				name: 'Additional Metadata',
				text: 'additional_metadata'
			}];

			var div = domConstruct.create("div");
			displayHeader(div, item.genome_name, "fa icon-genome fa-2x", "/view/Genome/" + item.genome_id, options);

			var summary = "Length: " + item.genome_length + "bp, Chromosomes: " + (item.chromosomes || 0) + ", Plasmids: " + (item.plasmids || 0) + ", Contigs: " + (item.contigs || 0);

			domConstruct.create("div", {
				innerHTML: summary,
				"class": "DataItemSummary",
				nowrap: "nowrap"
			}, div);

			displayDetailBySections(item, metadataGenomeSummaryID, metadataGenomeSummaryValue, div, options);

			return div;
		}
	};

	function displayHeader(parent, label, iconClass, url, options){
		var linkTitle = options && options.linkTitle || false;

		var titleDiv = domConstruct.create("div", {"class": "DataItemHeader"}, parent);

		// span icon
		domConstruct.create("span", {"class": iconClass}, titleDiv);

		// span label
		domConstruct.create("span", {
			innerHTML: (linkTitle) ? lang.replace('<a href="{url}">{label}</a>', {url: url, label: label}) : label
		}, titleDiv);
	}

	function displayDetailBySections(item, meta_data_section, meta_data, parent, options){

		var mini = options && options.mini || false;

		var table = domConstruct.create("table", {}, parent);
		var tbody = domConstruct.create("tbody", {}, table);

		for(var i = 0; i < meta_data_section.length; i++){
			var tr;
			if(mini == false){

				tr = domConstruct.create("tr", {}, tbody);
				domConstruct.create("td", {
					innerHTML: meta_data_section[i],
					"class": "DataItemSectionHead",
					colspan: 2
				}, tr);
			}

			var value = meta_data[meta_data_section[i]];

			for(var j = 0; j < value.length; j++){
				var column = value[j].text;

				if(column && (item[column] || item[column] == "0")){

					if(!mini || (mini && value[j].mini)){

						tr = domConstruct.create("tr", {}, tbody);
						domConstruct.create("td", {
							"class": "DataItemProperty",
							innerHTML: value[j].name
						}, tr);

						var innerHTML;
						if(value[j].link && item[column] != "-" && item[column] != "0"){
							if(typeof(value[j].link) == "function"){
								innerHTML = value[j].link.apply(this, arguments);
							}else{
								innerHTML = "<a href='" + value[j].link + item[column] + "' target ='_blank'>" + item[column] + "</a>";
							}
						}
						else{
							innerHTML = item[column];
						}

						domConstruct.create("td", {
							"class": "DataItemValue",
							innerHTML: innerHTML
						}, tr);
					}
				}
			}
		}
	}

	function displayDetail(item, column_data, parent, options){
		var mini = options && options.mini || false;

		var table = domConstruct.create("table", {}, parent);
		var tbody = domConstruct.create("tbody", {}, table);

		for(var i = 0; i < column_data.length; i++){
			var column = column_data[i].text;

			if(column && (item[column] || item[column] == "0") && !column_data[i].data_hide){

				if(!mini || (mini && column_data[i].mini)){

					var tr = domConstruct.create("tr", {}, tbody);
					domConstruct.create("td", {
						"class": "DataItemProperty",
						innerHTML: column_data[i].name
					}, tr);

					var innerHTML;
					if(column_data[i].link && item[column] != "-" && item[column] != "0"){
						if(typeof(column_data[i].link) == "function"){
							innerHTML = column_data[i].link.apply(this, arguments);
						}else{
							innerHTML = "<a href='" + column_data[i].link + item[column] + "' target ='_blank'>" + item[column] + "</a>";
						}
					}
					else{
						innerHTML = item[column];
					}

					domConstruct.create("td", {
						"class": "DataItemValue",
						innerHTML: innerHTML
					}, tr);
				}
			}
		}
	}
	
	return function(item, type, options){

		var new_type;
		switch(type){
			case "genome_group":
				new_type = "genome_data";
				break;
			case "feature_group":
				new_type = "feature_data";
				break;
			case "experiment":
				new_type = "transcriptomics_sample_data";
				break;
			default:
				new_type = (formatters[type])? type : "default";
				// console.log("display in " + new_type + " format");
		}

		return formatters[new_type](item, options);
	}
});
