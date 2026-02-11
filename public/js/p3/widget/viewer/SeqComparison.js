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

    get_object_metadata: async function (paths) {
      var objs = [];
      for (let path of paths) {
        try {
          var obj = await WorkspaceManager.getObject(path, true);
          objs.push(obj);
        } catch (e) {
          console.warn("Failed to load:", path, e);
        }
      }
      return objs;
    },

    _setDataAttr: function (data) {
      this.data = data;

      if (data.autoMeta &&
          data.autoMeta.parameters &&
          data.autoMeta.parameters.output_path &&
          data.autoMeta.parameters.output_path !== data.path) {

        for (let outfile of data.autoMeta.output_files || []) {
          outfile[0] = outfile[0].replace(
            new RegExp('^' + data.autoMeta.parameters.output_path),
            data.path
          );
        }
      }

      let decodedParts = data.path
        .split('/')
        .filter(Boolean)
        .map(p => decodeURIComponent(p));

      let decodedPath = '/' + decodedParts.join('/');

      let basePath = decodedPath.replace(/\/$/, '') + '/.' + decodeURIComponent(data.name);

      //
      // Expected output files
      //
      var files = ['circos_final.html', 'circos.svg', 'genome_comparison.json'];

      var paths = files.map(function (f) {
        return basePath + '/' + f;
      });

      console.log("SeqComparison decoded paths:", paths);

      this.get_object_metadata(paths).then(lang.hitch(this, function (objs) {
        this._resultObjects = objs.filter(Boolean);
        console.log("got objects:", this._resultObjects);
        this.refresh();
      }));
    },

    refresh: function () {
      if (!this._resultObjects || !this._resultObjects.length) return;

      this._resultObjects.some(function (obj) {
        if (obj && obj.name === 'circos_final.html') {

          const fullPath = obj.path.replace(/\/$/, '') + '/' + obj.name;

          console.log("Fetching full HTML from:", fullPath);

          // IMPORTANT: use "false" to get file content
          WorkspaceManager.getObject(fullPath, false)
            .then(lang.hitch(this, function (file) {
              console.log("HTML file object:", file);
              this.viewer.set('content', file.data);
            }))
            .catch(function (err) {
              console.error("Failed to fetch HTML:", err);
            });

          return true;
        }
        return false;
      }, this);
    },

    startup: function () {
      if (this._started) return;

      this.inherited(arguments);

      this.viewer = new ContentPane({
        content: 'Loading Job Results...',
        region: 'center'
      });

      this.addChild(this.viewer);

      this.on('i:click', function (evt) {
        var rel = domAttr.get(evt.target, 'rel');
        if (rel) {
          WorkspaceManager.downloadFile(rel);
        } else {
          console.warn('link not found:', rel);
        }
      });
    }
  });
});
