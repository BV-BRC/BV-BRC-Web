define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/on", "dojo/topic", "dojo/dom-construct", "dojo/dom", "dojo/query", "dojo/when", "dojo/request",
	"dijit/layout/ContentPane", "dijit/layout/BorderContainer", "dijit/TooltipDialog", "dijit/Dialog", "dijit/popup",
	"dijit/TitlePane", "dijit/form/Select", "dijit/form/Button",
	"./ContainerActionBar", "../util/PathJoin", "./PathwayMapGrid"
], function(declare, lang,
			on, Topic, domConstruct, dom, Query, when, request,
			ContentPane, BorderContainer, TooltipDialog, Dialog, popup,
			TitlePane, Select, Button,
			ContainerActionBar, PathJoin, EcGrid){
	return declare([BorderContainer], {
		gutters: false,
		visible: false,
		state: null,
		_setVisibleAttr: function(visible){
			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();
			}

			if(this.ecTable){
				this.ecTable.set('visible', true);
				this.state = lang.mixin(this.state, {genome_ids:['1201033.3', '1201034.3', '1201035.3', '1202451.3', '1095900.3', '1094552.3']});
				this.ecTable.set('state', this.state);
			}
			if(this.map){
				this.map.set('visible', true);
			}
		},
		onFirstView: function(){
			if(this._firstView){
				return;
			}

			this.ecTableContainer = new ContentPane({
				region: "left",
				content: "Total # of Genomes: ",
				style: "width: 380px"
			});
			this.ecTable = new EcGrid({
				state: this.state
			});
			this.ecTableContainer.addChild(this.ecTable);

			this.map = new ContentPane({
				region: "center",
				content: '<img id="map_img" src="/patric/images/pathways/map00401.png" alt=""/>'
			});

			this.addChild(this.ecTableContainer);
			this.addChild(this.map);

			this.inherited(arguments);
			this._firstView = true;
		}
	});
});