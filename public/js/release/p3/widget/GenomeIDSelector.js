define("p3/widget/GenomeIDSelector", [
	"dijit/form/FilteringSelect","dojo/_base/declare",
	"dojo/store/JsonRest"
], function(
	FilteringSelect, declare, 
	Store
){
	
	return declare([FilteringSelect], {
		apiServiceUrl: window.App.dataAPI,
		promptMessage:'Genome ID.',
		missingMessage:'GenomeID is not specified.',
		placeHolder:'',
		searchAttr: "genome_id",
		//query: "?&select(taxon_id)",
		query: {select: "genome_name,genome_id"},
		queryExpr: "${0}",
		autoComplete: false,
		store: null,
		required: false,

		constructor: function(){
			if (!this.store){
				this.store = new Store({target: this.apiServiceUrl + "/genome/", idProperty: "genome_id", header: {accept: "application/json"}});
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
