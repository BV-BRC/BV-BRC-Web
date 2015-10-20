define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/_base/lang",
	"./ActionBar", "./ContainerActionBar", "dijit/layout/TabContainer",
	"./ProteinFamiliesGridContainer", "dijit/layout/ContentPane", "dojo/topic"
], function(declare, BorderContainer, on, lang,
			ActionBar, ContainerActionBar, TabContainer,
			ProteinFamiliesGrid, ContentPane, Topic){

	return declare([BorderContainer], {
		gutters: false,
		params: null,
		_setParamsAttr: function(params){
			this.params = params;
			if(this._started && this.proteinFamiliesGrid){
				var changed = false;
				var checkParams = ["genome_id"];

				checkParams.forEach(function(cp){
					if(params[cp] != this.params[cp]){
						changed = true;
						this.params[cp] = params[cp];
					}
				});

				if(changed){
					this.proteinFamiliesGrid.set("params", params);
				}
			}
		},

		visible: false,
		_setVisibleAttr: function(visible){
			this.visible = visible;
			if(this.proteinFamiliesGrid){
				this.proteinFamiliesGrid.set('visible', true);
				if(!this.proteinFamiliesGrid._hasBeenViewed){
					this.proteinFamiliesGrid.set("params", this.params);
					this.proteinFamiliesGrid._hasBeenViewed = true;
				}
			}
		},
		startup: function(){
			if(this._started){
				return;
			}
			//this.containerActionBar = new ContainerActionBar({
			//	region: "top",
			//	splitter: false,
			//	"className": "BrowserHeader"
			//});
			//this.selectionActionBar = new ActionBar({
			//	region: "right",
			//	layoutPriority: 2,
			//	style: "width:48px;text-align:center;",
			//	splitter: false
			//});
			this.tabContainer = new TabContainer({region: "center", id: this.id + "_TabContainer"});

			this.proteinFamiliesGrid = new ProteinFamiliesGrid({title: "Table", content: "Protein Families Table"});
			this.heatmap = new ContentPane({title: "Heatmap", content: "Heatmap"});

			this.tabContainer.addChild(this.proteinFamiliesGrid);
			this.tabContainer.addChild(this.heatmap);

			//this.addChild(this.containerActionBar);
			this.addChild(this.tabContainer);
			//this.addChild(this.selectionActionBar);

			this.inherited(arguments);
		}
	});
});

