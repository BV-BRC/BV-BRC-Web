define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/request', 'dojo/when', 'dojo/Stateful', 'dojo/topic',
  'dojo/store/util/QueryResults', '../../../../store/ArrangeableMemoryStore'
], function (
  declare, lang, Deferred,
  request, when, Stateful, Topic,
  QueryResults, ArrangeableMemoryStore
) {

  let tgState = {
    sequence_features: '',
    country: 'All',
    region: 'All',
    month: 'All',
    min_total_isolates: 10,
    min_lineage_count: 10,
    min_prevalence: 0.005,
    min_growth_rate: 1,
    keyword: ''
  };

  function sanitizeInput(input) {
    if (input === '*') {
      return input;
    } else if (input.includes(' ')) {
      return encodeURIComponent(`"${input}"`);
    } else {
      return encodeURIComponent(input);
    }
  }

  return declare([ArrangeableMemoryStore, Stateful], {
    baseQuery: {},
    apiServer: window.App.dataServiceURL,
    idProperty: 'id',
    state: null,
    tgState: tgState,
    feature_id: null,
    onSetState: function (attr, oldVal, state) {
      if (state) {
        let cur = this.state;
        let next = state;
        if (cur != next) {
          this._loaded = false;
          delete this._loadingDeferred;
        }
      }
    },

    constructor: function (options) {
      this.watch('state', lang.hitch(this, 'onSetState'));
      this._loaded = false;
      if (options.apiServer) {
        this.apiServer = options.apiServer;
      }

      let self = this;

      Topic.subscribe('Variant', function () {
        let key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updateTgState':
            self.tgState = value;
            self.reload(value);
            break;
          default:
            break;
        }
      });
    },

    reload: function (curr_tgState) {
      let self = this;
      self.tgState = curr_tgState;
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

      let _self = this;
      let results;
      let qr = QueryResults(when(this.loadData(), function () {
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
      let _self = this;
      return when(this.loadData(), function () {
        return _self.get(id, opts);
      });
    },

    loadData: function () {
      if (this._loadingDeferred) {
        return this._loadingDeferred;
      }

      let _self = this;

      if (!this.state || this.state.search == null) {
        console.log('No State, use empty data set for initial store');

        // this is done as a deferred instead of returning an empty array
        // in order to make it happen on the next tick.  Otherwise it
        // in the query() function above, the callback happens before qr exists
        let def = new Deferred();
        setTimeout(lang.hitch(_self, function () {
          _self.setData([]);
          _self._loaded = true;
          def.resolve(true);
        }), 0);
        return def.promise;
      }

      let range = '';
      if (_self.tgState.keyword !== '') {
        range += `&keyword(${sanitizeInput(_self.tgState.keyword)})`;
      }
      if (_self.tgState.sequence_features !== '') {
        range += `&eq(sequence_features,${sanitizeInput(_self.tgState.sequence_features)})`;
      }
      if (_self.tgState.country !== '') {
        range += `&eq(country,${sanitizeInput(_self.tgState.country)})`;
      }
      if (_self.tgState.region !== '') {
        range += `&eq(region,${sanitizeInput(_self.tgState.region)})`;
      }
      if (_self.tgState.month !== '') {
        range += `&eq(month,${sanitizeInput(_self.tgState.month)})`;
      }
      if (_self.tgState.min_total_isolates > 0) {
        range += `&gt(total_isolates,${_self.tgState.min_total_isolates})`;
      }
      if (_self.tgState.min_lineage_count > 0) {
        range += `&gt(lineage_count,${_self.tgState.min_lineage_count})`;
      }
      if (_self.tgState.min_prevalence > 0) {
        range += `&gt(prevalence,${_self.tgState.min_prevalence})`;
      }
      if (_self.tgState.min_growth_rate > 0) {
        range += `&gt(growth_rate,${_self.tgState.min_growth_rate})`;
      }
      const q = this.state.search + range + '&sort(-prevalence)&limit(25000)';

      this._loadingDeferred = when(request.post(window.App.dataServiceURL + '/spike_variant/', {
        data: q,
        headers: {
          accept: 'application/solr+json',
          'content-type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }), function (response) {
        _self.setData(response.response.docs);
        _self._loaded = true;
      });
      return this._loadingDeferred;
    }
  });
});
