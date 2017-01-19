define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred",
	"dojo/request", "dojo/when", "dojo/Stateful", "dojo/topic",
	"./P3MemoryStore"
], function(declare, lang, Deferred,
			request, when, Stateful, Topic,
			Memory){

	return declare([Memory, Stateful], {
		idProperty: "interaction_id",
		state: null,
		onSetState: function(attr, oldVal, state){
			if(!state){
				return;
			}

			console.warn("onSetState", state);
		},

		constructor: function(options){
			this._loaded = false;

			this.topicId = options.topicId;
			console.log("interaction store created.", this.topicId);

			// Topic.subscribe()

			this.watch("state", lang.hitch(this, "onSetState"));
		},

		loadData: function(){
			if(this._loadingDeferred){
				return this._loadingDeferred;
			}

			// console.log(this.state.search);
			if(!this.state.search){
				var def = new Deferred();
				setTimeout(lang.hitch(this, function(){
					this.setData([]);
					this._loaded = true;
					// def.resolve(true);
				}), 0);
				return def.promise;
			}

			var query = this.state.search;
			if(this.state.hashParams
				&& this.state.hashParams.hasOwnProperty('filter')
				&& this.state.hashParams.filter !== "false"){
				query += "&" + this.state.hashParams.filter;
			}
			query += "&facet((pivot,(method_id,method_name)),(mincount,1))&facet((pivot,(type_id,type_name)),(mincount,1))&facet((pivot,(taxon_a,taxon_b)),(mincount,1))&facet((pivot,(taxon_a,taxid_a)),(mincount,1))&facet((pivot,(taxon_b,taxid_b)),(mincount,1))&facet((pivot,(taxon_a,group_a)),(mincount,1))&facet((pivot,(taxon_b,group_b)),(mincount,1))&limit(500,0)";

			this._loadingDeferred = when(request.get(this.apiServer + '/ppi/?' + query, {
				handleAs: 'json',
				headers: {
					'Accept': 'application/solr+json',
					'Content-Type': 'application/rqlquery+x-www-form-urlencoded'
				}
			}), lang.hitch(this, function(res){

				var data = res.response.docs;

				this.setData(data);
				this._loaded = true;

				Topic.publish(this.topicId, "updateGraphData", data);
			}));

			return this._loadingDeferred;
		}
	})
});