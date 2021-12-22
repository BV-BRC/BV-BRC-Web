define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic', 'dojo/dom-construct',
  'dijit/Dialog', 'dijit/popup', 'dijit/TooltipDialog', './SelectionToGroup',
  './ContainerActionBar', 'FileSaver',
  './PathwaySummaryGrid', './GridContainer', './PerspectiveToolTip'
], function (
  declare, lang, on, Topic, domConstruct,
  Dialog, popup, TooltipDialog, SelectionToGroup,
  ContainerActionBar, saveAs,
  PathwaySummaryGrid, GridContainer, PerspectiveToolTipDialog
) {

  var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div>';
  var downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  return declare([GridContainer], {
    gridCtor: PathwaySummaryGrid,
    containerType: 'pathway_summary_data',
    facetFields: [],
    dataModel: 'pathway_summary',
    createFilterPanel: function (opts) {
      this.containerActionBar = this.filterPanel = new ContainerActionBar({
        region: 'top',
        layoutPriority: 7,
        splitter: true,
        className: 'BrowserHeader',
        dataModel: this.dataModel,
        facetFields: this.facetFields,
        state: lang.mixin({}, this.state),
        enableAnchorButton: false,
        currentContainerWidget: this
      });
    },

    buildQuery: function () {
      // prevent further filtering. DO NOT DELETE
    },
    _setQueryAttr: function (query) {
      // block default query handler for now.
    },
    _setStateAttr: function (state) {
      this.inherited(arguments);
      if (!state) {
        return;
      }
      // console.log("PathwaySummaryGridContainer _setStateAttr: ", state);
      if (!this._firstView) {
        this._setVisibleAttr(true);
      }
      if (this.grid) {
        // console.log("   call set state on this.grid: ", this.grid);
        this.grid.set('state', state);
      } else {
        console.log('No Grid Yet (PathwaySummaryGridContainer)');
      }

      this._set('state', state);
    },

    selectionActions: GridContainer.prototype.selectionActions.concat([
      [
        'ViewPathwayMap',
        'fa icon-map-o fa-2x',
        {
          label: 'Map',
          multiple: false,
          validTypes: ['*'],
          tooltip: 'View PathwayMap',
          validContainerTypes: ['pathway_summary_data']
        },
        function (selection) {
          // console.log(selection, this.state);

          var url = { annotation: 'PATRIC' };

          url.pathway_id = selection[0].pathway_id;
          url.feature_id = selection[0].feature_ids;
          url.genome_ids = selection[0].genome_ids;

          var params = Object.keys(url).map(function (p) {
            return p + '=' + url[p];
          }).join('&');
          // console.log(params);
          Topic.publish('/navigate', { href: '/view/PathwayMap/?' + params, target: 'blank' });
        },
        false
      ], [
        'ViewFeatureItems',
        'MultiButton fa icon-selection-FeatureList fa-2x',
        {
          label: 'FEATURES',
          validTypes: ['*'],
          multiple: true,
          // min: 1,
          max: 5000,
          tooltip: 'Switch to Feature List View. Press and Hold for more options.',
          validContainerTypes: ['pathway_summary_data'],
          pressAndHold: function (selection, button, opts, evt) {
            console.log('PressAndHold');
            console.log('Selection: ', selection, selection[0]);
            popup.open({
              popup: new PerspectiveToolTipDialog({
                perspective: 'FeatureList',
                perspectiveUrl: '/view/FeatureList/?in(feature_id,(' + selection.map(function (x) {
                  return x.feature_ids;
                }).join(',') + '))'
              }),
              around: button,
              orient: ['below']
            });

          }
        },
        function (selection) {
          var ids = selection.map(function (d) {
            return d.feature_ids;
          });
          Topic.publish('/navigate', { href: '/view/FeatureList/?in(feature_id,(' + ids.join(',') + '))' });
        },
        false
      ], [
        'AddGroup',
        'fa icon-object-group fa-2x',
        {
          label: 'GROUP',
          ignoreDataType: true,
          multiple: true,
          validTypes: ['*'],
          requireAuth: true,
          max: 10000,
          tooltip: 'Add selection to a new or existing feature group',
          validContainerTypes: ['pathway_summary_data']
        },
        function (selection, containerWidget) {
          // console.log("Add Items to Group", selection);
          var dlg = new Dialog({ title: 'Add selected items to group' });
          var type = 'feature_group';
          var feature_ids = selection.map(function (d) {
            return d.feature_ids;
          });
          // construct an array, each element is an object with "feature_id" as property
          // no need to remove duplicate as WorkspaceManager takes care of it
          var features = [];
          feature_ids.forEach(function (s) {
            s.forEach(function (d) {
              features.push({ feature_id: d });
            });
          });

          var genome_ids = selection.map(function (d) {
            return d.genome_ids;
          });
          var genomes = [];
          genome_ids.forEach(function (s) {
            s.forEach(function (d) {
              genomes.push({ genome_id: d });
            });
          });
          var stg = new SelectionToGroup({
            selection: features.concat(genomes),
            type: type,
            inputType: 'feature_data',
            path: containerWidget.get('path')
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
        },
        false
      ]
    ]),

    containerActions: GridContainer.prototype.containerActions.concat([
      [
        'DownloadTable',
        'fa icon-download fa-2x',
        {
          label: 'DOWNLOAD',
          multiple: false,
          validTypes: ['*'],
          tooltip: 'Download Table',
          tooltipDialog: downloadTT
        },
        function () {

          downloadTT.set('content', dfc);

          on(downloadTT.domNode, 'div:click', lang.hitch(this, function (evt) {
            var rel = evt.target.attributes.rel.value;
            var DELIMITER,
              ext;
            if (rel === 'text/csv') {
              DELIMITER = ',';
              ext = 'csv';
            } else {
              DELIMITER = '\t';
              ext = 'txt';
            }

            var data  = this.grid.store.query('', { sort: this.grid.store.sort });

            var headers = ['Pathway Name', '# of Gene Selected', '# of Genes Annotated', '% Coverage'];
            var content = [];
            data.forEach(function (row) {
              content.push(['"' + row.pathway_name + '"', row.genes_selected, row.genes_annotated, row.coverage].join(DELIMITER));
            });

            saveAs(new Blob([headers.join(DELIMITER) + '\n' + content.join('\n')], { type: rel }), 'BVBRC_pathway_summary.' + ext);

            popup.close(downloadTT);
          }));

          popup.open({
            popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
            around: this.containerActionBar._actions.DownloadTable.button,
            orient: ['below']
          });
        },
        true
      ]
    ])
  });
});
