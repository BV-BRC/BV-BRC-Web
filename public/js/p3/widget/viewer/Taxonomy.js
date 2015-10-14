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
				console.log("Set query for taxonomy genome list");
				this.set("query","?eq(taxon_lineage_ids," + id + ")"); 
			}));
		},

		createOverviewPanel: function(){
			return new ContentPane({content: "Taxonomy Overview", title: "Overview",id: this.viewer.id + "_" + "overview"});
		},
		refresh: function(){
			var _self=this;
			this.viewHeader.set("content", this.taxonomy.lineage_names.slice(1).join("&nbsp;&raquo;&nbsp;"));
			if (_self.viewHeader){
				this.viewHeader.set("content", this.taxonomy.lineage_names.slice(1).join("&nbsp;&raquo;&nbsp;"));
			}
			if (_self.genomes){ _self.genomes.set("query", "?in(genome_id,(" + _self.genome_ids.join(",") + "))") }

			if (_self.features){ _self.features.set("query", "?in(genome_id,(" + _self.genome_ids.join(",") + "))"); }
			if (_self.specialtyGenes){ _self.specialtyGenes.set("query", "?in(genome_id,(" + _self.genome_ids.join(",") + "))"); }
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
