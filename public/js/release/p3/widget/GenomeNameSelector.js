define("p3/widget/GenomeNameSelector", [
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
		placeHolder:'e.g. Mycobacterium tuberculosis H37Rv',
		searchAttr: "genome_name",
		//query: "?&select(taxon_name)",
		queryExpr: "*${0}*",
		query: {select: "genome_name,genome_id,strain"},
		highlightMatch: "all",
		autoComplete: false,
		store: null,
        labelType:'html',
		constructor: function(){
			if (!this.store){
				this.store = new Store({target: this.apiServiceUrl + "/genome/", idProperty: "genome_id", header: {accept: "application/json"}});
			}
		},
		/*isValid: function(){
			return (!this.required || this.get('displayedValue') != "");
		},*/
        labelFunc: function(item, store){
            var label="";
            if (typeof item.public !== 'undefined' && !item.public){
                label+="<i class='fa icon-lock3 fa-1x' />&nbsp;";
            }
            else {
                label+="<i class='fa fa-1x'> &nbsp; </i>&nbsp;";
            }

            label+=item.genome_name;
            var strainAppended=false;
            if(item.strain){
                strainAppended= (item.genome_name.indexOf(item.strain, item.genome_name.length - item.strain.length) !== -1);
                if(!strainAppended){
                    label+=" "+item.strain;
                    strainAppended=true;
                }
            }
            label+= " ["+item.genome_id+"]";
            /*else if(!strainAppended){
                if(item.genbank_accessions){
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
            }*/
            return label;
        }

	});
});
