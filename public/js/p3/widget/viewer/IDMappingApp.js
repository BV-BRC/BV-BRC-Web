define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/topic",
	"dijit/layout/StackContainer", "dijit/layout/TabController",
	"dijit/layout/ContentPane", "dojox/widget/Standby",
	"./Base", "../IDMappingAppResultGridContainer", "../../store/IDMappingAppMemoryStore"
], function(declare, lang, Topic,
			TabContainer, StackController,
			ContentPane, Standby,
			ViewerBase, GridContainer, ResultMemoryStore){

	return declare([ViewerBase], {
		"disabled": false,
		"query": null,
		loadingMask: null,
		visible: true,

		constructor: function(options){

			this.topicId = "IDMappingApp_" + options.id.split("_idmapResult")[0];

			Topic.subscribe(this.topicId, lang.hitch(this, function(){
				var key = arguments[0];//, value = arguments[1];

				switch(key){
					case "showLoadingMask":
						this.loadingMask.show();
						break;
					case "hideLoadingMask":
						this.loadingMask.hide();
						break;
					default:
						break;
				}
			}));
		},

		onSetState: function(attr, oldVal, state){

			if(!state){
				return;
			}

			this.loadingMask.show();
			this.gsGrid.set('state', state);
		},

		postCreate: function(){

			this.loadingMask = new Standby({
				target: this.id,
				image: "/public/js/p3/resources/images/spin.svg",
				color: "#efefef"
			});
			this.addChild(this.loadingMask);
			this.loadingMask.startup();

			var gsStore = new ResultMemoryStore({
				type: "idmap",
				idProperty: "idx",
				topicId: this.topicId
			});

			this.gsGrid = new GridContainer({
				type: 'idmap',
				containerType: "id_data",
				topicId: this.topicId,
				store: gsStore,
				region: "center"
			});

			this.addChild(this.gsGrid);

			this.inherited(arguments);
		}

	})
});
