define([
	"dojo/_base/declare","./TabViewerBase","dojo/on", "dojo/_base/lang",
	"dojo/dom-class","dijit/layout/ContentPane","dojo/dom-construct",
	"../formatter","dijit/layout/TabContainer","../GenomeOverview",
	"dojo/request","dojo/_base/lang","../FeatureGridContainer","../SpecialtyGeneGridContainer",
	"../ActionBar","../ContainerActionBar","../PathwaysContainer","../ProteinFamiliesContainer",
	"../DiseaseContainer","../PublicationGridContainer","../CircularViewerContainer",
	"../TranscriptomicsContainer"/*,"JBrowse/Browser"*/,"../InteractionsContainer","../GenomeGridContainer"
], function(
	declare, TabViewerBase, on, lang,
	domClass,ContentPane,domConstruct,
	formatter,TabContainer,GenomeOverview,
	xhr,lang,FeatureGridContainer,SpecialtyGeneGridContainer,
	ActionBar,ContainerActionBar,PathwaysContainer,ProteinFamiliesContainer,
	DiseaseContainer,PublicationGridContainer,CircularViewerContainer,
	TranscriptomicsContainer/*, JBrowser*/,InteractionsContainer,GenomeGridContainer
){
	return declare([TabViewerBase], {
		paramsMap: "query",

		_setQueryAttr: function(query){

			console.log("GenomeList SetQuery: ", query);		
			if (query == this.query){
				console.log("GenomeList: Skip Unchanged query", query);
				return;
			}

			this.query = query;

			var _self=this;

	

			xhr.get(this.apiServiceUrl + "/genome/" + (query||"?") + "&select(genome_id)&limit(100)",{
				headers: {
					accept: "application/json"
				},
				handleAs: "json"	
			}).then(function(genomes) {
				_self.genome_ids = genomes.map(function(o) { return o.genome_id; }); 
				_self.refresh();
			});

		},

		refresh: function(){
			var _self=this;

			if (_self.genomes){ _self.genomes.set("query", _self.query) }
			if (_self.features){ _self.features.set("query", "?in(genome_id,(" + _self.genome_ids.join(",") + "))"); }
			if (_self.specialtyGenes){ _self.specialtyGenes.set("query", "?in(genome_id,(" + _self.genome_ids.join(",") + "))"); }

		},

		postCreate: function(){
			this.inherited(arguments);

			this.phylogeny= new ContentPane({content: "Phylogeny", title: "Phylogeny",id: this.viewer.id + "_" + "phylogeny"});
			this.genomes= new GenomeGridContainer({title: "Genomes",id: this.viewer.id + "_" + "genomes", query: this.params});

			this.browserPanel = new ContentPane({title: "Genome Browser", content: '<div id="' + this.id + "_jbrowse" + '"></div>',id: this.viewer.id + "_" + "browserPanel"});
			this.circularViewer= new CircularViewerContainer({title: "Circular Viewer",id: this.viewer.id + "_" + "circularViewer"});
			this.features = new FeatureGridContainer({title: "Features", id: this.viewer.id + "_" + "features"});
			this.specialtyGenes= new SpecialtyGeneGridContainer({title: "Specialty Genes",id: this.viewer.id + "_" + "specialtyGenes"});
			this.pathways= new PathwaysContainer({title: "Pathways",id: this.viewer.id + "_" + "pathways"});
			this.proteinFamilies= new ProteinFamiliesContainer({title: "Protein Families",id: this.viewer.id + "_" + "proteinFamilies"});
			this.transcriptomics= new TranscriptomicsContainer({title: "Transcriptomics",id: this.viewer.id + "_" + "transcriptomics"});

			this.viewer.addChild(this.phylogeny);
			this.viewer.addChild(this.genomes);
			this.viewer.addChild(this.browserPanel);
			this.viewer.addChild(this.circularViewer);
			this.viewer.addChild(this.features);
			this.viewer.addChild(this.specialtyGenes);
			this.viewer.addChild(this.pathways);
			this.viewer.addChild(this.proteinFamilies);
			this.viewer.addChild(this.transcriptomics);


//			this.genomeBrowser= new JBrowser({
//				title: "Genome Browser",
////				include: [],
////				css: [],
//				dataRoot: "/public/js/jbrowse.repo/sample_data/json/volvox",
//				nameUrl: "{dataRoot}/names/meta.json",
//				containerID: this.id + "_jbrowse",
//				updateBrowserURL:false,
//				stores: { url: { type: "JBrowse/Store/SeqFeature/FromConfig", features: [] } },
//			});
	
		}
	});
});
