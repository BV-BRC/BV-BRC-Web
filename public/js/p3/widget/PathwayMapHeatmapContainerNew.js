/**
 * container for new (non-flash) heatmap
 */

define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic', 'dojo/dom-construct',
  'dojo/request', 'dijit/layout/ContentPane', 'dijit/layout/BorderContainer', 'dijit/TooltipDialog',
  'dijit/Dialog', 'dijit/popup', 'dijit/form/Button', './ContainerActionBar',
  './HeatmapContainerNew', './SelectionToGroup', '../util/PathJoin', 'FileSaver',
  'heatmap/dist/hotmap',  'dojo/query'

], function (
  declare, lang, on, Topic, domConstruct,
  request, ContentPane, BorderContainer, TooltipDialog,
  Dialog, popup, Button, ContainerActionBar,
  HeatmapContainerNew, SelectionToGroup, PathJoin, saveAs,
  Heatmap, Query
) {

  return declare([BorderContainer, HeatmapContainerNew], {
    gutters: false,
    state: null,
    visible: false,
    pmState: null,
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

          this.chart.flipAxis();
        },
        true
      ]
    ],
    constructor: function () {
      this.dialog = new Dialog({});

      Topic.subscribe('PathwayMap', lang.hitch(this, function () {
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updatePmState':
            this.pmState = value;
            this.hmapUpdate();
            break;
          case 'refreshHeatmap':
            this.hmapUpdate();
            Topic.publish('PathwayMap', 'requestHeatmapData', this.pmState);
            break;
          case 'updateHeatmapData':
            this.currentData = value;
            this.hmapUpdate();
            Topic.publish(this.topicId, 'hideLoadingMask');
            break;
          default:
            break;
        }
      }));
    },
    _setVisibleAttr: function (visible) {
      this.visible = visible;

      if (this.visible && !this._firstView) {
        this.initContainer();
        this.initializeHeatmap();
        this.onFirstView();
      }
    },


    initContainer: function () {
      var panel = this.panel = new ContentPane({
        region: 'center',
        content: "<div id='heatmapTarget'></div>",
        style: 'padding:0; overflow: hidden;'
      });

      dojo.connect(panel, 'resize', this, 'onResize');
      this.addChild(panel);
    },

    onResize: function () {
      if (!this.chart) return;
      this.chart.resize();
    },

    onFirstView: function () {
      if (this._firstView) {
        return;
      }

      // action buttons for heatmap viewer
      this.containerActionBar = new ContainerActionBar({
        baseClass: 'BrowserHeader',
        region: 'top'
      });

      this.inherited(arguments);
      this._firstView = true;
    },
    flashReady: function () {
      if (typeof (this.flashDom.refreshData) == 'function') {
        Topic.publish('PathwayMap', 'refreshHeatmap');
      }
    },
    hmapCellClicked: function (colID, rowID) {
      var isTransposed = (this.pmState.heatmapAxis === 'Transposed');
      var originalAxis = this._getOriginalAxis(isTransposed, colID, rowID);

      var ecNumber = originalAxis.columnIds;
      var genomeId = originalAxis.rowIds;

      var query = '?and(eq(ec_number,' + ecNumber + '),eq(genome_id,' + genomeId + '),eq(annotation,PATRIC))&limit(25000,0)';

      Topic.publish('PathwayMap', 'showLoadingMask');
      request.get(PathJoin(window.App.dataServiceURL, 'pathway', query), {
        handleAs: 'json',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        }
      }).then(lang.hitch(this, function (response) {
        Topic.publish('PathwayMap', 'hideLoadingMask');

        // dedupe features
        var featureSet = {};
        response.forEach(function (d) {
          if (!Object.prototype.hasOwnProperty.call(featureSet, d.feature_id)) {
            featureSet[d.feature_id] = true;
          }
        });
        var features = Object.keys(featureSet);

        this.dialog.set('content', this._buildPanelCellClicked(isTransposed, ecNumber, genomeId, features));
        var actionBar = this._buildPanelButtons(colID, rowID, ecNumber, genomeId, features);
        domConstruct.place(actionBar, this.dialog.containerNode, 'last');

        this.dialog.show();
      }));

    },
    hmapCellsSelected: function (colIDs, rowIDs) {
      if (rowIDs.length == 0) return;
      var isTransposed = (this.pmState.heatmapAxis === 'Transposed');
      var originalAxis = this._getOriginalAxis(isTransposed, colIDs, rowIDs);

      var ecNumbers = originalAxis.columnIds;
      var genomeIds = originalAxis.rowIds;

      var query = 'and(in(ec_number,(' + ecNumbers + ')),in(genome_id,(' + genomeIds + ')),eq(annotation,PATRIC))&limit(25000,0)';

      Topic.publish('PathwayMap', 'showLoadingMask');
      request.post(PathJoin(window.App.dataServiceURL, 'pathway'), {
        handleAs: 'json',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        data: query
      }).then(lang.hitch(this, function (response) {
        Topic.publish('PathwayMap', 'hideLoadingMask');

        // dedupe features
        var featureSet = {};
        response.forEach(function (d) {
          if (!Object.prototype.hasOwnProperty.call(featureSet, d.feature_id)) {
            featureSet[d.feature_id] = true;
          }
        });
        var features = Object.keys(featureSet);

        this.dialog.set('content', this._buildPanelCellsSelected(isTransposed, ecNumbers, genomeIds, features));
        var actionBar = this._buildPanelButtons(colIDs, rowIDs, ecNumbers, genomeIds, features);
        domConstruct.place(actionBar, this.dialog.containerNode, 'last');

        this.dialog.show();
      }));
    },
    _buildPanelCellClicked: function (isTransposed, ecNumber, genomeId, features) {

      var gfs = this.pmState.genomeFilterStatus;

      var genomeName = gfs[genomeId].getLabel();
      var description = '',
        memberCount = 0,
        index = 0;

      if (isTransposed) {
        // rows: families, columns: genomes
        this.currentData.rows.forEach(function (row, idx) {
          if (row.rowID === ecNumber) {
            description = row.rowLabel;
            index = idx;
          }
        });
        this.currentData.columns.forEach(function (col) {
          if (col.colID === genomeId) {
            memberCount = parseInt(col.distribution.substr(2 * index, 2), 16);
          }
        });
      } else {
        index = gfs[genomeId].getIndex();
        this.currentData.columns.forEach(function (col) {
          if (col.colID === ecNumber) {
            description = col.colLabel;
            memberCount = parseInt(col.distribution.substr(2 * index, 2), 16);
          }
        });
      }

      var text = [];
      text.push('<b>Genome:</b> ' + genomeName);
      text.push('<b>Product:</b> ' + description);
      text.push('<b>EC Number:</b> ' + ecNumber);
      text.push('<b>Members:</b> ' + memberCount);

      return text.join('<br>');
    },
    _buildPanelCellsSelected: function (isTransposed, ecNumbers, genomeIds, features) {

      var text = [];
      text.push('<b>Genomes Selected:</b> ' + genomeIds.length);
      text.push('<b>EC Selected:</b> ' + ecNumbers.length);
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
            r.push(row.rowLabel);
            colIndexes.forEach(function (colIdx) {
              var val = parseInt(_self.currentData.columns[colIdx].distribution.substr(idx * 2, 2), 16);
              r.push(val);
            });
            data[rowIDs.indexOf(row.rowID)] = r.join(DELIMITER);
          }
        });

        saveAs(new Blob([header + '\n' + data.join('\n')], { type: rel }), 'PATRIC_pathway_map_heatmap.' + ext);
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

    update: function () {
      Topic.publish('PathwayMap', 'refreshHeatmap');
    },

    hmapUpdate: function () {
      var self = this;

      if (!this.currentData) return;
      var data = this.formatData(this.currentData);

      if (!this.chart) {
        this.chart = new Hotmap({
          ele: this.hmapDom,
          cols: data.cols,
          rows: data.rows,
          matrix: data.matrix,
          rowsLabel: 'Protein Families',
          colsLabel: 'Genomes',
          hideRowMeta: true,
          hideColMeta: true,
          color: {
            bins: ['=0', '=1', '=2', '>=3'],
            colors: [0x000000, 16440142, 16167991, 16737843]
          },
          options: {
            theme: 'light',
            maxFontSize: 13,
            hideOptions: true,
            useBoundingClient: true
          },
          onSelection: function (objs) {
            var colIDs = objs.map(function (c) { return c.colID; });
            var rowIDs = objs.map(function (r) { return r.rowID; });
            self.hmapCellsSelected(colIDs, rowIDs);
          },
          onClick: function (obj) {
            self.hmapCellClicked(obj.colID, obj.rowID);
          },
          onFullscreenClick: function () {
            setTimeout(function () {
              self.onResize();
            }, 500);
          }
        });

        this.containerActions.forEach(function (a) {
          this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
        }, this);

        // put action icons in heatmap header
        var header = Query('.hotmap .header', this.hmapDom)[0];
        domConstruct.place(this.containerActionBar.domNode, header, 'last');
        Query('.WSContainerActionBar', header).style('margin-left', 'auto');
        Query('.ActionButtonWrapper', header).style('width', '48px');


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
      var rows = data.rows.map(function (r) {
        return {
          name: r.rowLabel,
          id: r.rowID,
          meta: r.meta,
          distribution: r.distribution
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
    }
  });
});
