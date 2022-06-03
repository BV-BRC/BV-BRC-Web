define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/request', 'dojo/when', 'dojo/Stateful', 'dojo/topic', 'dojo/promise/all',
  'dojo/store/Memory', 'dojo/store/util/QueryResults'
], function (
  declare, lang, Deferred,
  request, when, Stateful, Topic, All,
  Memory, QueryResults
) {

  return declare([Memory, Stateful], {
    baseQuery: {},
    apiServer: window.App.dataServiceURL,
    idProperty: 'idx',
    state: null,
    rowLimit: 25000,
    sourceToTarget: {}, // models one to many, and no mapping relationships
    summary: {
      total: 0, found: 0, type: 'None', mapped: 0
    },

    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }
      this.reload();
    },

    constructor: function (options) {
      this._loaded = false;
      this.topicId = options.topicId;
      if (options.apiServer) {
        this.apiServer = options.apiServer;
      }
      this.watch('state', lang.hitch(this, 'onSetState'));
    },

    reload: function () {
      var self = this;
      delete self._loadingDeferred;
      self._loaded = false;
      self.loadData();
      self.set('refresh');
    },

    query: function (query, opts) {
      query = query || {};
      if (this._loaded) {
        return this.inherited(arguments);
      }

      var _self = this;
      var results;
      var qr = QueryResults(when(this.loadData(), lang.hitch(this, function () {
        results = _self.query(query, opts);
        qr.total = when(results, function (results) {
          return results.total || results.length;
        });
        return results;
      })));

      return qr;

    },

    get: function (id, opts) {
      if (this._loaded) {
        return this.inherited(arguments);
      }
      var _self = this;
      return when(this.loadData(), function () {
        return _self.get(id, opts);
      });

    },
    expandNoMap: function (data) {
      var _self = this;
      var hasMap = 0;
      var numFound = 0;
      if (data !== null) {
        var idx = data.length + 1;
        Object.keys(_self.sourceToTarget).forEach(function (source) {
          var numTargets = Object.keys(_self.sourceToTarget[source]).length;
          if ( numTargets == 0) {
            data.push({ source: source, idx: idx });
            idx += 1;
          }
          else {
            hasMap += 1;
            numFound += numTargets;
          }
        });
      }
      _self.summary.mapped = hasMap;
      _self.summary.found = numFound;
      Topic.publish(_self.topicId, 'updateHeader', _self.summary);
      Topic.publish(_self.topicId, 'hideLoadingMask');

    },
    findFailure: function (fromIdValue, toId) {
      this.summary.found = 0;
      var data = [];
      this.expandNoMap(data);
      this.setData(data);
      this._loaded = true;
      return true;
    },

    loadData: function () {
      if (this._loadingDeferred) {
        return this._loadingDeferred;
      }

      var _self = this;
      if (!this.state) {

        // this is done as a deferred instead of returning an empty array
        // in order to make it happen on the next tick.  Otherwise it
        // in the query() function above, the callback happens before qr exists
        var def = new Deferred();
        setTimeout(lang.hitch(_self, function () {
          this.setData([]);
          this._loaded = true;
        }), 0);
        return def.promise;
      }

      var fromIdGroup = this.state.fromIdGroup;
      var fromId = this.state.fromId;
      var toIdGroup = this.state.toIdGroup;
      var toId = this.state.toId;
      var fromIdValue = this.state.fromIdValue.split(',');
      for(var i = 0; i < fromIdValue.length; i++) fromIdValue[i]=fromIdValue[i].replace(/^["'](.+(?=["']$))["']$/, '$1');
      var via = 'gene_id';
      via = this.state.joinId;
      // the joinID is what creates Advanced Search
      var joinId = null;
      if (via == 'gene_id') {
        joinId = { genome_feature: 'gene_id', id_ref: 'GeneID' };
      }
      else if (via == 'refseq_locus_tag') {
        joinId = { genome_feature: 'refseq_locus_tag', id_ref: 'Gene_OrderedLocusName' };
      }
      else if (via == 'protein_id') {
        joinId = { genome_feature: 'protein_id', id_ref: 'RefSeq' };
      }
      else {
        joinId = { genome_feature: 'gi', id_ref: 'GI' };
      }

      _self.sourceToTarget = {};
      fromIdValue.forEach(function (d) {
        _self.sourceToTarget[d] = {};
      });


      _self.summary.total = fromIdValue.length;
      _self.summary.type = toId;

      if (fromIdGroup === 'PATRIC') {
        if (toIdGroup === 'PATRIC') {
          var solr_core = '/genome_feature/';
          var solr_sort = 'genome_name asc,accession asc,start asc';
          if (fromId == toId && toId == 'genome_id') {
                solr_core = '/genome/';
                solr_sort = 'genome_id asc';
          }
          this._loadingDeferred = when(request.post(_self.apiServer + solr_core, {
            handleAs: 'json',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/solrquery+x-www-form-urlencoded',
              'X-Requested-With': null,
              Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
            },
            data: {
              q: fromId + ':(' + fromIdValue.join(' OR ') + ') AND ' + toId + ':[* TO *]',
              rows: _self.rowLimit,
              sort: solr_sort
            }
          }), function (data) {

            var idx = 0;
            data.forEach(function (d) {
              d.target = d[toId];
              d.idx = idx;
              d.source = d[fromId];
              d.document_type = 'feature_data';
              _self.sourceToTarget[d[fromId]][d[toId]] = true;
              idx += 1;
            });
            _self.expandNoMap(data);
            _self.setData(data);
            _self._loaded = true;
            return true;
          }, function (error) {
            console.log(error);
            _self.expandNoMap(null);
            _self._loaded = true;
            return false;
          });
        } else {
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
              Accept: 'application/json',
              'Content-Type': 'application/solrquery+x-www-form-urlencoded',
              'X-Requested-With': null,
              Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
            },
            data: {
              q: fromId + ':(' + fromIdValue.join(' OR ') + ')',
              rows: _self.rowLimit
            }
          }), function (features) {

            giNumbers = features.map(function (d) {
              return d[joinId.genome_feature];
            }).filter(function (d) {
              return d !== undefined && d > 0;
            });

            if (giNumbers.length === 0) {
              Topic.publish(_self.topicId, 'hideLoadingMask');
              _self.findFailure(fromIdValue, toId);
              _self.setData([]);
              _self._loaded = true;
              return true;
            }
            console.log('am i in features?');
            return when(request.post(_self.apiServer + '/id_ref/', {
              handleAs: 'json',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/solrquery+x-www-form-urlencoded',
                'X-Requested-With': null,
                Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
              },
              data: {
                q: 'id_type:' + joinId.id_ref + ' AND id_value:(' + giNumbers.join(' OR ') + ')',
                rows: _self.rowLimit
              }
            }), function (response) {

              if (response.length === 0) {
                return _self.findFailure(fromIdValue, toId);
              }

              response.forEach(function (d) {
                accessionGiMap[d.uniprotkb_accession] = d.id_value;
              });

              return when(request.post(_self.apiServer + '/id_ref/', {
                handleAs: 'json',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/solrquery+x-www-form-urlencoded',
                  'X-Requested-With': null,
                  Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
                },
                data: {
                  q: 'uniprotkb_accession:(' + Object.keys(accessionGiMap).join(' OR ') + ') AND ' + ((toId === 'UniProtKB-Accession') ? 'id_type:' + joinId.id_ref : 'id_type:(' + toId + ')'),
                  rows: _self.rowLimit
                }
              }), function (response) {

                response.forEach(function (d) {
                  var accession = d.uniprotkb_accession;
                  var target = d.id_value;
                  var gi = accessionGiMap[accession];

                  if (toId === 'UniProtKB-Accession') {
                    if (!Object.prototype.hasOwnProperty.call(giTarget, gi)) {
                      giTarget[gi] = [accession];
                    } else {
                      giTarget[gi].push(accession);
                    }
                  } else {
                    if (!Object.prototype.hasOwnProperty.call(giTarget, gi)) {
                      giTarget[gi] = [target];
                    } else {
                      giTarget[gi].push(target);
                    }
                  }

                });

                var data = [];
                features.forEach(function (d) {
                  var item = Object.create(d);
                  if (Object.prototype.hasOwnProperty.call(d, joinId.genome_feature)) {
                    var target = giTarget[d[joinId.genome_feature]];
                    if (target) {
                      target.forEach(function (t) {
                        item.target = t;
                        item.source = item[fromId];
                        item.idx = item.feature_id + '_' + item.target;
                        item.document_type = 'feature_data';
                        _self.sourceToTarget[item[fromId]][t] = true;
                        data.push(item);
                      });
                    }
                  }
                });

                _self.summary.found = data.length;
                Topic.publish(_self.topicId, 'updateHeader', _self.summary);
                _self.expandNoMap(data);

                _self.setData(data);
                _self._loaded = true;
                Topic.publish(_self.topicId, 'hideLoadingMask');
                return true;
              }, function (error) {
                console.log(error);
                _self.expandNoMap(null);
                _self._loaded = true;
                return false;
              });
            });
          });
        }
      }
      else {
        if (toIdGroup === 'PATRIC') {
          // from Other to PATRIC

          // step 1: get UniProtKBAccession (query to id_ref). skip if fromId equals UniProtKB-Accession
          // step 2: get GI from UniProtKBAccession (query to id_ref) // defUniprotKB2PATRIC()
          // step 3: get PATRIC feature from GI (query to genome_feature) // defUniprotKB2PATRIC()

          var defUniprotKB2PATRIC = function (uniprotKBAccession, accessionSource) {
            return when(request.post(_self.apiServer + '/id_ref/', {
              handleAs: 'json',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/solrquery+x-www-form-urlencoded',
                'X-Requested-With': null,
                Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
              },
              data: {
                q: 'uniprotkb_accession:(' + uniprotKBAccession.join(' OR ') + ') AND id_type:' + joinId.id_ref,
                rows: _self.rowLimit
              }
            }), function (response) {
              if (response.length === 0) {
                return _self.findFailure(fromIdValue, toId);
              }

              var giNumbers = [];
              var giSource = [];

              response.forEach(function (d) {
                var gi = d.id_value;
                if (typeof gi === 'string') {
                  gi = gi.trim();
                }
                giNumbers.push(gi);
                var accession = d.uniprotkb_accession;
                giSource[gi] = { uniprotkb_accession: accession, source: accessionSource[accession] };
              });

              return when(request.post(_self.apiServer + '/genome_feature/', {
                handleAs: 'json',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/solrquery+x-www-form-urlencoded',
                  'X-Requested-With': null,
                  Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
                },
                data: {
                  q: joinId.genome_feature + ':(' + giNumbers.join(' OR ') + ') AND annotation:PATRIC',
                  rows: _self.rowLimit
                }
              }), function (response) {
                var data = [];
                response.forEach(function (d) {
                  var item = Object.create(d);
                  item.source = giSource[d[joinId.genome_feature]].source;
                  var stuff = d[joinId.genome_feature];
                  if (typeof stuff === 'string') {
                    stuff = stuff.trim();
                  }
                  item.uniprotkb_accession = giSource[stuff].uniprotkb_accession;
                  item.target = d[toId];
                  item.feature_id = d.feature_id;
                  item.document_type = 'feature_data';
                  item.idx = item.feature_id + '_' + item.target;
                  _self.sourceToTarget[item.source][d[toId]] = true;
                  data.push(item);
                });
                _self.expandNoMap(data);
                return data;
              }, function (error) {
                console.log(error);
              } );
            });
          };

          var accessionSourceMap = {};

          if (fromId === 'UniProtKB-Accession') {

            fromIdValue.forEach(function (d) {
              accessionSourceMap[d] = d;
            });
            this._loadingDeferred = when(defUniprotKB2PATRIC(fromIdValue, accessionSourceMap), function (data) {
              _self.setData(data);
              _self._loaded = true;
              return true;
            }, function (error) {
              console.log(error);
              _self.expandNoMap(null);
              _self._loaded = true;
              return false;
            });
          } else {
            // get UniprotKBAccession via query to id_ref
            this._loadingDeferred = when(request.post(_self.apiServer + '/id_ref/', {
              handleAs: 'json',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/solrquery+x-www-form-urlencoded',
                'X-Requested-With': null,
                Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
              },
              data: {
                q: 'id_type:' + fromId + ' AND id_value:(' + fromIdValue.join(' OR ') + ')',
                rows: _self.rowLimit
              }
            }), function (response) {

              var uniprotkbAccessionList = [];

              if (response.length === 0) {
                return _self.findFailure(fromIdValue, toId);
              }

              response.forEach(function (d) {
                var accession = d.uniprotkb_accession;
                uniprotkbAccessionList.push(accession);
                accessionSourceMap[accession] = d.id_value;
              });

              return when(defUniprotKB2PATRIC(uniprotkbAccessionList, accessionSourceMap), function (data) {

                _self.setData(data);
                _self._loaded = true;
                return true;
              }, function (error) {
                console.log(error);
                _self.expandNoMap(null);
                _self._loaded = true;
                return false;
              });
            });
          }
        }

        else { // start OTHER to OTHER

          // step 1: get UniProtKBAccession (query to id_ref). skip if fromId equals UniProtKB-Accession
          // step 2: get GI from UniProtKBAccession (query to id_ref) // defUniprotKB2PATRIC()
          // step 3: get PATRIC feature from GI (query to genome_feature) // defUniprotKB2PATRIC()

          var defUniprotKB2Other = function (uniprotKBAccession, accessionSource) {

            return when(request.post(_self.apiServer + '/id_ref/', {
              handleAs: 'json',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/solrquery+x-www-form-urlencoded',
                'X-Requested-With': null,
                Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
              },
              data: {
                q: 'uniprotkb_accession:(' + uniprotKBAccession.join(' OR ') + ') AND id_type:' + toId,
                rows: _self.rowLimit
              }
            }), function (response) {
              var data = [];
              var idx = 0;
              response.forEach(function (d) {
                var accession = d.uniprotkb_accession;
                var item = {};
                item.source = accessionSource[accession];
                item.idx = idx;
                item.target = d.id_value;
                item.uniprotkb_accession = accession;
                console.log(item);
                if (typeof item.source === 'undefined' ) {
                  item.source = uniprotKBAccession;
                }
                else {
                  _self.sourceToTarget[item.source][d.id_value] = true;
                }
                data.push(item);
                idx += 1;
              });
              _self.expandNoMap(data);
              return data;
            }, function (error) {
              console.log(error);
              _self.expandNoMap(null);
              _self._loaded = true;
              return false;
            });
          };

          var accessionSourceMap = {};

          if (fromId === 'UniProtKB-Accession') {

            accessionSourceMap = fromIdValue.map(function (d) {
              return { d: d };
            });
            this._loadingDeferred = when(defUniprotKB2Other(fromIdValue, accessionSourceMap), function (data) {
              _self.setData(data);
              _self._loaded = true;
              return true;
            }, function (error) {
              console.log(error);
              _self.expandNoMap(null);
              _self._loaded = true;
              return false;
            });
          } else {
            // get UniprotKBAccession via query to id_ref
            this._loadingDeferred = when(request.post(_self.apiServer + '/id_ref/', {
              handleAs: 'json',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/solrquery+x-www-form-urlencoded',
                'X-Requested-With': null,
                Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
              },
              data: {
                q: 'id_type:' + fromId + ' AND id_value:(' + fromIdValue.join(' OR ') + ')',
                rows: _self.rowLimit
              }
            }), function (response) {

              var uniprotkbAccessionList = [];

              response.forEach(function (d) {
                var accession = d.uniprotkb_accession;
                uniprotkbAccessionList.push(accession);
                accessionSourceMap[accession] = d.id_value;
              });

              return when(defUniprotKB2Other(uniprotkbAccessionList, accessionSourceMap), function (data) {

                _self.setData(data);
                _self._loaded = true;
                return true;
              });
            });
          }

        }// end else OTHER to OTHER
      }

      return this._loadingDeferred;
    }
  });
});
