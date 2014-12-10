define("cid/widget/NewsGrid", [
	"dojo/_base/declare","./Grid","dojo/on",
	"dojo/dom-class","./formatter"
], function(
	declare, Grid, on,
	domClass,Formatter
){
	return declare([Grid], {
		dataModel: "news",
		"class": "NewsGrid",
		constructor: function(){
			this.columns={ 
				"author": {
					label: "author",
					className: "authorColumn",
					field: "genome_name",
					sortable: true
				},
				"title": {
					label: "Title",
					className: "titleColumn",
					field: "accession",
					sortable: true
				},
				"publicationDate": {
					label: "Publication Date",
					className: "dateColumn",
					field: "accession",
					sortable: true,
					formatter: Formatter.dateOnly
				}
			}
		}
	});
});
