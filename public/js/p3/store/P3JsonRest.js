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

    // useCursorPagination: Boolean
    //   When true, uses Solr cursor-based pagination instead of offset-based
    //   Range headers. Provides stable pagination and better deep-paging performance.
    //   Requires the API to support the cursor() RQL operator for this collection.
    //   All collections in the BV-BRC data API support cursor pagination via
    //   the cursor() RQL operator (configured in p3_api config.js collectionUniqueKeys).
    useCursorPagination: true,

    constructor: function (options) {
      var baseUrl = (window.App.dataServiceURL ? (window.App.dataServiceURL) : '');
      if (baseUrl.charAt(-1) !== '/') {
        baseUrl += '/';
      }

      this.target = baseUrl + this.dataModel + '/';
      this.init();

      // Initialize cursor cache: maps page number -> cursor mark token
      // Page 1 always uses '*' (Solr's initial cursor mark)
      this._cursorCache = { 1: '*' };
      this._lastCursorQuery = null;
      this._lastCursorSort = null;
    },
    init: function () {
      this.headers = {
        accept: 'application/json',
        'content-type': 'application/rqlquery+x-www-form-urlencoded',
        'X-Requested-With': null,
        Authorization: (window.App.authorizationToken || '')
      };
    },
    autoFacet: false,
    dataModel: '',
    target: '',
    idProperty: 'id',

    // resetCursorCache: Function
    //   Clears all cached cursor marks. Called when query or sort changes
    //   invalidate existing cursors.
    resetCursorCache: function () {
      this._cursorCache = { 1: '*' };
      this._lastCursorQuery = null;
      this._lastCursorSort = null;
    },

    // getCursorForPage: Function
    //   Returns the cached cursor mark for the given page number, or null if
    //   that page hasn't been visited yet.
    getCursorForPage: function (page) {
      return this._cursorCache[page] || null;
    },

    // getMaxCachedPage: Function
    //   Returns the highest page number that has a cached cursor mark.
    getMaxCachedPage: function () {
      var max = 1;
      for (var p in this._cursorCache) {
        if (this._cursorCache.hasOwnProperty(p)) {
          var num = parseInt(p, 10);
          if (num > max) { max = num; }
        }
      }
      return max;
    },

    query: function (query, options) {
      // summary:
      //      Queries the store for objects. This will trigger a POST request to the server, with the
      //      query added as a query string.
      // query: Object
      //      The query to use for retrieving objects from the store.
      // options: __QueryOptions?
      //      The optional arguments to apply to the resultset.
      //      When useCursorPagination is true, options._cursorPage should be set to the
      //      target page number (1-based). The store will look up or compute the cursor mark.
      // returns: dojo/store/api/Store.QueryResults
      //      The results of the query, extended with iterative methods.

      if (!query) {
        return QueryResults([]);
      }

      options = options || {};
      var self = this;
      var headers = lang.mixin({
        Accept: this.accepts
      }, this.headers, options.headers);

      var hasQuestionMark = this.target.indexOf('?') > -1;
      if (query && typeof query == 'object') {
        query = xhr.objectToQuery(query);
        query = query ? (hasQuestionMark ? '&' : '?') + query : '';
      }
      query = query || '';

      // Detect query or sort changes to invalidate cursor cache.
      // Only track changes for cursor-paginated requests (those with _cursorPage).
      // Non-cursor requests like _selectAll send modified query strings with
      // limit() and select() appended -- those should not invalidate the cache.
      if (this.useCursorPagination && options._cursorPage) {
        var sortKey = options.sort ? JSON.stringify(options.sort) : '';
        if (this._lastCursorQuery !== null && (this._lastCursorQuery !== query || this._lastCursorSort !== sortKey)) {
          this.resetCursorCache();
        }
        this._lastCursorQuery = query;
        this._lastCursorSort = sortKey;
      }

      // Cursor pagination path: append cursor() and limit() to RQL query
      // instead of using Range headers
      if (this.useCursorPagination && options._cursorPage) {
        var cursorPage = options._cursorPage;
        var cursorMark = this._cursorCache[cursorPage];

        if (!cursorMark) {
          // Should not happen if CursorPagination extension is working correctly,
          // but fall back to page 1 if cursor is missing
          console.warn('P3JsonRest: No cursor cached for page ' + cursorPage + ', falling back to page 1');
          cursorMark = '*';
          cursorPage = 1;
        }

        // Append cursor() operator to the RQL query
        var cursorParam = '&cursor(' + encodeURIComponent(cursorMark) + ')';
        query += cursorParam;

        // Append limit() for page size (API uses this for rows=)
        var count = options.count || 200;
        query += '&limit(' + count + ')';

        // Do NOT send Range headers in cursor mode -- they are mutually exclusive
        // (The API's Limiter.js skips Range when req.cursorMark is set)

      } else {
        // Original offset-based pagination via Range headers
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
      }

      // Append sort parameters (used by both cursor and offset pagination)
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

      // POST the query
      query = (query && (typeof query == 'string') && (query.charAt(0) == '?')) ? query.substr(1) : query;
      var results = dojo.rawXhrPost({
        url: this.target,
        postData: query || '',
        handleAs: 'json',
        headers: headers
      }, true);

      // Extract total count from Content-Range header.
      // Also capture X-Cursor-Mark for cursor pagination.
      var cursorPageForCache = (this.useCursorPagination && options._cursorPage) ? options._cursorPage : null;

      results.total = results.then(function (res) {
        var range = results.ioArgs.xhr.getResponseHeader('Content-Range');
        if (!range) {
          // At least Chrome drops the Content-Range header from cached replies.
          range = results.ioArgs.xhr.getResponseHeader('X-Content-Range');
        }

        // Cache the next cursor mark if in cursor mode
        if (cursorPageForCache) {
          var nextCursor = results.ioArgs.xhr.getResponseHeader('X-Cursor-Mark');
          if (nextCursor) {
            // Store cursor for the NEXT page
            self._cursorCache[cursorPageForCache + 1] = nextCursor;
          }
        }

        return range && (range = range.match(/\/(.*)/)) && +range[1];
      });
      return QueryResults(results);
    }

  });
});
