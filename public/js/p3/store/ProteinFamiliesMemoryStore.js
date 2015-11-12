define([
	"dojo/_base/declare", "dojo/request",
	"dojo/store/Memory", "dojo/store/util/QueryResults",
	"dojo/when", "dojo/_base/lang", "dojo/Stateful", "dojo/_base/Deferred",
	"dojo/topic", "./HeatmapDataTypes"
], function(declare, request,
			Memory, QueryResults,
			when, lang, Stateful, Deferred,
			Topic){
	return declare([Memory, Stateful], {
		baseQuery: {},
		apiServer: window.App.dataServiceURL,
		idProperty: "family_id",
		state: null,
		params: {
			familyType: 'figfam'
		},

		onSetState: function(attr, oldVal, state){
			//console.log("ProteinFamiliesMemoryStore setState: ", state.genome_ids);
			var cur = (this.genome_ids || []).join("");
			var next = (state.genome_ids || []).join("");
			if(cur != next){
				this.set("genome_ids", state.genome_ids || []);
				this._loaded = false;
				delete this._loadingDeferred;
			}

		},
		constructor: function(options){
			this._loaded = false;
			this.genome_ids = [];
			if(options.apiServer){
				this.apiServer = options.apiServer;
			}
			this.watch('state', lang.hitch(this, 'onSetState'));

			var self = this;

			Topic.subscribe("ProteinFamilies", function(){
				console.log("received:", arguments);
				var key = arguments[0], value = arguments[1];

				if (key === "familyType") {
					self.params.familyType = value;
				}

				delete self._loadingDeferred;
				self._loaded = false;
				self.loadData();
				self.set("refresh");
			});
		},

		query: function(query, opts){
			query = query || {};
			//console.warn("query: ", query, opts);
			if(opts.sort == undefined){
				opts.sort = [{attribute: "family_id", descending: false}];
			}
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

			var state = this.state || {};

			if(!state.genome_ids || state.genome_ids.length < 1){
				console.log("No Genome IDS, use empty data set for initial store");

				//this is done as a deferred instead of returning an empty array
				//in order to make it happen on the next tick.  Otherwise it
				//in the query() function above, the callback happens before qr exists
				var def = new Deferred();
				setTimeout(lang.hitch(this, function(){
					this.setData([]);
					this._loaded = true;
					def.resolve(true);
				}), 0);
				return def.promise;

			}

			// TODO: change family Id based on params
			var familyType = this.params.familyType;
			var familyId = familyType + '_id';

			var query = {
				q: "genome_id:(" + this.genome_ids.join(' OR ') + ")",
				fq: "annotation:PATRIC AND feature_type:CDS AND " + familyId + ":[* TO *]",
				rows: 0,
				facet: true,
				'json.facet': '{stat:{type:field,field:' + familyId + ',limit:-1,facet:{aa_length_min:"min(aa_length)",aa_length_max:"max(aa_length)",aa_length_mean:"avg(aa_length)",ss:"sumsq(aa_length)",sum:"sum(aa_length)"}}}'
			};
			var q = Object.keys(query).map(function(p){
				return p + "=" + query[p]
			}).join("&");

			var _self = this;

			this._loadingDeferred = when(request.post(this.apiServer + '/genome_feature/', {
				handleAs: 'json',
				headers: {
					'Accept': "application/solr+json",
					'Content-Type': "application/solrquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': this.token ? this.token : (window.App.authorizationToken || "")
				},
				data: q
			}), function(response){
				var familyStat = response.facets.stat.buckets;

				var familyIdList = [];
				familyStat.forEach(function(element){
					if(element.val != ""){
						familyIdList.push(element.val);
					}
				});

				// sub query - genome distribution
				query = q + '&json.facet={stat:{type:field,field:genome_id,limit:-1,facet:{families:{type:field,field:' + familyId + ',limit:-1,sort:{index:asc}}}}}';

				console.log("Do Second Request to /genome_feature/");
				return when(request.post(_self.apiServer + '/genome_feature/', {
					handleAs: 'json',
					headers: {
						'Accept': "application/solr+json",
						'Content-Type': "application/solrquery+x-www-form-urlencoded",
						'X-Requested-With': null,
						'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
					},
					data: query
				}), function(response){

					return when(request.post(_self.apiServer + '/protein_family_ref/', {
						handleAs: 'json',
						headers: {
							'Accept': "application/solr+json",
							'Content-Type': "application/solrquery+x-www-form-urlencoded",
							'X-Requested-With': null,
							'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
						},
						data: {
							q: 'family_type:' + familyType + ' AND family_id:(' + familyIdList.join(' OR ') + ')',
							rows: 1000000
						}
					}), function(res){
						var genomeFamilyDist = response.facets.stat.buckets;
						var familyGenomeCount = {};
						var familyGenomeIdCountMap = {};
						var familyGenomeIdSet = {};
						var genomePosMap = {};
						_self.genome_ids.forEach(function(genomeId, idx){
							genomePosMap[genomeId] = idx;
						});

						window.performance.mark('mark_start_stat1');
						genomeFamilyDist.forEach(function(genome){
							var genomeId = genome.val;
							var genomePos = genomePosMap[genomeId];
							var familyBuckets = genome.families.buckets;

							familyBuckets.forEach(function(bucket){
								var familyId = bucket.val;
								if(familyId != ""){
									var genomeCount = bucket.count.toString(16);
									if(genomeCount.length < 2) genomeCount = '0' + genomeCount;

									if(familyId in familyGenomeIdCountMap){
										familyGenomeIdCountMap[familyId][genomePos] = genomeCount;
									}
									else{
										var genomeIdCount = new Array(_self.genome_ids.length);
										genomeIdCount[genomePos] = genomeCount;
										familyGenomeIdCountMap[familyId] = genomeIdCount;
									}

									if(familyId in familyGenomeIdSet){
										familyGenomeIdSet[familyId].push(genomeId);
									}
									else{
										var genomeIds = new Array(_self.genome_ids.length);
										genomeIds.push(genomeId);
										familyGenomeIdSet[familyId] = genomeIds;
									}
								}
							});
						});

						window.performance.mark('mark_end_stat1');
						window.performance.measure('measure_protein_family_stat1', 'mark_start_stat1', 'mark_end_stat1');

						window.performance.mark('mark_start_stat2');
						Object.keys(familyGenomeIdCountMap).forEach(function(familyId){
							var hashSet = {};
							familyGenomeIdSet[familyId].forEach(function(value){
								hashSet[value] = true;
							});
							familyGenomeCount[familyId] = Object.keys(hashSet).length;
						});

						window.performance.mark('mark_end_stat2');
						window.performance.measure('measure_protein_family_stat2', 'mark_start_stat2', 'mark_end_stat2');

						window.performance.mark('mark_start_stat3');

						var familyRefHash = {};
						res.response.docs.forEach(function(el){
							if(!(el.family_id in familyRefHash)){
								familyRefHash[el.family_id] = el.family_product;
							}
						});
						window.performance.mark('mark_end_stat3');
						window.performance.measure('measure_protein_family_stat3', 'mark_start_stat3', 'mark_end_stat3');

						window.performance.mark('mark_start_stat4');
						//var data = new Array(Object.keys(familyRefHash).length);
						var data = [];
						familyStat.forEach(function(element){
							var familyId = element.val;
							if(familyId != ""){
								var featureCount = element.count;
								var std = 0;
								if(featureCount > 1){
									var sumSq = element.ss || 0;
									var sum = element.sum || 0;
									var realSq = sumSq - (sum * sum) / featureCount;
									std = Math.sqrt(realSq / (featureCount - 1));
								}

								var row = {
									family_id: familyId,
									feature_count: featureCount,
									genome_count: familyGenomeCount[familyId],
									aa_length_std: std,
									aa_length_max: element.aa_length_max,
									aa_length_mean: element.aa_length_mean,
									aa_length_min: element.aa_length_min,
									description: familyRefHash[familyId],
									genomes: familyGenomeIdCountMap[familyId].join("")
								};
								data.push(row);
							}
						});
						window.performance.mark('mark_end_stat4');
						window.performance.measure('measure_protein_family_stat4', 'mark_start_stat4', 'mark_end_stat4');
						// console.log(data);

						window.performance.measure('measure_total', 'mark_start_stat1', 'mark_end_stat4');

						var measures = window.performance.getEntriesByType('measure');
						for(var i = 0, len = measures.length; i < len; ++i){
							console.log(measures[i].name + ' took ' + measures[i].duration + ' ms');
						}
						_self.setData(data);
						_self._loaded = true;
						return true;
					}, function(err){
						console.log("Error in ProteinFamiliesStore: ", err)
					});
				});
			});
			return this._loadingDeferred;
		},

		getHeatmapData: function(filterData){

			var rows = [];
			var cols = [];
			var keeps = [];
			var colorStop = [];

			function createColumn(i, family, meta, groupId, keeps, maxIntensity){
				var iSend = "", intensity = family.genomes, j, pick, iSendDecimal, labelColor, columnColor;

				for(j = 0; j < keeps.length; j++){
					pick = keeps[j];
					iSend += intensity.charAt(pick);
					++pick;
					iSend += intensity.charAt(pick);

					iSendDecimal = parseInt(intensity.charAt(pick - 1) + intensity.charAt(pick), 16);

					if(maxIntensity <= iSendDecimal){
						maxIntensity = iSendDecimal;
					}
				}

				labelColor = ((i % 2) == 0) ? 0x000066 : null;
				columnColor = ((i % 2) == 0) ? 0xF4F4F4 : 0xd6e4f4;

				cols[i] = new Column(i, groupId, family.description, iSend, labelColor, columnColor, meta);

				return maxIntensity;
			}

			// rows - genomes
			filterData.forEach(function(genome, idx){
				keeps.push(2 * idx);
				var labelColor = ((idx % 2) == 0) ? 0x000066 : null;
				var rowColor = ((idx % 2) == 0) ? 0xF4F4F4 : 0xd6e4f4;

				rows.push(new Row(idx, genome.genome_id, genome.genome_name, labelColor, rowColor));

				//syntenyOrderStore.push([genome.genome_id, genome.genome_name]);
			});

			// cols - families
			//console.warn(this);
			var maxIntensity = 0;
			//this.data.forEach(function(family, idx){
			var data = this.query("", {});
			//console.log(data);
			data.forEach(function(family, idx){
				var meta = {
					'instances': family.feature_count,
					'members': family.genome_count,
					'min': family.aa_length_min,
					'max': family.aa_length_max
				};
				maxIntensity = createColumn(idx, family, meta, family.family_id, keeps, maxIntensity);
			});

			// colorStop
			if(maxIntensity == 1){
				colorStop = [new ColorStop(1, 0xfadb4e)];
			}else if(maxIntensity == 2){
				colorStop = [new ColorStop(0.5, 0xfadb4e), new ColorStop(1, 0xf6b437)];
			}else if(maxIntensity >= 3){
				colorStop = [new ColorStop(1 / maxIntensity, 0xfadb4e), new ColorStop(2 / maxIntensity, 0xf6b437), new ColorStop(3 / maxIntensity, 0xff6633), new ColorStop(maxIntensity / maxIntensity, 0xff6633)];
			}

			//console.log(rows, cols, colorStop);

			return {
				'rows': rows,
				'columns': cols,
				'colorStops': colorStop,
				'rowLabel': 'Genomes',
				'colLabel': 'Protein Families',
				'rowTrunc': 'mid',
				'colTrunc': 'end',
				'offset': 1,
				'digits': 2,
				'countLabel': 'Members',
				'negativeBit': false,
				'cellLabelField': '',
				'cellLabelsOverrideCount': false,
				'beforeCellLabel': '',
				'afterCellLabel': ''
			};
		}
	});
});