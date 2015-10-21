define([
	"dojo/_base/declare", "dojo/request",
	"dojo/store/Memory", "dojo/store/util/QueryResults",
	"dojo/when", "dojo/_base/lang", "dojo/Stateful"
], function(declare, request,
			Memory, QueryResults,
			when, lang, Stateful){
	return declare([Memory, Stateful], {
		baseQuery: {},
		apiServer: window.App.dataServiceURL,
		idProperty: "family_id",
		state: null,

		onSetState: function(attr, oldVal, state){
			//console.log("ProteinFamiliesMemoryStore setState: ", state);
			if(state && state.genome_ids && state.genome_ids.length > 0){
				this.genome_ids = state.genome_ids || [];
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

			this._loadingDeferred = when(request.get(this.apiServer + '/genome_feature/?' + q, {
				handleAs: 'json',
				headers: {
					'Accept': "application/solr+json",
					'Content-Type': "application/solrquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': this.token ? this.token : (window.App.authorizationToken || "")
				}
			}), function(response){

				var familyStat = response.facets.stat.buckets;

				var familyIdList = [];
				familyStat.forEach(function(element){
					familyIdList.push(element.val);
				});

				// sub query - genome distribution
				query['json.facet'] = '{stat:{type:field,field:genome_id,limit:-1,facet:{families:{type:field,field:' + familyId + ',limit:-1,sort:{index:asc}}}}}';

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
						var familyGenomeIdStr = {};
						var familyGenomeCount = {};
						var familyGenomeIdCountMap = {};
						var familyGenomeIdSet = {};
						var genomePosMap = {};
						_self.genome_ids.forEach(function(genomeId){
							genomePosMap[genomeId] = _self.genome_ids.indexOf(genomeId);
						});

						genomeFamilyDist.forEach(function(genome){
							var genomeId = genome.val;
							var genomePos = genomePosMap[genomeId];
							var familyBuckets = genome.families.buckets;

							familyBuckets.forEach(function(bucket){
								var familyId = bucket.val;
								var genomeCount = bucket.count.toString(16);
								if(genomeCount.length < 2) genomeCount = '0' + genomeCount;

								if(familyId in familyGenomeIdCountMap){
									familyGenomeIdCountMap[familyId][genomePos] = genomeCount;
								}
								else{
									var genomeIdCount = [];
									genomeIdCount[genomePos] = genomeCount;
									familyGenomeIdCountMap[familyId] = genomeIdCount;
								}

								if(familyId in familyGenomeIdSet){
									familyGenomeIdSet[familyId].push(genomeId);
								}
								else{
									var genomeIds = [];
									genomeIds.push(genomeId);
									familyGenomeIdSet[familyId] = genomeIds;
								}
							});
						});

						Object.keys(familyGenomeIdCountMap).forEach(function(familyId){
							var genomeIdStr = familyGenomeIdCountMap[familyId];
							familyGenomeIdStr[familyId] = genomeIdStr.join("");
							familyGenomeCount[familyId] = familyGenomeIdSet[familyId].filter(function(value, index, self){
								return self.indexOf(value) === index;
							}).length;
						});

						var data = {};
						var familyRefHash = {};
						res.response.docs.forEach(function(el){
							if(familyRefHash[el.family_id] == null){
								familyRefHash[el.family_id] = el.family_product;
							}
						});

						familyStat.forEach(function(element){
							var familyId = element.val;
							var featureCount = element.count;
							var std = 0;
							if(featureCount > 1){
								var sumSq = element.ss || 0;
								var sum = element.sum || 0;
								var realSq = sumSq - (sum * sum) / featureCount;
								std = Math.sqrt(realSq / (featureCount - 1));
							}

							element.family_id = familyId;
							element.feature_count = featureCount;
							element.aa_length_std = std;
							element.description = familyRefHash[element.val];
							element.genome_count = familyGenomeCount[familyId];
							element.genomes = familyGenomeIdStr[familyId];
							delete element.val;
							delete element.ss;
							delete element.sum;
							data[familyId] = element;
						});
						console.log(data);

						var gridData = [];
						Object.keys(data).forEach(function(key){
							gridData.push(data[key]);
						});
						//gridData.sort(function(a, b){
						//	return (a.family_id).localeCompare(b.family_id);
						//});
						_self.setData(gridData);
						//console.log(gridData);

						_self._loaded = true;
						return true;
					}, function(err) {

					}, function(update) {
						// console.log(update);
					});
				});
			});
			return this._loadingDeferred;
		}
	});
});