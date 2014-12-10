define("cid/widget/BiosetGrid", [
	"dojo/_base/declare","./Grid","dojo/on",
	"dojo/dom-class","./formatter"
], function(
	declare, Grid, on,
	domClass,Formatter
){
	return declare([Grid], {
		dataModel: "bioset",
		"class": "NewsGrid",
		dndSourceType: "bioset",
		constructor: function(){
			this.columns={ 
				"id": {
					label: "BioSet ID",
					className: "idColumn",
					field: "biosetId",
					sortable: true
				},
				"host": {
					label: "Host",
					className: "titleColumn",
					field: "host",
					sortable: true
				},
				"pathogen": {
					label: "Pathogen/Stimulating Factor",
					className: "",
					field: "pathogen",
					sortable: true
				},
				"experimentType": {
					label: "Experiment Type",
					className: "",
					field: "experimentType",
					sortable: true
				},
				"geneList": {
					label: "Gene List",
					className: "",
				},
				"selectionCriteria": {
					label: "Selection Criteria",
					className: "",
					field: "selectionCriteria",
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
