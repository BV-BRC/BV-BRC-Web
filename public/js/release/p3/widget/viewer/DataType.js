define("p3/widget/viewer/DataType", [
	"dojo/_base/declare", "dojo/_base/lang", "dojo/when", "dojo/request", "dojo/string",
	"dojo/dom-construct",
	"dijit/layout/ContentPane", "dijit/_WidgetBase", "dijit/_TemplatedMixin",
	"./Base", "../../util/PathJoin"
], function(declare, lang, when, request, String,
			domConstruct,
			ContentPane, WidgetBase, Templated,
			ViewerBase, PathJoin){
	return declare([ViewerBase], {

		onSetState: function(attr, oldVal, state){
			// console.log("DataType view onSetState", state);

			if(!state){
				return;
			}

			var parts = state.pathname.split("/");
			var dataType = parts[parts.length - 1];

			if(!dataType) return;

			this.dataType = dataType;

			when(request.get(PathJoin(this.apiServiceUrl, "content/dlp/", dataType), {
				handleAs: "html"
			}), lang.hitch(this, function(content){

				this.template = content;
				this.viewer.set('content', content);

				when(request.get(PathJoin(this.apiServiceUrl, "content/dlp/", dataType + ".json"),{
					handleAs: "json"

				}), lang.hitch(this, function(data){

					this.set(dataType, data);
				}));
			}));
		},

		_setAntibioticResistanceAttr: function(data){
			console.log(data);

			// var popularList = data['popularGenomes']['popularList'];
			//
			// var top = domConstruct("div", {"class": "group"});
			//
			// for (var i = 0, len = popularList.length; i < len; i++){
			// 	var item = domConstruct("div", {"class": "genome-data right half group", id: 'genome-tab' + (i+1)}, top);
			// 	var prop = domConstruct("div", {"class": 'far2x'}, item);
			//
			// }

		},

		_setGenomeFeaturesAttr: function(data){

		},

		_setGenomesAttr: function(data){

		},

		_setPathwaysAttr: function(data){

		},

		_setProteinFamiliesAttr: function(data){

		},

		_etSpecialtyGenesAttr: function(data){

		},
		_setTranscriptomicsAttr: function(data){

			// select genomes
			var popularList = data['popularGenomes']['popularList'];

			console.log(this.viewer, data);
		},

		postCreate: function(){
			if(!this.state){
				this.state = {};
			}

			this.inherited(arguments);

			this.viewer = new ContentPane({
				region: "center",
				content: ""
			});

			this.addChild(this.viewer);
		}
	});
});
