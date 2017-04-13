define("p3/widget/CompareRegionContainer", [
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/dom-construct", "dojo/when", "dojo/topic",
	"dijit/layout/BorderContainer", "dijit/layout/ContentPane", "dijit/form/Select", "dijit/form/Button",
	"dojox/widget/Standby",
	"FileSaver",
	"./SEEDClient", "./CompareRegionViewer"
], function(declare, lang,
			domConstruct, when, Topic,
			BorderContainer, ContentPane, Select, Button,
			Standby,
			saveAs,
			SEEDClient, CompareRegionViewer){

	return declare([BorderContainer], {
		gutters: false,
		visible: false,
		state: null,
		patric_id: null,
		topicId: null,

		constructor: function(options){
			this.topicId = "CompareRegions_" + options.id.split('_compareRegionViewer')[0];

			Topic.subscribe(this.topicId, lang.hitch(this, function(){

				var key = arguments[0], value = arguments[1];

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

			if(!state.feature){
				return;
			}

			if(this.patric_id == state.feature.patric_id){
				return;
			}else{
				this.patric_id = state.feature.patric_id;
			}

			if(this.viewer){
				// this.viewer.set('state', state);
				this.render(state.feature.patric_id, 10000, 10, "pgfam", "representative+reference");
			}

			this._set('state', state);
		},

		render: function(peg, window, n_genomes, method, filter){
			this.loadingMask.show();
			this.service.compare_regions_for_peg(peg, window, n_genomes, method, filter,
				function(data){
					// console.log(data);
					this.compare_regions.set_data(data);
					this.compare_regions.render();
					this.loadingMask.hide();
				}.bind(this),
				function(err){
					// TODD: display error
					console.error(err);
				}
			)
		},

		exportToSVG: function(){
			if(this.compare_regions){

				when(this.compare_regions.exportSVG(), function(data){
					saveAs(new Blob([data], {type: 'image/svg+xml'}), "PATRIC_compare_regions.svg");
				});
			}
		},

		_setVisibleAttr: function(visible){
			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();
			}

			if(this.viewer){
				this.viewer.set('visible', true);

				this.service.get_palette('compare_region', function(palette){
					this.compare_regions.set_palette(palette);
				}.bind(this));
			}
		},

		postCreate: function(){
			this.loadingMask = new Standby({
				target: this.id,
				image: "/public/js/p3/resources/images/spin.svg",
				color: "#efefef"
			});
			this.addChild(this.loadingMask);
			this.loadingMask.startup();
		},

		onFirstView: function(){
			if(this._firstView){
				return;
			}

			this.service = new SEEDClient(window.App.compareregionServiceURL);

			this.viewer = new ContentPane({
				region: "center"
			});

			this.compare_regions = new CompareRegionViewer(this.viewer.domNode, this.service);
			this.compare_regions.topicId = this.topicId;

			this.filterPanel = this._buildFilterPanel();

			this.watch("state", lang.hitch(this, "onSetState"));

			this.addChild(this.viewer);
			this.addChild(this.filterPanel);

			this.inherited(arguments);
			this._firstView = true;
		},

		_buildFilterPanel: function(){

			var filterPanel = new ContentPane({
				region: "top",
				splitter: true
			});

			// region size
			var label_region_size = domConstruct.create("label", {innerHTML: "Region Size: "});
			this.region_size = new Select({
				name: "region_size",
				value: 10000,
				style: "width: 100px; margin-right: 10px",
				options: [{
					value: 5000, label: "5,000bp"
				}, {
					value: 10000, label: "10,000bp"
				}, {
					value: 15000, label: "15,000bp"
				}, {
					value: 20000, label: "20,000bp"
				}]
			});
			domConstruct.place(label_region_size, filterPanel.containerNode, "last");
			domConstruct.place(this.region_size.domNode, filterPanel.containerNode, "last");

			// domConstruct.place("<br/>", filterPanel.containerNode, "last");

			// number of genomes
			var label_n_genomes = domConstruct.create("label", {innerHTML: "Number of genomes: "});
			this.n_genomes = new Select({
				name: "n_genomes",
				value: 10,
				style: "width: 50px; margin-right: 10px",
				options: [{
					value: 5, label: "5"
				}, {
					value: 10, label: "10"
				}, {
					value: 15, label: "15"
				}, {
					value: 20, label: "20"
				}, {
					value: 50, label: "50"
				}]
			});
			domConstruct.place(label_n_genomes, filterPanel.containerNode, "last");
			domConstruct.place(this.n_genomes.domNode, filterPanel.containerNode, "last");

			// domConstruct.place("<br/>", filterPanel.containerNode, "last");

			// pinning method
			var label_method = domConstruct.create("label", {innerHTML: "Method: "});
			this.method = new Select({
				name: "method",
				value: "pgfam",
				style: "width: 150px; margin-right: 10px",
				options: [{
					value: "pgfam", label: "PATRIC cross-genus families (PGfams)"
				}, {
					value: "plfam", label: "PATRIC genus-specific families (PLfams)"
				}]
			});
			domConstruct.place(label_method, filterPanel.containerNode, "last");
			domConstruct.place(this.method.domNode, filterPanel.containerNode, "last");

			// domConstruct.place("<br/>", filterPanel.containerNode, "last");

			// filter
			var label_g_filter = domConstruct.create("label", {innerHTML: "Genomes: "});
			this.g_filter = new Select({
				name: "filter",
				value: "representative reference",
				style: "width: 100px; margin-right: 10px",
				options: [{
					value: "representative+reference", label: "Reference & Representative"
				}, {
					value: "all", label: "All public genomes"
				}]
			});
			domConstruct.place(label_g_filter, filterPanel.containerNode, "last");
			domConstruct.place(this.g_filter.domNode, filterPanel.containerNode, "last");

			// domConstruct.place("<br/>", filterPanel.containerNode, "last");

			// update button
			var btn_submit = new Button({
				label: "Update",
				onClick: lang.hitch(this, function(){
					var window = this.region_size.get('value');
					var n_genomes = this.n_genomes.get('value');
					var method = this.method.get('value');
					var filter = this.g_filter.get('value');

					this.render(this.patric_id, window, n_genomes, method, filter);
				})
			});
			domConstruct.place(btn_submit.domNode, filterPanel.containerNode, "last");

			// export button
			var btn_export = new Button({
				label: "Export",
				onClick: lang.hitch(this, "exportToSVG")
			});
			domConstruct.place(btn_export.domNode, filterPanel.containerNode, "last");

			return filterPanel;
		}
	})
});
