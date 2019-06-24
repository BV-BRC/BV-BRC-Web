define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/on', 'dojo/topic', 'dojo/dom-construct', 'dojo/dom', 'dojo/query', 'dojo/when', 'dojo/request',
  'dijit/layout/ContentPane', 'dijit/layout/BorderContainer', 'dijit/TooltipDialog', 'dijit/Dialog', 'dijit/popup',
  'dijit/TitlePane', 'dijit/registry', 'dijit/form/Form', 'dijit/form/RadioButton', 'dijit/form/Select', 'dijit/form/Button',
  './ContainerActionBar', './SelectionToGroup', '../util/PathJoin', 'FileSaver',
  './HeatmapContainerNew', 'heatmap/dist/heatmap', 'dojo/dom-class'

], function (
  declare, lang,
  on, Topic, domConstruct, dom, Query, when, request,
  ContentPane, BorderContainer, TooltipDialog, Dialog, popup,
  TitlePane, registry, Form, RadioButton, Select, Button,
  ContainerActionBar, SelectionToGroup, PathJoin, saveAs,
  HeatmapContainerNew, Heatmap, domClass
) {

  return declare([BorderContainer, HeatmapContainerNew], {
    gutters: false,
    state: null,
    visible: false,
    pfState: null,
    containerActions: [
      [
        'Flip Axis',
        'fa icon-rotate-left fa-2x',
        { label: 'Flip Axis', multiple: false, validTypes: ['*'] },
        'flipAxis',
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
        'Advanced Clustering',
        'fa icon-cluster fa-2x',
        { label: 'Advanced', multiple: false, validTypes: ['*'] },
        function () {
          var self = this;

          this.dialog.set('content', this._buildPanelAdvancedClustering());

          // building action bar
          var actionBar = domConstruct.create('div', {
            'class': 'dijitDialogPaneActionBar'
          });
          var btnSubmit = new Button({
            label: 'Submit',
            onClick: function () {
              var param = {};
              var f = registry.byId('advancedClusterParams').value;

              param.g = (f.cluster_by === 3 || f.cluster_by === 1) ? f.algorithm : 0;
              param.e = (f.cluster_by === 3 || f.cluster_by === 2) ? f.algorithm : 0;
              param.m = f.type;

              self.cluster(param);
              self.dialog.hide();
            }
          });
          var btnCancel = new Button({
            label: 'Cancel',
            onClick: function () {
              self.dialog.hide();
            }
          });
          btnSubmit.placeAt(actionBar);
          btnCancel.placeAt(actionBar);

          domConstruct.place(actionBar, this.dialog.containerNode, 'last');

          this.dialog.show();
        },
        true
      ],
      [
        'Anchor',
        'fa icon-random fa-2x',
        {
          label: 'Anchor',
          multiple: false,
          validType: ['*'],
          tooltip: 'Anchor by genome'
        },
        function () {
          this.tooltip_anchoring = new TooltipDialog({
            content: this._buildPanelAnchoring()
          });
          this.containerActionBar._actions.Anchor.options.tooltipDialog = this.tooltip_anchoring;

          if (this.isPopupOpen) {
            this.isPopupOpen = false;
            popup.close();
          } else {
            popup.open({
              parent: this,
              popup: this.containerActionBar._actions.Anchor.options.tooltipDialog,
              around: this.containerActionBar._actions.Anchor.button,
              orient: ['below']
            });
            this.isPopupOpen = true;
          }
        },
        true
      ]
    ],
    constructor: function (options) {
      this.dialog = new Dialog({});

      this.topicId = options.topicId;
      // subscribe
      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updatePfState':
            this.pfState = value;
            break;
          case 'refreshHeatmap':
            this.hmapUpdate();
            Topic.publish(this.topicId, 'requestHeatmapData', this.pfState);
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

    update: function () {
      Topic.publish(this.topicId, 'refreshHeatmap');
    },

    /* todo(nc): this logic can probably be removed as it's
      only ever set to true, apparently */
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

      // action buttons container for containerActions
      this.containerActionBar = new ContainerActionBar({
        baseClass: 'BrowserHeader',
        region: 'top'
      });

      this.inherited(arguments);
      this._firstView = true;
    },

    hmapCellClicked: function (colID, rowID) {
      var isTransposed = (this.pfState.heatmapAxis === 'Transposed');
      var originalAxis = this._getOriginalAxis(isTransposed, colID, rowID);

      var familyId = originalAxis.columnIds;
      var genomeId = originalAxis.rowIds;

      var query = '?and(eq(' + this.pfState.familyType + '_id,' + familyId + '),eq(genome_id,' + genomeId + '),eq(feature_type,CDS),eq(annotation,PATRIC))&select(feature_id,patric_id,refseq_locus_tag)&limit(250000)';

      Topic.publish(this.topicId, 'showLoadingMask');
      request.get(PathJoin(window.App.dataServiceURL, 'genome_feature', query), {
        handleAs: 'json',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        }
      }).then(lang.hitch(this, function (features) {
        Topic.publish(this.topicId, 'hideLoadingMask');

        this.dialog.set('content', this._buildPanelCellClicked(isTransposed, familyId, genomeId, features));
        var actionBar = this._buildPanelButtons(colID, rowID, familyId, genomeId, features);
        domConstruct.place(actionBar, this.dialog.containerNode, 'last');

        this.dialog.show();
      }));

    },
    hmapCellsSelected: function (colIDs, rowIDs) {
      if (rowIDs.length == 0) return;
      var isTransposed = (this.pfState.heatmapAxis === 'Transposed');
      var originalAxis = this._getOriginalAxis(isTransposed, colIDs, rowIDs);

      var familyIds = originalAxis.columnIds;
      var genomeIds = originalAxis.rowIds;

      var query = 'and(in(' + this.pfState.familyType + '_id,(' + familyIds + ')),in(genome_id,(' + genomeIds + ')),eq(feature_type,CDS),eq(annotation,PATRIC))&select(feature_id,patric_id,refseq_locus)&limit(250000)';

      Topic.publish(this.topicId, 'showLoadingMask');
      request.post(PathJoin(window.App.dataServiceURL, 'genome_feature'), {
        handleAs: 'json',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        data: query
      }).then(lang.hitch(this, function (features) {
        Topic.publish(this.topicId, 'hideLoadingMask');

        this.dialog.set('content', this._buildPanelCellsSelected(isTransposed, familyIds, genomeIds, features));
        var actionBar = this._buildPanelButtons(colIDs, rowIDs, familyIds, genomeIds, features);
        domConstruct.place(actionBar, this.dialog.containerNode, 'last');

        this.dialog.show();
      }));
    },
    _buildPanelCellClicked: function (isTransposed, familyId, genomeId, features) {

      var gfs = this.pfState.genomeFilterStatus;

      var genomeName = gfs[genomeId].getLabel();
      var description = '',
        memberCount = 0,
        index = 0;

      if (isTransposed) {
        // rows: families, columns: genomes
        this.currentData.rows.forEach(function (row, idx) {
          if (row.rowID === familyId) {
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
          if (col.colID === familyId) {
            description = col.colLabel;
            memberCount = parseInt(col.distribution.substr(2 * index, 2), 16);
          }
        });
      }

      var text = [];
      text.push('<b>Genome:</b> ' + genomeName);
      text.push('<b>Product:</b> ' + description);
      text.push('<b>Family ID:</b> ' + familyId);
      text.push('<b>Members:</b> ' + memberCount);
      features.forEach(function (feature) {
        var featureLink = '<a href="/view/Feature/' + feature.feature_id + '" target="_blank">' + feature.patric_id + '</a>';
        if (feature.refseq_locus_tag !== undefined) {
          featureLink += ', ' + feature.refseq_locus_tag;
        }
        if (feature.alt_locus_tag !== undefined) {
          featureLink += ', ' + feature.alt_locus_tag;
        }
        text.push(featureLink);
      });

      return text.join('<br>');
    },
    _buildPanelCellsSelected: function (isTransposed, familyIds, genomeIds, features) {

      // var membersCount = this._countMembers(colIDs, rowIDs);

      var text = [];
      text.push('<b>Genomes Selected:</b> ' + genomeIds.length);
      text.push('<b>Family Selected:</b> ' + familyIds.length);
      text.push('<b>Members:</b> ' + features.length);

      return text.join('<br>');
    },
    _buildPanelAdvancedClustering: function () {

      if (registry.byId('advancedClusterParams') !== undefined) {
        registry.byId('advancedClusterParams').destroyRecursive();
      }

      var form = new Form({
        id: 'advancedClusterParams'
      });

      var tp_dim = new TitlePane({
        title: 'Cluster by'
      }).placeAt(form.containerNode);

      new RadioButton({
        checked: false,
        value: 2,
        name: 'cluster_by',
        label: 'Protein Families'
      }).placeAt(tp_dim.containerNode);
      domConstruct.place('<label>Protein Families</label><br/>', tp_dim.containerNode, 'last');

      new RadioButton({
        checked: false,
        value: 1,
        name: 'cluster_by',
        label: 'Genomes'
      }).placeAt(tp_dim.containerNode);
      domConstruct.place('<label>Genomes</label><br/>', tp_dim.containerNode, 'last');

      new RadioButton({
        checked: true,
        value: 3,
        name: 'cluster_by',
        label: 'Both'
      }).placeAt(tp_dim.containerNode);
      domConstruct.place('<label>Both</label>', tp_dim.containerNode, 'last');

      var sel_algorithm = new Select({
        name: 'algorithm',
        value: 2,
        options: [{
          value: 0, label: 'No clustering'
        }, {
          value: 1, label: 'Un-centered correlation'
        }, {
          value: 2, label: 'Pearson correlation'
        }, {
          value: 3, label: 'Un-centered correlation, absolute value'
        }, {
          value: 4, label: 'Pearson correlation, absolute value'
        }, {
          value: 5, label: 'Spearman rank correlation'
        }, {
          value: 6, label: 'Kendall tau'
        }, {
          value: 7, label: 'Euclidean distance'
        }, {
          value: 8, label: 'City-block distance'
        }]
      });

      var sel_type = new Select({
        name: 'type',
        value: 'a',
        options: [{
          value: 'm', label: 'Pairwise complete-linkage'
        }, {
          value: 's', label: 'Pairwise single-linkage'
        }, {
          value: 'c', label: 'Pairwise centroid-linkage'
        }, {
          value: 'a', label: 'Pairwise average-linkage'
        }]
      });

      new TitlePane({
        title: 'Clustering algorithm',
        content: sel_algorithm
      }).placeAt(form.containerNode);

      new TitlePane({
        title: 'Clustering type',
        content: sel_type
      }).placeAt(form.containerNode);

      return form;
    },
    _buildPanelAnchoring: function () {

      var self = this;
      var pfState = self.pfState;
      var options = [{ value: '', label: 'Select a genome' }];
      options = options.concat(pfState.genomeIds.map(function (genomeId) {
        return {
          value: genomeId,
          label: pfState.genomeFilterStatus[genomeId].getLabel()
        };
      }).sort(function (a, b) {
        // return a.label - b.label;
        if (a.label < b.label) {
          return -1;
        }
        else if (a.label > b.label) {
          return 1;
        }

        return 0;

      }));

      var anchor = new Select({
        name: 'anchor',
        options: options
      });
      anchor.on('change', lang.hitch(this, function (genomeId) {
        if (genomeId !== '') {
          Topic.publish(this.topicId, 'anchorByGenome', genomeId);
          popup.close(self.tooltip_anchoring);
        }
      }));

      return anchor;
    },
    _buildPanelButtons: function (colIDs, rowIDs, familyIds, genomeIds, features) {
      var _self = this;
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

        saveAs(new Blob([header + '\n' + data.join('\n')], { type: rel }), 'PATRIC_protein_families_heatmap.' + ext);
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
        disabled: (features.length === 0)
      });
      on(downloadPT.domNode, 'click', function (e) {
        if (e.target.attributes.rel === undefined) return;
        var rel = e.target.attributes.rel.value;
        var currentQuery = '?in(feature_id,(' + features.map(function (f) {
          return f.feature_id;
        }).join(',') + '))&sort(+feature_id)';

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
        disabled: (features.length === 0)
      });
      on(btnShowDetails.domNode, 'click', function () {

        var query = '?in(feature_id,(' + features.map(function (d) {
          return d.feature_id;
        }) + '))';
        Topic.publish('/navigate', {
          href: '/view/FeatureList/' + query + '#view_tab=features',
          target: 'blank'
        });

        _self.dialog.hide();
      });

      var btnAddToWorkspace = new Button({
        label: 'Add Proteins to Group',
        disabled: (features.length === 0)
      });
      on(btnAddToWorkspace.domNode, 'click', function () {
        if (!window.App.user || !window.App.user.id) {
          Topic.publish('/login');
          return;
        }

        var dlg = new Dialog({ title: 'Add This Feature To Group' });
        var stg = new SelectionToGroup({
          selection: features,
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
    flipAxis: function () {
      // flip internal flag
      if (this.pfState.heatmapAxis === '') {
        this.pfState.heatmapAxis = 'Transposed';
      } else {
        this.pfState.heatmapAxis = '';
      }

      this.chart.flipAxis();
    },

    cluster: function (param) {
      var p = param || { g: 2, e: 2, m: 'a' };

      var isTransposed = this.pfState.heatmapAxis === 'Transposed';
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
        // DO NOT TRANSPOSE. clustering process is based on the corrected axises
        this.pfState.clusterRowOrder = res.rows;
        this.pfState.clusterColumnOrder = res.columns;

        Topic.publish(this.topicId, 'updatePfState', this.pfState);
        Topic.publish(this.topicId, 'updateFilterGridOrder', res.rows);
        Topic.publish(this.topicId, 'updateMainGridOrder', res.columns);

        // re-draw heatmap
        Topic.publish(this.topicId, 'refreshHeatmap');
      }), function (err) {

        Topic.publish(this.topicId, 'hideLoadingMask');

        new Dialog({
          title: err.status || 'Error',
          content: err.text || err
        }).show();
      });
    },

    hmapUpdate: function () {
      var self = this;

      if (!this.currentData) return;
      var data = this.formatData(this.currentData);
      console.log('heatmap data:', data);

      if (!this.chart) {
        this.chart = new Heatmap({
          ele: this.hmapDom,
          cols: data.cols,
          rows: data.rows,
          matrix: data.matrix,
          rowsLabel: 'Genomes',
          colsLabel: 'Protein Families',
          color: {
            bins: ['=0', '=1', '=2', '>=3'],
            colors: [0x000000, 16440142, 16167991, 16737843]
          },
          options: {
            theme: 'light',
            showVersion: true
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
            // must also hide filter container
            domClass.toggle(Query('.filterPanel')[0], 'dijitHidden');
            Query('.dijitSplitter').forEach(function (el) {
              domClass.toggle(el, 'dijitHidden');
            });

            setTimeout(function () {
              self.chart.resize();
            }, 500);
          }
        });

        this.containerActions.forEach(function (a) {
          this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
        }, this);

        // put action icons in heatmap header
        var header = Query('.heatmap .header', this.hmapDom)[0];
        domConstruct.place(this.containerActionBar.domNode, header, 'last');
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
    }

  });
});
