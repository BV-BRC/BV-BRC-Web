define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/request', 'dojo/when', 'dojo/Stateful', 'dojo/topic', 'dojo/promise/all',
  './P3MemoryStore'
], function (
  declare, lang, Deferred,
  request, when, Stateful, Topic, All,
  Memory
) {

  return declare([Memory, Stateful], {
    idProperty: 'id',
    state: null,
    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }

      // console.warn("onSetState", state);
      if (state.feature && state.feature.patric_id) {
        Topic.publish(this.topicId, 'pinFeatures', [state.feature.patric_id]);
      }
      this.clear();
    },

    constructor: function (options) {
      this._loaded = false;

      this.topicId = options.topicId;
      // console.log("interaction store created.", this.topicId);

      // Topic.subscribe()

      this.watch('state', lang.hitch(this, 'onSetState'));
    },

    loadData: function () {
      if (this._loadingDeferred) {
        return this._loadingDeferred;
      }

      // console.log(this.state.search);
      if (!this.state.search) {
        var def = new Deferred();
        setTimeout(lang.hitch(this, function () {
          this.setData([]);
          this._loaded = true;
          // def.resolve(true);
        }), 0);
        return def.promise;
      }

      var query = this.state.search;
      if (this.state.hashParams
        && Object.prototype.hasOwnProperty.call(this.state.hashParams, 'filter')
        && this.state.hashParams.filter !== 'false') {
        query += '&' + this.state.hashParams.filter;
      }
      var dataUrl = this.apiServer + '/ppi/';

      this._loadingDeferred = when(request.post(dataUrl, {
        handleAs: 'json',
        headers: {
          Accept: 'application/solr+json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded'
        },
        data: query + '&limit(1)'
      }), lang.hitch(this, function (res) {

        // var numFound = res.response.numFound;

        var fetchSize = 5000;
        // var steps = Math.ceil(numFound / fetchSize);
        //
        // var forBlockScopedVars = [];
        // for(var i = 0; i < steps; i++){
        //   forBlockScopedVars.push(i);
        // }
        var forBlockScopedVars = [0];
        var allRequests = forBlockScopedVars.map(function (i) {
          var deferred = new Deferred();
          var range = 'items=' + (i * fetchSize) + '-' + ((i + 1) * fetchSize);
          request.post(dataUrl, {
            handleAs: 'json',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
              Range: range
            },
            data: query
          }).then(function (body) {
            deferred.resolve(body);
          });
          return deferred.promise;
        });

        console.time('getSubQueries');
        return when(All(allRequests), lang.hitch(this, function (results) {
          console.timeEnd('getSubQueries');
          console.time('data2');
          var data = results.reduce(function (a, b) {
            return a.concat(b);
          });

          this.setData(data);
          this._loaded = true;

          Topic.publish(this.topicId, 'updateGraphData', data);
          console.timeEnd('data2');
        }));
      }));

      return this._loadingDeferred;
    }
  });
});
