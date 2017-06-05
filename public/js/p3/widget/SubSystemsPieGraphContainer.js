define.amd.jQuery = true;
define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic", 
	"dojo/query", "dojo/request", "dojo/dom-construct", "dojo/dom-style", 
	"dojo/dom-class", "dijit/layout/BorderContainer", "dijit/layout/ContentPane", "./FilterContainerActionBar",
	"./GridContainer", "./SubSystemsPieChartMemoryGrid"
], function(declare, lang, on, Topic, 
			query, request, domConstruct, domStyle, 
			domClass, BorderContainer, ContentPane, ContainerActionBar,
			GridContainer, SubSystemsPieChartGrid){

	return declare([BorderContainer], {
		gutters: false,
		visible: false,
		state: null,

		onSetState: function(attr, oldState, state){
			if(!state){
				console.log("!state in grid container; return;")
				return;
			}
			
			this.chart.set('state', state)
		},

		_setVisibleAttr: function(visible){
			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();
			}

			if(this.viewer){
				this.viewer.set('visible', true);
			}
		},

		onFirstView: function(){
			if(this._firstView){
				return;
			}

			this.piechartviewer = new ContentPane({
				region: "left",
				content: "<div id='subsystemspiechart'></div>",
				style: "padding:0"
			});

			// this.legendviewer = new ContentPane({
			// 	region: "right",
			// 	content: "<div id='subsystemslegend'></div>",
			// 	style: "margin-right:100px; float:right"
			// })

			// this.chart = new SubSystemsPieChartGrid(this.viewer.domNode)
			this.addChild(this.piechartviewer);
			//this.addChild(this.legendviewer);
			this.chart = new SubSystemsPieChartGrid();

			this.watch("state", lang.hitch(this, "onSetState"));

			this.inherited(arguments);
			this._firstView = true;
		}
	})
});