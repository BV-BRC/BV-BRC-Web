define("cid/widget/GenomeGrid", [
	"dojo/_base/declare","./Grid","dojo/on",
	"dojo/dom-class"
], function(
	declare, Grid, on,
	domClass
){

	return declare([Grid], {
		"class": "GenomeGrid",
		dndSourceType:"gid",
		dataModel: "genomesummary",
		constructor: function(){
			this.columns={ 
				"organismName": {
					label: "Organism Name",
					className: "nameColumn organismNameColumn",
					field: "organism_name",
					sortable: true
				},
				"genomeStatus": {
					label: "Genome Status",
					className: "statusColumn genomeStatusColumn",
					field: "genome_status",
					sortable: true
				},
				"patricCDS": {
					label: "PATRIC CDS",
					className: "idColumn",
					field: "rast_cds",
					sortable: true
				},
				"isolationCountry": {
					label: "Isolation Country",
					className: "countryColumn",
					field: "isolation_country",
					sortable: true
				},
				"hostname": {
					label: "Host Name",
					className: "nameColumn",
					field: "host_name",
					sortable: true
				},
				"disease": {
					label: "Disease",
					className: "diseaseColumn",
					field: "disease",
					sortable: true
				},
				"collectionDate": {
					label: "Collection Date",
					className: "dateColumn",
					field: "collection_date",
					sortable: true
				},
				"completionDate": {
					label: "Completion Date",
					className: "dateColumn",
					field: "completion_date",
					sortable: true
				},
				"genbankAccessions": {
					label: "Genbank Accessions",
					className: "idColumn",
					field: "genbank_accessions",
					hidden:true,
					sortable: true
				},
				"contigs": {
					label: "Contigs",
					field: "contigs",
					hidden:true,
					sortable: true
				},
				"ncbi_project_id": {
					label: "NCBI Project ID",
					field: "ncbi_project_id",
					hidden:true,
					sortable: true
				},
				"genome_info_id": {
					label: "Genome Info ID",
					field: "genome_info_id",
					hidden:true,
					sortable: true
				},
				"publication": {
					label: "Publication",
					field: "publication",
					hidden:true,
					sortable: true
				},
				"sequencing_center": {
					label: "Sequencing Centers",
					field: "sequencing_centers",
					hidden:true,
					sortable: true
				},
				"genome_length": {
					label: "Genome Length",
					field: "genome_length",
					hidden:true,
					sortable: true
				},
				"taxon_id": {
					label: "NCBI Taxon ID",
					field: "ncbi_tax_id",
					hidden:true,
					sortable: true
				},
				"sequences": {
					label: "Sequences",
					field: "sequences",
					hidden:true,
					sortable: true
				},
				"refseq_cds": {
					label: "RefSeq CDS",
					field: "refseq_cds",
					hidden:true,
					sortable: true
				},
				"brc_cds": {
					label: "BRC CDS",
					field: "brc_cds",
					hidden:true,
					sortable: true
				},
				"isolation_source": {
					label: "Isolation Source",
					field: "isolation_source",
					hidden:true,
					sortable: true
				},
				"host_health": {
					label: "Host Health",
					field: "host_health",
					hidden:true,
					sortable: true
				},
				"sequencing_platform": {
					label: "Sequencing Platform",
					field: "sequencing_platform",
					hidden:true,
					sortable: true
				},
				"plasmids": {
					label: "Plasmids",
					field: "plasmids",
					hidden:true,
					sortable: true
				},
				"assembly_method": {
					label: "Assembly Method",
					field: "assembly_method",
					hidden:true,
					sortable: true
				},
				"chromosomes": {
					label: "Chromosomes",
					field: "chromosomes",
					hidden:true,
					sortable: true
				},
				"availability": {
					label: "Availability",
					field: "availability",
					hidden:true,
					sortable: true
				},
				"common_name": {
					label: "Common Name",
					field: "common_name",
					hidden:true,
					sortable: true
				},
				"sequencing_depth": {
					label: "Sequencing Depth",
					field: "sequencing_depth",
					hidden:true,
					sortable: true
				},
				"isolation_comments": {
					label: "Isolation Comments",
					field: "isolation_comments",
					hidden:true,
					sortable: true
				},
				"culture_collection": {
					label: "Culture Collection",
					field: "culture_collection",
					hidden:true,
					sortable: true
				},
				"strain": {
					label: "Strain",
					field: "strain",
					hidden:true,
					sortable: true
				},
				"gc_content": {
					label: "GC Content",
					field: "gc_content",
					hidden:true,
					sortable: true
				},
				"lineage": {
					label: "Lineage",
					field: "taxon_lineage_names",
					hidden:true,
					sortable: true
				}
			}
		},
		buildQuery: function(table, extra){
			return  "?" + (this.activeFilter?( "" + this.activeFilter +"" ):"") ;
		}

	});
});
