define([
  'dojo/_base/declare',
  'dojo/store/JsonRest',
  'dojo/store/util/QueryResults',
  'dojo/when', 'dojo/_base/lang',
  'dojo/_base/xhr', 'dojo/json',
  'dojo/Evented'

], function (
  declare,
  Store,
  QueryResults,
  when, lang,
  xhr, json,
  Evented
) {
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
        Authorization: (window.App.authorizationToken || '')
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
      // console.log("DO POST: ", query)
      var results = dojo.rawXhrPost({
        url: this.target,
        postData: query || '',
        handleAs: 'json',
        headers: headers
      }, true);

      results.total = results.then(function (res) {
        // console.log("Arguments: ", arguments)

        // if (res && res.response) { return res.response.numFound; }
        var range = results.ioArgs.xhr.getResponseHeader('Content-Range');
        if (!range) {
          // At least Chrome drops the Content-Range header from cached replies.
          range = results.ioArgs.xhr.getResponseHeader('X-Content-Range');
        }
        return range && (range = range.match(/\/(.*)/)) && +range[1];
      });
      return QueryResults(results);
    }

  });
});
