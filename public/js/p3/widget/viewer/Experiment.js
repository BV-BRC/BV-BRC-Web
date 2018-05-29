define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  '../Grid', '../formatter', '../../WorkspaceManager', 'dojo/_base/lang'
], function (
  declare, BorderContainer, on,
  domClass, ContentPane, domConstruct,
  Grid, formatter, WorkspaceManager, lang
) {
  return declare([BorderContainer], {
    baseClass: 'ExperimentViewer',
    disabled: false,
    query: null,
    data: null,
    containerType: 'experiment',
    getExperimentId: function () {
      return (this.data.path + this.data.name);
    },
    isSummaryView: function () {
      return true;
    },
    _setDataAttr: function (data) {
      this.data = data;
      this._hiddenPath = data.path + '.' + data.name;

      WorkspaceManager.getFolderContents(this._hiddenPath, false, false, false).then(lang.hitch(this, function (paths) {
        var filtered = paths.filter(function (f) {
          // console.log("Filtering f: ", f);
          // if(f instanceof Array){
          //   var path = f[0];
          // }else{
          //   path = f;
          // }
          if ('path' in f && f.path.match('sample.json')) {
            return true;
          }
          if ('path' in f && f.path.match('experiment.json')) {
            return true;
          }
          return false;
        }).map(function (f) {
          return f.path;
        });
        filtered.sort();

        // console.log("Experiment Sub Paths: ", paths);

        WorkspaceManager.getObjects(filtered).then(lang.hitch(this, function (objs) {
          objs.forEach(function (obj) {
            if (typeof obj.data == 'string') {
              obj.data = JSON.parse(obj.data);
            }
          });
          this.experiment = objs[0].data;
          this.samples = objs[1].data.sample;
          // this.samples.forEach(function(s){ s.type="experiment_sample" });
          console.log('Got sample Data: ', objs[1]);
          var content = ['Platform Organism: ' + (this.experiment.organism || 'Undefined') + ' Pubmed ID: ' + (this.experiment.pubmed || 'Undefined') + ' <br>'];
          content.push('Genes Mapped/Genes Total: ' + (this.experiment.geneTotal - this.experiment.genesMissed) + '/' + this.experiment.geneTotal + ' Samples: ' + this.experiment.samples + '<br>');
          content.push(this.experiment.description);
          this.viewHeader.set('content', content.join(''));
          this.viewer.renderArray(this.samples);

        }));
      }));

    },
    startup: function () {
      if (this._started) {
        return;
      }
      this.viewHeader = new ContentPane({ content: 'Loading Experiment...<br><br>', region: 'top' });
      this.viewer = new Grid({
        region: 'center',
        deselectOnRefresh: true,
        columns: {
          title: { label: 'Title', field: 'expname' },
          genes: { label: 'Genes', field: 'genes' },
          sigGenesLR: { label: 'Significant Genes (Log Ratio)', field: 'sig_log_ratio' },
          sigGenesZS: { label: 'Significant Genes (Z Score)', field: 'sig_z_score' },
          strain: { label: 'Strain', field: 'organism' },
          gene_modification: { label: 'Gene Modification', field: 'mutant' },
          expCondition: { label: 'Experiment Condition', field: 'condition' },
          timePoint: { label: 'Time Point', field: 'timepoint' }
        }
      });
      var _self = this;
      this.viewer.on('.dgrid-content .dgrid-row:dblclick', function (evt) {
        var row = _self.viewer.row(evt);
        console.log('dblclick row:', row);
        on.emit(_self.domNode, 'ItemDblClick', {
          item_path: row.data.path,
          item: row.data,
          bubbles: true,
          cancelable: true
        });
        console.log('after emit');
      });
      // _selection={};
      // Topic.publish("/select", []);

      this.viewer.on('dgrid-select', function (evt) {
        console.log('dgrid-select: ', evt);
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self.viewer,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'select', newEvt);
        // console.log("dgrid-select");
        // var rows = event.rows;
        // Object.keys(rows).forEach(function(key){ _selection[rows[key].data.id]=rows[key].data; });
        // var sel = Object.keys(_selection).map(function(s) { return _selection[s]; });
        // Topic.publish("/select", sel);
      });
      this.viewer.on('dgrid-deselect', function (evt) {
        console.log('dgrid-select');
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self.viewer,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'deselect', newEvt);

        //                                      var rows = event.rows;
        //                                      Object.keys(rows).forEach(function(key){ delete _selection[rows[key].data.id] });
        //                                      var sel = Object.keys(_selection).map(function(s) { return _selection[s]; });
        //                                      Topic.publish("/select", sel);
      });
      this.addChild(this.viewHeader);
      this.addChild(this.viewer);
      this.inherited(arguments);
      this.viewer.refresh();
    }
  });
});
