define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic', 'dojo/dom-construct',
  'dojo/query', 'dojo/when', 'dojo/request', 'dijit/layout/ContentPane',
  'dijit/layout/BorderContainer', 'dijit/TooltipDialog', 'dijit/Dialog', 'dijit/popup',
  'dijit/form/Select', 'dijit/form/Button', './ContainerActionBar',
  './HeatmapContainerNew', './SelectionToGroup', 'FileSaver', '../store/SubsystemMapMemoryStore',
  'heatmap/dist/hotmap'
], function (
  declare, lang,
  on, Topic, domConstruct, Query, when, request,
  ContentPane, BorderContainer, TooltipDialog, Dialog, popup,
  Select, Button, ContainerActionBar,
  HeatmapContainerNew, SelectionToGroup, saveAs, Store,
  Hotmap
) {

  return declare([BorderContainer, HeatmapContainerNew], {
    gutters: false,
    state: null,
    visible: false,
    pmState: null,
    region: 'center',
    clusterHeaderDictionary: {},
    query: (this.query || ''),
    store: null,
    hasBeenClustered: false,
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataServiceURL,
    containerActions: [
      [
        'Flip Axis',
        'fa icon-rotate-left fa-2x',
        { label: 'Flip Axis', multiple: false, validTypes: ['*'] },
        function () {
          // flip internal flag
          if (this.pmState.heatmapAxis === '') {
            this.pmState.heatmapAxis = 'Transposed';
          } else {
            this.pmState.heatmapAxis = '';
          }

          Topic.publish('SubSystemMap', 'refreshHeatmap');
          this.chart.flipScaling();
        },
        true
      ],
      [
        'Sorting',
        'fa icon-newspaper fa-2x',
        {
          label: 'Sorting',
          multiple: false,
          validType: ['*'],
          tooltip: 'Sort alphabetically or taxonomically'
        },
        function () {

          // dialog for anchoring
          // if(this.containerActionBar._actions.Sorting.options.tooltipDialog == null){
          this.tooltip_sorting = new TooltipDialog({
            content: this._buildPanelSorting()
          });
          this.containerActionBar._actions.Sorting.options.tooltipDialog = this.tooltip_sorting;
          // }

          if (this.isPopupOpen) {
            this.isPopupOpen = false;
            popup.close();
          } else {
            popup.open({
              parent: this,
              popup: this.containerActionBar._actions.Sorting.options.tooltipDialog,
              around: this.containerActionBar._actions.Sorting.button,
              orient: ['below']
            });
            this.isPopupOpen = true;
          }
        },
        true
      ],
      [
        'Cluster',
        'fa icon-cluster fa-2x',
        { label: 'Cluster', multiple: false, validTypes: ['*'] },
        'cluster',
        true
      ],
      [
        'SaveSVG',
        'fa icon-download fa-2x',
        {
          label: 'Save',
          multiple: false,
          validType: ['*'],
          tooltip: 'Download heat map'
        },
        function () {
          this.tooltip_anchoring = new TooltipDialog({
            style: 'width: 200px;',
            content: this._buildPanelSaveSVG()
          });
          this.containerActionBar._actions.SaveSVG.options.tooltipDialog = this.tooltip_anchoring;

          if (this.isPopupOpen) {
            this.isPopupOpen = false;
            popup.close();
          } else {
            popup.open({
              parent: this,
              popup: this.containerActionBar._actions.SaveSVG.options.tooltipDialog,
              around: this.containerActionBar._actions.SaveSVG.button,
              orient: ['below']
            });
            this.isPopupOpen = true;
          }
        },
        true
      ]
    ],
    constructor: function () {
      this.dialog = new Dialog({});

      // subscribe
      var self = this;
      Topic.subscribe('SubSystemMap', function () {
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updatePmState':
            console.log('1) called updatepm state');
            self.pmState = value;
            break;
          case 'refreshHeatmap':
            console.log('2) called refresh heatmap');
            Topic.publish('SubSystemMap', 'requestHeatmapData', self.pmState);
            break;
          case 'heatmapOrdering':
            if (Object.prototype.hasOwnProperty.call(self, 'originalPmState') ) {
              Topic.publish('SubSystemMap', 'requestHeatmapData', self.originalPmState);
            } else {
              Topic.publish('SubSystemMap', 'requestHeatmapData', self.pmState);
            }
            break;
          case 'updateHeatmapData':
            console.log('3) called updateheatmapdata');
            self.currentData = value;

            self.hmapUpdate();

            break;
          default:
            break;
        }
      });
    },

    _buildPanelSorting: function () {

      var self = this;
      var options = [{ value: '', label: 'Select Sorting' }, { value: 'taxonomical', label: 'Taxonomical' }, { value: 'alphabetical', label: 'Alphabetical' }];

      var anchor = new Select({
        name: 'anchor',
        options: options
      });
      anchor.on('change', lang.hitch(this, function (sorting) {

        if (sorting === 'alphabetical') {
          this.state.display_alphabetically = true;
          Topic.publish('SubSystemMap', 'heatmapOrdering');
          popup.close(self.tooltip_sorting);
        }

        else if (sorting === 'taxonomical') {
          this.state.display_alphabetically = false;
          Topic.publish('SubSystemMap', 'heatmapOrdering');
          popup.close(self.tooltip_sorting);
        }

      }));

      return anchor;
    },

    _setVisibleAttr: function (visible) {
      this.visible = visible;

      if (this.visible && !this._firstView) {
        this.onFirstView();
        this.hmapDom = this.initializeHeatmap();

        setTimeout(function () {
          Topic.publish('SubSystemMap', 'refreshHeatmap');
        }, 3000);
      }
    },
    onFirstView: function () {

      if (this._firstView) {
        return;
      }

      // action buttons for heatmap viewer
      this.containerActionBar = new ContainerActionBar({
        baseClass: 'BrowserHeader',
        region: 'top',
        style: 'padding:0'
      });

      this.addChild(new ContentPane({
        region: 'center',
        content: "<div id='heatmapTarget'></div>",
        style: 'padding:0'
      }));

      this.inherited(arguments);
      this._firstView = true;

      console.log('SubsystemMapHeatmapContainer > this.state', this.state);
      this._setState(this.state);
    },

    hmapCellClicked: function (colID, rowID) {
      var isTransposed = (this.pmState.heatmapAxis === 'Transposed');
      var originalAxis = this._getOriginalAxis(isTransposed, colID, rowID);

      var roleId = '"' + originalAxis.columnIds + '"';
      var genomeId = originalAxis.rowIds;

      var that = this;

      var query = 'q=role_id:(' + roleId + ') AND genome_id:(' + genomeId + ')&rows=25000';

      return when(request.post(window.App.dataAPI + 'subsystem/', {
        handleAs: 'json',
        headers: {
          Accept: 'application/solr+json',
          'Content-Type': 'application/solrquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: window.App.authorizationToken
        },
        data: query
      }), function (response) {
        var featureSet = {};
        response.response.docs.forEach(function (d) {
          if (!Object.prototype.hasOwnProperty.call(featureSet, d.feature_id)) {
            featureSet[d.feature_id] = true;
          }
        });
        var features = Object.keys(featureSet);

        that.dialog.set('content', that._buildPanelCellClicked(isTransposed, roleId, genomeId, features));
        var actionBar = that._buildPanelButtons(colID, rowID, roleId, genomeId, features);
        domConstruct.place(actionBar, that.dialog.containerNode, 'last');

        that.dialog.show();
      });
    },

    hmapCellsSelected: function (colIDs, rowIDs) {
      if (rowIDs.length == 0) return;
      var isTransposed = (this.pmState.heatmapAxis === 'Transposed');
      var originalAxis = this._getOriginalAxis(isTransposed, colIDs, rowIDs);

      var that = this;

      var roleIds = originalAxis.columnIds;
      var genomeIds = originalAxis.rowIds;

      var roleIdsQuotes = roleIds.map(function (role) {
        return '"' + role + '"';
      });

      var query = 'q=role_id:(' + roleIdsQuotes.join(' OR ') + ') AND genome_id:(' + genomeIds.join(' OR ') + ')&rows=25000';

      return when(request.post(window.App.dataAPI + 'subsystem/', {
        handleAs: 'json',
        headers: {
          Accept: 'application/solr+json',
          'Content-Type': 'application/solrquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: window.App.authorizationToken
        },
        data: query
      }), function (response) {
        Topic.publish('SubSystemMap', 'hideLoadingMask');

        var featureSet = {};
        response.response.docs.forEach(function (d) {
          if (!Object.prototype.hasOwnProperty.call(featureSet, d.feature_id)) {
            featureSet[d.feature_id] = true;
          }
        });
        var features = Object.keys(featureSet);

        that.dialog.set('content', that._buildPanelCellsSelected(isTransposed, roleIds, genomeIds, features));
        var actionBar = that._buildPanelButtons(colIDs, rowIDs, roleIds, genomeIds, features);
        domConstruct.place(actionBar, that.dialog.containerNode, 'last');

        that.dialog.show();
      });
    },

    maxPatricIDsShown: 10,
    _buildPanelCellClicked: function (isTransposed, roleId, genomeId, features) {

      var gfs = this.pmState.genomeFilterStatus;

      var genomeName = gfs[genomeId].getLabel();

      var text = [];

      var patricIds = [];
      var extraFeaturesLength = features.length - this.maxPatricIDsShown;

      if (features.length > this.maxPatricIDsShown) {
        for (var i = 0; i < this.maxPatricIDsShown; i++) {
          patricIds.push(features[i]);
        }
        patricIds.push(extraFeaturesLength + ' more');
      } else {
        patricIds = features;
      }

      var cleanRoleName = roleId.replace(/_/g, ' ');
      text.push('<b>Genome:</b> ' + genomeName);
      // text.push('<b>Product:</b> ' + description);
      text.push('<b>Role ID:</b> ' + cleanRoleName);
      text.push('<b>BRC IDs:</b> ' + patricIds.join(', '));
      text.push('<b>Members:</b> ' + features.length);

      return text.join('<br>');
    },
    _buildPanelCellsSelected: function (isTransposed, roleIds, genomeIds, features) {

      var text = [];
      text.push('<b>Genomes Selected:</b> ' + genomeIds.length);
      text.push('<b>Roles Selected:</b> ' + roleIds.length);
      text.push('<b>Members:</b> ' + features.length);

      return text.join('<br>');
    },
    _buildPanelButtons: function (colIDs, rowIDs, ecNumbers, genomeIds, features) {
      var _self = this;
      var featureIds = (typeof (features[0]) === 'string') ? features.join(',') : features.map(function (d) { return d.feature_id; }).join(',');

      var actionBar = domConstruct.create('div', {
        'class': 'dijitDialogPaneActionBar'
      });
      var dhc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div>';
      var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
      var downloadHM = new TooltipDialog({
        content: dhc,
        onMouseLeave: function () {
          popup.close(downloadHM);
        }
      });
      var downloadPT = new TooltipDialog({
        content: dfc,
        onMouseLeave: function () {
          popup.close(downloadPT);
        }
      });

      var btnDownloadHeatmap = new Button({
        label: 'Download Heatmap Data'
      });
      on(downloadHM.domNode, 'click', function (e) {
        if (e.target.attributes.rel === undefined) return;
        var rel = e.target.attributes.rel.value;
        var DELIMITER,
          ext;
        if (rel === 'text/csv') {
          DELIMITER = ',';
          ext = 'csv';
        } else {
          DELIMITER = '\t';
          ext = 'txt';
        }

        var colIndexes = [];
        _self.currentData.columns.forEach(function (col, idx) {
          if (colIDs.indexOf(col.colID) > -1) {
            colIndexes[colIDs.indexOf(col.colID)] = idx;
          }
        });

        var header = _self.currentData.rowLabel + '/' + _self.currentData.colLabel;
        colIndexes.forEach(function (colIdx) {
          header += DELIMITER + _self.currentData.columns[colIdx].colLabel;
        });

        var data = [];
        _self.currentData.rows.forEach(function (row, idx) {
          if (rowIDs.indexOf(row.rowID) > -1) {
            var r = [];
            r.push('"' + row.rowLabel + '"');
            colIndexes.forEach(function (colIdx) {
              var val = parseInt(_self.currentData.columns[colIdx].distribution.substr(idx * 2, 2), 16);
              r.push(val);
            });
            data[rowIDs.indexOf(row.rowID)] = r.join(DELIMITER);
          }
        });

        saveAs(new Blob([header + '\n' + data.join('\n')], { type: rel }), 'BVBRC_subsystem_map_heatmap.' + ext);
        popup.close(downloadHM);
      });
      on(btnDownloadHeatmap.domNode, 'click', function () {
        popup.open({
          popup: downloadHM,
          around: btnDownloadHeatmap.domNode,
          orient: ['below']
        });
      });

      var btnDownloadProteins = new Button({
        label: 'Download Proteins',
        disabled: (featureIds.length === 0)
      });
      on(downloadPT.domNode, 'click', function (e) {
        if (e.target.attributes.rel === undefined) return;
        var rel = e.target.attributes.rel.value;
        var currentQuery = '?in(feature_id,(' + featureIds + '))&sort(+feature_id)';

        window.open(window.App.dataServiceURL + '/genome_feature/' + currentQuery + '&http_authorization=' + encodeURIComponent(window.App.authorizationToken) + '&http_accept=' + rel + '&http_download=true');
        popup.close(downloadPT);
      });

      on(btnDownloadProteins.domNode, 'click', function () {
        popup.open({
          popup: downloadPT,
          around: btnDownloadProteins.domNode,
          orient: ['below']
        });
      });

      var btnShowDetails = new Button({
        label: 'Show Proteins',
        disabled: (featureIds.length === 0)
      });
      on(btnShowDetails.domNode, 'click', function () {
        Topic.publish('/navigate', { href: '/view/FeatureList/?in(feature_id,(' + featureIds + '))#view_tab=features', target: 'blank' });

        _self.dialog.hide();
      });

      var btnAddToWorkspace = new Button({
        label: 'Add Proteins to Group',
        disabled: (featureIds.length === 0)
      });
      on(btnAddToWorkspace.domNode, 'click', function () {
        if (!window.App.user || !window.App.user.id) {
          Topic.publish('/login');
          return;
        }

        var dlg = new Dialog({ title: 'Add This Feature To Group' });
        var stg = new SelectionToGroup({
          selection: features.map(function (f) { return { feature_id: f }; }),
          type: 'feature_group'
        });
        on(dlg.domNode, 'dialogAction', function (evt) {
          dlg.hide();
          setTimeout(function () {
            dlg.destroy();
          }, 2000);
        });
        domConstruct.place(stg.domNode, dlg.containerNode, 'first');
        stg.startup();
        dlg.startup();
        dlg.show();
      });

      var btnCancel = new Button({
        label: 'Cancel',
        onClick: function () {
          _self.dialog.hide();
        }
      });

      btnDownloadHeatmap.placeAt(actionBar);
      btnDownloadProteins.placeAt(actionBar);
      btnShowDetails.placeAt(actionBar);
      btnAddToWorkspace.placeAt(actionBar);
      btnCancel.placeAt(actionBar);

      return actionBar;
    },
    _getOriginalAxis: function (isTransposed, columnIds, rowIds) {
      var originalAxis = {};
      if (isTransposed) {
        originalAxis.columnIds = rowIds;
        originalAxis.rowIds = columnIds;
      } else {
        originalAxis.columnIds = columnIds;
        originalAxis.rowIds = rowIds;
      }
      return originalAxis;
    },

    _setApiServer: function (server) {
      this.apiServer = server;
    },
    _setState: function (state) {
      if (!this.store) {
        this.set('store', this.createStore(this.apiServer, this.apiToken || window.App.authorizationToken, state));
      } else {
        this.store.set('state', state);
        this.refresh();
      }
    },
    _setSort: function (sort) {
      this.inherited(arguments);
      this.store.sort = sort;
    },
    createStore: function (server, token, state) {

      var store = new Store({
        token: token,
        apiServer: this.apiServer || window.App.dataServiceURL,
        state: state || this.state
      });
      // store.watch('refresh', lang.hitch(this, "refresh"));

      return store;
    },

    // override exportcurrent data to handle dashes in malformed role data by using a dictionary
    exportCurrentData: function (isTransposed) {
      // compose heatmap raw data in tab delimited format
      // this de-transpose (if it is transposed) so that cluster algorithm can be applied to a specific data type

      var that = this;

      var cols,
        rows,
        id_field_name,
        data_field_name,
        tablePass = [],
        header = [''];

      if (isTransposed) {
        cols = this.currentData.rows;
        rows = this.currentData.columns;
        id_field_name = 'rowID';
        data_field_name = 'colID';
      } else {
        cols = this.currentData.columns;
        rows = this.currentData.rows;
        id_field_name = 'colID';
        data_field_name = 'rowID';
      }

      for (var i = 0; i < cols.length; i++) {
        var columnKey = 'column' + i;
        that.clusterHeaderDictionary[columnKey] = cols[i][id_field_name];
      }

      for (var fakeColumnName in that.clusterHeaderDictionary) {
        // guard-for-in
        if (Object.prototype.hasOwnProperty.call(that.clusterHeaderDictionary, fakeColumnName)) {
          header.push(fakeColumnName);
        }
      }

      tablePass.push(header.join('\t'));

      for (var i = 0, iLen = rows.length; i < iLen; i++) {
        var r = [];
        r.push(rows[i][data_field_name]);

        for (var j = 0, jLen = cols.length; j < jLen; j++) {
          if (isTransposed) {
            r.push(parseInt(rows[i].distribution[j * 2] + rows[i].distribution[j * 2 + 1], 16));
          } else {
            r.push(parseInt(cols[j].distribution[i * 2] + cols[j].distribution[i * 2 + 1], 16));
          }
        }

        tablePass.push(r.join('\t'));
      }

      return tablePass.join('\n');
    },
    cluster: function (param) {
      var that = this;
      var p = param || { g: 2, e: 2, m: 'a' };

      var isTransposed = this.pmState.heatmapAxis === 'Transposed';

      if (!that.hasBeenClustered) {
        this.originalPmState = $.extend(true, {}, this.pmState);
      }

      var data = this.exportCurrentData(isTransposed);

      console.log('clustering data set size: ', data.length);
      if (data.length > 1500000) {
        new Dialog({
          title: 'Notice',
          content: 'The data set is too large to cluster. Please use filter panel to reduce the size',
          style: 'width: 300px'
        }).show();
        return;
      }

      Topic.publish(this.topicId, 'showLoadingMask');

      return when(window.App.api.data('cluster', [data, p]), lang.hitch(this, function (res) {

        that.hasBeenClustered = true;

        var columnNames = [];
        res.columns.forEach(function (column) {
          columnNames.push(that.clusterHeaderDictionary[column]);
        });

        // DO NOT TRANSPOSE. clustering process is based on the corrected axises
        this.pmState.clusterRowOrder = res.rows;
        this.pmState.clusterColumnOrder = columnNames;

        Topic.publish('SubSystemMap', 'updatePmState', this.pmState);

        // re-draw heatmap
        Topic.publish('SubSystemMap', 'refreshHeatmap');
      }), function (err) {

        Topic.publish('SubSystemMap', 'hideLoadingMask');

        new Dialog({
          title: err.status || 'Error',
          content: err.text || err
        }).show();
      });
    },

    hmapUpdate: function () {
      var self = this;
      console.log('heatmap data:', this.currentData);

      if (!this.currentData) return;
      var data = this.formatData(this.currentData);

      if (!this.chart) {
        var legendLabels = ['0', '1', '2', '3+'];

        this.chart = new Hotmap({
          ele: Query('#heatmapTarget')[0],
          cols: data.cols,
          rows: data.rows,
          matrix: data.matrix,
          rowsLabel: 'Genomes',
          colsLabel: 'Protein Families',
          color: {
            bins: ['=0', '=1', '=2', '>=3'],
            labels: legendLabels,
            colors: [0x000000, 16440142, 16167991, 16737843],
            altColors: [{
              bins: ['=0', '=1', '=2', '>=3'],
              labels: legendLabels,
              colors: [0xffffff, 0xfbe6e2, 0xffadad, 0xff0000]
            }]
          },
          options: {
            theme: 'light',
            maxFontSize: 13,
            hideOptions: true,
            useBoundingClient: true,
            rowLabelEllipsisPos: 1
          },
          onSelection: function (objs, rowIDs, colIDs) {
            self.hmapCellsSelected(colIDs, rowIDs);
          },
          onClick: function (obj) {
            self.hmapCellClicked(obj.colID, obj.rowID);
          },
          onFullscreenClick: function () {
            // nothing should be needed here for the subsystems view
          }
        });

        this.containerActions.forEach(function (a) {
          this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
        }, this);

        // put action icons in heatmap header
        var header = Query('.hotmap .header', this.hmapDom)[0];
        domConstruct.place(this.containerActionBar.domNode, header, 'last');
        Query('.WSContainerActionBar', header).style('margin-left', 'auto');
        Query('.ActionButtonWrapper').style('width', '48px');

        // hack to remove unused path div (interfering with flexbox)
        Query('.wsBreadCrumbContainer', this.hmapDom)[0].remove();
      } else {
        this.chart.update({
          rows: data.rows,
          cols: data.cols,
          matrix: data.matrix
        });
      }
    },

    formatData: function (data) {
      if (!data.rows.length) {
        alert('Error: no rows were provided to the heatmap viewer\nPlease try refreshing the page');
        return;
      }

      if (!data.columns.length) {
        alert('Error: no columns were provided to the heatmap viewer');
        return;
      }

      var rows = data.rows.map(function (r) {
        return {
          name: r.rowLabel,
          id: r.rowID
        };
      });
      var cols = data.columns.map(function (c) {
        return {
          name: c.colLabel,
          id: c.colID,
          distribution: c.distribution,
          meta: c.meta
        };
      });

      // get lists of vals for each column
      var vals = cols.map(function (c) {
        var hexStrs = c.distribution.match(/.{2}/g), // convert hex string to vals
          vals = hexStrs.map(function (hex) { return  parseInt(hex, 16); });

        delete c.distribution; // we no longer need the distribution
        return vals;
      });

      // make pass of all column val data (i times, where i = number of rows)
      var matrix = [];
      for (var i = 0; i < vals[0].length; i++) {
        var row = [];
        for (var j = 0; j < vals.length; j++) {
          row.push(vals[j][i]);
        }
        matrix.push(row);
      }

      return { cols: cols, rows: rows, matrix: matrix };
    },

    _buildPanelSaveSVG: function () {
      var self = this;

      var container = domConstruct.create('div');

      domConstruct.create('a', {
        innerHTML: '<i class="fa icon-download"></i> Save snapshot (SVG)',
        onclick: function () {
          var status = domConstruct.toDom('<div><br>Creating SVG...</div>');
          domConstruct.place(status, container, 'last');
          setTimeout(function () {
            self.chart.downloadSVG({ fileName: 'heatmap.svg' });
            domConstruct.destroy(status);
          }, 1000);
        }
      }, container);

      domConstruct.place('<br>', container);

      domConstruct.create('a', {
        innerHTML: '<i class="fa icon-download"></i> Save entire chart (SVG)',
        onclick: function () {
          var status = domConstruct.toDom('<div><br>Creating SVG... <br>This may take awhile for large charts</div>');
          domConstruct.place(status, container, 'last');
          setTimeout(function () {
            self.chart.downloadSVG({ fileName: 'heatmap.svg', full: true });
            domConstruct.destroy(status);
          }, 1000);
        }
      }, container);

      domConstruct.place('<br>', container);

      domConstruct.create('a', {
        innerHTML: '<i class="fa icon-download"></i> Save chart to TSV',
        onclick: function () {
          var status = domConstruct.toDom('<div><br>Creating TSV...<br></div>');
          domConstruct.place(status, container, 'last');
          setTimeout(function () {
            self.downloadChart();
            domConstruct.destroy(status);
          }, 1000);
        }
      }, container);

      domConstruct.place('<br>', container);

      domConstruct.create('a', {
        innerHTML: '<i class="fa icon-download"></i> Save chart to JSON',
        onclick: function () {
          var status = domConstruct.toDom('<div><br>Creating JSON...<br></div>');
          domConstruct.place(status, container, 'last');
          setTimeout(function () {
            self.downloadJSON();
            domConstruct.destroy(status);
          }, 1000);
        }
      }, container);

      return container;
    },


    downloadJSON: function () {
      var _self = this;
      var ext = 'json';
      var rel = 'text/plain';
      var state = _self.chart.getState();
      var obj = { 'rows': state.rows, 'cols': state.cols, 'matrix': state.matrix };
      saveAs(new Blob([JSON.stringify(obj)], { type: rel }), 'BVBRC_subsystems_heatmap.' + ext);
    },

    downloadChart: function () {
      var _self = this;
      var DELIMITER = '\t';
      var ext = 'tsv';
      var rel = 'text/tsv';

      var state = _self.chart.getState();
      var header = 'Genomes/Protein Families';
      state.cols.forEach(function (col, idx) {
        header += DELIMITER + col.name + ' (' + col.id + ')';
      });

      var data = [];
      state.rows.forEach(function (row, idx) {
        var r = [];
        r.push(row.name + ' (' + row.id + ')');
        for (var step = 0; step < state.cols.length; step++) {
          r.push(state.matrix[idx][step]);
        }
        data[idx] = r.join(DELIMITER);
      });

      saveAs(new Blob([header + '\n' + data.join('\n')], { type: rel }), 'BVBRC_subsystems_heatmap.' + ext);
    },

  });
});
