define([
  'dgrid/extensions/Pagination', 'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/query', 'dojo/string', 'put-selector/put', 'dgrid/util/misc'
], function (Pagination, declare, lang, Deferred, on, query, string, put, miscUtil) {

  // CursorPagination extends dgrid's Pagination extension to support
  // cursor-based pagination via Solr cursorMark.
  //
  // When the store has useCursorPagination: true, this extension:
  // - Replaces page number links with "Page X of Y" text
  // - Only allows next/previous navigation (no random page jumps)
  // - Passes _cursorPage in query options for cursor-based fetching
  // - Clears the store's cursor cache on query/sort changes
  //
  // When the store does NOT have useCursorPagination (Memory stores, etc.),
  // all behavior falls back to the parent Pagination extension unchanged.

  return declare(Pagination, {

    _isCursorMode: function () {
      // summary:
      //   Returns true if the current store uses cursor-based pagination.
      return this.store && this.store.useCursorPagination;
    },

    gotoPage: function (page) {
      // summary:
      //   Loads the given page. Uses cursor marks if the store supports it,
      //   otherwise falls back to offset-based pagination.

      if (!this._isCursorMode()) {
        return this.inherited(arguments);
      }

      var grid = this;
      var dfd = new Deferred();

      var result = this._trackError(function () {
        var count = grid.rowsPerPage;
        return grid._cursorFetchPage(page, count, dfd);
      });

      if (!result) {
        dfd.reject();
      }
      return dfd.promise;
    },

    _cursorFetchPage: function (page, count, dfd) {
      // summary:
      //   Fetches a single page using its cached cursor mark.

      var grid = this;
      var store = this.store;

      // Ensure we have a cursor for this page. For next/prev navigation
      // this is always true (page 1 = '*', page N+1 cached after fetching page N).
      var cursorMark = store.getCursorForPage(page);
      if (!cursorMark) {
        console.warn('CursorPagination: No cursor for page ' + page + ', resetting to page 1');
        page = 1;
        cursorMark = '*';
      }

      var options = lang.mixin(grid.get('queryOptions'), {
        start: (page - 1) * count,
        count: count,
        _cursorPage: page
      });

      var contentNode = grid.contentNode;
      var oldNodes, children, i, len;

      if (grid.showLoadingMessage) {
        if (grid.noDataNode) {
          put(grid.noDataNode, '!');
          delete grid.noDataNode;
        } else {
          grid.cleanup();
        }
        contentNode.innerHTML = '';
        grid.loadingNode = put(contentNode, 'div.dgrid-loading');
        grid.loadingNode.innerHTML = grid.loadingMessage;
      } else {
        grid._oldPageNodes = oldNodes = {};
        children = contentNode.children;
        for (i = 0, len = children.length; i < len; i++) {
          oldNodes[children[i].id] = children[i];
        }
        grid._oldPageObserver = grid.observers.pop();
      }

      grid._isLoading = true;

      var results = store.query(grid.query, options);

      Deferred.when(grid.renderArray(results, null, options), function (rows) {
        // Clean up loading state
        if (grid.loadingNode) {
          put(grid.loadingNode, '!');
          delete grid.loadingNode;
        } else if (grid._oldPageNodes) {
          for (var id in grid._oldPageNodes) {
            grid.removeRow(grid._oldPageNodes[id]);
          }
          delete grid._oldPageNodes;
          if (grid._oldPageObserver) {
            grid._oldPageObserver.cancel();
            grid._numObservers--;
            delete grid._oldPageObserver;
          }
        }
        delete grid._isLoading;

        grid.scrollTo({ y: 0 });

        Deferred.when(results.total, function (total) {
          if (!total) {
            if (grid.noDataNode) {
              put(grid.noDataNode, '!');
              delete grid.noDataNode;
            }
            grid.noDataNode = put(grid.contentNode, 'div.dgrid-no-data');
            grid.noDataNode.innerHTML = grid.noDataMessage;
          }

          // Calculate start/end from page number (cursor mode doesn't
          // track server-side offset)
          var start = (page - 1) * count;
          grid.paginationStatusNode.innerHTML = string.substitute(grid.i18nPagination.status, {
            start: Math.min(start + 1, total),
            end: Math.min(total, start + count),
            total: total
          });
          grid._total = total;
          grid._currentPage = page;
          grid._rowsOnPage = rows.length;

          grid._updateNavigation();
        });

        dfd.resolve(results);
      }, function (error) {
        if (grid.loadingNode) {
          put(grid.loadingNode, '!');
          delete grid.loadingNode;
        } else if (grid._oldPageNodes) {
          for (var id in grid._oldPageNodes) {
            grid.removeRow(grid._oldPageNodes[id]);
          }
          delete grid._oldPageNodes;
          if (grid._oldPageObserver) {
            grid._oldPageObserver.cancel();
            grid._numObservers--;
            delete grid._oldPageObserver;
          }
        }
        delete grid._isLoading;
        dfd.reject(error);
      });

      return dfd.promise;
    },

    _updateNavigation: function () {
      // summary:
      //   In cursor mode: shows "Page X of Y" text with prev/next arrows only.
      //   In offset mode: falls back to parent behavior (clickable page numbers).

      if (!this._isCursorMode()) {
        return this.inherited(arguments);
      }

      var linksNode = this.paginationLinksNode,
        currentPage = this._currentPage,
        paginationNavigationNode = this.paginationNavigationNode,
        end = Math.ceil(this._total / this.rowsPerPage),
        focused = document.activeElement,
        focusableNodes;

      function setDisabled(link, disabled) {
        put(link, (disabled ? '.' : '!') + 'dgrid-page-disabled');
        link.tabIndex = disabled ? -1 : 0;
      }

      // Clear any existing page links / text box handles
      if (this._pagingTextBoxHandle) {
        this._pagingTextBoxHandle.remove();
      }
      linksNode.innerHTML = '';

      // Update prev/first arrow states
      query('.dgrid-first, .dgrid-previous', paginationNavigationNode).forEach(function (link) {
        setDisabled(link, currentPage === 1);
      });
      // Update next/last arrow states
      query('.dgrid-last, .dgrid-next', paginationNavigationNode).forEach(function (link) {
        setDisabled(link, currentPage >= end);
      });

      // Show "Page X of Y" between the arrows instead of clickable page numbers
      if (end > 0) {
        put(linksNode, 'span.dgrid-page-info', 'Page ' + currentPage + ' of ' + end);
      }

      // Handle focus restoration if a disabled arrow was focused
      if (focused && focused.tabIndex === -1) {
        focusableNodes = query("[tabindex='0']", paginationNavigationNode);
        if (focused === this.paginationPreviousNode || focused === this.paginationFirstNode) {
          focused = focusableNodes[0];
        } else if (focusableNodes.length) {
          focused = focusableNodes[focusableNodes.length - 1];
        }
        if (focused) {
          focused.focus();
        }
      }
    },

    refresh: function () {
      // Reset cursor cache when the grid refreshes (new query, etc.)
      if (this._isCursorMode()) {
        this.store.resetCursorCache();
      }
      return this.inherited(arguments);
    },

    _setSort: function () {
      // Reset cursor cache when sort changes
      if (this._isCursorMode()) {
        this.store.resetCursorCache();
      }
      this.inherited(arguments);
    }
  });
});
