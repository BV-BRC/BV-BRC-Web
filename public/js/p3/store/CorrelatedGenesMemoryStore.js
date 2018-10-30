define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/request', 'dojo/when', 'dojo/Stateful', 'dojo/topic',
  'dojo/store/Memory',
  'dojo/store/util/QueryResults'
], function (
  declare, lang, Deferred,
  request, when, Stateful, Topic,
  Memory, QueryResults
) {

  return declare([Memory, Stateful], {
    baseQuery: {},
    idProperty: 'feature_id',
    apiServer: window.App.dataServiceURL,
    state: null,
    feature_id: null,
    onSetState: function (attr, oldVal, state) {
      if (state && state.feature && state.feature.feature_id) {
        var cur = this.feature_id;
        var next = state.feature.feature_id;
        if (cur != next) {
          this.set('feature_id', state.feature_id || {});
          this._loaded = false;
          delete this._loadingDeferred;
        }
      }
    },
    constructor: function (options) {
      this._loaded = false;
      this.feature_id = null;
      if (options.apiServer) {
        this.apiServer = options.apiServer;
      }

      var self = this;

      Topic.subscribe('CorrelatedGenes', lang.hitch(this, function () {
        // console.log("CorrelatedGenesMemoryStore:", arguments);
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'filter':
            self.cutoff_value = value.cutoff_value;
            self.cutoff_dir = value.cutoff_dir;
            this.reload();
            break;
          default:
            break;
        }
      }));

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
      // console.log("Initiate NON LOADED Query: ", query);
      var qr = QueryResults(when(this.loadData(), function () {
        // console.log("Do actual Query Against loadData() data. QR: ", qr);
        results = _self.query(query || {}, opts);
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
      var state = this.state || {};

      if (!state.feature_id) {
        // console.log("No Feature, use empty data set for initial store");

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

      _self.cutoff_value = _self.cutoff_value || 0.4;
      _self.cutoff_dir = _self.cutoff_dir || 'pos';

      this._loadingDeferred = when(request.post(_self.apiServer + '/transcriptomics_gene/', {
        handleAs: 'json',
        headers: {
          Accept: 'application/solr+json',
          'Content-Type': 'application/solrquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
        },
        data: {
          q: 'genome_id:' + state.feature.genome_id,
          fq: '{!correlation fieldId=refseq_locus_tag fieldCondition=pid fieldValue=log_ratio srcId=' + state.feature.refseq_locus_tag + ' filterCutOff=' + _self.cutoff_value + ' filterDir=' + _self.cutoff_dir + ' cost=101}',
          rows: 0,
          'json.nl': 'map'
        }
      }), function (response) {

        if (response.correlation.length === 0) {
          _self.setData([]);
          _self._loaded = true;
          return true;
        }

        var refseqLocusTagList = [];
        response.correlation.forEach(function (element) {
          refseqLocusTagList.push(element.id);
        });

        // sub query
        return when(request.post(_self.apiServer + '/genome_feature/', {
          handleAs: 'json',
          headers: {
            Accept: 'application/solr+json',
            'Content-Type': 'application/solrquery+x-www-form-urlencoded',
            'X-Requested-With': null,
            Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
          },
          data: {
            q: 'refseq_locus_tag:(' + refseqLocusTagList.join(' OR ') + ') AND genome_id:' + state.feature.genome_id,
            fq: 'annotation:PATRIC AND feature_type:CDS',
            rows: 25000
          }
        }), function (res) {

          var featureHash = {};
          res.response.docs.forEach(function (el) {
            if (featureHash[el.refseq_locus_tag] == null) {
              featureHash[el.refseq_locus_tag] = el;
            }
          });

          var data = [];
          response.correlation.forEach(function (element) {
            data.push(lang.mixin({}, element, featureHash[element.id]));
          });
          // console.log(data);
          _self.setData(data);
          _self._loaded = true;

          return true;
        });
      });
      return this._loadingDeferred;
    }
  });
});
