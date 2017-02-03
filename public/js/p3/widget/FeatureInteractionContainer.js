define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/request",
	"dijit/layout/BorderContainer",
	"./FeaturePPIViewer", "../util/PathJoin"
], function(declare, lang,
			xhr,
			BorderContainer,
			FeaturePPIViewer, PathJoin){

	var xhrOption = {
		handleAs: "json",
		headers: {
			'Accept': 'application/json',
			'Content-Type': "application/rqlquery+x-www-form-urlencoded",
			'X-Requested-With': null,
			'Authorization': window.App.authorizationToken || ""
		}
	};

	return declare([BorderContainer], {
		gutters: false,
		visible: false,
		feature_id: null,
		_setVisibleAttr: function(visible){
			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();
			}
		},

		onFirstView: function(){
			if(this._firstView){
				return;
			}

			this.fp_viewer = new FeaturePPIViewer();
			this.fp_viewer.init(this.domNode);

			this.watch("state", lang.hitch(this, "onSetState"));

			this.inherited(arguments);
			this._firstView = true;
		},

		onSetState: function(attr, oldVal, state){
			if(!state){
				return;
			}

			if(this.feature_id !== state.feature.feature_id){

				// console.log("onSetState", state);

				this.feature_id = state.feature.feature_id;
				var self = this;
				var query = "?or(eq(feature_id_a," + state.feature.feature_id + "),eq(feature_id_b," + state.feature.feature_id + "))";
				xhr.get(PathJoin(window.App.dataAPI, "/ppi/" + query), xhrOption)
					.then(lang.hitch(this, function(data){
						if(data.length === 0) return;

						var second = data.map(function(d){
							return [d.feature_id_a, d.feature_id_b];
						}).reduce(function(a, b){
							return a.concat(b);
						});

						var q = "?and(in(feature_id_a,(" + second.join(",") + ")),in(feature_id_b,(" + second.join(",") + ")))";

						xhr.get(PathJoin(window.App.dataAPI, "/ppi/" + q), xhrOption)
							.then(lang.hitch(this, function(data){

								self.fp_viewer.render(data, state.feature.feature_id);
							}));
					}));
			}
		}
	})
});