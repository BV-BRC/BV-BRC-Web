define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  '../PageGrid', '../formatter', '../../WorkspaceManager', 'dojo/_base/lang',
  'dojo/dom-attr', '../WorkspaceExplorerView', 'dijit/Dialog', '../../util/encodePath',
  'dojo/topic'
], function (
  declare, BorderContainer, on,
  domClass, ContentPane, domConstruct,
  Grid, formatter, WorkspaceManager, lang,
  domAttr, WorkspaceExplorerView, Dialog, encodePath, topic
) {
  // Types that can be navigated to (folders, job results, etc.)
  var navigableTypes = [
    'folder', 'job_result', 'parentfolder',
    'genome_group', 'feature_group', 'experiment_folder',
    'experiment_group'
  ];
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
      var _self = this;

      // Check if autoMeta has the required job data (parameters, output_files, app)
      // If not, we need to read the actual job_result file content
      if (!data.autoMeta || !data.autoMeta.parameters) {
        // autoMeta is incomplete - read the actual file content
        var filePath = data.path + data.name;
        WorkspaceManager.getObject(filePath, false).then(function (result) {
          // result.data contains the JSON content of the job_result file
          var jobData;
          try {
            if (typeof result.data === 'string') {
              jobData = JSON.parse(result.data);
            } else {
              jobData = result.data;
            }
          } catch (e) {
            console.error('Error parsing job result file:', e);
            new Dialog({
              content: 'Error loading job result data. The job result file may be corrupted.',
              title: 'Error Loading Job Result',
              style: 'width: 300px !important;'
            }).show();
            return;
          }

          // Merge the parsed job data into autoMeta
          data.autoMeta = lang.mixin(data.autoMeta || {}, jobData);

          // Now continue with normal processing
          _self._processJobData(data);
        }, function (err) {
          console.error('Error reading job result file:', err);
          new Dialog({
            content: 'Error loading job result data. The job result file could not be read.',
            title: 'Error Loading Job Result',
            style: 'width: 300px !important;'
          }).show();
        });
      } else {
        // autoMeta has the required data, process normally
        this._processJobData(data);
      }
    },

    _processJobData: function (data) {
      var _self = this;

      // console.log("[JobResult] data: ", data);
      if (data.autoMeta.parameters && data.autoMeta.parameters.output_path && data.autoMeta.parameters.output_path != data.path)
      {
        // console.log("Rewrite data path from", data.autoMeta.parameters.output_path, "to", data.path);

        // Escape special regex characters in the path to avoid "Invalid regular expression" errors
        // when paths contain characters like ), (, [, ], etc.
        var escapedPath = data.autoMeta.parameters.output_path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        if (data.autoMeta.output_files) {
          for (var outfile of data.autoMeta.output_files)
          {
            outfile[0] = outfile[0].replace(new RegExp('^' + escapedPath), data.path);
          }
        }
      }
      this._hiddenPath = data.path + '.' + data.name;
      // console.log("[JobResult] Output Files: ", this.data.autoMeta.output_files);

      // Create the viewer now that _hiddenPath is set
      // Replace the placeholder if it exists
      if (this._viewerPlaceholder) {
        this.removeChild(this._viewerPlaceholder);
        this._viewerPlaceholder.destroyRecursive();
        this._viewerPlaceholder = null;
      }

      // Create viewHeader if it doesn't exist yet (async path runs before startup)
      if (!this.viewHeader) {
        this.viewHeader = new ContentPane({ content: 'Loading data from ' + this.data.name + ' job file.', region: 'top', style: 'width:90%;height:30%;' });
        this.addChild(this.viewHeader);
      }

      this.viewer = new WorkspaceExplorerView({ region: 'center', path: this._hiddenPath });
      this.addChild(this.viewer);

      // Force a resize to ensure proper layout after adding the viewer
      this.resize();

      // Handle double-click on items to navigate to them
      // Use on() directly on the domNode since the event bubbles up from WorkspaceGrid
      on(this.viewer.domNode, 'ItemDblClick', lang.hitch(this, function (evt) {
        if (evt.item && evt.item.type && navigableTypes.indexOf(evt.item.type) >= 0) {
          topic.publish('/navigate', { href: '/workspace' + encodePath(evt.item_path) });
        }
      }));

      // Publish the job result data so Copilot and other modules can access it
      topic.publish('Copilot/JobResultReady', data);

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

      // Only create placeholder if we haven't already processed the job data
      // (which can happen in async path before startup is called)
      if (!this.viewer) {
        this.viewHeader = new ContentPane({ content: 'Loading data from ' + this.data.name + ' job file.', region: 'top', style: 'width:90%;height:30%;' });
        this.addChild(this.viewHeader);

        // The viewer will be created in _processJobData after _hiddenPath is set
        // This handles both sync and async paths
        // Note: Don't add placeholder text here - the viewHeader already shows loading status
        // Adding text in the center region causes overlap issues when autoMeta is missing
        this._viewerPlaceholder = new ContentPane({ content: '', region: 'center' });
        this.addChild(this._viewerPlaceholder);
      }

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
