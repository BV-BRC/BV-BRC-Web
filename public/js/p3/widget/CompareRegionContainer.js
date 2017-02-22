define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dijit/layout/BorderContainer", "dijit/layout/ContentPane",
	"dojox/widget/Standby",
	"./SEEDClient", "./CompareRegionViewer"
], function(declare, lang,
			BorderContainer, ContentPane,
			Standby,
			SEEDClient, CompareRegionViewer){

	return declare([BorderContainer], {
		gutters: false,
		visible: false,
		state: null,
		patric_id: null,
		onSetState: function(attr, oldVal, state){
			if(!state){
				return;
			}

			if(!state.feature){
				return;
			}

			if(this.patric_id == state.feature.patric_id){
				return;
			}

			if(this.viewer){
				// this.viewer.set('state', state);
				this.loadingMask.show();
				this.service.compare_regions_for_peg(state.feature.patric_id,
					15000, 15, "pgfam", "representative reference",
					function(data){
						// console.log(data);
						this.compare_regions.set_data(data);
						this.compare_regions.render();
						this.patric_id = state.feature.patric_id;
						this.loadingMask.hide();
					}.bind(this),
					function(err){
						console.error(err);
					}
				)
			}

			this._set('state', state);
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
					// this.render();
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

			this.filterPanel = this._buildFilterPanel();

			this.watch("state", lang.hitch(this, "onSetState"));

			this.addChild(this.viewer);
			this.addChild(this.filterPanel);

			this.inherited(arguments);
			this._firstView = true;
		},

		_buildFilterPanel: function(){

			return ContentPane({
				region: "left",
				content: "filter panel placeholder"
			})
		}
	})
});