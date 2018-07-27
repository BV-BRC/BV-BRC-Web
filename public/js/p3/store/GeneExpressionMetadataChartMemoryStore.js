define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/request', 'dojo/when', 'dojo/Stateful', 'dojo/topic', 'dojo/promise/all',
  'dojo/store/Memory', 'dojo/store/util/QueryResults',
  './ArrangeableMemoryStore'
], function (
  declare, lang, Deferred,
  request, when, Stateful, Topic, All,
  Memory, QueryResults,
  ArrangeableMemoryStore
) {

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
    idProperty: 'pid',
    state: null,
    tgState: tgState,
    feature_id: null,
    filter_type: '',
    onSetState: function (attr, oldVal, state) {
      console.log('Gene Transcriptomics Tab metadata onSetState: ', state);

      this.set('feature_id', state.feature_id || {});
      this._loaded = false;
      delete this._loadingDeferred;
      /*

      if(state && state.feature && state.feature.feature_id){
        var cur = this.feature_id;
        var next = state.feature.feature_id;
        if(cur != next){
          this.set("feature_id", state.feature_id || {});
          this._loaded = false;
          delete this._loadingDeferred;
        }
      }
*/
    },

    constructor: function (options) {
      this._loaded = false;
      if (options.apiServer) {
        this.apiServer = options.apiServer;
      }

      var self = this;
      // console.log("In GeneExpressionMemoryStore constructor received this.filter_type:", this.filter_type);
      // this.loadData();
      Topic.subscribe('GeneExpression', function () {
        console.log('GeneExpressionChartMemoryStore received:', arguments);
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updateTgState':
            self.tgState = value;
            // self.reload();
            break;

          default:
            break;
        }
      });

      this.watch('state', lang.hitch(this, 'onSetState'));
    },


    _thresholdFilter: function (comparison, tgState, filterStatus) {
      var uf = tgState.upFold,
        df = tgState.downFold;
      var uz = tgState.upZscore,
        dz = tgState.downZscore;
      var l = (comparison && !isNaN(parseFloat(comparison.log_ratio))) ? parseFloat(comparison.log_ratio) : 0;
      var z = (comparison && !isNaN(parseFloat(comparison.z_score))) ? parseFloat(comparison.z_score) : 0;
      if (!comparison) return false;

      var pass = false;
      switch (filterStatus) {
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
      console.log('_thresholdFilter: [', filterStatus, pass, '] ', uf, l, df, ',', uz, z, dz);
      return pass;
    },

    reload: function (curr_tgState) {
      // console.log("In MemoryStore reload ... ");
      var self = this;
      self.tgState = curr_tgState;
      delete self._loadingDeferred;
      self._loaded = false;
      self.loadData();
      self.set('refresh');
    },

    query: function (query, opts) {
      // console.log("In GeneExpressionChartMemoryStore query ... ", query, ",", opts);
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
        console.log('In MemoryStore query, results ... ', results);
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

      if (!this.state || this.state.search == null) {
        // console.log("No State, use empty data set for initial store");

        // this is done as a deferred instead of returning an empty array
        // in order to make it happen on the next tick.  Otherwise it
        // in the query() function above, the callback happens before qr exists
        var def = new Deferred();
        setTimeout(lang.hitch(_self, function () {
          _self.setData([]);
          _self._loaded = true;
          def.resolve(true);
        }), 0);
        return def.promise;
      }
      // console.log("In MemoryStore loadData(): state:", this.state);
      // console.log("In MemoryStore loadData(): _self.tgState:", _self.tgState);

      var uf = _self.tgState.upFold,
        df = _self.tgState.downFold;
      var uz = _self.tgState.upZscore,
        dz = _self.tgState.downZscore;
      var keyword = _self.tgState.keyword;

      var range = '';
      if (keyword && keyword.length > 0)
      {
        range += '&keyword(' + encodeURIComponent(keyword) + ')';
      }

      if (uf > 0 && df < 0)
      {
        range += '&or(gt(log_ratio,'  + uf + '),lt(log_ratio,'  + df + '))';
      }
      else if (uf > 0) {
        range += '&gt(log_ratio,'  + uf + ')';
      }
      else if (df < 0) {
        range += '&lt(log_ratio,'  + df + ')';
      }
      if (uz > 0 && dz < 0)
      {
        range += '&or(gt(z_score,'  + uz + '),lt(z_score,'  + dz + '))';
      }
      else if (uz > 0) {
        range += '&gt(z_score,'  + uz + ')';
      }
      else if (dz < 0) {
        range += '&lt(z_score,'  + dz + ')';
      }

      range += '&facet((field,strain),(field,mutant),(field,condition),(mincount,1))&limit(1)';

      var q = this.state.search + range;

      console.log('In MemoryStore query: q:', q);
      // console.log("In MemoryStore query: window.App.dataServiceURL:", window.App.dataServiceURL);

      this._loadingDeferred = when(request.post(window.App.dataServiceURL + '/transcriptomics_gene/', {
        data: q,
        headers: {
          accept: 'application/solr+json',
          'content-type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }), function (response) {
        // console.log('!!!!In GeneExpressionChartMemoryStore loadData(): response.response:', response.facet_counts);

        var strainArray = response.facet_counts.facet_fields.strain;
        var mutantArray = response.facet_counts.facet_fields.mutant;
        var conditionArray = response.facet_counts.facet_fields.condition;
        var data = [];
        data.push(strainArray);
        data.push(mutantArray);
        data.push(conditionArray);
        _self.setData(data);
        // console.log('!!!!In GeneExpressionChartMemoryStore loadData():  _self.data:', _self.data);
        _self._loaded = true;
        // return;
      });
      return this._loadingDeferred;
    }
  });
});
