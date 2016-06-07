define("p3/store/GeneExpressionMemoryStore", [
	"dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred",
	"dojo/request", "dojo/when", "dojo/Stateful", "dojo/topic", "dojo/promise/all",
	"dojo/store/Memory", "dojo/store/util/QueryResults",
	"./ArrangeableMemoryStore"
], function(declare, lang, Deferred,
			request, when, Stateful, Topic, All,
			Memory, QueryResults,
			ArrangeableMemoryStore){

	var tgState = {
		comparisonIds: [],
		comparisonFilterStatus: {},
		upFold: 0,
		downFold: 0,
		upZscore: 0,
		downZscore: 0
	};

	return declare([ArrangeableMemoryStore, Stateful], {
		baseQuery: {},
		apiServer: window.App.dataServiceURL,
		idProperty: "pid",
		state: null,
		tgState: tgState,
		feature_id: null,
		onSetState: function(attr, oldVal, state){
			console.log("Gene Transcriptomics Tab onSetState: ", state);
			if(state && state.feature && state.feature.feature_id){
				var cur = this.feature_id;
				var next = state.feature.feature_id;
				if(cur != next){
					this.set("feature_id", state.feature_id || {});
					this._loaded = false;
					delete this._loadingDeferred;
				}
			}
		},

		constructor: function(options){
			this._loaded = false;
			if(options.apiServer){
				this.apiServer = options.apiServer;
			}

			var self = this;

			Topic.subscribe("GeneExpression", function(){
				console.log("GeneExpressionMemoryStore received:", arguments);
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "applyConditionFilter":
						self.tgState = value;
						//self.conditionFilter(value);
						self.reload();
						Topic.publish("GeneExpression", "updateTgState", self.tgState);
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
			
			console.log("In MemoryStore conditionFilter ... ", tgState, ",", self._original); 

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
			console.log("_thresholdFilter: [", filterStatus, pass, "] ", uf, l, df, ",", uz, z, dz);
			return pass;
		},
		
		reload: function(){
			console.log("In MemoryStore reload ... ");
			var self = this;
			delete self._loadingDeferred;
			self._loaded = false;
			self.loadData();
			self.set("refresh");
		},

		query: function(query, opts){
			console.log("In MemoryStore query ... ", query, ",", opts); 
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
					console.log("In MemoryStore query, results ... ", results); 
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
			//console.log("In MemoryStore loadData(): state:", this.state);
			console.log("In MemoryStore loadData(): _self.tgState:", _self.tgState);

			var uf = _self.tgState.upFold, df = _self.tgState.downFold;
			var uz = _self.tgState.upZscore, dz = _self.tgState.downZscore;
			var keyword= _self.tgState.keyword;

			//var q = this.state.search + "&select(feature_id,refseq_locus_tag,pid,expname)&limit(25000)";
			//var q = this.state.search + "&select(feature_id,refseq_locus_tag,pid,expname,accession,pmid,genome_id,strain,mutant,condition,timepoint,avg_intensity,log_ratio,z_score)&sort(+expname)&limit(25000)";
			//var q = this.state.search + "&select(feature_id,refseq_locus_tag,pid,expname,accession,pmid,genome_id,strain,mutant,condition,timepoint,avg_intensity,log_ratio,z_score)&sort(+expname)&limit(25000)";
			var range = "";
			if (keyword && keyword.length >0)
			{
				range += "&keyword(" + encodeURIComponent(keyword) + ")";
			}
			
			if (uf>0 && df<0)
			{
				range += "&or(gt(log_ratio,"  + uf + "),lt(log_ratio,"  + df+ "))";			
			}
			else if (uf>0) {
				range += "&gt(log_ratio,"  + uf + ")";
			}
			else if (df<0) {
				range += "&lt(log_ratio,"  + df+ ")";
			}
			if (uz>0 && dz<0)
			{
				range += "&or(gt(z_score,"  + uz + "),lt(z_score,"  + dz+ "))";			
			}
			else if (uz>0) {
				range += "&gt(z_score,"  + uz+ ")";
			}
			else if (dz<0) {
				range += "&lt(z_score,"  + dz+ ")";
			}
			//var q = this.state.search + range + "&select(pid,feature_id,refseq_locus_tag,pid,expname,accession,pmid,genome_id,strain,mutant,condition,timepoint,avg_intensity,log_ratio,z_score)&sort(+expname)&limit(25000)";
			var q = this.state.search + range + "&sort(+expname)&limit(25000)";
			
			console.log("In MemoryStore query: q:", q);
			console.log("In MemoryStore query: window.App.dataServiceURL:", window.App.dataServiceURL);

			this._loadingDeferred = when(request.post(window.App.dataServiceURL + '/transcriptomics_gene/', {
						data: q,
						headers: {
							"accept": "application/solr+json",
							"content-type": "application/rqlquery+x-www-form-urlencoded",
							'X-Requested-With': null,
							'Authorization': (window.App.authorizationToken || "")
						},
						handleAs: "json"
				}), function(response){
				console.log("In MemoryStore loadData(): response.response:", response.response);

				var comparisonIdList = [];
				var comparisons = response.response.docs.map(function(comparison){
					var strPId = comparison.pid.toString();
					comparison.pid = strPId;
					comparisonIdList.push(strPId);
					return comparison;
				});
				_self.tgState.comparisonIds = comparisonIdList;
				console.log("In MemoryStore loadData(): comparisonIds:", comparisonIdList);

				_self.setData(response.response.docs);
				_self._loaded = true;
				return;
			});
			return this._loadingDeferred;
		}
	})
});