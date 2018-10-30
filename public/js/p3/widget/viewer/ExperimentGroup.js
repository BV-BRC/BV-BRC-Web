define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  '../Grid', '../formatter', '../../WorkspaceManager', 'dojo/_base/lang',
  'dojo/_base/Deferred', 'dojo/store/JsonRest', 'dojo/promise/all', '../../util/PathJoin'
], function (
  declare, BorderContainer, on,
  domClass, ContentPane, domConstruct,
  Grid, formatter, WorkspaceManager, lang,
  Deferred, Store, All, PathJoin
) {

  return declare([BorderContainer], {
    baseClass: 'ExperimentViewer',
    disabled: false,
    query: null,
    containerType: 'experiment_group',
    data: null,
    _setDataAttr: function (data) {
      this.data = data;
      // console.log("Data: ", data);
      WorkspaceManager.getObject(data.path + data.name).then(lang.hitch(this, function (obj) {
        // console.log("WorkspaceGroup: ", obj);
        var eidDefer = [];
        if (obj && obj.data && typeof obj.data == 'string') {
          obj.data = JSON.parse(obj.data);
        }
        var wsItemDef = new Deferred();
        if (obj && obj.data && obj.data.id_list && obj.data.id_list.ws_item_path) {
          var workspaceItems = obj.data.id_list.ws_item_path;
          var expObjs = [];
          WorkspaceManager.getObjects(workspaceItems).then(lang.hitch(this, function (objs) {
            // console.log("Experiments from ws: ", objs);
            objs.forEach(function (o) {
              if (o && o.metadata.autoMeta && o.metadata.autoMeta.output_files) {
                if (o.metadata.type == 'folder') {
                  return;
                }

                o.metadata.autoMeta.output_files.some(function (output_file) {
                  if (output_file.match(/experiment\.json$/)) {
                    expObjs.push({
                      expFile: output_file,
                      expPath: o.metadata.path + o.metadata.name
                    });
                    return true;
                  }
                });
              }
            });
            WorkspaceManager.getObjects(expObjs.map(function (x) {
              return x.expFile;
            })).then(lang.hitch(this, function (objs) {
              var data = objs.map(function (o, idx) {
                var d = (typeof o.data == 'string') ? JSON.parse(o.data) : o.data;
                d.document_type = 'experiment';
                d.source = 'me';
                d.path = expObjs[idx].expPath;
                return d;
              });
              // console.log("Experiment Data: ", data);
              wsItemDef.resolve(data);
            }));
          }));

        } else {
          wsItemDef.resolve([]);
        }

        if (obj && obj.data && obj.data.id_list && obj.data.id_list.eid) {
          var list = obj.data.id_list.eid.join(',');
          var query = '?or(in(expid,(' + list + ')),in(eid,(' + list + ')))';
          console.log('Query: ', query);
          eidDefer = this.store.query(query);
        } else {
          eidDefer = [];
        }

        Deferred.when(All([wsItemDef, eidDefer]), lang.hitch(this, function (res) {
          // console.log("all res: ", res);
          if (res[1]) {
            res[1] = res[1].map(function (item) {
              if (item) {
                item.source = 'PATRIC';
              }
              return item;
            });
          }
          var d = res[0].concat(res[1]);
          // console.log("Combined Experiments: ", d);
          this.viewer.renderArray(d);
          this.viewHeader.set('content', obj.metadata.name);
        }));
      }));
    },
    startup: function () {
      if (this._started) {
        return;
      }
      if (!this.store) {
        this.store = new Store({
          target: PathJoin(window.App.dataAPI, 'transcriptomics_experiment'),
          header: { accept: 'application/json' }
        });
      }
      this.viewHeader = new ContentPane({ content: 'Loading Experiments...<br><br>', region: 'top' });
      this.viewer = new Grid({
        region: 'center',
        deselectOnRefresh: true,
        columns: {
          source: { label: 'Source', field: 'source' },
          // dataType: {label: "Data Type", field: "document_type"},
          title: { label: 'Title', field: 'title' },
          comparisons: { label: 'Comparisons', field: 'samples' },
          genes: { label: 'Genes', field: 'genes' },
          pubmed: { label: 'PubMed', field: 'pmid' },
          organism: { label: 'Organism', field: 'organism' },
          condition: { label: 'Condition', field: 'condition' },
          timeseries: { label: 'Time Series', field: 'timeseries' }
        }
      });
      var _self = this;
      this.viewer.on('.dgrid-content .dgrid-row:dblclick', function (evt) {
        var row = _self.viewer.row(evt);

        on.emit(_self.domNode, 'ItemDblClick', {
          item_path: row.data.path,
          item: row.data,
          bubbles: true,
          cancelable: true
        });
      });

      this.viewer.on('dgrid-select', function (evt) {
        // console.log('dgrid-select: ', evt);
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self.viewer,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'select', newEvt);
      });
      this.viewer.on('dgrid-deselect', function (evt) {
        // console.log("dgrid-select");
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self.viewer,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'deselect', newEvt);
      });
      this.addChild(this.viewHeader);
      this.addChild(this.viewer);
      this.inherited(arguments);
      this.viewer.refresh();
    }
  });
});
