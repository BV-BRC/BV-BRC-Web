define([
	"dijit/form/FilteringSelect","dojo/_base/declare",
	"dojo/store/JsonRest"
], function(
	FilteringSelect, declare, 
	Store
){
	
	return declare([FilteringSelect], {
		apiServiceUrl: window.App.dataAPI,
		promptMessage:'NCBI Taxonomy ID.',
		missingMessage:'NCBI Tax ID is not specified.',
		placeHolder:'',
		searchAttr: "taxon_id",
		query: "?&select(taxon_id)",
		autoComplete: false,
		store: null,

		constructor: function(){
			if (!this.store){
				this.store = new Store({target: this.apiServiceUrl + "/taxonomy/", idProperty: "taxon_id", header: {accept: "application/json"}});
			}
		}
	});
});
