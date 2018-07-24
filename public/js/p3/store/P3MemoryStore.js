define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/when', 'dojo/store/util/QueryResults', 'dojo/store/Memory'
], function (
  declare, lang,
  when, QueryResults, Memory
) {

  return declare([Memory], {
    clear: function () {
      delete this._loadingDeferred;
      this._loaded = false;
    },

    reload: function () {

      if (!this._loadingDeferred.isResolved()) {
        this._loadingDeferred.cancel('reloaded');
      }

      delete this._loadingDeferred;
      this._loaded = false;
      this.loadData();
      this.set('refresh');
    },

    query: function (query, opts) {
      query = query || {};
      if (this._loaded) {
        return this.inherited(arguments);
      }

      var results;
      var qr = QueryResults(when(this.loadData(), lang.hitch(this, function () {
        results = this.query(query, opts);
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
      return when(this.loadData(), lang.hitch(this, function () {
        return this.get(id, opts);
      }));

    }
  });
});
