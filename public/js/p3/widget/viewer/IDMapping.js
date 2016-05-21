define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dijit/layout/ContentPane",
	"./Base", "../IDMappingGridContainer"
], function(declare, lang,
			ContentPane,
			ViewerBase, GridContainer){
	return declare([ViewerBase], {
		"disabled": false,
		"query": null,
		apiServiceUrl: window.App.dataAPI,

		onSetState: function(attr, oldVal, state){
			// console.log("IDMapping onSetState", state);

			if(!state){
				return;
			}

			var parts = state.pathname.split("/");
			var params = parts[parts.length - 1];

			params.split('&').forEach(function(p){
				var kv = p.split("=");
				if(kv[1]){
					state[kv[0]] = kv[1];
				}
			});
			// console.log("onSetState: ", this.state);
			if(!state.fromIdValue) return;

			this.viewer.set('visible', true);
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
				content: "[placeholder for IDMapping summary: xxx feature found etc]",
				region: "top"
			});

			this.addChild(this.viewerHeader);
			this.addChild(this.viewer);
		}
	});
});
