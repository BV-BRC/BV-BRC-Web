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

		"someOtherType": function(item, options){
			// do some other type formatting here and return it
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
				text : 'genome_id'
			}, {
				name : 'Genome Name',
				text : 'genome_name'
			}, {
				name : 'NCBI Taxon ID',
				text : 'taxon_id'
			}, {
				name : 'Genome Status',
				text : 'genome_status'
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
				link : 'http://www.ncbi.nlm.nih.gov/bioproject/?term='
			}, {
				name : 'BioSample Accession',
				text : 'biosample_accession',
				link : 'http://www.ncbi.nlm.nih.gov/biosample/'
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

			diaplayColumns = {
				genome_id: 1,
				genome_name: 1,
				taxon_id: 1,
				genome_status: 1,
				organism_name: 1,
				strain: 1,
				serovar: 1,
				biovar: 1,
				pathovar: 1,
				mlst: 1,
				other_typing: 1,
				culture_collection: 1,
				type_strain: 1,
				antimicrobial_resistance: 1,
				antimicrobial_resistance_evidence: 1,
				sequencing_centers: 1,
				completion_date: 1,
				publication: 1,
				bioproject_accession: 1,
				biosample_accession: 1,
				assembly_accession: 1,
				genbank_accessions: 1,
				refseq_accessions: 1,
				sequencing_status: 1,
				sequencing_platform: 1,
				sequencing_depth: 1,
				assembly_method: 1,
				chromosomes: 1,
				plasmids: 1,
				contigs: 1,
				sequences: 1,
				genome_length: 1,
				gc_content: 1,
				patric_cds: 1,
				refseq_cds: 1,
				isolation_site: 1,
				isolation_source: 1,
				isolation_comments: 1,
				collection_date: 1,
				isolation_country: 1,
				geographic_location: 1,
				latitude: 1,
				longitude: 1,
				altitude: 1,
				depth: 1,
				other_environmental: 1,
				host_name: 1,
				host_gender: 1,
				host_age: 1,
				host_health: 1,
				body_sample_site: 1,
				body_sample_subsite: 1,
				other_clinical: 1,
				gram_stain: 1,
				cell_shape: 1,
				motility: 1,
				sporulation: 1,
				temperature_range: 1,
				optimal_temperature: 1,
				salinity: 1,
				oxygen_requirement: 1,
				habitat: 1,
				disease: 1,
				comments: 1,
				additional_metadata: 1};



			var div = domConstruct.create("div");
			var hdr_div = domConstruct.create("div", {}, div);

			var hdr_table = domConstruct.create("table", {} , div);
			var hdr_tbody = domConstruct.create("tbody",{}, hdr_table);
			var hdr_th = domConstruct.create("tr",{},hdr_tbody);
			var hdr_tda = domConstruct.create("td",{}, hdr_th);
			var span = domConstruct.create("span", {class: "fa icon-genome fa-2x"}, hdr_tda);
			var hdr_tdb = domConstruct.create("td",{innerHTML: item.genome_name, style: "font-weight: bold"}, hdr_th);

			var dtl_div = domConstruct.create("div", {}, div);
			var table = domConstruct.create("table", {} , dtl_div);
			var tbody = domConstruct.create("tbody",{},table);

			var	tr = domConstruct.create("tr", {},tbody);
			var	tda = domConstruct.create("td", {}, tr);
			domConstruct.create("hr", {}, tda);
			var	tdb = domConstruct.create("td", {innerHTML: ""}, tr);
			domConstruct.create("hr", {}, tdb);


			var summary = "Length: " + item.genome_length + "bp, Chromosomes: " + item.chromosomes + ", Plasmids: " + item.plasmids + ", Contigs: " + item.contigs;
			tr = domConstruct.create("tr", {},tbody);
			tda = domConstruct.create("td", {innerHTML: "Summary:", style: "font-weight: bold"}, tr);
			tdb = domConstruct.create("td", {innerHTML: summary}, tr);

			console.log("metadataGenomeSummaryID.length=", metadataGenomeSummaryID.length);

			for(var i=0; i< metadataGenomeSummaryID.length; i++)
			{
				tr = domConstruct.create("tr", {},tbody);
				tda = domConstruct.create("td", {}, tr);
				domConstruct.create("hr", {}, tda);
				tdb = domConstruct.create("td", {innerHTML: ""}, tr);
				domConstruct.create("hr", {}, tdb);

				tr = domConstruct.create("tr", {},tbody);
				tda = domConstruct.create("td", {innerHTML: metadataGenomeSummaryID[i]+":", style: "font-weight: bold"}, tr);
				tdb = domConstruct.create("td", {innerHTML: ""}, tr);
				

				var value = metadataGenomeSummaryValue[metadataGenomeSummaryID[i]];
				console.log("metadataGenomeSummaryValue[metadataGenomeSummaryID[i]]=", value);
				console.log("value.length=", value.length);
				
				for(var j=0; j<value.length; j++) {
					// console.log("value[j]=", value[j]);
					// console.log("value[j].text=", value[j].text);
					var column = value[j].text;
					//console.log("column=", column);
					//console.log("item[column]=", item[column]);
					if (column && item[column])
					{
						console.log("column=", column);
						console.log("item[column]=", item[column]);
						console.log("value[j].name=", value[j].name);
						
						if (value[j].link && item[column] != "-")
						{
							tr = domConstruct.create("tr",{},tbody);
							tda = domConstruct.create("td",{innerHTML: value[j].name}, tr);
							tdb = domConstruct.create("td",{innerHTML: "<a href='" + value[j].link + item[column] + "' target ='_blank'>" + item[column] + "</a>"}, tr);
						}
						else
						{
							tr = domConstruct.create("tr",{},tbody);
							tda = domConstruct.create("td",{innerHTML: value[j].name}, tr);
							tdb = domConstruct.create("td",{innerHTML: item[column]}, tr);						
						}
					}
				}
				
			}

			var additional = 0;
			
			Object.keys(item).sort().forEach(function(key){
				if (diaplayColumns[key] != 1 && item[key])
				{
					if (additional ==0)
					{
						tr = domConstruct.create("tr", {},tbody);
						tda = domConstruct.create("td", {}, tr);
						domConstruct.create("hr", {}, tda);
						tdb = domConstruct.create("td", {innerHTML: ""}, tr);
						domConstruct.create("hr", {}, tdb);
					
						tr = domConstruct.create("tr", {},tbody);
						tda = domConstruct.create("td", {innerHTML: "Additional Info:", style: "font-weight: bold"}, tr);
						tdb = domConstruct.create("td", {innerHTML: ""}, tr);					
					}
					additional ++;
					tr = domConstruct.create("tr",{},tbody)
					tda = domConstruct.create("td",{innerHTML: key}, tr);
					tdb = domConstruct.create("td",{innerHTML: item[key]}, tr);
				}
			},this);		
			

			return div;

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
