define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/on', 'dojo/topic', 'dojo/when', 'dojo/request', 'dojo/dom-construct',
  'dijit/popup', 'dijit/TooltipDialog', 'dijit/Dialog',
  './ContainerActionBar', 'FileSaver',
  './ProteinFamiliesGrid', './GridContainer', './DownloadTooltipDialog', '../util/PathJoin', './SelectionToGroup'
], function (
  declare, lang,
  on, Topic, when, request, domConstruct,
  popup, TooltipDialog, Dialog,
  ContainerActionBar, saveAs,
  ProteinFamiliesGrid, GridContainer, DownloadTooltipDialog, PathJoin, SelectionToGroup
) {

  var vfc = ['<div class="wsActionTooltip" rel="dna">View FASTA DNA</div>',
    '<div class="wsActionTooltip" rel="protein">View FASTA Proteins</div>'
  ].join('\n');

  var viewFASTATT = new TooltipDialog({
    content: vfc,
    onMouseLeave: function () {
      popup.close(viewFASTATT);
    }
  });

  on(viewFASTATT.domNode, 'click', function (evt) {
    var rel = evt.target.attributes.rel.value;
    var sel = viewFASTATT.selection;
    delete viewFASTATT.selection;

    Topic.publish('/navigate', { href: '/view/FASTA/' + rel + '/' + sel, target: 'blank' });
  });

  var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div>';

  var downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  var downloadSelectionTT = new DownloadTooltipDialog({});
  downloadSelectionTT.startup();

  return declare([GridContainer], {
    gridCtor: ProteinFamiliesGrid,
    containerType: 'proteinfamily_data',
    tutorialLink: 'user_guides/organisms_taxon/protein_families.html',
    facetFields: [],
    showAutoFilterMessage: false,
    constructor: function (options) {

      this.topicId = options.topicId;

      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updatePfState':
            this.pfState = value;
            break;
          default:
            break;
        }
      }));
    },
    buildQuery: function () {
      return '';
    },
    _setQueryAttr: function (query) {
      // block default query handler for now.
    },
    _setStateAttr: function (state) {
      this.inherited(arguments);
      if (!state) {
        return;
      }
      // console.log("ProteinFamiliesGridContainer _setStateAttr: ", state);
      if (this.grid) {
        // console.log("   call set state on this.grid: ", this.grid);
        Topic.publish(this.topicId, 'showLoadingMask');
        this.grid.set('state', state);
      } else {
        // console.log("No Grid Yet (ProteinFamiliesGridContainer)");
      }

      this._set('state', state);
    },
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

            var headers = ['Family ID', 'Proteins', 'Genomes', 'Description', 'Min AA Length', 'Max AA Length', 'Mean', 'Std Dev'];
            var content = [];
            data.forEach(function (row) {
              content.push([row.family_id, row.feature_count, row.genome_count, '"' + row.description + '"', row.aa_length_min, row.aa_length_max, row.aa_length_mean, row.aa_length_std].join(DELIMITER));
            });

            saveAs(new Blob([headers.join(DELIMITER) + '\n' + content.join('\n')], { type: rel }), 'BVBRC_protein_families.' + ext);

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
    ]),
    selectionActions: GridContainer.prototype.selectionActions.concat([
      [
        'DownloadSelection',
        'fa icon-download fa-2x',
        {
          label: 'DWNLD',
          multiple: true,
          validTypes: ['*'],
          ignoreDataType: true,
          tooltip: 'Download Selection',
          max: 5000,
          tooltipDialog: downloadSelectionTT,
          validContainerTypes: ['proteinfamily_data']
        },
        function (selection) {

          var query = 'and(in(genome_id,(' + this.pfState.genomeIds.join(',') + ')),in(' + this.pfState.familyType + '_id,(' + selection.map(function (s) {
            return s.family_id;
          }).join(',') + ')))&select(feature_id)&limit(25000)';

          var self = this;

          when(request.post(PathJoin(window.App.dataAPI, '/genome_feature/'), {
            handleAs: 'json',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
              'X-Requested-With': null,
              Authorization: (window.App.authorizationToken || '')
            },
            data: query
          }), function (response) {

            self.selectionActionBar._actions.DownloadSelection.options.tooltipDialog.set('selection', response);
            self.selectionActionBar._actions.DownloadSelection.options.tooltipDialog.set('containerType', 'feature_data');

            setTimeout(lang.hitch(self, function () {
              popup.open({
                popup: this.selectionActionBar._actions.DownloadSelection.options.tooltipDialog,
                around: this.selectionActionBar._actions.DownloadSelection.button,
                orient: ['below']
              });
            }), 10);
          });
        },
        false
      ],
      [
        'ViewFASTA',
        'fa icon-fasta fa-2x',
        {
          label: 'FASTA',
          ignoreDataType: true,
          multiple: true,
          validTypes: ['*'],
          tooltip: 'View FASTA Data',
          tooltipDialog: viewFASTATT
        },
        function (selection) {

          viewFASTATT.selection = '?and(in(genome_id,(' + this.pfState.genomeIds.join(',') + ')),in(' + this.pfState.familyType + '_id,(' + selection.map(function (s) {
            return s.family_id;
          }).join(',') + ')))';

          popup.open({
            popup: this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog,
            around: this.selectionActionBar._actions.ViewFASTA.button,
            orient: ['below']
          });
        },
        false
      ], [
        'MultipleSeqAlignmentFeatures',
        'fa icon-alignment fa-2x',
        {
          label: 'MSA',
          ignoreDataType: true,
          multiple: false,
          validTypes: ['*'],
          tooltip: 'Multiple Sequence Alignment',
          validContainerTypes: ['proteinfamily_data']
        },
        function (selection) {

          var query = 'and(in(genome_id,(' + this.pfState.genomeIds.join(',') + ')),in(' + this.pfState.familyType + '_id,(' + selection.map(function (s) {
            return s.family_id;
          }).join(',') + ')))';

          Topic.publish('/navigate', { href: '/view/MSA/?' + query, target: 'blank' });
        },
        false
      ], [
        'ViewProteinFamiliesMembers',
        'fa icon-group fa-2x',
        {
          label: 'Members',
          multiple: true,
          validTypes: ['*'],
          tooltip: 'View Family Members',
          validContainerTypes: ['proteinfamily_data']
        },
        function (selection) {

          var query = '?and(in(genome_id,(' + this.pfState.genomeIds.join(',') + ')),in(' + this.pfState.familyType + '_id,(' + selection.map(function (sel) {
            return sel.family_id;
          }).join(',') + ')))';

          Topic.publish('/navigate', { href: '/view/FeatureList/' + query + '#view_tab=features', target: 'blank' });
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
          max: 100,
          tooltip: 'Add selection to a new or existing group',
          validContainerTypes: ['proteinfamily_data']
        },
        function (selection) {

          var query = 'and(in(genome_id,(' + this.pfState.genomeIds.join(',') + ')),in(' + this.pfState.familyType + '_id,(' + selection.map(function (s) {
            return s.family_id;
          }).join(',') + ')))&select(feature_id,genome_id)&limit(25000)';

          when(request.post(PathJoin(window.App.dataAPI, '/genome_feature/'), {
            handleAs: 'json',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
              'X-Requested-With': null,
              Authorization: (window.App.authorizationToken || '')
            },
            data: query
          }), function (ids) {

            var dlg = new Dialog({ title: 'Add selected items to group' });
            var stg = new SelectionToGroup({
              selection: ids,
              type: 'feature_group',
              inputType: 'feature_data',
              path: ''
            });
            on(dlg.domNode, 'dialogAction', function () {
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
        },
        false
      ]

    ])
  });
});
