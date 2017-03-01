define("p3/store/IDMappingAppMemoryStore", [
	"dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred",
	"dojo/request", "dojo/when", "dojo/Stateful", "dojo/topic", "dojo/promise/all",
	"dojo/store/Memory", "dojo/store/util/QueryResults"
], function(declare, lang, Deferred,
			request, when, Stateful, Topic, All,
			Memory, QueryResults){

	return declare([Memory, Stateful], {
		baseQuery: {},
		apiServer: window.App.dataServiceURL,
		idProperty: "idx",
		state: null,
        rowLimit :25000,
        sourceToTarget: {}, //models one to many, and no mapping relationships
		
        onSetState: function(attr, oldVal, state){
			if(!state){
				return;
			}
			// console.log("onSetState", state, this);
			this.reload();
		},

		constructor: function(options){
			this._loaded = false;
			this.topicId = options.topicId;
			if(options.apiServer){
				this.apiServer = options.apiServer;
			}
			this.watch("state", lang.hitch(this, "onSetState"));
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
				var qr = QueryResults(when(this.loadData(), lang.hitch(this, function(){
					results = _self.query(query, opts);
					qr.total = when(results, function(results){
						return results.total || results.length
					});
					return results;
				})));

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
        expandNoMap: function(data){
            var _self=this;
            var idx = data.length+1;
            Object.keys(_self.sourceToTarget).forEach(function(source){
                if(Object.keys(_self.sourceToTarget[source]).length == 0){
                    data.push({'source':source,'idx':idx});
                    idx+=1;
                }
            });
        },

		loadData: function(){
			if(this._loadingDeferred){
				return this._loadingDeferred;
			}

			var _self = this;

			// console.warn(this.state, this.state.genome_ids, !this.state.genome_ids);
			if(!this.state){
				// console.log("No Genome IDS, use empty data set for initial store");

				//this is done as a deferred instead of returning an empty array
				//in order to make it happen on the next tick.  Otherwise it
				//in the query() function above, the callback happens before qr exists
				var def = new Deferred();
				setTimeout(lang.hitch(_self, function(){
					this.setData([]);
					this._loaded = true;
					// def.resolve(true);
				}), 0);
				return def.promise;
			}

			var fromIdGroup = this.state.fromIdGroup;
			var fromId = this.state.fromId;
			var toIdGroup = this.state.toIdGroup;
			var toId = this.state.toId;
			var fromIdValue = this.state.fromIdValue.split(',');

            _self.sourceToTarget={};
            fromIdValue.forEach(function(d){
                _self.sourceToTarget[d]={};
            });



			var summary = {
				total: fromIdValue.length,
				found: 0,
				type: toId
			};

			// console.log(this.state);

			if(fromIdGroup === 'PATRIC'){
				if(toIdGroup === 'PATRIC'){
					this._loadingDeferred = when(request.post(_self.apiServer + '/genome_feature/', {
						handleAs: 'json',
						headers: {
							'Accept': "application/json",
							'Content-Type': "application/solrquery+x-www-form-urlencoded",
							'X-Requested-With': null,
							'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
						},
						data: {
							q: fromId + ":(" + fromIdValue.join(" OR ") + ")",
							rows: _self.rowLimit,
							sort: "genome_name asc,accession asc,start asc"
						}
					}), function(data){

						summary.found = data.length;
						Topic.publish("IDMapping", "updateHeader", summary);
                        var idx =0;
						data.forEach(function(d){
							d['target'] = d[toId];
                            d['idx'] = idx;
                            d['source'] = d[fromId];
                            _self.sourceToTarget[d[fromId]][d[toId]]=true;
                            idx+=1;
						});
                        _self.expandNoMap(data);
						_self.setData(data);
				        Topic.publish(_self.topicId, "hideLoadingMask");
						_self._loaded = true;
						return true;
					});
				}else{
					// from PATRIC to Other
					var giNumbers = {};
					var accessionGiMap = {};
					var giTarget = {};

					// step 1: get GeneID from fromId (query to genome_feature)
					// step 2: get UniprotKBAccession from GI numbers (query to id_ref), then create accessionGiMap
					// step 3: get requested id from UniprotKBAccession (query to id_ref), then create giTargetMap

					this._loadingDeferred = when(request.post(_self.apiServer + '/genome_feature/', {
						handleAs: 'json',
						headers: {
							'Accept': "application/json",
							'Content-Type': "application/solrquery+x-www-form-urlencoded",
							'X-Requested-With': null,
							'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
						},
						data: {
							q: fromId + ":(" + fromIdValue.join(" OR ") + ")",
							rows: _self.rowLimit
						}
					}), function(features){

						giNumbers = features.map(function(d){
							return d.gene_id;
						}).filter(function(d){
							return d !== undefined && d > 0;
						});

						// console.log(giNumbers);

						if(giNumbers.length === 0){
							summary.found = 0;
							Topic.publish("IDMapping", "updateHeader", summary);
				            Topic.publish(_self.topicId, "hideLoadingMask");

							_self.setData([]);
							_self._loaded = true;
							return true;
						}

						// console.log("giNumbers: ", giNumbers);
						return when(request.post(_self.apiServer + '/id_ref/', {
							handleAs: 'json',
							headers: {
								'Accept': "application/json",
								'Content-Type': "application/solrquery+x-www-form-urlencoded",
								'X-Requested-With': null,
								'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
							},
							data: {
								q: "id_type:GeneID AND id_value:(" + giNumbers.join(" OR ") + ")",
								rows: _self.rowLimit
							}
						}), function(response){

							if(response.length === 0){
								summary.found = 0;
								Topic.publish("IDMapping", "updateHeader", summary);
                                var data = [];
                                _self.expandNoMap(data);
								_self.setData(data);
								_self._loaded = true;
								return true;
							}

							response.forEach(function(d){
								accessionGiMap[d['uniprotkb_accession']] = d['id_value'];
							});

							// console.log(accessionGiMap);

							return when(request.post(_self.apiServer + '/id_ref/', {
								handleAs: 'json',
								headers: {
									'Accept': "application/json",
									'Content-Type': "application/solrquery+x-www-form-urlencoded",
									'X-Requested-With': null,
									'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
								},
								data: {
									q: "uniprotkb_accession:(" + Object.keys(accessionGiMap).join(" OR ") + ") AND " + ((toId === 'UniProtKB-Accession') ? 'id_type:GeneID' : 'id_type:(' + toId + ')'),
									rows: _self.rowLimit
								}
							}), function(response){

								response.forEach(function(d){
									var accession = d['uniprotkb_accession'];
									var target = d['id_value'];
									var gi = accessionGiMap[accession];

									if(toId === 'UniProtKB-Accession'){
										if(!giTarget.hasOwnProperty(gi)){
											giTarget[gi] = [accession];
										}else{
											giTarget[gi].push(accession);
										}
									}else{
										if(!giTarget.hasOwnProperty(gi)){
											giTarget[gi] = [target];
										}else{
											giTarget[gi].push(target);
										}
									}

								});

								// console.log(giTarget);

								var data = [];
								features.forEach(function(d){
								    var item = Object.create(d);
									if(d.hasOwnProperty('gene_id')){
										var target = giTarget[d['gene_id']];
										if(target){
											target.forEach(function(t){
												item['target'] = t;
												item['source'] = item[fromId];
												item['idx'] = item['feature_id'] + '_' + item['target'];
                                                _self.sourceToTarget[item[fromId]][t]=true;
												data.push(item);
											});
										}
									}
								});

								summary.found = data.length;
								Topic.publish("IDMapping", "updateHeader", summary);
                                _self.expandNoMap(data);

								_self.setData(data);
								_self._loaded = true;
				                Topic.publish(_self.topicId, "hideLoadingMask");
								return true;
							});
						});
					});
				}
			}
			else{
				if(toIdGroup === 'PATRIC'){
                    // from Other to PATRIC

                    // step 1: get UniProtKBAccession (query to id_ref). skip if fromId equals UniProtKB-Accession
                    // step 2: get GI from UniProtKBAccession (query to id_ref) // defUniprotKB2PATRIC()
                    // step 3: get PATRIC feature from GI (query to genome_feature) // defUniprotKB2PATRIC()

                    var defUniprotKB2PATRIC = function(uniprotKBAccession, accessionSource){

                        return when(request.post(_self.apiServer + '/id_ref/', {
                            handleAs: 'json',
                            headers: {
                                'Accept': "application/json",
                                'Content-Type': "application/solrquery+x-www-form-urlencoded",
                                'X-Requested-With': null,
                                'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
                            },
                            data: {
                                q: "uniprotkb_accession:(" + uniprotKBAccession.join(" OR ") + ") AND id_type:GeneID",
                                rows: _self.rowLimit
                            }
                        }), function(response){

                            var giNumbers = []; // response.map(function(d){ return d.id_value;});
                            var giSource = [];

                            response.forEach(function(d){
                                var gi = d['id_value'];
                                giNumbers.push(gi);
                                var accession = d['uniprotkb_accession'];
                                giSource[gi] = accessionSource[accession];
                            });

                            return when(request.post(_self.apiServer + '/genome_feature/', {
                                handleAs: 'json',
                                headers: {
                                    'Accept': "application/json",
                                    'Content-Type': "application/solrquery+x-www-form-urlencoded",
                                    'X-Requested-With': null,
                                    'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
                                },
                                data: {
                                    q: "gene_id:(" + giNumbers.join(" OR ") + ") AND annotation:PATRIC",
                                    rows: _self.rowLimit
                                }
                            }), function(response){

                                var data = [];
                                response.forEach(function(d){
                                    var item = Object.create(d);
                                    item['source'] = giSource[d['gene_id']];
                                    item['target']=d[toId];
                                    item['idx'] = item['feature_id'] + '_' + item['target'];
                                    _self.sourceToTarget[item['source']][d[toId]]=true;
                                    data.push(item);
                                });
                                _self.expandNoMap(data);
                                return data;
                            });
                        });
                    };

                    var accessionSourceMap = {};

                    if(fromId === 'UniProtKB-Accession'){

                        accessionSourceMap = fromIdValue.map(function(d){
                            return {d: d};
                        });
                        this._loadingDeferred = when(defUniprotKB2PATRIC(fromIdValue, accessionSourceMap), function(data){
                            summary.found = data.length;
                            Topic.publish("IDMapping", "updateHeader", summary);

                            _self.setData(data);
                            _self._loaded = true;
                            Topic.publish(_self.topicId, "hideLoadingMask");
                            return true;
                        });
                    }else{
                        // get UniprotKBAccession via query to id_ref
                        this._loadingDeferred = when(request.post(_self.apiServer + '/id_ref/', {
                            handleAs: 'json',
                            headers: {
                                'Accept': "application/json",
                                'Content-Type': "application/solrquery+x-www-form-urlencoded",
                                'X-Requested-With': null,
                                'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
                            },
                            data: {
                                q: 'id_type:' + fromId + ' AND id_value:(' + fromIdValue.join(' OR ') + ')',
                                rows: _self.rowLimit
                            }
                        }), function(response){

                            var uniprotkbAccessionList = [];

                            response.forEach(function(d){
                                var accession = d['uniprotkb_accession'];
                                uniprotkbAccessionList.push(accession);
                                accessionSourceMap[accession] = d['id_value'];
                            });

                            return when(defUniprotKB2PATRIC(uniprotkbAccessionList, accessionSourceMap), function(data){
                                summary.found = data.length;
                                Topic.publish("IDMapping", "updateHeader", summary);

                                _self.setData(data);
                                _self._loaded = true;
                                Topic.publish(_self.topicId, "hideLoadingMask");
                                return true;
                            });
                        });
                    }
                }

                else{//start OTHER to OTHER

                    // step 1: get UniProtKBAccession (query to id_ref). skip if fromId equals UniProtKB-Accession
                    // step 2: get GI from UniProtKBAccession (query to id_ref) // defUniprotKB2PATRIC()
                    // step 3: get PATRIC feature from GI (query to genome_feature) // defUniprotKB2PATRIC()

                    var defUniprotKB2Other = function(uniprotKBAccession, accessionSource){

                        return when(request.post(_self.apiServer + '/id_ref/', {
                            handleAs: 'json',
                            headers: {
                                'Accept': "application/json",
                                'Content-Type': "application/solrquery+x-www-form-urlencoded",
                                'X-Requested-With': null,
                                'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
                            },
                            data: {
                                q: "uniprotkb_accession:(" + uniprotKBAccession.join(" OR ") + ") AND id_type:"+toId,
                                rows: _self.rowLimit
                            }
                        }), function(response){
                            var data=[];
                            var giNumbers = []; // response.map(function(d){ return d.id_value;});
                            var giSource = [];
                            var idx =0;
                            response.forEach(function(d){
                                var accession = d['uniprotkb_accession'];
                                var item = {};
                                item['source'] = accessionSource[accession];
                                item['idx'] = idx;
                                item['target'] = d['id_value'];
                                item['uniprotkb_accession']=accession;
                                _self.sourceToTarget[item['source']][d['id_value']]=true;
                                data.push(item);
                                idx+=1;
                            });
                            _self.expandNoMap(data);
                            return data;
                        });
                    };

                    var accessionSourceMap = {};

                    if(fromId === 'UniProtKB-Accession'){

                        accessionSourceMap = fromIdValue.map(function(d){
                            return {d: d};
                        });
                        this._loadingDeferred = when(defUniprotKB2Other(fromIdValue, accessionSourceMap), function(data){
                            summary.found = data.length;
                            Topic.publish("IDMapping", "updateHeader", summary);

                            _self.setData(data);
                            _self._loaded = true;
                            Topic.publish(_self.topicId, "hideLoadingMask");
                            return true;
                        });
                    }else{
                        // get UniprotKBAccession via query to id_ref
                        this._loadingDeferred = when(request.post(_self.apiServer + '/id_ref/', {
                            handleAs: 'json',
                            headers: {
                                'Accept': "application/json",
                                'Content-Type': "application/solrquery+x-www-form-urlencoded",
                                'X-Requested-With': null,
                                'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
                            },
                            data: {
                                q: 'id_type:' + fromId + ' AND id_value:(' + fromIdValue.join(' OR ') + ')',
                                rows: _self.rowLimit
                            }
                        }), function(response){

                            var uniprotkbAccessionList = [];

                            response.forEach(function(d){
                                var accession = d['uniprotkb_accession'];
                                uniprotkbAccessionList.push(accession);
                                accessionSourceMap[accession] = d['id_value'];
                            });

                            return when(defUniprotKB2Other(uniprotkbAccessionList, accessionSourceMap), function(data){
                                summary.found = data.length;
                                Topic.publish("IDMapping", "updateHeader", summary);

                                _self.setData(data);
                                _self._loaded = true;
                                Topic.publish(_self.topicId, "hideLoadingMask");
                                return true;
                            });
                        });
                    }

                }//end else OTHER to OTHER
            }

			return this._loadingDeferred;
		}
	});
});
