define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/_base/Deferred",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"dojo/_base/xhr", "dojo/_base/lang", "./PageGrid", "./formatter", "../store/SubSystemPieChartMemoryStore", "dojo/request",
	"dojo/aspect", "./GridSelector", "dojo/when", "d3/d3", "dojo/Stateful"
], function(declare, BorderContainer, on, Deferred,
			domClass, ContentPane, domConstruct,
			xhr, lang, Grid, formatter, Store, request,
			aspect, selector, when, d3, Stateful){
	return declare([Stateful], {
		// region: "center",
		// query: (this.query || ""),
		// apiToken: window.App.authorizationToken,
		// apiServer: window.App.dataServiceURL,
		store: null,
		// dataModel: "subsystem",
		// primaryKey: "id",
		// selectionModel: "extended",
		// loadingMessage: "Loading subsystems.  This may take several minutes...",
		// deselectOnRefresh: true,
		// subsystem_data: {},
		// fullSelectAll: true,
		// state: null,

		// _setApiServer: function(server){
		// 	this.apiServer = server;
		// },

		constructor: function(){

			this.watch("state", lang.hitch(this, "onSetState"));
		},

		onSetState: function(attr, oldState, state){


			// var oldState = this.get('state');

			var ov, nv;
			if(oldState){
				ov = oldState.search;
				if(oldState.hashParams.filter){
					ov = ov + oldState.hashParams.filter;
				}
			}

			if(state){
				nv = state.search;
				if(state.hashParams.filter){
					nv = nv + state.hashParams.filter;
				}
			}

			this.state = state;

			if(ov != nv){
				if(!this.store){
					this.set('store', this.createStore(this.apiServer, this.apiToken || window.App.authorizationToken, state));
				}else{
					this.store.set("state", lang.mixin({}, state));
				}
					var that = this;

					Deferred.when(this.store.query(), function(data) {
						console.log(data)
						that.drawGraph(data);
					});
				// }
				// this.refresh()
			}else{
				// this.refresh()
			}
		},

		drawGraph: function(pieChartData) {
			console.log(pieChartData);

			var width = 1000;
			var height = 1000;
			var radius = Math.min(width, height) / 2;

			var color = d3.scaleOrdinal(d3.schemeCategory20);

			var svg = d3.select('#subsystemspiechart')
	          .append('svg')
	          .attr('width', width)
	          .attr('height', height)
	          .append('g')
	          .attr('transform', 'translate(' + (width / 2) +
	            ',' + (height / 2) + ')');

	        var arc = d3.arc()
	          .innerRadius(0)
	          .outerRadius(radius);

	        var pie = d3.pie()
	          .value(function(d) { return d.count; })
	          .sort(null);

	        var path = svg.selectAll('path')
	          .data(pie(pieChartData))
	          .enter()
	          .append('path')
	          .attr('d', arc)
	          .attr('fill', function(d) {
	            return color(d.pieChartData.val);
	        });
	    // }

		},



		// _setVisibleAttr: function(visible){
		// 	this.visible = visible;

		// 	if(this.visible && !this._firstView){
		// 		this.onFirstView();
		// 	}

		// 	if(this.viewer){
		// 		this.viewer.set('visible', true);

		// 		// this.service.get_palette('compare_region', function(palette){
		// 		// 	this.compare_regions.set_palette(palette);
		// 		// }.bind(this));
		// 	}
		// },

		// onFirstView: function(){
		// 	if(this._firstView){
		// 		return;
		// 	}

		// 	this.viewer = new ContentPane({
		// 		region: "center",
		// 		content: "<div id='subsystemspiechart'></div>",
		// 		style: "padding:0"
		// 	})
		// 	this.addChild(this.viewer);

		// 	this.inherited(arguments);
		// 	this._firstView = true;
		// },


		createStore: function(server, token, state){
			if(this.store){
				return this.store
			}

			return new Store({
				token: window.App.authorizationToken,
				apiServer: window.App.dataServiceURL,
				state: this.state,
				type: "subsystems_overview"
			});
		}
	});
});
