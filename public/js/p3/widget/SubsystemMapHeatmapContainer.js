define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/on', 'dojo/topic', 'dojo/dom-construct', 'dojo/dom', 'dojo/query', 'dojo/when', 'dojo/request',
  'dijit/layout/ContentPane', 'dijit/layout/BorderContainer', 'dijit/TooltipDialog', 'dijit/Dialog', 'dijit/popup',
  'dijit/TitlePane', 'dijit/registry', 'dijit/form/Form', 'dijit/form/RadioButton', 'dijit/form/Select', 'dijit/form/Button',
  './ContainerActionBar', './HeatmapContainer', './SelectionToGroup', '../util/PathJoin', 'FileSaver', '../store/SubsystemMapMemoryStore',
  'dojo/aspect'

], function (
  declare, lang,
  on, Topic, domConstruct, dom, Query, when, request,
  ContentPane, BorderContainer, TooltipDialog, Dialog, popup,
  TitlePane, registry, Form, RadioButton, Select, Button,
  ContainerActionBar, HeatmapContainer, SelectionToGroup, PathJoin, saveAs, Store,
  aspect
) {

  var legend = [
    '<div>',
    '<h5>HeatMap Cells</h5>',
    '<p>Cell color represents the number of proteins <br/> from a specific genome in a given protein family.</p>',
    '<br>',
    '<span class="heatmap-legend-entry black"></span>',
    '<span class="heatmap-legend-label">0</span>',
    '<div class="clear"></div>',
    '<span class="heatmap-legend-entry yellow"></span>',
    '<span class="heatmap-legend-label">1</span>',
    '<div class="clear"></div>',
    '<span class="heatmap-legend-entry orange"></span>',
    '<span class="heatmap-legend-label">2</span>',
    '<div class="clear"></div>',
    '<span class="heatmap-legend-entry red"></span>',
    '<span class="heatmap-legend-label">3+</span>',
    '<div class="clear"></div>',
    '</div>'
  ].join('\n');

  return declare([BorderContainer, HeatmapContainer], {
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
        'Legend',
        'fa icon-bars fa-2x',
        { label: 'Legend', multiple: false, validTypes: ['*'] },
        function () {
          if (this.containerActionBar._actions.Legend.options.tooltipDialog == null) {
            this.tooltip_legend = new TooltipDialog({
              content: legend
            });
            this.containerActionBar._actions.Legend.options.tooltipDialog = this.tooltip_legend;
          }

          if (this.isPopupOpen) {
            this.isPopupOpen = false;
            popup.close();
          } else {
            popup.open({
              parent: this,
              popup: this.containerActionBar._actions.Legend.options.tooltipDialog,
              around: this.containerActionBar._actions.Legend.button,
              orient: ['below']
            });
            this.isPopupOpen = true;
          }
        },
        true
      ],
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
        },
        true
      ],
      [
        'Reference Genomes',
        'fa icon-eye fa-2x',
        { label: 'Reference Genomes', multiple: false, validTypes: ['*'] },
        function () {
          if (this.state.display_reference_genomes) {
            this.state.display_reference_genomes = false;
          } else {
            this.state.display_reference_genomes = true;
          }

          Topic.publish('SubSystemMap', 'refreshHeatmap');
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
        'Toggle Description',
        'fa icon-enlarge fa-2x',
        { label: 'Toggle Description', multiple: false, validTypes: ['*'] },
        function () {
          if (this.state.display_reference_genomes) {
            this.state.display_reference_genomes = false;
          } else {
            this.state.display_reference_genomes = true;
          }

          Topic.publish('SubSystemMapResize', 'toggleDescription');
        },
        true
      ]
    ],
    constructor: function () {
      this.dialog = new Dialog({});

      var self = this;
      // subscribe
      Topic.subscribe('SubSystemMap', lang.hitch(self, function () {
        // console.log("SubsystemMapHeatmapContainer:", arguments);
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updatePmState':
            self.pmState = value;
            break;
          case 'refreshHeatmap':
            Topic.publish('SubSystemMap', 'requestHeatmapData', self.pmState);
            break;
          case 'heatmapOrdering':
            if (self.hasOwnProperty('originalPmState') ) {
              Topic.publish('SubSystemMap', 'requestHeatmapData', self.originalPmState);
            } else {
              Topic.publish('SubSystemMap', 'requestHeatmapData', self.pmState);
            }
            break;
          case 'updateHeatmapData':
            self.currentData = value;
            if (typeof (self.flashDom.refreshData) == 'function') {
              self.flashDom.refreshData();
              // Topic.publish("SubsystemMap", "hideLoadingMask");
            }
            break;
          default:
            break;
        }
      }));
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
        this.initializeFlash('SubsystemMapHeatMap');
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
      this.containerActions.forEach(function (a) {
        this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
      }, this);
      this.addChild(this.containerActionBar);

      this.addChild(new ContentPane({
        region: 'center',
        content: "<div id='flashTarget'></div>",
        style: 'padding:0'
      }));

      this.inherited(arguments);
      this._firstView = true;
      this._setState(this.state);
    },
    flashReady: function () {
      if (typeof (this.flashDom.refreshData) == 'function') {
        Topic.publish('SubSystemMap', 'refreshHeatmap');
      }
    },
    flashCellClicked: function (flashObjectID, colID, rowID) {
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
          if (!featureSet.hasOwnProperty(d.feature_id)) {
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

    flashCellsSelected: function (flashObjectID, colIDs, rowIDs) {
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
          if (!featureSet.hasOwnProperty(d.feature_id)) {
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
      var description = '',
        memberCount = 0,
        index = 0;

      if (isTransposed) {
        // rows: families, columns: genomes
        this.currentData.rows.forEach(function (row, idx) {
          if (row.rowID === roleId) {
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
          if (col.colID === roleId) {
            description = col.colLabel;
            memberCount = parseInt(col.distribution.substr(2 * index, 2), 16);
          }
        });
      }

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
      text.push('<b>PATRIC IDs:</b> ' + patricIds.join(', '));
      text.push('<b>Members:</b> ' + features.length);

      return text.join('<br>');
    },
    _buildPanelCellsSelected: function (isTransposed, roleIds, genomeIds, features) {

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

      text.push('<b>Genomes Selected:</b> ' + genomeIds.length);
      text.push('<b>Roles Selected:</b> ' + roleIds.length);
      text.push('<b>PATRIC IDs:</b> ' + patricIds.join(', '));
      text.push('<b>Members:</b> ' + features.length);

      return text.join('<br>');
    },
    _buildPanelButtons: function (colIDs, rowIDs, ecNumbers, genomeIds, features) {
      var _self = this;
      var featureIds = (typeof (features[0]) === 'string') ? features.join(',') : features.map(function (d) { return d.feature_id; }).join(',');

      var actionBar = domConstruct.create('div', {
        class: 'dijitDialogPaneActionBar'
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

        saveAs(new Blob([header + '\n' + data.join('\n')], { type: rel }), 'PATRIC_subsystem_map_heatmap.' + ext);
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
          selection: features.map(function (f) { return { feature_id:f }; }),
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
        header.push(fakeColumnName);
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

      // console.log("cluster is called", param);
      // this.set('loading', true);
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
        // Topic.publish(this.topicId, "updateFilterGridOrder", res.rows);
        // Topic.publish(this.topicId, "updateMainGridOrder", res.columns);

        // re-draw heatmap
        Topic.publish('SubSystemMap', 'refreshHeatmap');
      }), function (err) {

        Topic.publish('SubSystemMap', 'hideLoadingMask');

        new Dialog({
          title: err.status || 'Error',
          content: err.text || err
        }).show();
      });
    }
  });
});
