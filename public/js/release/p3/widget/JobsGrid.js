define(
  "p3/widget/JobsGrid", [
    'dojo/_base/declare', './PageGrid', 'dojo/store/JsonRest', 'dgrid/extensions/DijitRegistry',
    'dgrid/Keyboard', 'dgrid/Selection', './formatter', 'dgrid/extensions/ColumnResizer', 'dgrid/extensions/ColumnHider',
    'dgrid/extensions/DnD', 'dojo/dnd/Source', 'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang',
    'dojo/topic', 'dgrid/editor', 'dijit/Menu', 'dijit/MenuItem', '../WorkspaceManager', 'dijit/Dialog',
    '../JobManager', 'dojo/on'

  ],
  function (
    declare, Grid, Store, DijitRegistry,
    Keyboard, Selection, formatter, ColumnResizer,
    ColumnHider, DnD, DnDSource,
    Deferred, aspect, lang, Topic, editor, Menu, MenuItem, WorkspaceManager, Dialog,
    JobManager, on
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
      rowHeight: 24,
      loadingMessage: 'Loading...',
      dndDataType: 'genome',
      dndParams: {
        accept: 'none',
        selfAccept: false,
        copyOnly: true
      },
      columns: {
        status: {
          label: 'Status',
          field: 'status',
          formatter: formatter.status_alias
        },

        submit_time: {
          label: 'Submit',
          field: 'submit_time',
          formatter: formatter.date
        },

        id: {
          label: 'ID',
          field: 'id',
          hidden: true
        },
        service: {
          label: 'Service',
          field: 'app',
          formatter: formatter.serviceLabel
        },
        app: {
          label: 'App',
          field: 'app',
          formatter: formatter.appLabel,
          hidden: true
        },
        parameters: {
          label: 'Output Name',
          field: 'parameters',
          formatter: function (val) {
            return val.output_file || '';
          }
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

        this.dndParams.creator = lang.hitch(this, function (item, hint) {
        // console.log("item: ", item, " hint:", hint, "dataType: ", this.dndDataType);
          var avatar = dojo.create('div', {
            innerHTML: item.organism_name || item.ncbi_taxon_id || item.id
          });
          avatar.data = item;
          if (hint == 'avatar') {
          // create your avatar if you want
          }

          return {
            node: avatar,
            data: item,
            type: this.dndDataType
          };
        });
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
      // console.log("Show Error Dialog: ", data);
        if (!this.errorDialog) {
          this.errorDialog = new Dialog({ title: 'Task Output', content: 'Loading Task Detail...' });
        } else {
          this.errorDialog.set('content', 'Loading Task Detail...');
        }

        var _self = this;
        var timer = setTimeout(function () {
          _self.errorDialog.set('content', 'Unable to retreive additional details about this task at this task. The operation timed out.');
        }, 30000);
        JobManager.queryTaskDetail(data.id, true, true).then(function (detail) {
        // console.log("JOB DETAIL: ", detail);
          clearTimeout(timer);
          if (detail.stderr) {
            _self.errorDialog.set('content', "<div style='overflow:auto;'><div data-dojo-type='dijit/TitlePane' title='STDOUT' open='false'><pre>" + (detail.stdout || 'None.') + "</pre></div><br><div data-dojo-type='dijit/TitlePane' title='STDERR'><pre>" + (detail.stderr || 'None.') + '</pre></div>');
          } else {
            _self.errorDialog.set('content', 'Unable to retreive additional details about this task at this task.<br><pre>' + JSON.stringify(detail, null, 4) + '</pre>');
          }
        }, function (err) {
          _self.errorDialog.set('content', 'Unable to retreive additional details about this task at this task.<br>' + err + '<br><pre></pre>');
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
          // console.log('JobsGrid:dblclick: ', row);

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
