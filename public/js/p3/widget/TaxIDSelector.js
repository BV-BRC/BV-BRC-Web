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
		//query: "?&select(taxon_id)",
		query: {select: "taxon_name,taxon_id"},
		queryExpr: "${0}",
		autoComplete: false,
		store: null,
		required: false,

		constructor: function(){
			if (!this.store){
				this.store = new Store({target: this.apiServiceUrl + "/taxonomy/", idProperty: "taxon_id", headers: {accept: "application/json", "Authorization":(window.App.authorizationToken||"")}});
			}
		},
		/*
		validate: function (){
			// Overrides `dijit/form/TextBox.validate`
			this.valueNode.value = this.toString();
			return this.inherited(arguments);
		}*/
		isValid: function (){
			// Overrides ValidationTextBox.isValid()
			var error= !this.inherited(arguments);
			return !(error && this.required);
			//return !!this.item || (!this.required && this.get('displayedValue') == ""); // #5974
		}
	});
});
