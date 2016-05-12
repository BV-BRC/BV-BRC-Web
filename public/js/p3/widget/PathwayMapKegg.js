define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred",
	"dojo/on", "dojo/topic", "dojo/dom-construct", "dojo/dom", "dojo/query", "dojo/when", "dojo/request", "dojo/promise/all",
	"dijit/layout/ContentPane", "dijit/layout/BorderContainer", "dijit/TooltipDialog", "dijit/Dialog", "dijit/popup",
	"dijit/TitlePane", "dijit/registry", "dijit/form/Form", "dijit/form/RadioButton", "dijit/form/Select", "dijit/form/Button",
	"./ContainerActionBar", "./KeggMapPainter"

], function(declare, lang, Deferred,
			on, Topic, domConstruct, dom, Query, when, request, All,
			ContentPane, BorderContainer, TooltipDialog, Dialog, popup,
			TitlePane, registry, Form, RadioButton, Select, Button,
			ContainerActionBar){

	return declare([BorderContainer], {
		gutters: false,
		region: "center",
		visible: false,
		containerActions: [
			[
				"Legend",
				"fa icon-bars fa-2x",
				{label: "Legend", multiple: false, validTypes: ["*"]},
				function(){
					console.log("legend");
				},
				true
			],
			[
				"Print Map",
				"fa icon-print fa-2x",
				{label: "Print", multiple: false, validTypes: ["*"]},
				function(){
					console.log("print");
				},
				true
			]
		],
		pmState: null,
		constructor: function(){
			Topic.subscribe("PathwayMap", lang.hitch(this, function(){
				// console.log("PathwayMapKegg:", arguments);
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "updatePmState":
						this.pmState = value;
						this.drawBoxes(value);
						break;
					case "highlightEC":
						this.pNS.highlight(value);
						break;
					default:
						break;
				}
			}));
		},
		_setVisibleAttr: function(visible){
			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();
			}
		},
		onFirstView: function(){
			if(this._firstView){
				return;
			}

			this.containerActionBar = new ContainerActionBar({
				region: "top"
			});
			this.containerActions.forEach(function(a){
				this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
			}, this);
			this.addChild(this.containerActionBar);

			this.addChild(new ContentPane({
				region: "center",
				style: "padding:0",
				content: '<svg id="map_div" style="width:1200px;height:1000px;position:absolute;"></svg><img id="map_img" src="/patric/images/pathways/map' + this.state.pathway_id + '.png" alt=""/>',
			}));

			this.inherited(arguments);
			this._firstView = true;

			// this.drawBoxes();
		},
		drawBoxes: function(pmState){
			var self = this;
			when(this.getKeggData(pmState), function(data){

				// initialize
				self.pNS = new PathwayPainter();

				// process all ECs
				data['all_coordinates'].forEach(function(box){
					self.pNS.data.push(new boxData(box));
				});

				// present
				data['genome_x_y'].forEach(function(d){
					self.pNS.data.forEach(function(current){
						if(current.name === d['ec_number']){
							current.genome_count[d['algorithm']] = parseInt(d['genome_count']);
							current[d['algorithm']] = true;
						}
					});
				});

				self.pNS.setCurrent('PATRIC', 6);
				self.pNS.paint();
			});
		},
		getKeggData: function(pmState){

			var def = new Deferred();
			var _self = this;

			var defGenomeXy = when(request.post(_self.apiServer + '/pathway/', {
				handleAs: 'json',
				headers: {
					'Accept': "application/solr+json",
					'Content-Type': "application/solrquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
				},
				data: 'q=genome_id:(' + pmState.genomeIds.join(' OR ') + ') AND pathway_id:(' + pmState.pathway_id + ')&rows=0&facet=true&json.facet={stat:{field:{field:ec_number,limit:-1,facet:{genome_count:"unique(genome_id)"}}}}'
			}), function(response){

				var facets = response.facets.stat.buckets;
				var ecNumbers = [];
				var ecGenomeMap = {};
				facets.forEach(function(bucket){
					var ecNumber = bucket['val'];
					var count = bucket['genome_count'];
					ecNumbers.push(ecNumber);
					ecGenomeMap[ecNumber] = count;
				});

				return when(request.post(_self.apiServer + '/pathway_ref/', {
					handleAs: 'json',
					headers: {
						'Accept': "application/json",
						'Content-Type': "application/solrquery+x-www-form-urlencoded",
						'X-Requested-With': null,
						'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
					},
					data: 'q=pathway_id:(' + pmState.pathway_id + ') AND map_type:enzyme AND ec_number:(' + ecNumbers.join(' OR ') + ')&fl=ec_number,ec_description,map_location'
				}), function(response){

					var ref = {};
					response.forEach(function(row){
						var loc = row['map_location'][0].split(',');
						ref[row['ec_number']] = {
							ec_number: row['ec_number'],
							ec_description: row['ec_description'],
							x: parseInt(loc[0]),
							y: parseInt(loc[1])
						};
					});
					// build genome_x_y
					// algorithm, description, ec_number, genome_count, x, y
					return ecNumbers.map(function(ec_number){
						return lang.mixin(ref[ec_number], {
							algorithm: 'PATRIC',
							genome_count: ecGenomeMap[ec_number]
						});
					});
				})
			});

			var defAllCoordinates = when(request.post(_self.apiServer + '/pathway_ref/', {
				handleAs: 'json',
				headers: {
					'Accept': "application/json",
					'Content-Type': "application/solrquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
				},
				data: 'q=pathway_id:' + pmState.pathway_id + '&fl=ec_number,ec_description,map_location&rows=25000'
			}), function(response){

				var coordinates = [];
				response.map(function(row){
					row['map_location'].forEach(function(location){
						var loc = location.split(',');
						coordinates.push({
							ec_number: row['ec_number'],
							ec_description: row['ec_description'],
							x: parseInt(loc[0]),
							y: parseInt(loc[1])
						});
					});
				});

				return coordinates;
			});

			// var genomePathwayXy, var mapIdsInMap: implement when needed and add to All([])

			when(All([defGenomeXy, defAllCoordinates]), function(results){
				def.resolve({genome_x_y: results[0], all_coordinates: results[1]});
			});

			return def.promise;
		},
		getKeggCoordinates: function(type, pathwayId, idValue){

			var def = new Deferred();
			var _self = this;

			switch(type){
				case "ec_number":
					when(request.post(_self.apiServer + '/pathway_ref', {
						handleAs: 'json',
						headers: {
							'Accept': "application/json",
							'Content-Type': "application/solrquery+x-www-form-urlencoded",
							'X-Requested-With': null,
							'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
						},
						data: 'q=pathway_id:' + pathwayId + ' AND ec_number:' + idValue + '&fl=ec_number,map_location'
					}), function(response){

						var coordinates = response.map(function(row){
							var loc = row['map_location'][0].split(',');
							return {
								ec_number: row['ec_number'],
								x: parseInt(loc[0]),
								y: parseInt(loc[1])
							};
						});

						def.resolve(coordinates);
					});
					break;
				case "feature":
					when(request.post(_self.apiServer + '/pathway/', {
						handleAs: 'json',
						headers: {
							'Accept': "application/json",
							'Content-Type': "application/solrquery+x-www-form-urlencoded",
							'X-Requested-With': null,
							'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
						},
						data: 'q=pathway_id:' + pathwayId + ' AND feature_id(:' + idValue.replace(',', ' OR ') + ')&fl=ec_number'
					}), function(response){

						var ecNumbers = response.map(function(row){
							return row['ec_number'];
						});

						when(request.post(_self.apiServer + '/pathway_ref', {
							handleAs: 'json',
							headers: {
								'Accept': "application/json",
								'Content-Type': "application/solrquery+x-www-form-urlencoded",
								'X-Requested-With': null,
								'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
							},
							data: 'q=pathway_id:' + pathwayId + ' AND ec_number:' + ecNumbers.join(' OR ') + '&fl=ec_number,map_location'
						}), function(response){

							var coordinates = response.map(function(row){
								var loc = row['map_location'][0].split(',');
								return {
									ec_number: row['ec_number'],
									x: parseInt(loc[0]),
									y: parseInt(loc[1])
								};
							});

							def.resolve(coordinates);
						});
					});
					break;
				default:
					def.error('wrong params');
					break;
			}

			return def.promise;
		}
	});
});