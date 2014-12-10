define("cid/widget/PublicationsGrid", [
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
				"publication": {
					label: "Publication",
					className: "genomeNameColumn",
					field: "genomeName",
					sortable: true
				}
			}
		}
	});
});
