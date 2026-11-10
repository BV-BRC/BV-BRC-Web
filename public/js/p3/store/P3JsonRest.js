define([
  'dojo/_base/declare',
  'dojo/store/JsonRest',
  'dojo/store/util/QueryResults',
  'dojo/when', 'dojo/_base/lang',
  'dojo/_base/xhr', 'dojo/json',
  'dojo/Evented', '../auth/authHeaders', '../util/retryRequest', '../util/dateRangeWithinQuery'

], function (
  declare,
  Store,
  QueryResults,
  when, lang,
  xhr, json,
  Evented, authHeader, retryRequest, dateRangeWithinQuery) {
  return declare([Store, Evented], {
    headers: null,
    constructor: function (options) {
      // console.log("P3JsonRest Options", options);
      var baseUrl = (window.App.dataServiceURL ? (window.App.dataServiceURL) : '');
      if (baseUrl.charAt(-1) !== '/') {
        baseUrl += '/';
      }

      this.target = baseUrl + this.dataModel + '/';
      this.init();
      //  this.headers = {
      //      "accept": "application/json",
      //      "content-type": "application/rqlquery+x-www-form-urlencoded",
      //      'X-Requested-With': null,
      //      'Authorization': (window.App.authorizationToken || "")
      // }
    },
    init: function () {
      this.headers = {
        accept: 'application/json',
        //  "//content-type": "application/json",
        'content-type': 'application/rqlquery+x-www-form-urlencoded',
        'X-Requested-With': null,
        Authorization: authHeader()
      };
    },
    autoFacet: false,
    dataModel: '',
    target: '',
    idProperty: 'id',

    query: function (query, options) {
      // console.log("p3JsonRest Query: ",typeof query, options);
      // summary:
      //      Queries the store for objects. This will trigger a GET request to the server, with the
      //      query added as a query string.
      // query: Object
      //      The query to use for retrieving objects from the store.
      // options: __QueryOptions?
      //      The optional arguments to apply to the resultset.
      // returns: dojo/store/api/Store.QueryResults
      //      The results of the query, extended with iterative methods.

      if (!query) {
        return QueryResults([]);
      }

      options = options || {};
      var headers = lang.mixin({
        Accept: this.accepts
      }, this.headers, options.headers);
      // console.log("Store Req Headers: ", headers, "this.headers: ",this.headers, " opts.headers: ", options.headers, this);
      var hasQuestionMark = this.target.indexOf('?') > -1;
      if (query && typeof query == 'object') {
        query = xhr.objectToQuery(query);
        query = query ? (hasQuestionMark ? '&' : '?') + query : '';
      }
      query = query || '';

      // console.log("p3JsonRest Query: ", query)
      if (options.start >= 0 || options.count >= 0) {
        headers['X-Range'] = 'items=' + (options.start || '0') + '-' +
          (('count' in options && options.count != Infinity) ?
            (options.count + (options.start || 0)) : '');
        if (this.rangeParam) {
          query += (query || hasQuestionMark ? '&' : '?') + this.rangeParam + '=' + headers['X-Range'];
          hasQuestionMark = true;
        }
        else {
          headers.Range = headers['X-Range'];
        }
      }
      if (options && options.sort) {
        var sortParam = this.sortParam;
        query += (query || hasQuestionMark ? '&' : '?') + (sortParam ? sortParam + '=' : 'sort(');
        for (var i = 0; i < options.sort.length; i++) {
          var sort = options.sort[i];
          query += (i > 0 ? ',' : '') + (sort.descending ? this.descendingPrefix : this.ascendingPrefix) + encodeURIComponent(sort.attribute);
        }
        if (!sortParam) {
          query += ')';
        }
      }
      // console.log("P3JsonRest Query: ", query)
      // this is the GET version
      // var results = xhr("GET", {
      //     url: this.target + (query || ""),
      //     handleAs: "json",
      //     headers: headers
      // });

      // this is the POST version
      query = (query && (typeof query == 'string') && (query.charAt(0) == '?')) ? query.substr(1) : query;
      query = dateRangeWithinQuery(query);
      // console.log("DO POST: ", query)

      // This store uses dojo/_base/xhr, not dojo/request, so it does NOT go
      // through the p3/util/throttledRequest provider -- it needs its own 429
      // handling. It is also the request that fetches the grid's actual rows,
      // so a shed query here renders as an empty grid: the single worst
      // outcome in the API's client contract, because the user reads zero rows
      // as "my data is missing" rather than "the server is busy".
      var target = this.target;

      // Keep a handle on the winning attempt's xhr. results.total used to read
      // it off `results.ioArgs`, which is a property of the specific Deferred
      // rawXhrPost returns -- retryRequest hands back a different promise, so
      // that back-channel no longer exists. Capture it explicitly instead.
      var lastXhr = null;
      var retried = retryRequest(function () {
        var attempt = dojo.rawXhrPost({
          url: target,
          postData: query || '',
          handleAs: 'json',
          headers: headers
        }, true);
        lastXhr = attempt.ioArgs && attempt.ioArgs.xhr;
        return attempt;
      }, { label: target });

      // dojo/Deferred freezes its promise (Deferred.js:305), so assigning
      // .total directly to it is a silent no-op and every grid would lose its
      // row count. Delegate first -- which is exactly what QueryResults does
      // to a promise for the same reason -- keeping then()/cancel() working
      // since both are closures, not prototype methods. Pagination.js:419
      // feature-detects results.cancel, so it has to survive.
      var results = lang.delegate(retried);

      results.total = results.then(function (res) {
        // console.log("Arguments: ", arguments)

        // if (res && res.response) { return res.response.numFound; }
        if (!lastXhr) { return undefined; }
        var range = lastXhr.getResponseHeader('Content-Range');
        if (!range) {
          // At least Chrome drops the Content-Range header from cached replies.
          range = lastXhr.getResponseHeader('X-Content-Range');
        }
        return range && (range = range.match(/\/(.*)/)) && +range[1];
      });
      return QueryResults(results);
    }

  });
});
