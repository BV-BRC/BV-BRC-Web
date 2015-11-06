define([
	"dojo/_base/declare", "dojo/request",
	"dojo/store/Memory", "dojo/store/util/QueryResults",
	"dojo/when", "dojo/_base/lang", "dojo/Stateful", "dojo/_base/Deferred"
], function(declare, request,
			Memory, QueryResults,
			when, lang, Stateful, Deferred){
	return declare([Memory, Stateful], {
		baseQuery: {},
		apiServer: window.App.dataServiceURL,
		idProperty: "family_id",
		state: null,

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
			var familyType = 'figfam';
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

						var data = {};
						var familyRefHash = {};
						res.response.docs.forEach(function(el){
							if(!(el.family_id in familyRefHash)){
								familyRefHash[el.family_id] = el.family_product;
							}
						});
						window.performance.mark('mark_end_stat3');
						window.performance.measure('measure_protein_family_stat3', 'mark_start_stat3', 'mark_end_stat3');

						window.performance.mark('mark_start_stat4');
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

								data[familyId] = {
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
							}
						});
						window.performance.mark('mark_end_stat4');
						window.performance.measure('measure_protein_family_stat4', 'mark_start_stat4', 'mark_end_stat4');
						// console.log(data);

						window.performance.mark('mark_start_stat5');

						//var gridData = [];
						//Object.keys(data).forEach(function(key){
						//	gridData.push(data[key]);
						//});
						var arrayKeys = Object.keys(data);
						var arrayLength = arrayKeys.length;
						var gridData = new Array(arrayLength);
						for(var i = 0; i < arrayLength; i++){
							gridData[i] = data[arrayKeys[i]];
						}
						window.performance.mark('mark_end_stat5');
						window.performance.measure('measure_protein_family_stat5', 'mark_start_stat5', 'mark_end_stat5');
						window.performance.measure('measure_total', 'mark_start_stat1', 'mark_end_stat5');

						var measures = window.performance.getEntriesByType('measure');
						for(var i = 0, len = measures.length; i < len; ++i){
							console.log(measures[i].name + ' took ' + measures[i].duration + ' ms');
						}
						console.log("Set Data: ", gridData);
						_self.setData(gridData);
						_self._loaded = true;
						return true;
					}, function(err){
						console.log("Error in ProteinFamiliesStore: ", err)
					});
				});
			});
			return this._loadingDeferred;
		}
	});
});