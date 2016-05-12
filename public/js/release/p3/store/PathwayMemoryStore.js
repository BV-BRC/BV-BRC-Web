define("p3/store/PathwayMemoryStore", [
	"dojo/_base/declare",
	"dojo/request",
	"dojo/store/Memory",
	"dojo/store/util/QueryResults",
	"dojo/when", "dojo/_base/lang",
	"dojo/_base/Deferred", "dojo/Stateful",
	"../util/PathJoin"

], function(declare,
			request,
			Memory,
			QueryResults,
			when, lang,
			Deferred, Stateful,
			PathJoin){
	return declare([Memory, Stateful], {
		baseQuery: {},
		idProperty: "idx",
		apiServer: window.App.dataServiceURL,
		state: null,
		genome_ids: null,
		type: "pathway",
		onSetState: function(attr, oldVal, state){
			var ov, nv;
			if(oldVal){
				ov = oldVal.search + oldVal.filter
			}
			if(state){
				nv = state.search + state.filter
			}

			// console.log("MEMORY STORE onSetState: ", state, oldVal);
			// if (ov!=nv){
			// console.log("clear memory store data");
			this._loaded = false;
			if(this._loadingDeferred){
				// console.log("Deleting _loadingDeferred", this._loadingDeferred);
				delete this._loadingDeferred;
			}
			// }
		},
		constructor: function(opts){
			this.init(opts);
		},
		init: function(options){
			options = options || {};
			// console.log("PMS Ctor Options: ", options);
			this._loaded = false;
			this.genome_ids = [];
			lang.mixin(this, options);
			this.watch("state", lang.hitch(this, "onSetState"));
			// console.log("INIT COMPLETE: ", this)
		},

		query: function(query, opts){
			query = query || {};
			if(this._loaded){
				return this.inherited(arguments);
			}
			else{
				var _self = this;
				var results;
				// console.log("Beofre LOAD type: ", this.type);
				// console.log("Initiate NON LOADED Query: ", query);
				var qr = QueryResults(when(this.loadData(), function(){
					// console.log("Do actual Query Against loadData() data. QR: ", qr);
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

		queryTypes: {
			pathway: "&group((field,pathway_id),(format,simple),(ngroups,true),(limit,1),(facet,true))" +
			"&json(facet," + encodeURIComponent(JSON.stringify({
				stat: {
					field: {
						field: "pathway_id",
						limit: -1,
						facet: {
							genome_count: "unique(genome_id)",
							gene_count: "unique(feature_id)",
							ec_count: "unique(ec_number)",
							genome_ec: "unique(genome_ec)"
						}
					}
				}
			})) + ")",

			ecnumber: "&group((field,ec_number),(format,simple),(ngroups,true),(limit,1),(facet,true))" +
			"&json(facet," + encodeURIComponent(JSON.stringify({
				stat: {
					field: {
						field: "ec_number",
						limit: -1,
						facet: {
							genome_count: "unique(genome_id)",
							gene_count: "unique(feature_id)",
							ec_count: "unique(ec_number)",
							genome_ec: "unique(genome_ec)"
						}
					}
				}
			})) + ")",
			genes: "&group((field,feature_id),(format,simple),(ngroups,true),(limit,1),(facet,true))" +
			"&json(facet," + encodeURIComponent(JSON.stringify({
				stat: {
					field: {
						field: "feature_id",
						limit: -1,
						facet: {
							genome_count: "unique(genome_id)",
							gene_count: "unique(feature_id)",
							ec_count: "unique(ec_number)",
							genome_ec: "unique(genome_ec)"
						}
					}
				}
			})) + ")"
		},
		buildQuery: function(){
			var q = [];
			if(this.state){
				if(this.state.search){
					// console.log("buildQuery SEARCH: ", this.state.search);

					q.push((this.state.search.charAt(0) == "?") ? this.state.search.substr(1) : this.state.search);
				}else if(this.state.genome_ids){
					q.push("in(genome_id,(" + this.state.genome_ids.map(encodeURIComponent).join(",") + "))");
				}

				if(this.state.hashParams && this.state.hashParams.filter){
					if(this.state.hashParams.filter != "false"){
						q.push(this.state.hashParams.filter);
					}
				}
				if(q.length < 1){
					q = "";
				}
				else if(q.length == 1){
					q = q[0];
				}
				else{
					q = "and(" + q.join(",") + ")";
				}
			}else{
				q = ""
			}
			q = q + this.queryTypes[this.type];

			// console.log("End Build Query: ", q);
			return (q.charAt(0) == "?") ? q.substr(1) : q;
		},

		loadData: function(){

			if(this._loadingDeferred){
				return this._loadingDeferred;
			}
			var state = this.state || {};

			if(!state.search || !state.genome_ids || state.genome_ids.length < 1){
				// console.log("No Genome IDS, use empty data set for initial store");

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

			// var lq;

			// if(state && state.genome_ids){
			// 		lq = "&in(genome_id,(" + state.genome_ids.map(encodeURIComponent).join(",") + "))";
			// }

			// console.log("QUERY TYPE: ", this.type, this.queryTypes[this.type])
			var q = this.buildQuery();

			var _self = this;
			// console.log("Load Data: ", q);
			this._loadingDeferred = when(request.post(PathJoin(this.apiServer, 'pathway') + '/', {
				handleAs: 'json',
				headers: {
					'Accept': "application/solr+json",
					'Content-Type': "application/rqlquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': this.token ? this.token : (window.App.authorizationToken || "")
				},
				data: q

			}), lang.hitch(this, function(response){

				var docs = [];
				var props = {
					"pathway": "pathway_id",
					"ecnumber": "ec_number",
					"genes": 'feature_id'
				};
				// console.log("Pathway Base Query Response:", response);
				// console.log("Type: ", this.type, " props[this.type]: ", props[this.type], "res prop: ",  response.grouped[props[this.type]])
				if(response && response.grouped && response.grouped[props[this.type]]){
					var ds = response.grouped[props[this.type]].doclist.docs;
					var buckets = response.facets.stat.buckets;
					var map = {};
					buckets.forEach(function(b){
						map[b["val"]] = b;
						delete b["val"];
					});

					docs = ds.map(function(doc){
						var p = props[this.type];
						var pv = doc[p];
						// console.log("p: ", p, "pv: ", pv, " mapped[pv]", map[pv]);
						lang.mixin(doc, map[pv] || {});
						if(doc.genome_ec && doc.genome_count){
							doc.ec_cons = (doc.genome_ec / doc.genome_count / doc.ec_count * 100).toFixed(2);
						}else{
							doc.ec_cons = 0;
						}
						if(doc.gene_count && doc.genome_count){
							doc.gene_cons = (doc.gene_count / doc.genome_count / doc.ec_count).toFixed(2);
						}else{
							doc.gene_cons = 0;
						}

						// compose index key
						switch(this.type){
							case "pathway":
								doc.idx = doc.pathway_id;
								break;
							case "ecnumber":
								doc.idx = doc.pathway_id + "_" + doc.ec_number;
								break;
							case "genes":
								doc.idx = doc.feature_id;
								break;
							default:
								break;
						}
						return doc;
					}, this);
					// console.log("doc count: ", docs.length);

					_self.setData(docs);
					_self._loaded = true;
					return true;

				}else{
					console.error("Unable to Process Response: ", response);
					_self.setData([]);
					_self._loaded = true;
					return false;
				}
			}), lang.hitch(this, function(err){
				console.error("Error Loading Data: ", err);
				_self.setData([]);
				_self._loaded = true;
				return err;
			}));
			return this._loadingDeferred;
		}
	})
});
