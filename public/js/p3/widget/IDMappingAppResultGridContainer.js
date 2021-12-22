define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/on', 'dojo/topic', 'dojo/query', 'dojo/dom-class', 'dojo/when', 'dojo/request',
  'dijit/popup', 'dijit/TooltipDialog',
  './ContainerActionBar', 'FileSaver', './PerspectiveToolTip',
  './GridContainer', './IDMappingAppResultGrid',
  './DownloadTooltipDialog', 'dijit/Dialog',
  './SelectionToGroup', 'dojo/dom-construct'
], function (
  declare, lang,
  on, Topic, query, domClass, when, request,
  popup, TooltipDialog,
  ContainerActionBar, saveAs, PerspectiveToolTipDialog,
  GridContainer, IDMappingAppResultGrid,
  DownloadTooltipDialog, Dialog,
  SelectionToGroup, domConstruct
) {

  var vfc = '<div class="wsActionTooltip" rel="dna">View FASTA DNA</div><div class="wsActionTooltip" rel="protein">View FASTA Proteins</div>';
  var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div>';

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
    var idType;

    var ids = sel.map(function (d, idx) {
      if (!idType) {
        if (d.feature_id) {
          idType = 'feature_id';
        } else if (d.patric_id) {
          idType = 'patric_id';
        } else if (d.alt_locus_tag) {
          idType = 'alt_locus_tag';
        }
        // console.log("SET ID TYPE TO: ", idType)
      }

      return d[idType];
    });

    Topic.publish('/navigate', { href: '/view/FASTA/' + rel + '/?in(' + idType + ',(' + ids.map(encodeURIComponent).join(',') + '))', target: 'blank' });
  });
  var downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });


  var downloadSelectionTT = new DownloadTooltipDialog({});
  downloadSelectionTT.startup();


  on(downloadTT.domNode, 'div:click', lang.hitch(function (evt) {
    var rel = evt.target.attributes.rel.value;
    var data = downloadTT.get('data');
    var headers = downloadTT.get('headers');
    var filename = 'BVBRC_id_mapping';
    // console.log(data, headers);

    var DELIMITER,
      ext;
    if (rel === 'text/csv') {
      DELIMITER = ',';
      ext = 'csv';
    } else {
      DELIMITER = '\t';
      ext = 'txt';
    }

    var content = data.map(function (d) {
      return d.join(DELIMITER);
    });

    saveAs(new Blob([headers.join(DELIMITER) + '\n' + content.join('\n')], { type: rel }), filename + '.' + ext);

    popup.close(downloadTT);
  }));

  var downloadHeaders = ['Source', 'Target', 'UniprotKB ACC', 'BRC ID'];

  var downloadFields = ['source', 'target', 'uniprotkb_accession', 'patric_id'];

  return declare([GridContainer], {
    gridCtor: IDMappingAppResultGrid,
    containerType: 'feature_data',
    visible: true,
    store: null,

    buildQuery: function () {
    },
    _setQueryAttr: function (q) {
    },

    _setStoreAttr: function (store) {
      if (this.grid) {
        this.grid.store = store;
      }
      this._set('store', store);
    },

    onSetState: function (attr, oldState, state) {
      if (!state) {
        return;
      }

      if (this.grid) {
        this.grid.set('state', state);
      }
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
          validTypes: ['feature_data'],
          tooltip: 'Download Table',
          tooltipDialog: downloadTT
        },
        function () {

          downloadTT.set('content', dfc);

          var data = this.grid.store.query('', {});

          var content = data.map(function (o) {
            return downloadFields.map(function (field) {
              if (o[field] instanceof Array) {
                return '"' + o[field].map(function (v) {
                  return v.replace(/"/g, "'");
                }).join(';') + '"';
              } else if (o[field]) {
                if (typeof o[field] == 'string') {
                  return '"' + o[field].replace(/"/g, "'") + '"';
                }
                return o[field];

              }
              return '';

            });
          });

          downloadTT.set('data', content);
          downloadTT.set('headers', downloadHeaders);

          popup.open({
            popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
            around: this.containerActionBar._actions.DownloadTable.button,
            orient: ['below']
          });
        },
        true
      ]
    ]),
    selectionActions: [
      [
        'ToggleItemDetail',
        'fa icon-chevron-circle-right fa-2x',
        {
          label: 'HIDE',
          persistent: true,
          validTypes: ['feature_data'],
          tooltip: 'Toggle Details Pane'
        },
        function (selection, container, button) {
          // console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);

          var children = this.getChildren();
          // console.log("Children: ", children);
          if (children.some(function (child) {
            return this.itemDetailPanel && (child.id == this.itemDetailPanel.id);
          }, this)) {
            // console.log("Remove Item Detail Panel");
            this.removeChild(this.itemDetailPanel);

            query('.ActionButtonText', button).forEach(function (node) {
              node.innerHTML = 'SHOW';
            });

            query('.ActionButton', button).forEach(function (node) {
              domClass.remove(node, 'icon-chevron-circle-right');
              domClass.add(node, 'icon-chevron-circle-left');
            });
          }
          else {
            // console.log("Re-add child: ", this.itemDetailPanel);
            this.addChild(this.itemDetailPanel);

            query('.ActionButtonText', button).forEach(function (node) {
              node.innerHTML = 'HIDE';
            });

            query('.ActionButton', button).forEach(function (node) {
              console.log('ActionButtonNode: ', node);
              domClass.remove(node, 'icon-chevron-circle-left');
              domClass.add(node, 'icon-chevron-circle-right');
            });
          }
        },
        true
      ], [
        'DownloadSelection',
        'fa icon-download fa-2x',
        {
          label: 'DWNLD',
          multiple: true,
          validTypes: ['feature_data'],
          ignoreDataType: true,
          tooltip: 'Download Selection',
          max: 5000,
          tooltipDialog: downloadSelectionTT,
          validContainerTypes: ['genome_data', 'sequence_data', 'feature_data', 'spgene_data', 'spgene_ref_data', 'transcriptomics_experiment_data', 'transcriptomics_sample_data', 'pathway_data', 'transcriptomics_gene_data', 'gene_expression_data']
        },
        function (selection, container) {
          console.log('this.currentContainerType: ', this.containerType);
          console.log('GridContainer selection: ', selection);
          console.log('   ARGS: ', arguments);

          this.selectionActionBar._actions.DownloadSelection.options.tooltipDialog.set('selection', selection);
          this.selectionActionBar._actions.DownloadSelection.options.tooltipDialog.set('containerType', this.containerType);
          if (container && container.grid) {
            this.selectionActionBar._actions.DownloadSelection.options.tooltipDialog.set('grid', container.grid);
          }

          this.selectionActionBar._actions.DownloadSelection.options.tooltipDialog.timeout(3500);

          setTimeout(lang.hitch(this, function () {
            popup.open({
              popup: this.selectionActionBar._actions.DownloadSelection.options.tooltipDialog,
              around: this.selectionActionBar._actions.DownloadSelection.button,
              orient: ['below']
            });
          }), 10);

        },
        false
      ], [
        'ViewFeatureItem',
        'MultiButton fa icon-selection-Feature fa-2x',
        {
          label: 'FEATURE',
          validTypes: ['feature_data'],
          multiple: false,
          tooltip: 'Switch to Feature View. Press and Hold for more options.',
          validContainerTypes: ['feature_data', 'transcriptomics_gene_data'],
          pressAndHold: function (selection, button, opts, evt) {
            console.log('PressAndHold');
            console.log('Selection: ', selection, selection[0]);
            popup.open({
              popup: new PerspectiveToolTipDialog({
                perspective: 'Feature',
                perspectiveUrl: '/view/Feature/' + selection[0].feature_id
              }),
              around: button,
              orient: ['below']
            });
          }
        },
        function (selection) {
          var sel = selection[0];
          Topic.publish('/navigate', { href: '/view/Feature/' + sel.feature_id + '#view_tab=overview', target: 'blank' });
        },
        false
      ],
      [
        'ViewFeatureItems',
        'MultiButton fa icon-selection-FeatureList fa-2x',
        {
          label: 'FEATURES',
          validTypes: ['feature_data'],
          multiple: true,
          min: 2,
          max: 5000,
          tooltip: 'Switch to Feature List View. Press and Hold for more options.',
          validContainerTypes: ['feature_data', 'transcriptomics_gene_data', 'spgene_data'],
          pressAndHold: function (selection, button, opts, evt) {
            console.log('PressAndHold');
            console.log('Selection: ', selection, selection[0]);
            popup.open({
              popup: new PerspectiveToolTipDialog({
                perspective: 'FeatureList',
                perspectiveUrl: '/view/FeatureList/?in(feature_id,(' + selection.map(function (x) {
                  return x.feature_id;
                }).join(',') + '))'
              }),
              around: button,
              orient: ['below']
            });

          }
        },
        function (selection) {
          Topic.publish('/navigate', {
            href: '/view/FeatureList/?in(feature_id,(' + selection.map(function (x) {
              return x.feature_id;
            }).join(',') + '))',
            target: 'blank'
          });
        },
        false
      ],

      [
        'ViewGenomeItem',
        'MultiButton fa icon-selection-Genome fa-2x',
        {
          label: 'GENOME',
          validTypes: ['feature_data'],
          multiple: false,
          tooltip: 'Switch to Genome View. Press and Hold for more options.',
          ignoreDataType: true,
          validContainerTypes: ['sequence_data', 'feature_data', 'spgene_data', 'sequence_data'],
          pressAndHold: function (selection, button, opts, evt) {
            console.log('PressAndHold');
            console.log('Selection: ', selection, selection[0]);
            popup.open({
              popup: new PerspectiveToolTipDialog({ perspectiveUrl: '/view/Genome/' + selection[0].genome_id }),
              around: button,
              orient: ['below']
            });

          }
        },
        function (selection) {
          var sel = selection[0];
          // console.log("sel: ", sel)
          // console.log("Nav to: ", "/view/Genome/" + sel.genome_id);
          Topic.publish('/navigate', { href: '/view/Genome/' + sel.genome_id, target: 'blank' });
        },
        false
      ],

      [
        'ViewGenomeItems',
        'MultiButton fa icon-selection-GenomeList fa-2x',
        {
          label: 'GENOMES',
          validTypes: ['feature_data'],
          multiple: true,
          min: 2,
          max: 1000,
          tooltip: 'Switch to Genome List View. Press and Hold for more options.',
          ignoreDataType: true,
          validContainerTypes: ['genome_data', 'sequence_data', 'feature_data', 'spgene_data', 'sequence_data'],
          pressAndHold: function (selection, button, opts, evt) {
            var map = {};
            selection.forEach(function (sel) {
              if (!map[sel.genome_id]) {
                map[sel.genome_id] = true;
              }
            });
            var genome_ids = Object.keys(map);
            popup.open({
              popup: new PerspectiveToolTipDialog({
                perspective: 'GenomeList',
                perspectiveUrl: '/view/GenomeList/?in(genome_id,(' + genome_ids.join(',') + '))'
              }),
              around: button,
              orient: ['below']
            });

          }
        },
        function (selection) {
          var map = {};
          selection.forEach(function (sel) {
            if (!map[sel.genome_id]) {
              map[sel.genome_id] = true;
            }
          });
          var genome_ids = Object.keys(map);
          Topic.publish('/navigate', { href: '/view/GenomeList/?in(genome_id,(' + genome_ids.join(',') + '))', target: 'blank' });
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
          validTypes: ['feature_data'],
          max: 5000,
          tooltip: 'View FASTA Data',
          tooltipDialog: viewFASTATT,
          validContainerTypes: ['feature_data', 'spgene_data', 'transcriptomics_gene_data']
        },
        function (selection) {
          // console.log("view FASTA")
          viewFASTATT.selection = selection;
          // console.log("ViewFasta Sel: ", this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog)
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
          min: 2,
          multiple: true,
          max: 200,
          validTypes: ['feature_data'],
          tooltip: 'Multiple Sequence Alignment',
          validContainerTypes: ['feature_data', 'spgene_data', 'proteinfamily_data', 'pathway_data', 'transcriptomics_gene_data']
        },
        function (selection) {
          // console.log("MSA Selection: ", selection);
          var ids = selection.map(function (d) {
            return d.feature_id;
          });
          // console.log("OPEN MSA VIEWER");
          Topic.publish('/navigate', { href: '/view/MSA/?in(feature_id,(' + ids.map(encodeURIComponent).join(',') + '))', target: 'blank' });

        },
        false
      ],   [
        'PathwaySummary',
        'fa icon-git-pull-request fa-2x',
        {
          label: 'PTHWY',
          ignoreDataType: true,
          multiple: true,
          max: 200,
          validTypes: ['feature_data'],
          tooltip: 'Pathway Summary',
          validContainerTypes: ['feature_data', 'spgene_data', 'transcriptomics_gene_data', 'proteinfamily_data', 'pathway_data']
        },
        function (selection, containerWidget) {

          // console.warn(containerWidget.containerType, containerWidget.type, containerWidget);
          var ids = [];
          switch (containerWidget.containerType) {
            case 'proteinfamily_data':
              var familyIds = selection.map(function (d) {
                return d.family_id;
              });
              var genomeIds = containerWidget.state.genome_ids;
              var familyIdName = containerWidget.pfState.familyType + '_id';

              when(request.post(this.apiServer + '/genome_feature/', {
                handleAs: 'json',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                  'X-Requested-With': null,
                  Authorization: (window.App.authorizationToken || '')
                },
                data: 'and(in(' + familyIdName + ',(' + familyIds.join(',') + ')),in(genome_id,(' + genomeIds.join(',') + ')))&select(feature_id)&limit(25000)'
              }), function (response) {
                ids = response.map(function (d) {
                  return d.feature_id;
                });
                Topic.publish('/navigate', {
                  href: '/view/PathwaySummary/?features=' + ids.join(','),
                  target: 'blank'
                });
              });

              return;
              // break;
            case 'pathway_data':

              var queryContext = containerWidget.grid.store.state.search;
              if (containerWidget.grid.store.state.hashParams.filter != 'false') {
                queryContext += '&' + containerWidget.grid.store.state.hashParams.filter;
              }

              switch (containerWidget.type) {
                case 'pathway':
                  var pathway_ids = selection.map(function (d) {
                    return d.pathway_id;
                  });

                  when(request.post(this.apiServer + '/pathway/', {
                    handleAs: 'json',
                    headers: {
                      Accept: 'application/json',
                      'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                      'X-Requested-With': null,
                      Authorization: (window.App.authorizationToken || '')
                    },
                    data: 'and(in(pathway_id,(' + pathway_ids.join(',') + ')),' + queryContext + ')&select(feature_id)&limit(25000)'
                  }), function (response) {
                    ids = response.map(function (d) {
                      return d.feature_id;
                    });
                    Topic.publish('/navigate', {
                      href: '/view/PathwaySummary/?features=' + ids.join(','),
                      target: 'blank'
                    });
                  });
                  return;
                  // break;
                case 'ec_number':
                  var ec_numbers = selection.map(function (d) {
                    return d.ec_number;
                  });

                  when(request.post(this.apiServer + '/pathway/', {
                    handleAs: 'json',
                    headers: {
                      Accept: 'application/json',
                      'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                      'X-Requested-With': null,
                      Authorization: (window.App.authorizationToken || '')
                    },
                    data: 'and(in(ec_number,(' + ec_numbers.join(',') + ')),' + queryContext + ')&select(feature_id)&limit(25000)'
                  }), function (response) {
                    ids = response.map(function (d) {
                      return d.feature_id;
                    });
                    Topic.publish('/navigate', {
                      href: '/view/PathwaySummary/?features=' + ids.join(','),
                      target: 'blank'
                    });
                  });

                  return;
                  // break;
                case 'gene':
                  ids = selection.map(function (d) {
                    return d.feature_id;
                  });
                  break;
                default:
                  return;
                  // break;
              }
              break;
            default:
              // feature_data or spgene_data
              ids = selection.map(function (sel) {
                return sel.feature_id;
              });
              break;
          }

          Topic.publish('/navigate', {
            href: '/view/PathwaySummary/?features=' + ids.join(','),
            target: 'blank'
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
          validTypes: ['feature_data'],
          requireAuth: true,
          max: 10000,
          tooltip: 'Add selection to a new or existing group',
          validContainerTypes: ['genome_data', 'feature_data', 'transcriptomics_experiment_data', 'transcriptomics_gene_data', 'spgene_data']
        },
        function (selection, containerWidget) {
          // console.log("Add Items to Group", selection);
          var dlg = new Dialog({ title: 'Add selected items to group' });
          var type;

          if (!containerWidget) {
            // console.log("Container Widget not setup for addGroup");
            return;
          }

          if (containerWidget.containerType == 'genome_data') {
            type = 'genome_group';
          } else if (containerWidget.containerType == 'feature_data' || containerWidget.containerType == 'transcriptomics_gene_data' || containerWidget.containerType == 'spgene_data') {
            type = 'feature_group';
          } else if (containerWidget.containerType == 'transcriptomics_experiment_data') {
            type = 'experiment_group';
          }

          if (!type) {
            console.error('Missing type for AddGroup');
            return;
          }
          var stg = new SelectionToGroup({
            selection: selection,
            selectType: true,
            type: type,
            inputType: containerWidget.containerType,
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
    ]


  });
});
