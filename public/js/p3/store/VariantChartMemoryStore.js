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

  return declare([ArrangeableMemoryStore, Stateful], {
    baseQuery: {},
    apiServer: window.App.dataServiceURL,
    idProperty: 'id',
    state: null,
    onSetState: function (attr, oldVal, state) {
      console.log('VLChartMemoryStore Tab onSetState: ', state);
      this._loaded = false;
      delete this._loadingDeferred;
    },

    constructor: function (options) {
      this._loaded = false;
      if (options.apiServer) {
        this.apiServer = options.apiServer;
      }

      this.loadData();
      this.watch('state', lang.hitch(this, 'onSetState'));
    },

    reload: function () {
      console.log('In MemoryStore reload ... ');
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

      var q = this.state.search

      if (this.state.groupBy == 'country') {
        q += '&eq(month,All)&eq(region,All)&ne(aa_variant,D614G)&sort(-prevalence)&select(aa_variant,prevalence)&limit(20)';
      } else if (this.state.groupBy == 'lineage') {
        q += '&eq(month,All)&eq(region,All)&ne(country,All)&sort(-prevalence)&select(country,prevalence)&limit(20)';
      } else {
        return;
      }

      this._loadingDeferred = when(request.post(window.App.dataServiceURL + '/spike_variant', {
        data: q,
        headers: {
          accept: 'application/json',
          'content-type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }), function (res) {
        // return top lineages or countries
        let subq

        if (_self.state.groupBy == 'country') {
          subq = '&in(aa_variant,(' + res.map(function(el) {
            return encodeURIComponent('"' + el.aa_variant + '"')
          }).join(',') + '))'
        } else if (_self.state.groupBy == 'lineage') {
          subq = '&in(country,(' + res.map(function(el) {
            return encodeURIComponent('"' + el.country + '"')
          }).join(',') + '))'
        }

        let q = _self.state.search + subq + '&eq(region,All)&ne(month,All)&eq(month,*)&select(aa_variant,country,month,prevalence,id)&limit(2500)';
        return when(request.post(window.App.dataServiceURL + '/spike_variant/', {
          data: q,
          headers: {
            accept: 'application/json',
            'content-type': 'application/rqlquery+x-www-form-urlencoded',
            'X-Requested-With': null,
            Authorization: (window.App.authorizationToken || '')
          },
          handleAs: 'json'
        }), function (response) {
          _self.setData(response);
          _self._loaded = true;
          return;
        });
      })
      return this._loadingDeferred;
    }
  });
});
