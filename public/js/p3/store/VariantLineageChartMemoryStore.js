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
    idProperty: 'feature_id',
    state: null,
    tgState: tgState,
    feature_id: null,
    filter_type: '',
    onSetState: function (attr, oldVal, state) {
      console.log('Gene Transcriptomics Tab onSetState: ', state);

      this.set('feature_id', state.feature_id || {});
      this._loaded = false;
      delete this._loadingDeferred;
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
      // console.log("_thresholdFilter: [", filterStatus, pass, "] ", uf, l, df, ",", uz, z, dz);
      return pass;
    },

    reload: function (curr_tgState) {
      console.log('In MemoryStore reload ... ');
      var self = this;
      self.tgState = curr_tgState;
      // console.log("In MemoryStore loadData(): self.tgState:", self.tgState, "tgState=", tgState);

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
        // console.log('In MemoryStore query, results ... ', results);
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
        console.log('No State, use empty data set for initial store');

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
      // console.log("In MemoryStore loadData(): state:", this.state, "_self.tgState:", _self.tgState);

      this.watch('state', lang.hitch(this, 'onSetState'));

      var keyword = _self.tgState.keyword;

      var range = '';
      if (keyword && keyword.length > 0)
      {
        range += '&keyword(' + encodeURIComponent(keyword) + ')';
      }

      var q = this.state.search + range;

      console.log('In MemoryStore query: q:', q);
      // console.log("In MemoryStore query: window.App.dataServiceURL:", window.App.dataServiceURL);

      this._loadingDeferred = when(request.post(window.App.dataServiceURL + '/spike_lineage/', {
        data: q,
        headers: {
          accept: 'application/solr+json',
          'content-type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }), function (response) {
        console.log('!!!!In VariantLineageChartMemoryStore loadData(): response.response:', response);
        var data = [];

        response = [
            {
              "country":"Argentina",
              "region":"Buenos Aires",
              "month":"202007",
              "total_isolates":11,
              "lineage_count":1,
              "prevalence":0.0909,
              "growth_rate":1.0,
              "lineage":"Q414R,D614G",
              "id":"32562a5d-c828-4405-82eb-16d907bb5043",
              "_version_":1690342894812004357},
            {
              "country":"Argentina",
              "region":"Buenos Aires",
              "month":"202010",
              "total_isolates":33,
              "lineage_count":3,
              "prevalence":0.0909,
              "growth_rate":1.0,
              "lineage":"Q414R,D614G",
              "id":"2c4ef87b-6cc0-4aa4-a9eb-7801501a0a95",
              "_version_":1690342894813052930},
            {
              "country":"Argentina",
              "region":"Buenos Aires",
              "month":"202011",
              "total_isolates":13,
              "lineage_count":1,
              "prevalence":0.0769,
              "growth_rate":0.846,
              "lineage":"Q414R,D614G",
              "id":"2f37e969-ef57-44f0-a821-0bbcd5dc3cb2",
              "_version_":1690342894813052938},
            {
              "country":"Argentina",
              "region":"Buenos Aires",
              "month":"202012",
              "total_isolates":21,
              "lineage_count":2,
              "prevalence":0.0952,
              "growth_rate":1.238,
              "lineage":"Q414R,D614G",
              "id":"ca9a4381-4427-4282-9128-71f5c48dff10",
              "_version_":1690342894814101513},
            {
              "country":"Unknown",
              "region":"Buenos Aires",
              "month":"202005",
              "total_isolates":46,
              "lineage_count":7,
              "prevalence":0.1522,
              "growth_rate":1.0,
              "lineage":"Q414R,D614G",
              "id":"8d496fe8-d63c-4ea4-a381-7dd45d6376cd",
              "_version_":1690342916914937857},
            {
              "country":"Argentina",
              "region":"Buenos Aires",
              "month":"202005",
              "total_isolates":14,
              "lineage_count":5,
              "prevalence":0.3571,
              "growth_rate":1.0,
              "lineage":"D614G",
              "id":"5ed31d8d-a830-4d22-a3cc-4a08e520b73a",
              "_version_":1690342894810955778},
            {
              "country":"Argentina",
              "region":"Buenos Aires",
              "month":"202006",
              "total_isolates":4,
              "lineage_count":1,
              "prevalence":0.25,
              "growth_rate":0.7001,
              "lineage":"D614G",
              "id":"9fb94051-c375-41a5-88d1-37ed0f8bc989",
              "_version_":1690342894810955786},
            {
              "country":"Argentina",
              "region":"Buenos Aires",
              "month":"202007",
              "total_isolates":11,
              "lineage_count":7,
              "prevalence":0.6364,
              "growth_rate":2.5456,
              "lineage":"D614G",
              "id":"74faa4ee-c427-4e8b-aaff-4a26cc8630a9",
              "_version_":1690342894812004354},
            {
              "country":"Argentina",
              "region":"Buenos Aires",
              "month":"202010",
              "total_isolates":33,
              "lineage_count":3,
              "prevalence":0.0909,
              "growth_rate":1.0,
              "lineage":"D614G",
              "id":"e88e98d0-9d83-4474-9981-cb0a1276ac1f",
              "_version_":1690342894812004360},
            {
              "country":"Argentina",
              "region":"Buenos Aires",
              "month":"202011",
              "total_isolates":13,
              "lineage_count":3,
              "prevalence":0.2308,
              "growth_rate":2.5391,
              "lineage":"D614G",
              "id":"576d1efd-c64d-41bf-9914-846b3cca5e85",
              "_version_":1690342894813052934},
            {
              "country":"Argentina",
              "region":"Buenos Aires",
              "month":"202012",
              "total_isolates":21,
              "lineage_count":1,
              "prevalence":0.0476,
              "growth_rate":0.2062,
              "lineage":"D614G",
              "id":"14f8e5d5-1258-4797-9111-8b7975a4ac35",
              "_version_":1690342894814101506},
            {
              "country":"Unknown",
              "region":"Buenos Aires",
              "month":"202003",
              "total_isolates":5,
              "lineage_count":4,
              "prevalence":0.8,
              "growth_rate":1.0,
              "lineage":"D614G",
              "id":"2fd2ff1f-68cb-470c-bc87-e8bcb1895bb3",
              "_version_":1690342916912840707},
            {
              "country":"Unknown",
              "region":"Buenos Aires",
              "month":"202004",
              "total_isolates":41,
              "lineage_count":24,
              "prevalence":0.5854,
              "growth_rate":0.7318,
              "lineage":"D614G",
              "id":"d1ad02c5-7133-46a9-891b-9d68fed58f76",
              "_version_":1690342916912840713},
            {
              "country":"Unknown",
              "region":"Buenos Aires",
              "month":"202005",
              "total_isolates":46,
              "lineage_count":28,
              "prevalence":0.6087,
              "growth_rate":1.0398,
              "lineage":"D614G",
              "id":"f98762e9-7f93-4e7b-94b4-0cef11441784",
              "_version_":1690342916913889288},
            {
              "country":"Unknown",
              "region":"Buenos Aires",
              "month":"202006",
              "total_isolates":5,
              "lineage_count":5,
              "prevalence":1.0,
              "growth_rate":1.6428,
              "lineage":"D614G",
              "id":"80d5fad2-4031-400d-ab2c-e8f048ca51f1",
              "_version_":1690342916914937862}
          ]
        var bySeries = {} // given: region, key:lineage -> x: time, y: prevalence
        for (i = 0; i  < response.length; i++) {
          var res = response[i]
          var lineage = res['lineage']
          if (!bySeries[lineage]) {
            bySeries[lineage] = [res]
          } else {
            bySeries[lineage].push(res)
          }
        }
        // sort by month & decoration
        // var keys = Object.keys(bySeries)
        // for (i = 0; i < keys.size(); i++) {
        //   var key = keys[i]
        //   bySeries[key] = bySeries[key].map(function(el) {

        //   }
        // }
        // console.warn(bySeries)

        _self.setData(data);
        // console.log("!!!!In GeneExpressionChartMemoryStore loadData():  _self.data:", _self.data);
        _self._loaded = true;
        // return;
      });
      return this._loadingDeferred;
    }

  });
});
