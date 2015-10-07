define([
	"dojo/_base/declare","./GenomeList","dojo/on",
	"dojo/dom-class","dijit/layout/ContentPane","dojo/dom-construct",
	"../formatter","dijit/layout/TabContainer","../GenomeOverview",
	"dojo/request","dojo/_base/lang","../FeatureGridContainer","../SpecialtyGeneGridContainer",
	"../ActionBar","../ContainerActionBar","../PathwaysContainer","../ProteinFamiliesContainer",
	"../DiseaseContainer","../PublicationGridContainer","../CircularViewerContainer",
	"../TranscriptomicsContainer","JBrowse/Browser","../InteractionsContainer"
], function(
	declare, GenomeList, on,
	domClass,ContentPane,domConstruct,
	formatter,TabContainer,GenomeOverview,
	xhr,lang,FeatureGridContainer,SpecialtyGeneGridContainer,
	ActionBar,ContainerActionBar,PathwaysContainer,ProteinFamiliesContainer,
	DiseaseContainer,PublicationGridContainer,CircularViewerContainer,
	TranscriptomicsContainer, JBrowser,InteractionsContainer
){
	return declare([GenomeList], {
		params: null,
		taxon_id: "",
		apiServiceUrl: window.App.dataAPI,
		_setParamsAttr: function(params){
			this.set("taxon_id", params);	
		},
		_setTaxon_idAttr: function(id){
			this.taxon_id = id;
			xhr.get(this.apiServiceUrl + "/taxonomy/" + id,{
				headers: {
					accept: "application/json"
				},
				handleAs: "json"	
			}).then(lang.hitch(this,function(taxonomy) {
				this.taxonomy=taxonomy;
				console.log("Taxonomy: ", taxonomy);
				this.set("query","?eq(taxon_lineage_ids," + id + ")"); 
			}));
		},
		_setQueryAttr: function(query){
			this.query = query;
			if (this.viewer){
				this.viewer.set("query", query);
			}
		},
		refresh: function(){
			this.viewHeader.set("content", this.taxonomy.lineage_names.slice(1).join("&nbsp;&raquo;&nbsp;"));
//			this.features.set("query", "?eq(genome_id," + this.genome.genome_id + ")");	
//			this.specialtyGenes.set("query", "?eq(genome_id," + this.genome.genome_id + ")");	
		},
		postCreate: function(){
			//if (this._started) {return;}
			this.inherited(arguments);
		},

		startup: function(){
			if (this._started) { return; }
			this.inherited(arguments);
			if (this.genome) {
				this.refresh();
			}
		}
	});
});
