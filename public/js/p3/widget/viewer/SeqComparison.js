define([
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
    get_object_metadata: async function(paths) {
      var objs = [];
      for (path of paths)
      {
	try {
	  var obj = await WorkspaceManager.getObject([path], true);
	  objs.push(obj);
	} catch (e) {
	}
      }
      return objs;
    },
    _setDataAttr: function (data) {
      this.data = data;

      if (data.autoMeta.parameters.output_path != data.path)
      {
	// console.log("Rewrite data path from", data.autoMeta.parameters.output_path, "to", data.path);
	  
	for (outfile of data.autoMeta.output_files)
	{
	  outfile[0] = outfile[0].replace(new RegExp('^' + data.autoMeta.parameters.output_path), data.path);
	}
      }

      // console.log("job result viewer data: ", data);

      //
      // Retrieve info on all our supported output files
      //
      var files = ['circos_final.html', 'circos.svg', 'genome_comparison.json'];
      var paths = files.map(function(f) { return data.path + "/." + data.name + "/" + f });
      this.get_object_metadata(paths).then(lang.hitch(this, function(objs) {
        this._resultObjects = objs;
        console.log("got objects: ", objs);
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
