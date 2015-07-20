define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"./ActionBar","./ContainerActionBar","dijit/layout/TabContainer",
	"dijit/layout/ContentPane"
], function(
	declare,BorderContainer,on,
	ActionBar, ContainerActionBar,TabContainer,
	ContentPane
){

	return declare([BorderContainer], {
		gutters: true,
		query: null,
		_setQueryAttr: function(query){
			this.query = query;
			if (this.grid) {
				this.grid.set("query", query);
			}
		},
		startup: function(){
			if (this._started) { return; }
			this.controlPanel = new ContentPane({content: "Controller", region: "left",splitter:true, style:"width:175px;"});
			this.viewer = new ContentPane({content: "viewer", region: "center"});
			this.addChild(this.controlPanel);
			this.addChild(this.viewer);

			this.inherited(arguments);
		}
	});
});

