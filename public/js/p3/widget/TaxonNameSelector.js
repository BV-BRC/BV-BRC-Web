define([
	"dijit/form/ComboBox","dojo/_base/declare",
	"dojo/store/JsonRest"
], function(
	ComboBox, declare, 
	Store
){
	
	return declare([ComboBox], {
		apiServiceUrl: window.App.dataAPI,
		promptMessage:'Scientific name of the organism being annotated.',
		missingMessage:'Scientific Name must be provided.',
		placeHolder:'Bacillus Cereus',
		searchAttr: "taxon_name",
		query: "?&select(taxon_name)",
		queryExpr: "*${0}*",
		highlightMatch: "all",
		autoComplete: false,
		store: null,

		constructor: function(){
			if (!this.store){
				this.store = new Store({target: this.apiServiceUrl + "/taxonomy/", idProperty: "taxon_id", header: {accept: "application/json"}});
			}
		}
	});
});
