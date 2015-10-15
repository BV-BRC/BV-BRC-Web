define([
	"dojo/_base/declare","./TabViewerBase","dojo/on", "dojo/_base/lang",
	"dojo/dom-class","dijit/layout/ContentPane","dojo/dom-construct","dojo/topic",
	"../formatter","dijit/layout/TabContainer","../GenomeOverview",
	"dojo/request","dojo/_base/lang","../FeatureGridContainer","../SpecialtyGeneGridContainer",
	"../ActionBar","../ContainerActionBar","../PathwaysContainer","../ProteinFamiliesContainer",
	"../DiseaseContainer","../PublicationGridContainer","../CircularViewerContainer",
	"../TranscriptomicsContainer"/*,"JBrowse/Browser"*/,"../InteractionsContainer","../GenomeGridContainer"
], function(
	declare, TabViewerBase, on, lang,
	domClass,ContentPane,domConstruct,Topic,
	formatter,TabContainer,GenomeOverview,
	xhr,lang,FeatureGridContainer,SpecialtyGeneGridContainer,
	ActionBar,ContainerActionBar,PathwaysContainer,ProteinFamiliesContainer,
	DiseaseContainer,PublicationGridContainer,CircularViewerContainer,
	TranscriptomicsContainer/*, JBrowser*/,InteractionsContainer,GenomeGridContainer
){
	return declare([TabViewerBase], {
		paramsMap: "query",
		maxGenomesPerList: 5000,
		totalGenomes: 0,
		constructor: function(){
			console.log(this.id, "GenomeList ctor() this: ", this);
		},

		_setQueryAttr: function(query){
			// console.log(this.id, " _setQueryAttr: ", query, this);
			//if (!query) { console.log("GENOME LIST SKIP EMPTY QUERY: ");  return; }
			// console.log("GenomeList SetQuery: ", query, this);		
			if (query == this.query){
				console.log("GenomeList: Skip Unchanged query", query);
				return;
			}
			this._set("query", query);
			if (!this._started) { return; }

			var _self=this;
			console.log('genomeList setQuery - this.query: ', this.query)

			var url = this.apiServiceUrl + "/genome/" + (this.query||"?") + "&select(genome_id)&limit(5000)";

			console.log("url: ",  url)
			xhr.get(url,{
				headers: {
					accept: "application/solr+json",
	                'X-Requested-With': null,
	                'Authorization': (window.App.authorizationToken || "")
				},
				handleAs: "json"	
			}).then(function(res) {
				console.log(" URL: ", url);
				console.log("Get GenomeList Res: ", res);
				if (res && res.response && res.response.docs){
					var genomes = res.response.docs;
					if (genomes){
						_self._set("total_genomes", res.response.numFound);
						var genome_ids = genomes.map(function(o) { return o.genome_id; });
						_self._set("genome_ids", genome_ids)
					}
				}else{
					console.log("Invalid Response for: ", url);
				}
			}, function(err){
				console.log("Error Retreiving Genomes: ", err)
			});

		},

		onSetQuery: function(attr,oldVal,newVal){
			this.genomes.set('query', newVal);
		},		

		onSetGenomeIds: function(attr,oldVal,newVal){
			if (this.features){ this.features.set("query", "?in(genome_id,(" + this.genome_ids.join(",") + "))"); }
			if (this.specialtyGenes){ this.specialtyGenes.set("query", "?in(genome_id,(" + this.genome_ids.join(",") + "))"); }
		},

		createOverviewPanel: function(){
			return new ContentPane({content: "Overview", title: "Overview",id: this.viewer.id + "_" + "overview"});
		},

		postCreate: function(){
			this.inherited(arguments);
			console.log(this.id, " postCreate(): ", this)
			this.viewHeader.set("content", '<div style="margin:4px;">Genome List</div>')
			this.overview = this.createOverviewPanel();

			this.phylogeny= new ContentPane({maxGenomeCount: 5000,content: "Phylogeny", title: "Phylogeny",id: this.viewer.id + "_" + "phylogeny", disabled: true});
			this.genomes= new GenomeGridContainer({title: "Genomes",id: this.viewer.id + "_" + "genomes"});

			this.features = new FeatureGridContainer({title: "Features", id: this.viewer.id + "_" + "features", disabled: true});
			this.specialtyGenes= new SpecialtyGeneGridContainer({title: "Specialty Genes",id: this.viewer.id + "_" + "specialtyGenes", disabled: true});
			this.pathways= new PathwaysContainer({title: "Pathways",id: this.viewer.id + "_" + "pathways", disabled: true});
			this.proteinFamilies= new ProteinFamiliesContainer({title: "Protein Families",id: this.viewer.id + "_" + "proteinFamilies", disabled: true});
			this.transcriptomics= new TranscriptomicsContainer({title: "Transcriptomics",id: this.viewer.id + "_" + "transcriptomics", disabled: true});

			this.viewer.addChild(this.overview);
			this.viewer.addChild(this.genomes);
			this.viewer.addChild(this.phylogeny);
			this.viewer.addChild(this.features);
			this.viewer.addChild(this.specialtyGenes);
			this.viewer.addChild(this.pathways);
			this.viewer.addChild(this.proteinFamilies);
			this.viewer.addChild(this.transcriptomics);

			this.watch("query", lang.hitch(this, "onSetQuery"));
			this.watch("genome_ids", lang.hitch(this,"onSetGenomeIds"))
			this.watch("total_genomes", lang.hitch(this, "onSetTotalGenomes"));

			// on(this.domNode, "SetAnchor", lang.hitch(this, function(evt){
			// 		evt.stopPropagation();
			// 		console.log(this.id, " Call onSetAnchor " , this);
			// 		this.onSetAnchor(evt);
			// }));

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
	
		},
		onSetTotalGenomes: function(attr,oldVal,newVal){
				this.viewHeader.set("content", '<div style="margin:4px;">Genome List Query: ' + this.query + " ( " + newVal +" Genomes )</div>")
				var hasDisabled=false;

				this.viewer.getChildren().forEach(function(child){
					if (child && child.maxGenomeCount && (newVal>child.maxGenomeCount)){
						hasDisabled=true;
						child.set("disabled", true);
					}else{
						child.set("disabled", false);
					}
				})

				if (hasDisabled){
					this.showWarning();
				}else{
					this.hideWarning();
				}
		},
		hideWarning: function(){
			if (this.warningPanel){
				this.removeChild(this.warningPanel);
			}
		},
		showWarning: function(msg){
			if (!this.warningPanel){
				this.warningPanel = new ContentPane({style: "margin:0px; padding: 0px;margin-top: -10px;", content: '<div class="WarningBanner" style="background: #f9ff85;text-align:center;margin:4px;margin-bottom: 0px;margin-top: 0px;padding:4px;border:0px solid #aaa;border-radius:4px;">Your genome list is too large to view all of the supplemental data.  Filter the genomes and then press the Anchor button to enable the disabled tabs.</div>', region: "top", layoutPriority: 3});
			}
			this.addChild(this.warningPanel);
		},
		onSetAnchor: function(evt){
			console.log("onSetAnchor: ", evt, evt.filter);
			evt.stopPropagation();
			evt.preventDefault();
			var f = evt.filter;
			var parts = []
			if (this.query) { 
				var q = (this.query.charAt(0)=="?")?this.query.substr(1):this.query;
				if (q!="keyword(*)"){
					parts.push(q) 
				}
			}
			if (evt.filter) { parts.push(evt.filter) }

			console.log("parts: ", parts);

			if (parts.length > 1){
				q = "?and(" + parts.join(",") + ")"
			}else if (parts.length==1){
				q = "?" + parts[0]
			}else{
				q = "";
			}



			console.log("SetAnchor to: ", q);
			var hp;
			if (this.hashParams && this.hashParams.view_tab){
				hp = {view_tab: this.hashParams.view_tab}
			}else{
				hp = {}
			}
			l= window.location.pathname + q + "#" + Object.keys(hp).map(function(key){
				return key + "=" + hp[key]
			},this).join("&");
			console.log("NavigateTo: ", l);
            Topic.publish("/navigate", {href: l});
		},
	});
});
