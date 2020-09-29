define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/request', 'dojo/when', 'dojo/Stateful', 'dojo/topic',
  'dojo/store/Memory', 'dojo/store/util/QueryResults'
], function (
  declare, lang, Deferred,
  request, when, Stateful, Topic,
  Memory, QueryResults
) {

  return declare([Memory, Stateful], {
    baseQuery: {},
    apiServer: window.App.dataServiceURL,
    idProperty: 'pathway_id',
    state: null,
    constructor: function (options) {
      this._loaded = false;
      if (options.apiServer) {
        this.apiServer = options.apiServer;
      }
      this.watch('state', lang.hitch(this, 'onSetState'));
    },

    clear: function () {
      delete this._loadingDeferred;
      this._loaded = false;
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

    onSetState: function (attr, oldState, state) {
      if (!state || !state.feature_ids || state.feature_ids.length < 1) {
        return;
      }
      this.clear();
    },

    loadData: function () {
      if (this._loadingDeferred) {
        return this._loadingDeferred;
      }

      var _self = this;

      // console.warn(this.state.genome_ids, !this.state.genome_ids);
      if (!this.state || !this.state.feature_ids) {

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

      Topic.publish('PathwaySummary', 'showLoadingMask');

      var postData = {
        q: 'feature_id:(' + _self.state.feature_ids.join(' OR ') + ')',
        fl: 'pathway_id,pathway_name,feature_id,genome_id',
        rows: 25000,
        facet: true,
        'json.facet': '{stat:{field:{field:pathway_id,limit:-1,facet:{gene_count:"unique(feature_id)"}}}}'
      };

      this._loadingDeferred = when(request.post(_self.apiServer + '/pathway/', {
        handleAs: 'json',
        headers: {
          Accept: 'application/solr+json',
          'Content-Type': 'application/solrquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        data: postData
      }), function (response) {

        var features = response.response.docs;

        if (features.length == 0) {

          var summary = {
            total: _self.state.feature_ids.length,
            found: 0,
            pathways: 0
          };
          Topic.publish('PathwaySummary', 'updateHeader', summary);

          _self.setData([]);
          _self._loaded = true;
          Topic.publish('PathwaySummary', 'hideLoadingMask');
          return true;
        }

        var facets = response.facets.stat.buckets;

        var featureIdMap = {};
        var genomeIdMap = {};
        var pathwayIdMap = {};
        var pathwayNameMap = {};
        var pathwayFeatureMap = {};
        var genesSelected = {};

        features.forEach(function (f) {
          if (!Object.prototype.hasOwnProperty.call(pathwayNameMap, f.pathway_id)) {
            pathwayNameMap[f.pathway_id] = f.pathway_name;
          }
          if (!Object.prototype.hasOwnProperty.call(pathwayFeatureMap, f.pathway_id)) {
            pathwayFeatureMap[f.pathway_id] = {};
            if (!Object.prototype.hasOwnProperty.call(pathwayFeatureMap[f.pathway_id], f.feature_id)) {
              pathwayFeatureMap[f.pathway_id][f.feature_id] = true;
            }
          } else {
            if (!Object.prototype.hasOwnProperty.call(pathwayFeatureMap[f.pathway_id], f.feature_id)) {
              pathwayFeatureMap[f.pathway_id][f.feature_id] = true;
            }
          }
          if (!Object.prototype.hasOwnProperty.call(genomeIdMap, f.genome_id)) {
            genomeIdMap[f.genome_id] = true;
          }
          if (!Object.prototype.hasOwnProperty.call(pathwayIdMap, f.pathway_id)) {
            pathwayIdMap[f.pathway_id] = true;
          }
          if (!Object.prototype.hasOwnProperty.call(featureIdMap, f.feature_id)) {
            featureIdMap[f.feature_id] = true;
          }
        });

        facets.forEach(function (bucket) {
          genesSelected[bucket.val] = bucket.gene_count;
        });

        var query = {
          q: 'genome_id:(' + Object.keys(genomeIdMap).join(' OR ') + ') AND pathway_id:(' + Object.keys(pathwayIdMap).join(' OR ') + ')',
          fq: 'annotation:PATRIC',
          rows: 0,
          facet: true,
          'json.facet': '{stat:{field:{field:pathway_id,limit:-1,facet:{gene_count:"unique(feature_id)"}}}}'
        };
        var q = Object.keys(query).map(function (p) {
          return p + '=' + query[p];
        }).join('&');

        return when(request.post(_self.apiServer + '/pathway/', {
          handleAs: 'json',
          headers: {
            Accept: 'application/solr+json',
            'Content-Type': 'application/solrquery+x-www-form-urlencoded',
            'X-Requested-With': null,
            Authorization: (window.App.authorizationToken || '')
          },
          data: q
        }), function (response) {

          var facets = response.facets.stat.buckets;

          var genesAnnotated = {};
          facets.forEach(function (bucket) {
            genesAnnotated[bucket.val] = bucket.gene_count;
          });

          var data = [];
          Object.keys(genesSelected).forEach(function (pathway_id) {

            var pw = {
              pathway_id: pathway_id,
              pathway_name: pathwayNameMap[pathway_id],
              genes_selected: genesSelected[pathway_id],
              genes_annotated: genesAnnotated[pathway_id],
              coverage: parseInt(genesSelected[pathway_id] / genesAnnotated[pathway_id] * 100),
              genome_ids: Object.keys(genomeIdMap),
              feature_ids: Object.keys(pathwayFeatureMap[pathway_id])
            };

            data.push(pw);
          });

          var summary = {
            total: _self.state.feature_ids.length,
            found: Object.keys(featureIdMap).length,
            pathways: Object.keys(pathwayIdMap).length
          };
          // console.log("update header: ", summary);
          Topic.publish('PathwaySummary', 'updateHeader', summary);

          _self.setData(data);
          _self._loaded = true;
          Topic.publish('PathwaySummary', 'hideLoadingMask');
          return true;
        }, function (err) {
          console.error('Error in PathwaySummaryMemoryStore: ', err);
          Topic.publish('PathwaySummary', 'hideLoadingMask');
          Topic.publish('PathwaySummary', 'timeOut');
          setTimeout(function () {  alert('The query took too long or could not be loaded.', err); }, 1000);
        });
      }, function (err) {
        console.error('Error in PathwaySummaryMemoryStore: ', err);
        if (err.message != 'Request canceled') {
          Topic.publish('PathwaySummary', 'hideLoadingMask');
          Topic.publish('PathwaySummary', 'timeOut');
          setTimeout(function () {  alert('The query took too long or could not be loaded.', err); }, 1000);
        }
      });
      return this._loadingDeferred;
    }
  });
});
