define("p3/store/PathwayMemoryStore", [
	"dojo/_base/declare",
	"dojo/request",
	"dojo/store/Memory",
	"dojo/store/util/QueryResults",
	"dojo/when", "dojo/_base/lang",
	"dojo/_base/Deferred", "dojo/Stateful"

], function(declare,
			request,
			Memory,
			QueryResults,
			when, lang,
			Deferred, Stateful){
	return declare([Memory, Stateful], {
		baseQuery: {},
		idProperty: "pathway_id",
		apiServer: window.App.dataServiceURL,
		state: null,
		genome_ids: null,
		onSetState: function(attr, oldVal, state){
			//console.log("PathwayMemoryStore setState: ", state);
			if(state && state.genome_ids && state.genome_ids.length > 0){
				var cur = this.genome_ids.join("");
				var next = state.genome_ids.join("");
				if(cur != next){
					this.set("genome_ids", state.genome_ids || []);
					this._loaded = false;
					delete this._loadingDeferred;
				}
			}
		},
		constructor: function(options){
			//console.log("PMS Ctor Options: ", options);
			this._loaded = false;
			this.genome_ids = [];
			if(options.apiServer){
				this.apiServer = options.apiServer
			}
			this.watch("state", lang.hitch(this, "onSetState"))
		},

		query: function(query, opts){
			query = query || {};
			if(this._loaded){
				return this.inherited(arguments);
			}
			else{
				var _self = this;
				var results;
				console.log("Initiate NON LOADED Query: ", query);
				var qr = QueryResults(when(this.loadData(), function(){
					console.log("Do actual Query Against loadData() data. QR: ", qr);
					results = _self.query(query || {}, opts);
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
			}
			else{
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

			var lq;

			if(state && state.genome_ids){
				//	lq = state.genome_ids.map(function(x){ return "genome_id:" + x}).join(" OR ");
				lq = "genome_id:(" + state.genome_ids.join(" OR ") + ")";
			}

			console.log("PathwayMemoryStore LoadData Query: ", lq);

			var query = {
				q: lq,
				rows: 1,
				facet: true,
				'json.facet': '{stat:{field:{field:pathway_id,limit:-1,facet:{genome_count:"unique(genome_id)",gene_count:"unique(feature_id)",ec_count:"unique(ec_number)",genome_ec:"unique(genome_ec)"}}}}'

			};
			var q = Object.keys(query).map(function(p){
				return p + "=" + query[p]
			}).join("&");

			var _self = this;
			console.log("Load Data: ", q);
			this._loadingDeferred = when(request.post(this.apiServer + '/pathway/', {
				handleAs: 'json',
				headers: {
					'Accept': "application/solr+json",
					'Content-Type': "application/solrquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': this.token ? this.token : (window.App.authorizationToken || "")
				},
				data: q

			}), function(response){
				console.log("Pathway Base Query Response:", response);
				var pathwayIdList = [];
				response.facets.stat.buckets.forEach(function(element){
					pathwayIdList.push(element.val);
				});
				var data = [];
				// sub query
				var pathwayRefHash = {};
				return when(request.post(_self.apiServer + '/pathway_ref/', {
					handleAs: 'json',
					headers: {
						'Accept': "application/solr+json",
						'Content-Type': "application/solrquery+x-www-form-urlencoded",
						'X-Requested-With': null,
						'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
					},
					data: {
						q: 'pathway_id:(' + pathwayIdList.join(' OR ') + ')',
						rows: 1000000
					}
				}), function(res){
					res.response.docs.forEach(function(el){
						if(pathwayRefHash[el.pathway_id] == null){
							pathwayRefHash[el.pathway_id] = {
								pathway_name: el.pathway_name,
								pathway_class: el.pathway_class
							};
						}
					});

					response.facets.stat.buckets.forEach(function(element){
						var ec_cons = 0,
							gene_cons = 0;
						if(element.genome_count > 0 && element.ec_count > 0){
							ec_cons = element.genome_ec / element.genome_count / element.ec_count * 100;
							gene_cons = element.gene_count / element.genome_count / element.ec_count;
						}
						var el = {
							pathway_id: element.val,
							ec_cons: ec_cons,
							gene_cons: gene_cons
						};
						el.pathway_name = pathwayRefHash[element.val].pathway_name;
						el.pathway_class = pathwayRefHash[element.val].pathway_class;
						//el.annotation = self.params.annotation;
						delete element.val;
						data.push(lang.mixin(el, element));
					});
					console.log("setData() rows: ", data.length);
					_self.setData(data);
					_self._loaded = true;

					return true;
				});
			});
			return this._loadingDeferred;
		}
	})
});