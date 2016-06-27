define("p3/widget/viewer/PathwaySummary", [
	"dojo/_base/declare", "dojo/_base/lang",
	"dijit/layout/ContentPane",
	"./Base", "../PathwaySummaryGridContainer"
], function(declare, lang,
			ContentPane,
			ViewerBase, GridContainer){
	return declare([ViewerBase], {
		"disabled": false,
		"query": null,
		apiServiceUrl: window.App.dataAPI,

		onSetState: function(attr, oldVal, state){
//			 console.log("PathwaySummary onSetState", state);

			if(!state){
				return;
			}

			var parts = state.pathname.split("/");
			var params = parts[parts.length - 1];

			state.feature_ids = params.split(",");

			this.viewer.set('visible', true);
			this.viewer.set('state', lang.mixin({},state));
		},

		postCreate: function(){
			if(!this.state){
				this.state = {};
			}

			this.inherited(arguments);

			this.viewer = new GridContainer({
				region: "center",
				state: this.state
			});

			this.viewerHeader = new ContentPane({
				content: "",
				region: "top"
			});

			this.addChild(this.viewerHeader);
			this.addChild(this.viewer);
		}
	});
});
