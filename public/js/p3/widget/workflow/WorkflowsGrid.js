define(
  [
    'dojo/_base/declare', '../PageGrid', 'dgrid/extensions/DijitRegistry',
    'dgrid/Keyboard', 'dgrid/Selection', '../formatter', 'dgrid/extensions/ColumnResizer',
    'dgrid/extensions/ColumnHider', 'dojo/_base/Deferred', 'dojo/aspect',
    'dojo/topic', 'dojo/on', '../../WorkflowManager'
  ],
  function (
    declare, Grid, DijitRegistry,
    Keyboard, Selection, formatter, ColumnResizer,
    ColumnHider, Deferred, aspect,
    Topic, on, WorkflowManager
  ) {
    var store = WorkflowManager.getStore();
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
      farOffRemoval: 2000,
      keepScrollPosition: true,
      loadingMessage: 'Loading...',
      columns: {
        status: {
          label: 'Status',
          field: 'status',
          formatter: formatter.status_alias
        },
        workflow_id: {
          label: 'Workflow ID',
          field: 'workflow_id'
        },
        workflow_name: {
          label: 'Name',
          field: 'workflow_name'
        },
        step_count: {
          label: 'Steps',
          field: 'step_count'
        },
        submitted_at: {
          label: 'Submitted',
          field: 'submitted_at',
          formatter: formatter.date
        },
        completed_at: {
          label: 'Completed',
          field: 'completed_at',
          formatter: formatter.date
        }
      },
      constructor: function () {
        this.queryOptions = {
          sort: [{ attribute: 'submitted_at', descending: true }]
        };
      },
      sort: [
        { attribute: 'submitted_at', descending: true }
      ],
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
          on.emit(_self.domNode, 'select', {
            rows: evt.rows,
            selected: evt.grid.selection,
            grid: _self,
            bubbles: true,
            cancelable: true
          });
        });

        this.on('dgrid-deselect', function (evt) {
          on.emit(_self.domNode, 'deselect', {
            rows: evt.rows,
            selected: evt.grid.selection,
            grid: _self,
            bubbles: true,
            cancelable: true
          });
        });

        this.on('.dgrid-content .dgrid-row:dblclick', function (evt) {
          var row = _self.row(evt);
          on.emit(_self.domNode, 'ItemDblClick', {
            selected: row.data,
            bubbles: true,
            cancelable: true
          });
        });

        this.inherited(arguments);
      }
    });
  }
);

