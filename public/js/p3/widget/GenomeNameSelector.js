define([
	"dijit/form/FilteringSelect","dojo/_base/declare",
	"dojo/store/JsonRest"
], function(
	FilteringSelect, declare, 
	Store
){
	
	return declare([FilteringSelect], {
		apiServiceUrl: window.App.dataAPI,
		promptMessage:'Genome name.',
		missingMessage:'Specify genome name.',
		placeHolder:'e.g. Bacillus Cereus',
		searchAttr: "genome_name",
		//query: "?&select(taxon_name)",
		queryExpr: "*${0}*",
		query: {select: "genome_name,genome_id,strain"},
		highlightMatch: "all",
		autoComplete: false,
		store: null,
		constructor: function(){
			if (!this.store){
				this.store = new Store({target: this.apiServiceUrl + "/genome/", idProperty: "genome_id", header: {accept: "application/json"}});
			}
		},
		isValid: function(){
			return (!this.required || this.get('displayedValue') != "");
		},
        labelFunc: function(item, store){
            var label=item.genome_name
            if(item.strain && !(item.genome_name.indexOf(item.strain, item.genome_name.length - item.strain.length) !== -1)){
                label+=" "+item.strain;
            }
            else if(item.genbank_accessions){
                label+=" "+item.genbank_accessions;
            }
            else if(item.biosample_accession){
                label+=" "+item.biosample_accession;
            }
            else if(item.bioproject_accession){
                label+=" "+item.bioproject_accession;
            }
            else if(item.assembly_accession){
                label+=" "+item.assembly_accession;
            }
            else{
                label+=" "+item.genome_id;
            }
            return label;
        }

	});
});
