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
      minRowsPerPage: 50,
      bufferRows: 100,
      maxRowsPerPage: 1000,
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
        /*service: {
          label: 'Service',
          field: 'app',
          formatter: formatter.serviceLabel
        },*/
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

        this.refresh();

      }
    });

  }
);
