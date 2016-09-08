define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred",
	"dojo/request", "dojo/when", "dojo/Stateful", "dojo/topic", "dojo/promise/all",
	"dojo/store/Memory", "dojo/store/util/QueryResults",
	"./ArrangeableMemoryStore", "../WorkspaceManager", "./HeatmapDataTypes"
], function(declare, lang, Deferred,
			request, when, Stateful, Topic, All,
			Memory, QueryResults,
			ArrangeableMemoryStore, WorkspaceManager){

	var tgState = {
		heatmapAxis: '',
		comparisonIds: [],
		comparisonFilterStatus: {},
		clusterRowOrder: [],
		clusterColumnOrder: [],
		significantGenes: 'Y',
		colorScheme: 'rgb',
		maxIntensity: 0,
		upFold: 0,
		downFold: 0,
		upZscore: 0,
		downZscore: 0
	};

	return declare([ArrangeableMemoryStore, Stateful], {
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
						self.tgState = value;
						self.conditionFilter(value);
						self.currentData = self.getHeatmapData(self.tgState);
						Topic.publish("TranscriptomicsGene", "updateTgState", self.tgState);
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
		conditionFilter: function(tgState){
			var self = this;
			if(self._filtered == undefined){ // first time
				self._filtered = true;
				self._original = this.query("", {});
			}
			var data = self._original;
			var newData = [];
			var gfs = tgState.comparisonFilterStatus;

			var tsStart = window.performance.now();
			data.forEach(function(gene){

				var pass = false;
				var up_r = 0, down_r = 0, total_samples = 0;

				// comparisons
				for(var i = 0, len = tgState.comparisonIds.length; i < len; i++){
					var comparisonId = tgState.comparisonIds[i];
					var index = gfs[comparisonId].getIndex();
					var status = gfs[comparisonId].getStatus();
					var comparison = gene.samples[comparisonId];
					// console.log(gene, gene.feature_id, comparisonId, index, status, gene.dist, parseInt(gene.dist.substr(index * 2, 2), 16));

					var expression = gene.sample_binary.substr(index, 1);
					if(expression === '1'){
						if(status != 2){
							pass = self._thresholdFilter(comparison, tgState, status);
							if(!pass){
								break;
							}
						}else{
							// status == 2, don't care
							if(!pass){
								pass = self._thresholdFilter(comparison, tgState, status)
							}
						}
					}else{
						if(status != 2){
							pass = false;
							break;
						}
					}

					if(comparison){
						var value = parseFloat(comparison.log_ratio);
						if(!isNaN(value)){
							if(value > tgState.upFold){
								up_r++;
							}
							if(value < tgState.downFold){
								down_r++;
							}
							total_samples++;
						}
					}
				}

				gene.up = up_r;
				gene.down = down_r;
				gene.sample_size = total_samples;

				if(pass){
					newData.push(gene);
				}
			});
			console.log("conditionFilter took " + (window.performance.now() - tsStart), " ms");

			self.setData(newData);
			self.set("refresh");
		},
		_thresholdFilter: function(comparison, tgState, filterStatus){
			var uf = tgState.upFold, df = tgState.downFold;
			var uz = tgState.upZscore, dz = tgState.downZscore;
			var l = (comparison && !isNaN(parseFloat(comparison['log_ratio']))) ? parseFloat(comparison['log_ratio']) : 0;
			var z = (comparison && !isNaN(parseFloat(comparison['z_score']))) ? parseFloat(comparison['z_score']) : 0;
			if(!comparison) return false;

			var pass = false;
			switch(filterStatus){
				case 2: // don't care (' ')
					pass = (dz === uz && df === uf)
						|| ((z >= uz || z <= dz) && (l >= uf || l <= df));
					break;
				case 0: // up-regulated (1)
					pass = ((uz != 0 ? z >= uz : true) && l >= uf);
					break;
				case 1: // down-regulated (0)
					pass = ((dz != 0 ? z <= dz : true) && l <= df);
					break;
				default:
					break;
			}
			// console.log("_thresholdFilter: [", filterStatus, pass, "] ", uf, l, df, ",", uz, z, dz);
			return pass;
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

			var params = this.state.search.split('&');
			var wsExperiments = params.filter(function(s){ return s.match(/wsExpId=.*/) });
			var wsComparisons = params.filter(function(s){ return s.match(/wsComparisonId=.*/) });
			var wsExpIds, wsComparisonIds;
			if(wsExperiments.length > 0){
				wsExpIds = wsExperiments[0].replace('wsExpId=','').split(',');
			}
			if(wsComparisons.length > 0){
				wsComparisonIds = wsComparisons[0].replace('wsComparisonId=','').split(',');
			}

			// console.log(this.state.search, "wsExpIds: ", wsExpIds, "wsComparisonIds: ", wsComparisonIds);

			if(wsExpIds){

				var wsRequest = when(WorkspaceManager.getObjects(wsExpIds, true), function(data){

					var fileList = data.map(function(obj){
						var files = {};
						obj.autoMeta.output_files.forEach(function(arr){
							var d = arr[0];
							var file = d.substr(d.lastIndexOf('/') + 1);
							var type = file.split('.')[0];
							files[type] = d;
						});

						return {meta: obj, files: files};
					});

					var comparisonFiles = fileList.map(function(obj){
						return obj.files.sample;
					});
					var comparisonsReq = when(WorkspaceManager.getObjects(comparisonFiles, false), function(results){
						return results.map(function(d){
							if(!wsComparisonIds){
								return JSON.parse(d.data)['sample'];
							}else{
								return JSON.parse(d.data)['sample'].filter(function(s){
									// console.log(wsComparisonIds.indexOf(s.pid), s.pid);
									return wsComparisonIds.indexOf(s.pid) >= 0;
								})
							}
						});
					});
					var expressionFiles = fileList.map(function(obj){
						return obj.files.expression;
					});
					var expressionsReq = when(WorkspaceManager.getObjects(expressionFiles, false), function(results){
						return results.map(function(d){
							if(!wsComparisonIds){
								return JSON.parse(d.data)['expression']
							}else{
								return JSON.parse(d.data)['expression'].filter(function(e){
									return wsComparisonIds.indexOf(e.pid) >= 0;
								})
							}
						});
					});

					return when(All([comparisonsReq, expressionsReq]), function(results){
						var comparisons = [].concat.apply([], results[0]);
						var expressions = [].concat.apply([], results[1]);

						return {comparisons: comparisons, expressions: expressions};
					});
				});

				this._loadingDeferred = when(wsRequest, function(response){

					// console.log(response);

					var comparisons = response.comparisons;
					var expressions = response.expressions;

					var comparisonIdList = comparisons.map(function(d){
						return d.pid;
					});

					_self.tgState.comparisonIds = comparisonIdList;
					comparisons.forEach(function(comparison, idx){
						var cfs = new FilterStatus();
						cfs.init(idx, comparison.expname);
						_self.tgState.comparisonFilterStatus[comparison.pid.toString()] = cfs;
					});
					Topic.publish("TranscriptomicsGene", "updateTgState", _self.tgState);
					Topic.publish("TranscriptomicsGene", "updateFilterGrid", comparisons);

					// copied from public case //
					var p3FeatureIdSet = {};
					var p2FeatureIdSet = {};

					expressions.forEach(function(expression){
						if(expression.hasOwnProperty('feature_id')){
							if(!p3FeatureIdSet.hasOwnProperty(expression.feature_id)){
								p3FeatureIdSet[expression.feature_id] = true;
							}
						}else if(expression.hasOwnProperty('na_feature_id')){
							if(!p2FeatureIdSet.hasOwnProperty(expression.na_feature_id)){
								p2FeatureIdSet[expression.na_feature_id] = true;
							}
						}
					});

					var p3FeatureIdList = Object.keys(p3FeatureIdSet);
					var p2FeatureIdList = Object.keys(p2FeatureIdSet);

					// console.log("p3FeatureIdList:", p3FeatureIdList.length, "p2FeatureIdList:", p2FeatureIdList.length);

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
						// var features = response.response.docs;
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
								expr.samples[expression.pid.toString()] = {
									log_ratio: log_ratio || '',
									z_score: z_score || ''
								};
								expr.up = (log_ratio != null && Number(log_ratio) > 0) ? 1 : 0;
								expr.down = (log_ratio != null && Number(log_ratio) < 0) ? 1 : 0;

								expressionHash[featureId] = expr;
							}else{
								expr = expressionHash[featureId];
								if(!expr.samples.hasOwnProperty(expression.pid.toString())){
									log_ratio = expression.log_ratio;
									z_score = expression.z_score;
									expr.samples[expression.pid.toString()] = {
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
					// end of copy //
				});

				return this._loadingDeferred;
			}

			var query = this.state.search;

			this._loadingDeferred = when(request.post(this.apiServer + '/transcriptomics_sample/', {
				handleAs: 'json',
				headers: {
					'Accept': "application/json",
					'Content-Type': "application/rqlquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': this.token ? this.token : (window.App.authorizationToken || "")
				},
				data: query + "&select(pid,expname,expmean,timepoint,mutant,strain,condition)&limit(99999)"
			}), function(response){
				// console.warn(response);

				if(response.length === 0){
					// data is not available
					_self.setData([]);
					_self._loaded = true;
					return true;
				}

				var comparisonIdList = [];
				var comparisons = response.map(function(comparison){
					var strPId = comparison.pid.toString();
					comparison.pid = strPId;
					comparisonIdList.push(strPId);
					return comparison;
				});
				_self.tgState.comparisonIds = comparisonIdList;
				comparisons.forEach(function(comparison, idx){
					var cfs = new FilterStatus();
					cfs.init(idx, comparison.expname);
					_self.tgState.comparisonFilterStatus[comparison.pid.toString()] = cfs;
				});
				Topic.publish("TranscriptomicsGene", "updateTgState", _self.tgState);
				Topic.publish("TranscriptomicsGene", "updateFilterGrid", comparisons);

				// console.warn("Comparisons:", comparisonIdList);

				// sub query - genome distribution
				return when(request.post(_self.apiServer + '/transcriptomics_gene/', {
					handleAs: 'json',
					headers: {
						'Accept': "application/solr+json",
						'Content-Type': "application/rqlquery+x-www-form-urlencoded",
						'X-Requested-With': null,
						'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
					},
					data: query + "&select(pid,refseq_locus_tag,feature_id,log_ratio,z_score)&limit(1)"
				}), function(response){
					// var expressions = response.response.docs;
					var numFound = response.response.numFound;
					var start = response.response.start;

					var steps = Math.ceil(numFound / 25000);
					var allRequests = [];
					for(var i = 0; i < steps; i++){
						var deferred = when(request.post(_self.apiServer + '/transcriptomics_gene/', {
							handleAs: 'json',
							headers: {
								'Accept': "application/json",
								'Content-Type': "application/rqlquery+x-www-form-urlencoded",
								'X-Requested-With': null,
								'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
							},
							data: query + "&select(pid,refseq_locus_tag,feature_id,log_ratio,z_score)&limit(25000," + start + ")"
						}));
						allRequests.push(deferred);
						start += 25000;
					}

					return when(All(allRequests), function(response){
						var expressions = [];
						response.forEach(function(data){
							expressions = expressions.concat(data);
						});

						// console.warn("Expressions:", expressions);

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
							// var features = response.response.docs;
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
									expr.samples[expression.pid.toString()] = {
										log_ratio: log_ratio || '',
										z_score: z_score || ''
									};
									expr.up = (log_ratio != null && Number(log_ratio) > 0) ? 1 : 0;
									expr.down = (log_ratio != null && Number(log_ratio) < 0) ? 1 : 0;

									expressionHash[featureId] = expr;
								}else{
									expr = expressionHash[featureId];
									if(!expr.samples.hasOwnProperty(expression.pid.toString())){
										log_ratio = expression.log_ratio;
										z_score = expression.z_score;
										expr.samples[expression.pid.toString()] = {
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
			});
			return this._loadingDeferred;
		},

		getHeatmapData: function(tgState){
			var self = this;
			var rows = [];
			var cols = [];
			var maxIntensity = 0; // global and will be modified inside createColumn function
			var keeps = []; // global and will be referenced inside createColumn function

			var isTransposed = (tgState.heatmapAxis === 'Transposed');
			// var start = window.performance.now();

			// assumes axises are corrected
			var geneOrder = tgState.clusterColumnOrder;
			var comparisonOrder = tgState.clusterRowOrder;

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
			// if comparison order is changed, then needs to or-organize distribution in columns.
			var comparisonOrderChangeMap = [];

			if(comparisonOrder !== [] && comparisonOrder.length > 0){
				tgState.comparisonIds = comparisonOrder;
				comparisonOrder.forEach(function(comparisonId, idx){
					comparisonOrderChangeMap.push(tgState.comparisonFilterStatus[comparisonId].getIndex()); // keep the original position
					tgState.comparisonFilterStatus[comparisonId].setIndex(idx);
				});
			}

			tgState.comparisonIds.forEach(function(comparisonId, idx){
				var gfs = tgState.comparisonFilterStatus[comparisonId];
				// if(gfs.getStatus() != '1'){
				keeps.push(2 * gfs.getIndex());
				var labelColor = ((idx % 2) == 0) ? 0x000066 : null;
				var rowColor = ((idx % 2) == 0) ? 0xF4F4F4 : 0xd6e4f4;

				rows.push(new Row(gfs.getIndex(), comparisonId, gfs.getLabel(), labelColor, rowColor));
				// }
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
				var push_flag = false;

				// calculate distribution based on the threshold. gene.dist
				var dist = [];
				var labels = [];
				// gene.samples.forEach(function(sample, idx){
				tgState.comparisonIds.forEach(function(comparisonId, idx){
					var comparison = gene.samples[comparisonId];
					var all_genes_flag = false;
					var status = tgState.comparisonFilterStatus[comparisonId].getStatus();
					var expression = gene.sample_binary.substr(idx, 1);
					// console.log(comparisonId, filterStatus, expression);

					if(tgState.significantGenes === 'N'){
						if(expression === '1'){
							if(self._thresholdFilter(comparison, tgState, status)){
								push_flag = true;
								all_genes_flag = false;
							}else{
								if(tgState.significantGenes === 'N'){
									push_flag = true;
									all_genes_flag = true;
								}
							}
						}else{
							if(status != 2){
								push_flag = false;
							}else{
								if(tgState.significantGenes === 'N'){
									all_genes_flag = true;
								}
							}
						}
					}else{
						all_genes_flag = false;
						push_flag = true;
					}

					var val;
					if(comparison){
						var lr = parseFloat(comparison.log_ratio);
						if(isNaN(lr)){
							lr = 0;
						}

						// skip checking all vs significant genes
						if(all_genes_flag){
							val = "0B";
						}else{
							// skip checking threshold
							// console.log("threshold: ", self._thresholdFilter(comparison, tgState, filterStatus));
							if(!self._thresholdFilter(comparison, tgState, status)){
								val = "0B";
							}else{
								if(lr < 0 && lr >= -1){
									val = "01";
								}else if(lr < -1 && lr >= -2){
									val = "02";
								}else if(lr < -2 && lr >= -3){
									val = "03";
								}else if(lr < -3 && lr >= -4){
									val = "04";
								}else if(lr < -4){
									val = "05";
								}else if(lr > 0 && lr <= 1){
									val = "06";
								}else if(lr > 1 && lr <= 2){
									val = "07";
								}else if(lr > 2 && lr <= 3){
									val = "08";
								}else if(lr > 3 && lr <= 4){
									val = "09";
								}else if(lr > 4){
									val = "0A";
								}else{
									val = "0B";
								}
							}
						}
						dist[idx] = val;
						labels[idx] = lr;
					}else{
						dist[idx] = "0B";
						labels[idx] = "0";
					}
				});
				gene.dist = dist.join("");
				meta.labels = labels.join("|");

				if(push_flag){
					if(comparisonOrderChangeMap.length > 0){
						gene.dist = distributionTransformer(gene.dist, comparisonOrderChangeMap);
					}
					var order = geneOrderMap[gene.feature_id];
					cols[order] = createColumn(order, gene.feature_id, gene.product + " - " + gene.patric_id.replace("|", ""), gene.dist, meta);
				}
			});

			tgState.maxIntensity = maxIntensity; // store for later use
			var colorStop = getColorStops(tgState.colorScheme, maxIntensity);

			// console.warn(rows, cols, colorStop);

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