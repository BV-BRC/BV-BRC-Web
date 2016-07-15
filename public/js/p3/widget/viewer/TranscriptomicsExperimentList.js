define([
	"dojo/_base/declare", "./TabViewerBase", "dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../PageGrid", "../formatter", "../TranscriptomicsExperimentGridContainer", 
	 "../../util/PathJoin", "dojo/request", "dojo/_base/lang"
], function(declare, TabViewerBase, on,
			domClass, ContentPane, domConstruct,
			Grid, formatter, TranscriptomicsExperimentGridContainer,
			PathJoin, xhr, lang){
	return declare([TabViewerBase], {
		"baseClass": "ExperimentList",
		"disabled": false,
		"containerType": "experiment_data",
		"query": null,
		paramsMap: "query",
		defaultTab: "experiments",
		perspectiveLabel: "Experiments View",
		perspectiveIconClass: "icon-perspective-GenomeList",
		total_experiments: 0,
		warningContent: 'Your query returned too many results for detailed analysis.',
		_setQueryAttr: function(query){
			console.log(this.id, " _setQueryAttr: ", query, this);
			//if (!query) { console.log("GENOME LIST SKIP EMPTY QUERY: ");  return; }
			//console.log("GenomeList SetQuery: ", query, this);
			query = query; 
			this._set("query", query);
			if(!this._started){
				return; 
			}

			var _self = this;
			console.log('ExperimentList setQuery - this.query: ', this.query);

			var url = PathJoin(this.apiServiceUrl, "transcriptomics_experiment", "?" + (this.query) + "&limit(1)"); 

			console.log("url: ", url);
			xhr.get(url, {
				headers: {
					accept: "application/solr+json",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || "")
				},
				handleAs: "json"
			}).then(function(res){
				console.log(" URL: ", url);
				console.log("Get GenomeList Res: ", res);
				if(res && res.response && res.response.docs){
					var features = res.response.docs;
					if(features){
						_self._set("total_experiments", res.response.numFound);
					}
				}else{
					console.log("Invalid Response for: ", url);
				}
			}, function(err){
				console.log("Error Retreiving Experiments: ", err)
			});

		},

		onSetState: function(attr, oldVal, state){
			console.log("GenomeList onSetState()  OLD: ", oldVal, " NEW: ", state);

			// if (!state.feature_ids){
			// 	console.log("	NO Genome_IDS")
			// 	if (state.search == oldVal.search){
			// 		console.log("		Same Search")
			// 		console.log("		OLD Genome_IDS: ", oldVal.genome_ids);
			// 		this.set("state", lang.mixin({},state,{feature_ids: oldVal.genome_ids}))	
			// 		return;
			// 	}else{
			// 		this.set("query", state.search);
			// 	}
			// }else if (state.search!=oldVal.search){
			// 	console.log("SET QUERY: ", state.search);
			// 	this.set("query", state.search);
			// }

			this.set("query", state.search);

			// //console.log("this.viewer: ", this.viewer.selectedChildWidget, " call set state: ", state);
			var active = (state && state.hashParams && state.hashParams.view_tab) ? state.hashParams.view_tab : "taxons";
//			if(active == "Experiments"){
				this.setActivePanelState()
//			}

			this.inherited(arguments);
		},

		onSetQuery: function(attr, oldVal, newVal){
			if (this.overview) {
				this.overview.set("content", '<div style="margin:4px;">Feature List Query: ' + decodeURIComponent(newVal) + "</div>");
			}
			// this.viewHeader.set("content", '<div style="margin:4px;">Genome List Query: ' + decodeURIComponent(newVal) + ' </div>')
			this.queryNode.innerHTML = decodeURIComponent(newVal);
		},

		setActivePanelState: function(){

			var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : "experiments";
			console.log("Active: ", active, "state: ", this.state);

			var activeTab = this[active];
			
			if(!activeTab){
				console.log("ACTIVE TAB NOT FOUND: ", active);
				return;
			}

			switch(active){
				default:
					console.log("SET ACTIVE STATE for default taxonList tab: ", this.state);
					activeTab.set("state", lang.mixin({},this.state,{search: this.state.search}));
					break;
			}
			console.log("Set Active State COMPLETE");
		},

		onSetExperimentIds: function(attr, oldVal, genome_ids){
			this.state.taxon_ids = feature_ids;
			this.setActivePanelState();
		},

		createOverviewPanel: function(state){
			return new ContentPane({
				content: "Overview",
				title: "Overview",
				id: this.viewer.id + "_" + "overview",
				state: this.state
			});
		},

		postCreate: function(){
			this.inherited(arguments);

			this.watch("query", lang.hitch(this, "onSetQuery"));
			this.watch("total_experiments", lang.hitch(this, "onSetTotalExperiments"));

			//this.overview = this.createOverviewPanel(this.state);
			this.experiments= new TranscriptomicsExperimentGridContainer({
				title: "Experiments",
				id: this.viewer.id + "_" + "experiments",
				disabled: false
			});

			//this.viewer.addChild(this.overview);
			this.viewer.addChild(this.experiments);
			// this.viewer.addChild(this.sequences);
			//this.viewer.addChild(this.genomes);

		},
		onSetTotalExperiments: function(attr, oldVal, newVal){
			console.log("ON SET TOTAL TAXONS: ", newVal);
			this.totalCountNode.innerHTML = " ( " + newVal + " Experiments) ";
			var hasDisabled = false;

			// this.viewer.getChildren().forEach(function(child){
			// 	if(child && child.maxGenomeCount && (newVal > child.maxGenomeCount)){
			// 		hasDisabled = true;
			// 		child.set("disabled", true);
			// 	}else{
			// 		child.set("disabled", false);
			// 	}
			// });

			// if(hasDisabled){
			// 	this.showWarning();
			// }else{
			// 	this.hideWarning();
			// }
		},
		hideWarning: function(){
			if(this.warningPanel){
				this.removeChild(this.warningPanel);
			}
		},

		showWarning: function(msg){
			if(!this.warningPanel){
				this.warningPanel = new ContentPane({
					style: "margin:0px; padding: 0px;margin-top: -10px;",
					content: '<div class="WarningBanner" style="background: #f9ff85;text-align:center;margin:4px;margin-bottom: 0px;margin-top: 0px;padding:4px;border:0px solid #aaa;border-radius:4px;">' + this.warningContent + "</div>",
					region: "top",
					layoutPriority: 3
				});
			}
			this.addChild(this.warningPanel);
		},
		onSetAnchor: function(evt){
			console.log("onSetAnchor: ", evt, evt.filter);
			evt.stopPropagation();
			evt.preventDefault();
			var f = evt.filter;
			var parts = [];
			var q;
			if(this.query){
				q = (this.query.charAt(0) == "?") ? this.query.substr(1) : this.query;
				if(q != "keyword(*)"){
					parts.push(q)
				}
			}
			if(evt.filter & evt.filter != "false"){
				parts.push(evt.filter)
			}

			console.log("parts: ", parts);

			if(parts.length > 1){
				q = "?and(" + parts.join(",") + ")"
			}else if(parts.length == 1){
				q = "?" + parts[0]
			}else{
				q = "";
			}

			console.log("SetAnchor to: ", q);
			var hp;
			if(this.hashParams && this.hashParams.view_tab){
				hp = {view_tab: this.hashParams.view_tab}
			}else{
				hp = {}
			}
			l = window.location.pathname + q + "#" + Object.keys(hp).map(function(key){
					return key + "=" + hp[key]
				}, this).join("&");
			console.log("NavigateTo: ", l);
			Topic.publish("/navigate", {href: l});
		}
	});
});
