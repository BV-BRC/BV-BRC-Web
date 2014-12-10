define("cid/widget/GenomeSeqStatGrid", [
	"dojo/_base/declare","./Grid","dojo/on",
	"dojo/dom-class","./formatter"
], function(
	declare, Grid, on,
	domClass,Formatter
){
	return declare([Grid], {
		dataModel: "bioset",
		"class": "NewsGrid",
		constructor: function(){
			this.columns={ 
				"genomename": {
					label: "Genome Name",
					className: "nameColumn",
					field: "genomeName",
					sortable: true
				},
				"BRC": {
					label: "BRC",
					className: "titleColumn",
					field: "brc",
					sortable: true
				},
				"gsc": {
					label: "GSC",
					className: "",
					field: "gsc",
					sortable: true
				},
				"organismType": {
					label: "Organism Type",
					className: "",
					field: "organismType",
					sortable: true
				},
				"taxon": {
					label: "Taxon ID",
					className: "",
					field: "taxonId",
					sortable: true
				},
				"status": {
					label: "Status",
					className: "statusColumn",
					field: "status",
					sortable: true
				}
			}
		}
	});
});
