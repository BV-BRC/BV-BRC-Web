define([
  'dojo/_base/declare',
  'dojo/request',
  'dojo/store/Memory',
  'dojo/store/util/QueryResults',
  'dojo/when', 'dojo/_base/lang',
  'dojo/_base/Deferred', 'dojo/Stateful',
  '../util/PathJoin', '../auth/authHeaders', '../util/subsystemSummary'

], function (
  declare,
  request,
  Memory,
  QueryResults,
  when, lang,
  Deferred, Stateful,
  PathJoin,
  authHeader,
  SubsystemSummary) {
  return declare([Memory, Stateful], {
    baseQuery: {},
    idProperty: 'id',
    apiServer: window.App.dataServiceURL,
    state: null,
    genome_ids: null,
    type: 'subsystem',
    onSetState: function (attr, oldVal, state) {

      var ov,
        nv;
      if (oldVal) {
        ov = oldVal.search;
        if (oldVal.hashParams.filter) {
          ov += oldVal.hashParams.filter;
        }
      }
      if (state) {
        nv = state.search;
        if (state.hashParams.filter) {
          nv += state.hashParams.filter;
        }

      }

      this.state = state;

      if (!nv) {
        this.setData([]);
        this._loaded = true;
        if (this._loadingDeferred) {
          this.loadingDeferred.resolve(true);
        }
      } else if (ov != nv) {
        if (this._loaded) {
          this._loaded = false;
          delete this._loadingDeferred;
          return this.loadData();
        }
        if (this._loadingDeferred) {
          // var curDef = this._loadingDeferred;
          // when(this.loadData(), function(r){
          //   curDef.resolve(r);
          // })
          return this._loadingDeferred;
        }
        return this.loadData();


      }
    },
    constructor: function (opts) {
      this.init(opts);
    },
    init: function (options) {
      options = options || {};
      this._loaded = false;
      this.genome_ids = [];
      lang.mixin(this, options);
      this.watch('state', lang.hitch(this, 'onSetState'));
    },

    query: function (query, opts) {
      query = query || {};
      if (this._loaded) {
        return this.inherited(arguments);
      }

      var _self = this;
      var results;
      var qr = QueryResults(when(this.loadData(), function () {
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
      var state = this.state || {};

      if (!state.search || !state.genome_ids || state.genome_ids.length < 1) {

        // this is done as a deferred instead of returning an empty array
        // in order to make it happen on the next tick.  Otherwise it
        // in the query() function above, the callback happens before qr exists
        var def = new Deferred();
        setTimeout(lang.hitch(this, function () {
          this.setData([]);
          this._loaded = true;
          def.resolve(true);
        }), 0);
        return def.promise;

      }

      var _self = this;

      var headers = {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': null,
        Authorization: authHeader('api', this.token)
      };

      // The cached summary. Fast, and complete for anything an anonymous user
      // can see -- but the route queries as nobody and caches by URL, so for a
      // private genome it answers [] and the pie chart draws nothing.
      var fromCache = lang.hitch(this, function () {
        return request.get(PathJoin(this.apiServer, 'data/subsystem_summary', this.state.genome_id), {
          handleAs: 'json',
          headers: headers,
          timeout: 1200000
        });
      });

      // The same pivot asked of the ordinary data API, which carries the
      // caller's token and applies its permission filter. Reshaped to match
      // what the cached route returns, so the chart cannot tell the difference.
      var fromApi = lang.hitch(this, function () {
        var body = SubsystemSummary.buildSolrQuery(this.state.genome_id);
        if (!body) {
          return [];
        }
        return request.post(PathJoin(this.apiServer, 'subsystem') + '/', {
          handleAs: 'json',
          data: body,
          headers: lang.mixin({}, headers, {
            Accept: 'application/solr+json',
            'Content-Type': 'application/solrquery+x-www-form-urlencoded'
          }),
          timeout: 1200000
        }).then(SubsystemSummary.fromPivot);
      });

      var source = SubsystemSummary.chooseSource(state, !!(window.App && window.App.authorizationToken));
      var summary;
      if (source === 'api') {
        summary = fromApi();
      } else if (source === 'cache-then-api') {
        // Privacy unknown: a private genome's cached answer is [], which is
        // indistinguishable from a genome that simply has no subsystems.
        summary = when(fromCache(), function (rows) {
          return (rows && rows.length) ? rows : fromApi();
        }, fromApi);
      } else {
        summary = fromCache();
      }

      this._loadingDeferred = when(summary, lang.hitch(this, function (response) {

        if ( response ) {
          _self.setData(response.filter(function (row) { return row.name !== ''; }));
          _self._loaded = true;
          return true;
        }

      }), lang.hitch(this, function (err) {
        console.error('Error Loading Data: ', err);
        _self.setData([]);
        _self._loaded = true;
        return err;
      }));

      return this._loadingDeferred;
    }


  });
});
