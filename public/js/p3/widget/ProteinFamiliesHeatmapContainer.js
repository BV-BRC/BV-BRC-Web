define([
	"dojo/_base/declare", "dijit/layout/ContentPane", "dijit/layout/BorderContainer", "dojo/on",
	"./ContainerActionBar", "dijit/popup", "dojo/topic",
	"dijit/TooltipDialog",
	"dojo/_base/lang", "swfobject/swfobject"

], function(declare, ContentPane, BorderContainer, on,
			ContainerActionBar, popup, Topic,
			TooltipDialog,
			lang, swfobject){

	var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
	var downloadTT = new TooltipDialog({
		content: dfc, onMouseLeave: function(){
			popup.close(downloadTT);
		}
	});

	return declare([BorderContainer], {
		gutters: false,
		state: null,
		visible: false,
		_setVisibleAttr: function(visible){
			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();
				this.initializeFlash();
			}
		},
		initializeFlash: function(){
			var flashVars = {
				showLog: false,
				startColor: '0x6666ff',
				endColor: '0x00ff00'
			};
			var params = {
				quality: 'high',
				bgcolor: "#ffffff",
				allowscriptaccess: 'sameDomain',
				allowfullscreen: false,
				wmode: 'transparent'
			};
			var attributes = {
				id: 'ProteinFamilySorter',
				name: 'ProteinFamilySorter'
			};
			var target = document.getElementById("flashTarget");
			swfobject.embedSWF('/js/p3/resources/HeatmapViewer.swf', target, '100%', 747, 10, '/js/swfobject/lib/expressInstall.swf', flashVars, params, attributes);
		},
		onFirstView: function() {
			if(this._firstView){
				return;
			}

			//this.addChild(new ContentPane({region:"top", title:"actionbar", content:"placeholder for action bars"}));
			this.addChild(new ContentPane({region:"center", content:"", id:"flashTarget"}));

			this.inherited(arguments);
			this._firstView = true;
		}
	});
});
