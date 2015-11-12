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
		idProperty: "genome_id",
		state: null,

		onSetState: function(attr, oldVal, state){
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

			var query = {
				q: "genome_id:(" + this.genome_ids.join(' OR ') + ")",
				rows: this.genome_ids.length
			};
			var q = Object.keys(query).map(function(p){
				return p + "=" + query[p]
			}).join("&");

			var _self = this;

			this._loadingDeferred = when(request.post(this.apiServer + '/genome/', {
				handleAs: 'json',
				headers: {
					'Accept': "application/solr+json",
					'Content-Type': "application/solrquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': this.token ? this.token : (window.App.authorizationToken || "")
				},
				data: q
			}), function(response){
				var data = response.response.docs;

				_self.setData(data);
				_self._loaded = true;
				return true;
			});
			return this._loadingDeferred;
		}
	});
});