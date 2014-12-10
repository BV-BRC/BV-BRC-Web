define("cid/widget/SequenceGrid", [
	"dojo/_base/declare","./Grid","dojo/on",
	"dojo/dom-class"
], function(
	declare, Grid, on,
	domClass
){
	return declare([Grid], {
		dataModel: "sequenceinfo",
		"class": "SequenceGrid",
		constructor: function(){
			this.columns={ 
				"genomeName": {
					label: "Genome Name",
					className: "genomeNameColumn",
					field: "genome_name",
					sortable: true
				},
				"accession": {
					label: "Accession",
					className: "idColumn",
					field: "accession",
					sortable: true
				},
				/*"genomeBrowser": {
					label: "Genome Browser",
					className: "iconColumn genomeBrowserIcon",
					field: "genomeBrowser",
					sortable: true
				},*/
				"length": {
					label: "Length (bp)",
					className: "numberColumn lengthColumn",
					field: "length",
					sortable: true
				},
				"gcContent": {
					label: "GC Content",
					className: "percentageColumn",
					field: "gc_content",
					sortable: true
				},
				"description": {
					label: "Description",
					className: "descriptionColumn",
					field: "description",
					sortable: true
				}
	
			}
		}
	});
});
