define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/when", "dojo/request", "dojo/string",
	"dijit/layout/ContentPane",
	"./Base", "../../util/PathJoin", "../PathwayMapContainer"
], function(declare, lang, when, request, String,
			ContentPane,
			ViewerBase, PathJoin, PathwayMapContainer){
	return declare([ViewerBase], {
		"disabled": false,
		"query": null,
		containerType: "transcriptomics_experiment",
		apiServiceUrl: window.App.dataAPI,
		headerTemplate: "<table><tr><td>Pathway ID: <td></td><td>${0}</td></tr><tr><td>Pathway Name: <td></td><td>${1}</td></tr><tr><td>Pathway Class: <td></td><td>${2}</td></tr></table>",

		onSetState: function(attr, oldVal, state){
			// console.log("PathwayMap onSetState", state);

			if(!state){
				return;
			}

			var parts = state.pathname.split("/");
			var params = parts[parts.length - 1];

			// var pmState = {}; // pathway_id, ec_number, feature_id, taxon_id, annotation
			params.split('&').forEach(function(p){
				var kv = p.split("=");
				if(kv[1]){
					state[kv[0]] = kv[1];
				}
			});
			if(!state.pathway_id) return;

			// taxon_id -> state.genome_ids or genome_id ->state.genome_ids
			if(state.hasOwnProperty('genome_id')){
				state.genome_ids = [state.genome_id];
				this.viewer.set('visible', true);
			}
			else if(state.hasOwnProperty('genome_ids')){
				state.genome_ids = state.genome_ids.split(',');
				this.viewer.set('visible', true);
			}
			else if(state.hasOwnProperty('taxon_id')){
				var self = this;
				when(this.getGenomeIdsByTaxonId(state.taxon_id), function(genomeIds){
					state.genome_ids = genomeIds;
					self.viewer.set('visible', true);
				});
			}

			// update header
			this.buildHeaderContent(state.pathway_id)
				.then(lang.hitch(this, function(content){
					this.viewerHeader.set('content', content);
				}));
		},

		getGenomeIdsByTaxonId: function(taxon_id){

			var query = "?eq(taxon_lineage_ids," + taxon_id + ")&select(genome_id)&limit(25000)";
			return when(request.get(PathJoin(this.apiServiceUrl, "genome", query), {
				headers: {
					'Accept': "application/json",
					'Content-Type': "application/rqlquery+x-www-form-urlencoded"
				},
				handleAs: "json"
			}), function(response){
				return response.map(function(d){
					return d.genome_id;
				});
			});
		},

		buildHeaderContent: function(mapId){
			var self = this;
			var query = "?eq(pathway_id," + mapId + ")&limit(1)";
			return when(request.get(PathJoin(this.apiServiceUrl, "pathway_ref", query), {
				headers: {
					'Accept': "application/json",
					'Content-Type': "application/rqlquery+x-www-form-urlencoded"
				},
				handleAs: "json"
			}), function(response){
				var p = response[0];

				return String.substitute(self.headerTemplate, [p.pathway_id, p.pathway_name, p.pathway_class]);
			});
		},

		postCreate: function(){
			if(!this.state){
				this.state = {};
			}

			this.inherited(arguments);

			this.viewer = new PathwayMapContainer({
				region: "center",
				state: this.state,
				apiServer: this.apiServiceUrl
			});

			this.viewerHeader = new ContentPane({
				content: "",
				region: "top",
				style: "height: 60px"
			});

			this.addChild(this.viewerHeader);
			this.addChild(this.viewer);
		}
	});
});
