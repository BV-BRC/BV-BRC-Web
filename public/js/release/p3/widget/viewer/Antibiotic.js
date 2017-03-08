define("p3/widget/viewer/Antibiotic", [
	"dojo/_base/declare", "dojo/_base/lang",
	"./TabViewerBase", "../AntibioticOverview"
], function(declare, lang,
			TabViewerBase, AntibioticOverview){

	return declare([TabViewerBase], {

		perspectiveLabel: "Antibiotic View",
		// perspectiveIconClass: "",

		onSetState: function(attr, oldVal, state){

			if(!state){
				return;
			}

			if(!state.search){
				this.queryNode.innerHTML = "Error";
				this.totalCountNode.innerHTML = "";
			}

			// bypass setting attribute and invoke tabs with state
			var antibioticName = state.search;
			this.buildHeaderContent(antibioticName);

			this.overview.set('state', lang.mixin({}, state));
		},

		setActivePanelState: function(){
			// TODO: implement this
		},

		buildHeaderContent: function(name){
			this.queryNode.innerHTML = name;
			this.totalCountNode.innerHTML = "";
		},

		postCreate: function(){
			if(!this.state){
				this.state = {}
			}

			this.inherited(arguments); // creates this.viewer

			this.overview = new AntibioticOverview({
				title: "Overview",
				id: this.viewer.id + "_" + "overview"
			});

			this.viewer.addChild(this.overview);
		}


	})
});