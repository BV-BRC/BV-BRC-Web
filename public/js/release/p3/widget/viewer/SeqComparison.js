define("p3/widget/viewer/SeqComparison", [
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  '../PageGrid', '../formatter', '../../WorkspaceManager', 'dojo/_base/lang',
  'dojo/dom-attr'
], function (
  declare, BorderContainer, on,
  domClass, ContentPane, domConstruct,
  Grid, formatter, WorkspaceManager, lang,
  domAttr
) {
  return declare([BorderContainer], {
    baseClass: 'ExperimentViewer',
    disabled: false,
    query: null,
    data: null,
    containerType: 'job_result',
    _resultType: null,
    _jobOut: {
      start_time: { label: 'Start time', format: formatter.epochDate },
      elapsed_time: { label: 'Run time', format: formatter.runTime },
      end_time: { label: 'End time', format: formatter.epochDate },
      parameters: { label: 'Parameters', format: JSON.stringify }
    },
    _jobOrder: ['start_time', 'end_time', 'elapsed_time', 'parameters'],
    _appLabel: '',
    _resultMetaTypes: {},
    _autoLabels: {},
    getComparisonId: function () {
      return (this.data.path + this.data.name);
    },
    isSummaryView: function () {
      return true;
    },
    _setDataAttr: function (data) {
      this.data = data;
      // console.log("job result viewer data: ", data);
      var paths = this.data.autoMeta.output_files.filter(function (o) {
        // console.log("o[0]:", o[0]);
        return (o[0].indexOf('circos_final.html') >= 0) || (o[0].indexOf('circos.svg') >= 0) || (o[0].indexOf('genome_comparison.json') >= 0);

      }).map(function (o) {
        return o[0];
      });

      WorkspaceManager.getObjects(paths, true).then(lang.hitch(this, function (objs) {
        this._resultObjects = objs;
        // console.log("got objects: ", objs);
        this.refresh();
      }));

    },
    refresh: function () {
      if (this.data) {
        // console.log("view resultsObjects:  ", this._resultObjects);
        this._resultObjects.some(function (obj) {
          if (obj.name == 'circos_final.html') {
            WorkspaceManager.getObject(obj.path + obj.name).then(lang.hitch(this, function (obj) {
              // console.log("Circos HTML Object: ", obj);
              this.viewer.set('content', obj.data);
            }));
          }
        }, this);
      }
    },
    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this.viewer = new ContentPane({ content: 'Loading Job Results...', region: 'center' });
      // this.viewer= new ContentPane({content: "", region: "center"});
      // this.addChild(this.viewHeader);
      this.addChild(this.viewer);

      this.on('i:click', function (evt) {
        var rel = domAttr.get(evt.target, 'rel');
        if (rel) {
          WorkspaceManager.downloadFile(rel);
        } else {
          console.warn('link not found: ', rel);
        }
      });
    }
  });
});
