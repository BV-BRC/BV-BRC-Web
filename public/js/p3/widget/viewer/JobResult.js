define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  '../PageGrid', '../formatter', '../../WorkspaceManager', 'dojo/_base/lang',
  'dojo/dom-attr', '../WorkspaceExplorerView', 'dijit/Dialog', '../../util/encodePath'
], function (
  declare, BorderContainer, on,
  domClass, ContentPane, domConstruct,
  Grid, formatter, WorkspaceManager, lang,
  domAttr, WorkspaceExplorerView, Dialog, encodePath
) {
  return declare([BorderContainer], {
    baseClass: 'ExperimentViewer',
    disabled: false,
    query: null,
    data: null,
    containerType: 'job_result',
    _resultType: null,
    _jobOut: {
      id: { label: 'Job ID' },
      start_time: { label: 'Start time', format: formatter.epochDate },
      end_time: { label: 'End time', format: formatter.epochDate },
      elapsed_time: { label: 'Run time', format: formatter.runTime },
      parameters: {
        label: 'Parameters',
        format: function (d) {
          if (Object.prototype.hasOwnProperty.call(d, 'ustring')) {
            d.ustring = JSON.parse(d.ustring);
          }
          return '<pre style="font-size:.8em; overflow: scroll;">' + JSON.stringify(d, null, 2) + '</pre>';
        }
      }
    },
    _jobOrder: ['id', 'start_time', 'end_time', 'elapsed_time', 'parameters'],
    _appLabel: '',
    _resultMetaTypes: {},
    _autoLabels: {},
    _setDataAttr: function (data) {
      this.data = data;
      // console.log("[JobResult] data: ", data);
      if (data.autoMeta.parameters.output_path != data.path)
      {
        // console.log("Rewrite data path from", data.autoMeta.parameters.output_path, "to", data.path);

        for (outfile of data.autoMeta.output_files)
        {
          outfile[0] = outfile[0].replace(new RegExp('^' + data.autoMeta.parameters.output_path), data.path);
        }
      }
      this._hiddenPath = data.path + '.' + data.name;
      // console.log("[JobResult] Output Files: ", this.data.autoMeta.output_files);
      var _self = this;

      // check to see if there's a hidden .folder with the actual data
      WorkspaceManager.getObject(this._hiddenPath, true).otherwise(function (err) {
        new Dialog({
          content: "No output from this job was found in the <i>'." + _self.data.name + "'</i> folder. "
            + 'If you moved the job result file from another location, please ensure you '
            + 'have also moved the accomanying folder to this location.',
          title: 'Error Loading Job Result',
          style: 'width: 300px !important;'
        }).show();
      });

      // get the contents directly from the hidden folder, since metadata may be stale after a move
      WorkspaceManager.getFolderContents(this._hiddenPath, true, false)
        .then(function (objs) {
          _self._resultObjects = objs;
          _self.setupResultType();
          _self.refresh();
        });

    },
    isSummaryView: function () {
      return false;
    },
    setupResultType: function () {
      // console.log("[JobResult] setupResultType()");
      if (this.data.autoMeta.app.id) {
        this._resultType = this.data.autoMeta.app.id;
        // console.log("[JobResult] _resultType:",this._resultType);
      }
      //      if (this._resultType == 'GenomeAssembly') {
      //        this._appLabel = 'Genome Assembly';
      //      }
      //      else {
      this._appLabel = this._resultType;
      //      }
    },
    getExtraMetaDataForHeader: function (job_output) {
      return job_output;
    },
    refresh: function () {
      // console.log("[JobResult] refresh()");
      if (this.data) {
        var jobHeader = '<div style="width:100%"><div style="width:100%;" ><h3 style="color:#888;font-size:1.3em;font-weight:normal;" class="normal-case close2x"><span style="" class="wrap">';
        if (this.data.autoMeta && this.data.autoMeta.app) {
          jobHeader = jobHeader + this._appLabel + ' ';
        }
        jobHeader += 'Job Result</span></h3>';
        // this.viewer.set('content',jobHeader);

        var output = [];
        output.push(jobHeader + '<table style="width:90%" class="p3basic striped far2x" id="data-table"><tbody>');
        var job_output = [];

        // add extra metadata header lines
        job_output = this.getExtraMetaDataForHeader(job_output);

        this._jobOrder.forEach(function (prop) {
          /* if (prop=="output_files") { return; }
          if (prop=="app") { return; }
          if (prop=="job_output") { return; }
          if (prop=="hostname") { return; } */
          if (!this.data.autoMeta[prop]) {
            return;
          }

          if (Object.prototype.hasOwnProperty.call(this._jobOut, prop)) {
            // this._jobOut[prop]["value"]=this.data.autoMeta[prop];
            // var tableLabel = this._jobOut[prop].hasOwnProperty('label') ? this._jobOut[prop].label : prop;
            var tableValue = Object.prototype.hasOwnProperty.call(this._jobOut[prop], 'format') ? this._jobOut[prop].format(this.data.autoMeta[prop]) : this.data.autoMeta[prop];
            if (prop == 'parameters') {
              job_output.push('<tr class="alt"><td class="last" colspan=2><div data-dojo-type="dijit/TitlePane" data-dojo-props="title: \'Parameters\', open:false">' + tableValue + '</div></td></tr>');
            } else {
              job_output.push('<tr class="alt"><th scope="row" style="width:20%"><b>' + this._jobOut[prop].label + '</b></th><td class="last">' + tableValue + '</td></tr>');
            }
          }
        }, this);
      }

      output.push.apply(output, job_output);
      output.push('</tbody></table></div>');

      // if (this.data.userMeta) {
      //   Object.keys(this.data.userMeta).forEach(function (prop) {
      //     output.push('<div>' + prop + ': ' + this.data.userMeta[prop] + '</div>');
      //   }, this);
      // }

      output.push('</div>');
      this.viewHeader.set('content', output.join(''));
      this.resize();
    },
    startup: function () {
      if (this._started) {
        return;
      }

      this.inherited(arguments);
      this.viewHeader = new ContentPane({ content: 'Loading data from ' + this.data.name + ' job file.', region: 'top', style: 'width:90%;height:30%;' });
      this.viewer = new WorkspaceExplorerView({ region: 'center', path: encodePath(this._hiddenPath) });
      this.addChild(this.viewHeader);
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
