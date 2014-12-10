define("cid/widget/ProteinFamilyGrid", [
	"dojo/_base/declare","./Grid","dojo/on",
	"dojo/dom-class"
], function(
	declare, Grid, on,
	domClass
){
	return declare([Grid], {
		"class": "FeatureGrid",
		constructor: function(){
			this.columns={ 
				"ID": {
					label: "FigFam ID",
					className: "idColumn",
					field: "figfam_id",
					sortable: true
				},
				"Proteins": {
					label: "Proteins",
					className: "proteinsColumn",
					field: "proteins",
					sortable: true
				},
				"Genomes": {
					label: "Genomes",
					className: "genomesColumn",
					field: "genomes",
					sortable: true
				},
				"description": {
					label: "Product Description",
					className: "descriptionColumn",
					field: "figfam_product",
					sortable: true
				},
				"minAALength": {
					label: "Min AA Length",
					className: "lengthColumn",
					field: "end_min",
					sortable: true
				},
				"maxAALength": {
					label: "Max AA Length",
					className: "lengthColumn",
					field: "start_max",
					sortable: true
				},
				"mean": {
					label: "Mean",
					className: "meanColumn",
					field: "mean",
					sortable: true
				},
				"std": {
					label: "Std",
					className: "stdColumn",
					field: "stdColumn",
					sortable: true
				}
			}
		}
	});
});
