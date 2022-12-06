define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/on', 'dojo/topic', 'dojo/dom-construct',
  'dijit/popup', 'dijit/TooltipDialog', 'dijit/Dialog',
  'FileSaver',
  './GridContainer', './FacetFilterPanel', './InteractionGrid', './PerspectiveToolTip', './SelectionToGroup'
], function (
  declare, lang,
  on, Topic, domConstruct,
  popup, TooltipDialog, Dialog,
  saveAs,
  GridContainer, FacetFilterPanel, Grid, PerspectiveToolTipDialog, SelectionToGroup
) {

  var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div>';

  var downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  var vfc = '<div class="wsActionTooltip" rel="dna">View FASTA DNA</div><div class="wsActionTooltip" rel="protein">View FASTA Proteins</div>';
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

    var ids = sel.map(function (x) {
      return [x.feature_id_a, x.feature_id_b];
    }).reduce(function (a, b) {
      return a.concat(b);
    });

    Topic.publish('/navigate', {
      href: '/view/FASTA/' + rel + '/?in(feature_id,(' + ids.join(',') + '))',
      target: 'blank'
    });
  });

  return declare([GridContainer], {
    gridCtor: Grid,
    containerType: 'interaction_data',
    tutorialLink: 'quick_references/organisms_taxon/interactions.html',
    facetFields: ['category', 'evidence', 'detection_method', 'interaction_type', 'source_db', 'genome_name_a', 'genome_name_b'],
    dataModel: 'ppi',
    defaultFilter: 'eq(evidence,experimental)',
    constructor: function (options) {
      this.topicId = options.topicId;

      // Topic.subscribe
    },
    buildQuery: function () {
      return '';
    },
    _setQueryAttr: function () {
      //
    },
    _setStateAttr: function (state) {
      this.inherited(arguments);
      if (!state) {
        return;
      }
      // console.log("InteractionGridContainer _setStateAttr", state.taxon_id);
      if (this.grid) {
        this.grid.set('state', state);
      }

      this._set('state', state);
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

            var data = this.grid.store.query('', { sort: this.grid.store.sort });

            var headers = ['Interactor A ID', 'Interactor A Type', 'Interactor A Desc',
              'Domain A', 'Taxon ID A', 'Genome ID A', 'Genome Name A', 'RefSeq Locus Tag A', 'gene A',
              'Interactor B ID', 'Interactor B Type', 'Interactor B Desc',
              'Domain B', 'Taxon ID B', 'Genome ID B', 'Genome Name B', 'RefSeq Locus Tag B', 'gene B',
              'Category', 'Interaction Type', 'Detection Method', 'Evidence',
              'PMID', 'Source DB', 'Source ID', 'Score'];
            var content = [];
            data.forEach(function (row) {
              content.push([row.interactor_a, row.interactor_type_a, '"' + row.interactor_desc_a + '"',
                row.domain_a, row.taxon_id_a, row.genome_id_a, row.genome_name_a, row.refseq_locus_tag_a, row.gene_a,
                row.interactor_b, row.interactor_type_b, '"' + row.interactor_desc_b + '"',
                row.domain_b, row.taxon_id_b, row.genome_id_b, row.genome_name_b, row.refseq_locus_tag_b, row.gene_b,
                row.category, '"' + row.interaction_type + '"', '"' + row.detection_method + '"', '"' + row.evidence + '"',
                '"' + (row.pmid || []).join(',') + '"', '"' + row.source_db + '"', '"' + (row.source_id || '') + '"', row.score].join(DELIMITER));
            });

            saveAs(new Blob([headers.join(DELIMITER) + '\n' + content.join('\n')], { type: rel }), 'BVBRC_interactions.' + ext);

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
        'ViewFeatureItems',
        'MultiButton fa icon-selection-FeatureList fa-2x',
        {
          label: 'FEATURES',
          validTypes: ['*'],
          multiple: true,
          min: 1,
          max: 5000,
          tooltip: 'Switch to Feature List View. Press and Hold for more options.',
          validContainerTypes: ['interaction_data'],
          pressAndHold: function (selection, button, opts, evt) {
            var sel = selection.map(function (x) {
              return [x.feature_id_a, x.feature_id_b];
            }).reduce(function (a, b) {
              return a.concat(b);
            }).filter(function (x, i, orig) {
              return orig.indexOf(x) == i;
            });

            popup.open({
              popup: new PerspectiveToolTipDialog({
                perspective: 'FeatureList',
                perspectiveUrl: '/view/FeatureList/?in(feature_id,(' + sel.join(',') + '))'
              }),
              around: button,
              orient: ['below']
            });

          }
        },
        function (selection) {
          var sel = selection.map(function (x) {
            return [x.feature_id_a, x.feature_id_b];
          }).reduce(function (a, b) {
            return a.concat(b);
          }).filter(function (x, i, orig) {
            return orig.indexOf(x) == i;
          });

          // console.log(sel);
          Topic.publish('/navigate', {
            href: '/view/FeatureList/?in(feature_id,(' + sel.join(',') + '))'
          });
        },
        false
      ], [
        'ViewFASTA',
        'fa icon-fasta fa-2x',
        {
          label: 'FASTA',
          ignoreDataType: true,
          multiple: true,
          validTypes: ['*'],
          max: 5000,
          tooltip: 'View FASTA Data',
          tooltipDialog: viewFASTATT,
          validContainerTypes: ['interaction_data']
        },
        function (selection) {

          viewFASTATT.selection = selection;

          popup.open({
            popup: this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog,
            around: this.selectionActionBar._actions.ViewFASTA.button,
            orient: ['below']
          });
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
          tooltip: 'Add selection to a new or existing group',
          validContainerTypes: ['interaction_data']
        },
        function (selection) {
          var sel_feature = selection.map(function (x) {
            return [x.feature_id_a, x.feature_id_b];
          }).reduce(function (a, b) {
            return a.concat(b);
          }).filter(function (x, i, orig) {
            return orig.indexOf(x) == i;
          });

          var sel_genome = selection.map(function (x) {
            return [x.genome_id_a, x.genome_id_b];
          }).reduce(function (a, b) {
            return a.concat(b);
          }).filter(function (x, i, orig) {
            return orig.indexOf(x) == i;
          });
          var feature_ids = sel_feature.map(function (x) {
            return { feature_id: x };
          });
          var genome_ids = sel_genome.map(function (x) {
            return { genome_id: x };
          });

          var dlg = new Dialog({ title: 'Add selected items to group' });
          var type = 'feature_group';

          if (!type) {
            console.error('Missing type for AddGroup');
            return;
          }
          var stg = new SelectionToGroup({
            selection: feature_ids.concat(genome_ids),
            type: type,
            inputType: 'feature_data',
            path: ''
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
    ])
  });
});
