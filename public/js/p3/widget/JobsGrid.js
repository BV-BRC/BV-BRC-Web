define(
  [
    'dojo/_base/declare', './PageGrid', 'dgrid/extensions/DijitRegistry',
    'dgrid/Keyboard', 'dgrid/Selection', './formatter', 'dgrid/extensions/ColumnResizer',
    'dgrid/extensions/ColumnHider', 'dojo/_base/Deferred', 'dojo/aspect',
    'dojo/topic', 'dijit/Dialog', '../JobManager', 'dojo/on'
  ],
  function (
    declare, Grid, DijitRegistry,
    Keyboard, Selection, formatter, ColumnResizer,
    ColumnHider, Deferred, aspect,
    Topic, Dialog, JobManager, on
  ) {

    var store = JobManager.getStore();
    return declare([Grid, ColumnHider, Selection, Keyboard, ColumnResizer, DijitRegistry], {
      store: store,
      selectionMode: 'single',
      allowTextSelection: false,
      deselectOnRefresh: false,
      rowsPerPage: 200,
      minRowsPerPage: 50,
      bufferRows: 100,
      maxRowsPerPage: 200,
      pagingDelay: 250,
      // pagingMethod: "throttleDelayed",
      farOffRemoval: 2000,
      keepScrollPosition: true,
      loadingMessage: 'Loading...',
      columns: {
        status: {
          label: 'Status',
          field: 'status',
          formatter: formatter.status_alias
        },
        id: {
          label: 'ID',
          field: 'id'
        },
        app: {
          label: 'Service',
          field: 'application_name',
          formatter: formatter.serviceLabel,
        },
        parameters: {
          label: 'Output Name',
          field: 'parameters',
          formatter: function (val) {
            return val.output_file || '';
          }
        },
        submit_time: {
          label: 'Submit',
          field: 'submit_time',
          formatter: formatter.date
        },
        start_time: {
          label: 'Start',
          field: 'start_time',
          formatter: formatter.date
        },
        completed_time: {
          label: 'Completed',
          field: 'completed_time',
          formatter: formatter.date
        }
      },
      constructor: function () {
        this.queryOptions = {
          sort: [{ attribute: 'submit_time', descending: true }]
        };
      },

      queryOptions: {
        sort: [
          { attribute: 'submit_time', descending: true }
        ]
      },

      sort: [
        { attribute: 'submit_time', descending: true }
      ],

      _setTotalRows: function (rows) {
        this.totalRows = rows;

        if (this.controlButton) {
          if (!this._originalTitle) {
            this._originalTitle = this.controlButton.get('label');
          }
          this.controlButton.set('label', this._originalTitle + ' (' + rows + ')');
        }
      },

      showErrorDialog: function (data) {
        if (!this.errorDialog) {
          this.errorDialog = new Dialog({ title: 'Task Output', content: 'Loading Task Detail...' });
        } else {
          this.errorDialog.set('content', 'Loading Task Detail...');
        }

        var _self = this;
        var timer = setTimeout(function () {
          _self.errorDialog.set('content', 'Unable to retrieve additional details about this task at this task. The operation timed out.');
        }, 30000);

        JobManager.queryTaskDetail(data.id, true, true).then(function (detail) {
          clearTimeout(timer);
          if (detail.stderr) {
            _self.errorDialog.set('content', "<div style='overflow:auto;'><div data-dojo-type='dijit/TitlePane' title='STDOUT' open='false'><pre>" + (detail.stdout || 'None.') + "</pre></div><br><div data-dojo-type='dijit/TitlePane' title='STDERR'><pre>" + (detail.stderr || 'None.') + '</pre></div>');
          } else {
            _self.errorDialog.set('content', 'Unable to retrieve additional details about this task at this task.<br><pre>' + JSON.stringify(detail, null, 4) + '</pre>');
          }
        }, function (err) {
          _self.errorDialog.set('content', 'Unable to retrieve additional details about this task at this task.<br>' + err + '<br><pre></pre>');
        });

        this.errorDialog.show();
      },

      startup: function () {
        if (this._started) {
          return;
        }
        var _self = this;

        // Set up permanent suppression of "already resolved" errors that occur
        // during request cancellation. These are harmless and expected when
        // the user changes filters while a request is in progress.
        require(['dojo/Deferred'], function (NewDeferred) {
          if (NewDeferred && NewDeferred.instrumentRejected && !NewDeferred._originalInstrumentRejected) {
            NewDeferred._originalInstrumentRejected = NewDeferred.instrumentRejected;
            NewDeferred.instrumentRejected = function (error, handled, rejection, deferred) {
              // Suppress "already resolved" errors - these are expected when canceling requests
              if (error && error.message &&
                  error.message.indexOf('already been resolved') !== -1) {
                return; // Suppress this error
              }
              // Pass through other errors
              if (NewDeferred._originalInstrumentRejected) {
                NewDeferred._originalInstrumentRejected(error, handled, rejection, deferred);
              }
            };
          }
        });

        aspect.before(_self, 'renderArray', function (results) {
          Deferred.when(results.total, function (x) {
            _self.set('totalRows', x);
          });
        });

        Topic.publish('/select', []);

        this.on('dgrid-select', function (evt) {
          var newEvt = {
            rows: evt.rows,
            selected: evt.grid.selection,
            grid: _self,
            bubbles: true,
            cancelable: true
          };
          on.emit(_self.domNode, 'select', newEvt);
        });

        this.on('dgrid-deselect', function (evt) {
          var newEvt = {
            rows: evt.rows,
            selected: evt.grid.selection,
            grid: _self,
            bubbles: true,
            cancelable: true
          };
          on.emit(_self.domNode, 'deselect', newEvt);
        });

        this.on('.dgrid-content .dgrid-row:dblclick', function (evt) {
          var row = _self.row(evt);
          on.emit(_self.domNode, 'ItemDblClick', {
            selected: row.data,
            bubbles: true,
            cancelable: true
          });
        });

        // Note: We don't call refresh() here anymore.
        // The Pagination extension automatically loads the first page when the grid is
        // placed in the DOM. Calling refresh() here would cause a duplicate request
        // and "deferred already resolved" errors.
        // The inherited startup() will handle initialization.
        this.inherited(arguments);
      },

      // Override _setQuery to prevent overlapping refreshes.
      // When query changes rapidly (e.g., user starts search then cancels), multiple
      // _setQuery calls can overlap, each triggering a refresh. This override cancels
      // any in-progress request and starts the new one immediately.
      _setQuery: function (query, queryOptions) {
        var _self = this;

        // Update loading message based on whether a search is active
        if (query && query.search) {
          this.loadingMessage = 'Job search in progress...';
        } else {
          this.loadingMessage = 'Loading...';
        }

        // If currently loading, cancel the current load and start fresh
        if (this._isLoading) {
          // Mark that we're canceling - this will cause the old request's
          // callbacks to be suppressed
          this._canceledRequestId = this._currentRequestId || 0;

          // Cancel any top-level request that's in progress
          if (this._topLevelRequest && typeof this._topLevelRequest.cancel === 'function') {
            try {
              this._topLevelRequest.cancel();
            } catch (e) {
              // Ignore cancel errors
            }
            delete this._topLevelRequest;
          }

          // Clear the loading state so we can start a new load
          if (this.loadingNode) {
            this.loadingNode.parentNode && this.loadingNode.parentNode.removeChild(this.loadingNode);
            delete this.loadingNode;
          }
          if (this._oldPageNodes) {
            delete this._oldPageNodes;
          }
          if (this._oldPageObserver) {
            try {
              this._oldPageObserver.cancel();
              this._numObservers--;
            } catch (e) {
              // Ignore errors
            }
            delete this._oldPageObserver;
          }
          delete this._isLoading;
        }

        // Store the query
        this.query = query;
        if (queryOptions) {
          this.queryOptions = queryOptions;
        }

        // Now call inherited which will trigger refresh
        this.inherited(arguments);
      },

      // Override gotoPage to track request IDs and suppress errors from canceled requests
      gotoPage: function (page) {
        var _self = this;

        // Increment request ID for this call
        if (!this._currentRequestId) {
          this._currentRequestId = 0;
        }
        this._currentRequestId++;
        var thisRequestId = this._currentRequestId;

        // Call the inherited gotoPage
        var promise;
        try {
          promise = this.inherited(arguments);
        } catch (e) {
          // If the inherited call throws (e.g., deferred already resolved),
          // check if this was a canceled request
          if (thisRequestId <= (this._canceledRequestId || 0)) {
            // This was a canceled request, return a dummy resolved promise
            var dummyDeferred = new Deferred();
            dummyDeferred.resolve([]);
            return dummyDeferred.promise;
          }
          throw e; // Re-throw if not a canceled request
        }

        // Wrap the promise to suppress errors from canceled requests
        var wrappedDeferred = new Deferred();

        Deferred.when(promise, function (results) {
          // Check if this request was canceled
          if (thisRequestId <= (_self._canceledRequestId || 0)) {
            // Silently discard - don't resolve or reject
            return;
          }
          wrappedDeferred.resolve(results);
        }, function (error) {
          // Check if this request was canceled
          if (thisRequestId <= (_self._canceledRequestId || 0)) {
            // Silently discard the error
            return;
          }
          wrappedDeferred.reject(error);
        });

        return wrappedDeferred.promise;
      }
    });

  }
);
