define([
	"dojo/_base/declare", "dojo/request",
	"dojo/store/Memory", "dojo/store/util/QueryResults",
	"dojo/when", "dojo/_base/lang", "dojo/Stateful", "dojo/_base/Deferred",
	"dojo/topic", "./HeatmapDataTypes"
], function(declare, request,
			Memory, QueryResults,
			when, lang, Stateful, Deferred,
			Topic){

	var tgState = {
		heatmapAxis: '',
		comparisonIds: [],
		comparisonFilterStatus: {},
		clusterRowOrder: [],
		clusterColumnOrder: []
	};

	return declare([Memory, Stateful], {
		baseQuery: {},
		apiServer: window.App.dataServiceURL,
		idProperty: "feature_id",
		state: null,
		tgState: tgState,

		constructor: function(options){
			this._loaded = false;
			if(options.apiServer){
				this.apiServer = options.apiServer;
			}

			var self = this;

			Topic.subscribe("TranscriptomicsGene", function(){
				// console.log("received:", arguments);
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "applyConditionFilter":
						self.conditionFilter(value);
						self.currentData = self.getHeatmapData(self.tgState);
						Topic.publish("TranscriptomicsGene", "updateHeatmapData", self.currentData);
						break;
					case "requestHeatmapData":
						self.currentData = self.getHeatmapData(value);
						Topic.publish("TranscriptomicsGene", "updateHeatmapData", self.currentData);
						break;
					default:
						break;
				}
			});
		},
		conditionFilter: function(gfs){
			// TODO: implement here
			// var self = this;
			// if(self._filtered == undefined){ // first time
			// 	self._filtered = true;
			// 	self._original = this.query("", {});
			// }
			// var data = self._original;
			// var newData = [];
			//
			// // var tsStart = window.performance.now();
			// data.forEach(function(family){
			//
			// 	console.log(family);
			// 	var skip = false;
			//
			// 	Object.keys(gfs).forEach(function(genomeId){
			// 		var index = gfs[genomeId].getIndex();
			// 		var status = gfs[genomeId].getStatus();
			// 		console.log(family, family.family_id, genomeId, index, status, family.dist, parseInt(family.dist.substr(index * 2, 2), 16));
			// 		if(status == 1 && parseInt(family.dist.substr(index * 2, 2), 16) > 0){
			// 			skip = true;
			// 		}
			// 		else if(status == 0 && parseInt(family.dist.substr(index * 2, 2), 16) == 0){
			// 			skip = true;
			// 		}
			// 	});
			// 	if(!skip){
			// 		newData.push(family);
			// 	}
			// });
			// // console.log("genomeFilter took " + (window.performance.now() - tsStart), " ms");
			//
			// self.setData(newData);
			// self.set("refresh");
		},
		reload: function(){
			var self = this;
			delete self._loadingDeferred;
			self._loaded = false;
			self.loadData();
			self.set("refresh");
		},

		query: function(query, opts){
			query = query || {};
			// console.warn("query: ", query, opts);
			// if(opts.sort == undefined){
			// 	opts.sort = [{attribute: "family_id", descending: false}];
			// }
			if(this._loaded){
				return this.inherited(arguments);
			}
			else{
				var _self = this;
				var results;
				var qr = QueryResults(when(this.loadData(), function(){
					results = _self.query(query, opts);
					qr.total = when(results, function(results){
						return results.total || results.length
					});
					return results;
				}));

				return qr;
			}
		},

		get: function(id, opts){
			if(this._loaded){
				return this.inherited(arguments);
			}else{
				var _self = this;
				return when(this.loadData(), function(){
					return _self.get(id, options)
				})
			}
		},

		loadData: function(){
			if(this._loadingDeferred){
				return this._loadingDeferred;
			}

			var _self = this;

			if(!this.state || this.state.search == null){
				console.log("No State, use empty data set for initial store");

				//this is done as a deferred instead of returning an empty array
				//in order to make it happen on the next tick.  Otherwise it
				//in the query() function above, the callback happens before qr exists
				var def = new Deferred();
				setTimeout(lang.hitch(_self, function(){
					_self.setData([]);
					_self._loaded = true;
					def.resolve(true);
				}), 0);
				return def.promise;
			}

			// console.log("loadData(): state:", this.state);

			var query = this.state.search + "&limit(99999)";

			this._loadingDeferred = when(request.post(this.apiServer + '/transcriptomics_sample/', {
				handleAs: 'json',
				headers: {
					'Accept': "application/json",
					'Content-Type': "application/rqlquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': this.token ? this.token : (window.App.authorizationToken || "")
				},
				data: query + "&select(pid,expname,expmean,timepoint,mutant,strain,condition)"
			}), function(response){
				// console.warn(response);

				if(response.length === 0){
					// data is not available
					_self.setData([]);
					_self._loaded = true;
					return true;
				}

				var comparisons = response;
				var comparisonIdList = comparisons.map(function(comparison){
					return comparison.pid;
				});
				_self.tgState.comparisonIds = comparisonIdList;
				comparisons.forEach(function(comparison, idx){
					var cfs = new FilterStatus();
					cfs.init(idx, comparison.expname);
					_self.tgState.comparisonFilterStatus[comparison.pid] = cfs;
				});
				Topic.publish("TranscriptomicsGene", "updateTgState", _self.tgState);
				Topic.publish("TranscriptomicsGene", "updateFilterGrid", comparisons);

				// console.warn("Comparisons:", comparisonIdList);
				// TODO: read experiment from workspace and populate comparisons

				// sub query - genome distribution
				return when(request.post(_self.apiServer + '/transcriptomics_gene/', {
					handleAs: 'json',
					headers: {
						'Accept': "application/json",
						'Content-Type': "application/rqlquery+x-www-form-urlencoded",
						'X-Requested-With': null,
						'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
					},
					data: query + "&select(pid,refseq_locus_tag,feature_id,log_ratio,z_score)"
				}), function(expressions){

					// console.warn("Expressions:", expressions);
					// TODO: read experiment from workspace and populate expressions
					// TODO: handle 25k limit of the data API

					var p3FeatureIdSet = {};
					var p2FeatureIdSet = {}; // maybe when I read from workspace

					expressions.forEach(function(expression){
						if(expression.hasOwnProperty("feature_id")){
							if(!p3FeatureIdSet.hasOwnProperty(expression.feature_id)){
								p3FeatureIdSet[expression.feature_id] = true;
							}else if(expression.hasOwnProperty("na_feature_id")){
								if(!p2FeatureIdSet.hasOwnProperty(expression.na_feature_id)){
									p2FeatureIdSet[expression.na_feature_id] = true;
								}
							}
						}
					});

					var p3FeatureIdList = Object.keys(p3FeatureIdSet);
					var p2FeatureIdList = Object.keys(p2FeatureIdSet);

					// console.log("p3FeatureIdList:", p3FeatureIdList, "p2FeatureIdList:", p2FeatureIdList);

					return when(request.post(_self.apiServer + '/genome_feature/', {
						handleAs: 'json',
						headers: {
							'Accept': "application/json",
							'Content-Type': "application/solrquery+x-www-form-urlencoded",
							'X-Requested-With': null,
							'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
						},
						data: {
							q: (p3FeatureIdList.length > 0) ? 'feature_id:(' + p3FeatureIdList.join(' OR ') + ')' : ''
							+ (p3FeatureIdList.length > 0 && p2FeatureIdList.length > 0) ? ' OR ' : ''
							+ (p2FeatureIdList.length > 0) ? 'p2_feature_id:(' + p2FeatureIdList.join(' OR ') + ')' : '',
							fl: 'feature_id,p2_feature_id,strand,product,accession,start,end,patric_id,alt_locus_tag,genome_name,gene',

							rows: (p3FeatureIdList.length + p2FeatureIdList.length)
						}
					}), function(features){
						// console.warn("features: ", features);

						var expressionHash = {};

						window.performance.mark('mark_start_stat1');

						expressions.forEach(function(expression){
							var featureId;
							if(expression.hasOwnProperty("feature_id")){
								featureId = expression.feature_id;
							}else if(expression.hasOwnProperty("na_feature_id")){
								featureId = expression.na_feature_id;
							}

							if(!expressionHash.hasOwnProperty(featureId)){

								var expr = {samples: {}};
								(expression.hasOwnProperty('feature_id')) ? expr.feature_id = expression.feature_id : '';
								(expression.hasOwnProperty('na_feature_id')) ? expr.p2_feature_id = expression.na_feature_id : '';
								(expression.hasOwnProperty('refseq_locus_tag')) ? expr.refseq_locus_tag = expression.refseq_locus_tag : expression.exp_locus_tag;
								var log_ratio = expression.log_ratio, z_score = expression.z_score;
								expr.samples[expression.pid] = {
									log_ratio: log_ratio || '',
									z_score: z_score | ''
								};
								expr.up = (log_ratio != null && Number(log_ratio) > 0) ? 1 : 0;
								expr.down = (log_ratio != null && Number(log_ratio) < 0) ? 1 : 0;

								expressionHash[featureId] = expr;
							}else{
								expr = expressionHash[featureId];
								if(!expr.samples.hasOwnProperty(expression.pid)){
									log_ratio = expression.log_ratio;
									z_score = expression.z_score;
									expr.samples[expression.pid] = {
										log_ratio: log_ratio || '',
										z_score: z_score || ''
									};
									(log_ratio != null && Number(log_ratio) > 0) ? expr.up++ : '';
									(log_ratio != null && Number(log_ratio) < 0) ? expr.down++ : '';

									expressionHash[featureId] = expr;
								}
							}
						});
						window.performance.mark('mark_end_stat1');
						window.performance.measure('measure_transcriptomics_stat1', 'mark_start_stat1', 'mark_end_stat1');

						window.performance.mark('mark_start_stat2');
						var data = [];
						features.forEach(function(feature){

							var expr;
							if(expressionHash.hasOwnProperty(feature.feature_id)){
								expr = expressionHash[feature.feature_id];
							}else if(expressionHash.hasOwnProperty(feature.p2_feature_id)){
								expr = expressionHash[feature.p2_feature_id];
							}
							// build expr object
							var count = 0;
							expr.sample_binary = comparisonIdList.map(function(comparisonId){
								if(expr.samples.hasOwnProperty(comparisonId) && expr.samples[comparisonId].log_ratio !== ''){
									count++;
									return "1";
								}else{
									return "0";
								}
							}).join('');
							expr.sample_size = count;

							var datum = lang.mixin(lang.clone(feature), expr);
							data.push(datum);
						});

						window.performance.mark('mark_end_stat2');
						window.performance.measure('measure_transcriptomics_stat2', 'mark_start_stat2', 'mark_end_stat2');

						// var measures = window.performance.getEntriesByType('measure');
						// for(var i = 0, len = measures.length; i < len; ++i){
						// 	console.log(measures[i].name + ' took ', measures[i].duration, ' ms');
						// }

						_self.setData(data);
						_self._loaded = true;
						return true;
					}, function(err){
						console.error("Error in TranscriptomicsGeneStore: ", err)
					});
				});
			});
			return this._loadingDeferred;
		},

		getHeatmapData: function(pfState){
			var rows = [];
			var cols = [];
			var maxIntensity = 0; // global and will be modified inside createColumn function
			var keeps = []; // global and will be referenced inside createColumn function
			var colorStop = [];

			var isTransposed = (pfState.heatmapAxis === 'Transposed');
			// var start = window.performance.now();

			// assumes axises are corrected
			var geneOrder = pfState.clusterColumnOrder;
			var comparisonOrder = pfState.clusterRowOrder;

			var createColumn = function(order, colId, label, distribution, meta){
				var filtered = [], isEven = (order % 2) === 0;

				keeps.forEach(function(idx, i){ // idx is a start position of distribution. 2 * gfs.getIndex();
					filtered[i] = distribution.substr(idx, 2);
					var val = parseInt(filtered[i], 16);

					if(maxIntensity < val){
						maxIntensity = val;
					}
				});

				return new Column(order, colId, label, filtered.join(''),
					((isEven) ? 0x000066 : null) /* label color */,
					((isEven) ? 0xF4F4F4 : 0xd6e4f4) /*bg color */,
					meta);
			};

			// rows - comparisons
			// if genome order is changed, then needs to or-organize distribution in columns.
			var comparisonOrderChangeMap = [];

			if(comparisonOrder !== [] && comparisonOrder.length > 0){
				pfState.comparisonIds = comparisonOrder;
				comparisonOrder.forEach(function(comparisonId, idx){
					// console.log(genomeId, pfState.genomeFilterStatus[genomeId], idx);
					comparisonOrderChangeMap.push(pfState.comparisonFilterStatus[comparisonId].getIndex()); // keep the original position
					pfState.comparisonFilterStatus[comparisonId].setIndex(idx);
				});
			}

			pfState.comparisonIds.forEach(function(comparisonId, idx){
				var gfs = pfState.comparisonFilterStatus[comparisonId];
				if(gfs.getStatus() != '1'){
					keeps.push(2 * gfs.getIndex());
					var labelColor = ((idx % 2) == 0) ? 0x000066 : null;
					var rowColor = ((idx % 2) == 0) ? 0xF4F4F4 : 0xd6e4f4;

					//console.log("row: ", gfs.getIndex(), genomeId, gfs.getGenomeName(), labelColor, rowColor);
					rows.push(new Row(gfs.getIndex(), comparisonId, gfs.getLabel(), labelColor, rowColor));
				}
			});

			// cols - genes
			//console.warn(this);
			var data = this.query("", {});

			var geneOrderMap = {};
			if(geneOrder !== [] && geneOrder.length > 0){
				geneOrder.forEach(function(geneId, idx){
					geneOrderMap[geneId] = idx;
				});
			}else{
				data.forEach(function(gene, idx){
					geneOrderMap[gene.feature_id] = idx;
				})
			}

			data.forEach(function(gene){
				var meta = {
					'samples': gene.samples
				};

				// calculate distribution based on the threshold. gene.dist
				var dist = []; var labels = [];
				// gene.samples.forEach(function(sample, idx){
				pfState.comparisonIds.forEach(function(comparisonId, idx){
					var comparison = gene.samples[comparisonId];

					// lets copy current implementation for now
					var lr = parseFloat(comparison.log_ratio);
					if(isNaN(lr)){ lr = 0; }

					// skip checking all vs significant genes
					// skip checking threshold
					var val;
					if (lr < 0 && lr >= -1) {
						val = "01";
					} else if (lr < -1 && lr >= -2) {
						val = "02";
					} else if (lr < -2 && lr >= -3) {
						val = "03";
					} else if (lr < -3 && lr >= -4) {
						val = "04";
					} else if (lr < -4) {
						val = "05";
					} else if (lr > 0 && lr <= 1) {
						val = "06";
					} else if (lr > 1 && lr <= 2) {
						val = "07";
					} else if (lr > 2 && lr <= 3) {
						val = "08";
					} else if (lr > 3 && lr <= 4) {
						val = "09";
					} else if (lr > 4) {
						val = "0A";
					} else {
						val = "0B";
					}
					dist[idx] = val;
					labels[idx] = lr;
				});
				gene.dist = dist.join("");
				meta.labels = labels.join("|");

				if(comparisonOrderChangeMap.length > 0){
					gene.dist = distributionTransformer(gene.dist, comparisonOrderChangeMap);
				}
				var order = geneOrderMap[gene.feature_id];
				cols[order] = createColumn(order, gene.feature_id, gene.alt_locus_tag + "_" + gene.product, gene.dist, meta);
			});

			// TODO: re-implement
			// colorStop
			if(maxIntensity == 1){
				colorStop = [new ColorStop(1, 0xfadb4e)];
			}else if(maxIntensity == 2){
				colorStop = [new ColorStop(0.5, 0xfadb4e), new ColorStop(1, 0xf6b437)];
			}else if(maxIntensity >= 3){
				colorStop = [new ColorStop(1 / maxIntensity, 0xfadb4e), new ColorStop(2 / maxIntensity, 0xf6b437), new ColorStop(3 / maxIntensity, 0xff6633), new ColorStop(maxIntensity / maxIntensity, 0xff6633)];
			}

			//console.log(rows, cols, colorStop);

			var currentData = {
				'rows': rows,
				'columns': cols,
				'colorStops': colorStop,
				'rowLabel': 'Comparison',
				'colLabel': 'Gene',
				'rowTrunc': 'end',
				'colTrunc': 'end',
				'offset': 1,
				'digits': 2,
				'countLabel': 'Log ratio',
				'negativeBit': false,
				'cellLabelField': 'labels',
				'cellLabelsOverrideCount': true,
				'beforeCellLabel': '',
				'afterCellLabel': ''
			};

			if(isTransposed){

				var flippedDistribution = []; // new Array(currentData.rows.length);
				currentData.rows.forEach(function(row, rowIdx){
					var distribution = [];
					currentData.columns.forEach(function(col){
						distribution.push(col.distribution.substr(rowIdx * 2, 2));
					});
					flippedDistribution[rowIdx] = distribution.join("");
				});

				// create new rows
				var newRows = [];
				currentData.columns.forEach(function(col, colID){
					newRows.push(new Row(colID, col.colID, col.colLabel, col.labelColor, col.bgColor, col.meta));
				});
				// create new columns
				var newColumns = [];
				currentData.rows.forEach(function(row, rowID){
					newColumns.push(new Column(rowID, row.rowID, row.rowLabel, flippedDistribution[rowID], row.labelColor, row.bgColor, row.meta))
				});

				currentData = lang.mixin(currentData, {
					'rows': newRows,
					'columns': newColumns,
					'rowLabel': 'Gene',
					'colLabel': 'Comparison'
				});
			}

			// var end = window.performance.now();
			// console.log('getHeatmapData() took: ', (end - start), "ms");

			return currentData;
		}
	});
});