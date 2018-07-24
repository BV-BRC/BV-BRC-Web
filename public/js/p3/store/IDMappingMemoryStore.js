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

    constructor: function (options) {
      this._loaded = false;
      if (options.apiServer) {
        this.apiServer = options.apiServer;
      }
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
      var qr = QueryResults(when(this.loadData(), function () {
        results = _self.query(query, opts);
        qr.total = when(results, function (results) {
          return results.total || results.length;
        });
        return results;
      }));

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

    loadData: function () {
      if (this._loadingDeferred) {
        return this._loadingDeferred;
      }

      var _self = this;

      // console.warn(this.state, this.state.genome_ids, !this.state.genome_ids);
      if (!this.state.fromIdValue) {
        // console.log("No Genome IDS, use empty data set for initial store");

        // this is done as a deferred instead of returning an empty array
        // in order to make it happen on the next tick.  Otherwise it
        // in the query() function above, the callback happens before qr exists
        var def = new Deferred();
        setTimeout(lang.hitch(_self, function () {
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

      var summary = {
        total: fromIdValue.length,
        found: 0,
        type: toId,
        mapped: 0
      };

        // console.log(this.state);
      if (fromIdGroup === 'PATRIC') {
        if (toIdGroup === 'PATRIC') {
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
              rows: fromIdValue.length,
              sort: 'genome_name asc,accession asc,start asc'
            }
          }), function (data) {
            var idx = 0;
            data.forEach(function (d) {
              d.target = d[toId];
              d.idx = idx;
              idx += 1;
            });
            // console.log('patric to patric');
            // console.log(data);
            var targetIDarr = [];
            for (var i = 0; i < data.length; i++) {
              if (data[i].target !== undefined) {
                if (targetIDarr.length === 0) {
                  targetIDarr.push(data[i].target);
                  summary.found += 1;
                } else if (targetIDarr.indexOf(data[i].target) === -1) {
                  targetIDarr.push(data[i].target);
                  summary.found += 1;
                }
                summary.mapped += 1;
              }
            }
            // summary.found = data.length;
            Topic.publish('IDMapping', 'updateHeader', summary);
            _self.setData(data);
            _self._loaded = true;
            return true;
          });
        } else {
          // from PATRIC to Other
          var giNumbers = {};
          var accessionGiMap = {};
          var giTarget = {};

          // step 1: get GI from fromId (query to genome_feature)
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
              rows: fromIdValue.length
            }
          }), function (features) {
            giNumbers = features.map(function (d) {
              return d.gi;
            }).filter(function (d) {
              return d !== undefined && d > 0;
            });

            // console.log(giNumbers);

            if (giNumbers.length === 0) {
              summary.found = 0;
              Topic.publish('IDMapping', 'updateHeader', summary);

              _self.setData([]);
              _self._loaded = true;
              return true;
            }

            // console.log("giNumbers: ", giNumbers);
            return when(request.post(_self.apiServer + '/id_ref/', {
              handleAs: 'json',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/solrquery+x-www-form-urlencoded',
                'X-Requested-With': null,
                Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
              },
              data: {
                q: 'id_type:GI AND id_value:(' + giNumbers.join(' OR ') + ')',
                rows: 25000
              }
            }), function (response) {

              if (response.length === 0) {
                summary.found = 0;
                Topic.publish('IDMapping', 'updateHeader', summary);

                _self.setData([]);
                _self._loaded = true;
                return true;
              }

              response.forEach(function (d) {
                accessionGiMap[d.uniprotkb_accession] = d.id_value;
              });

              // console.log(accessionGiMap);

              return when(request.post(_self.apiServer + '/id_ref/', {
                handleAs: 'json',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/solrquery+x-www-form-urlencoded',
                  'X-Requested-With': null,
                  Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
                },
                data: {
                  q: 'uniprotkb_accession:(' + Object.keys(accessionGiMap).join(' OR ') + ') AND ' + ((toId === 'UniProtKB-Accession') ? 'id_type:GI' : 'id_type:(' + toId + ')'),
                  rows: 25000
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

                // console.log(giTarget);

                var data = [];
                features.forEach(function (d) {
                  if (Object.prototype.hasOwnProperty.call(d, 'gi')) {
                    var target = giTarget[d.gi];
                    if (target) {
                      target.forEach(function (t) {
                        var item = Object.create(d);
                        item.target = t;
                        item.idx = item.feature_id + '_' + item.target;
                        data.push(item);
                      });
                    }
                  }
                });
                // console.log('patric to other');
                // console.log(data);
                var targetIDarr = [];
                for (var i = 0; i < data.length; i++) {
                  if (data[i].target !== undefined) {
                    if (targetIDarr.length === 0) {
                      targetIDarr.push(data[i].target);
                      summary.found += 1;
                    } else if (targetIDarr.indexOf(data[i].target) === -1) {
                      targetIDarr.push(data[i].target);
                      summary.found += 1;
                    }
                    summary.mapped += 1;
                  }
                }
                // summary.found = data.length;
                Topic.publish('IDMapping', 'updateHeader', summary);
                _self.setData(data);
                _self._loaded = true;
                return true;
              });
            });
          });
        }
      }
      else {
        // from Other to PATRIC

        // step 1: get UniProtKBAccession (query to id_ref). skip if fromId equals UniProtKB-Accession
        // step 2: get GI from UniProtKBAccession (query to id_ref) // defUniprotKB2PATRIC()
        // step 3: get PATRIC feature from GI (query to genome_feature) // defUniprotKB2PATRIC()

        var defUniprotKB2PATRIC = function (uniprotKBAccession, accessionTarget) {

          return when(request.post(_self.apiServer + '/id_ref/', {
            handleAs: 'json',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/solrquery+x-www-form-urlencoded',
              'X-Requested-With': null,
              Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
            },
            data: {
              q: 'uniprotkb_accession:(' + uniprotKBAccession.join(' OR ') + ') AND id_type:GI',
              rows: 25000
            }
          }), function (response) {

            var giNumbers = []; // response.map(function(d){ return d.id_value;});
            var giTarget = [];

            response.forEach(function (d) {
              var gi = d.id_value;
              giNumbers.push(gi);
              var accession = d.uniprotkb_accession;
              giTarget[gi] = accessionTarget[accession];
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
                q: 'gi:(' + giNumbers.join(' OR ') + ') AND annotation:PATRIC',
                rows: 25000
              }
            }), function (response) {

              var data = [];
              response.forEach(function (d) {
                var item = Object.create(d);
                item.target = giTarget[d.gi];
                item.idx = item.feature_id + '_' + item.target;
                data.push(item);
              });
              return data;
            });
          });
        };

        var accessionTargetMap = {};

        if (fromId === 'UniProtKB-Accession') {

          accessionTargetMap = fromIdValue.map(function (d) {
            return { d: d };
          });
          this._loadingDeferred = when(defUniprotKB2PATRIC(fromIdValue, accessionTargetMap), function (data) {
            summary.found = data.length;
            Topic.publish('IDMapping', 'updateHeader', summary);

            _self.setData(data);
            _self._loaded = true;
            return true;
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
              rows: 25000
            }
          }), function (response) {

            var uniprotkbAccessionList = [];

            response.forEach(function (d) {
              var accession = d.uniprotkb_accession;
              uniprotkbAccessionList.push(accession);
              accessionTargetMap[accession] = d.id_value;
            });

            return when(defUniprotKB2PATRIC(uniprotkbAccessionList, accessionTargetMap), function (data) {
              console.log('other to patric');
              console.log(data);
              summary.found = data.length;
              Topic.publish('IDMapping', 'updateHeader', summary);

              _self.setData(data);
              _self._loaded = true;
              return true;
            });
          });
        }
      }

      return this._loadingDeferred;
    }
  });
});
