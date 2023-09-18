define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on', 'dojo/dom-construct',
  'dojo/request', 'dojo/when', 'dojo/dom-class',
  './ActionBar', './FilterContainerActionBar', 'dojo/_base/lang', './ItemDetailPanel', './SelectionToGroup',
  'dojo/topic', 'dojo/query', 'dijit/layout/ContentPane', 'dojo/text!./templates/IDMapping.html',
  'dijit/Dialog', 'dijit/popup', 'dijit/TooltipDialog', './DownloadTooltipDialog', './PerspectiveToolTip',
  './CopyTooltipDialog', './PermissionEditor', '../WorkspaceManager', '../DataAPI', 'dojo/_base/Deferred', '../util/PathJoin',
  './FeatureDetailsTooltipDialog', './ServicesTooltipDialog', './RerunUtility', 'dojox/widget/Standby'
], function (
  declare, BorderContainer, on, domConstruct,
  request, when, domClass,
  ActionBar, ContainerActionBar, lang, ItemDetailPanel, SelectionToGroup,
  Topic, query, ContentPane, IDMappingTemplate,
  Dialog, popup, TooltipDialog, DownloadTooltipDialog, PerspectiveToolTipDialog,
  CopyTooltipDialog, PermissionEditor, WorkspaceManager, DataAPI, Deferred, PathJoin,
  FeatureDetailsTooltipDialog, ServicesTooltipDialog, RerunUtility, Standby
) {

  var mmc = '<div class="wsActionTooltip" rel="dna">Nucleotide</div><div class="wsActionTooltip" rel="protein">Amino Acid</div>';
  var viewMSATT = new TooltipDialog({
    content: mmc,
    onMouseLeave: function () {
      popup.close(viewMSATT);
    }
  });

  var vfc = '<div class="wsActionTooltip" rel="dna">View FASTA DNA</div><div class="wsActionTooltip" rel="protein">View FASTA Proteins</div>';
  var viewFASTATT = new TooltipDialog({
    content: vfc,
    onMouseLeave: function () {
      popup.close(viewFASTATT);
    }
  });


  on(viewMSATT.domNode, 'click', function (evt) {
    var rel = evt.target.attributes.rel.value;
    var sel = viewMSATT.selection;
    var ids = sel.map(function (d) {
      return d.feature_id;
    });
    delete viewMSATT.selection;
    // var idType;

    Topic.publish('/navigate', { href: '/view/MSA/' + rel + '/?in(feature_id,(' + ids.map(encodeURIComponent).join(',') + '))', target: 'blank' });
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
        } else if (d.genome_id) {
          idType = 'genome_id';
        }
      }

      return d[idType];
    });

    Topic.publish('/navigate', { href: '/view/FASTA/' + rel + '/?in(' + idType + ',(' + ids.map(encodeURIComponent).join(',') + '))', target: 'blank' });
  });

  var downloadSelectionTT = new DownloadTooltipDialog({});
  downloadSelectionTT.startup();

  var copySelectionTT = new CopyTooltipDialog({});
  copySelectionTT.startup();

  var idMappingTTDialog = new TooltipDialog({
    style: 'overflow: visible;',
    content: IDMappingTemplate,
    onMouseLeave: function () {
      popup.close(idMappingTTDialog);
    }
  });

  on(idMappingTTDialog.domNode, 'TD:click', function (evt) {
    var rel = evt.target.attributes.rel.value;
    var selection = idMappingTTDialog.selection;
    delete idMappingTTDialog.selection;

    var toIdGroup = (['patric_id', 'feature_id', 'alt_locus_tag', 'refseq_locus_tag', 'protein_id', 'gene_id', 'gi'].indexOf(rel) > -1) ? 'PATRIC' : 'Other';

    Topic.publish('/navigate', { href: '/view/IDMapping/fromId=feature_id&fromIdGroup=PATRIC&fromIdValue=' + selection + '&toId=' + rel + '&toIdGroup=' + toIdGroup, target: 'blank' });
    popup.close(idMappingTTDialog);
  });

  return declare([BorderContainer], {
    'class': 'GridContainer',
    gutters: false,
    gridCtor: null,
    query: '',
    filter: '',
    state: null,
    dataModel: '',
    hashParams: null,
    design: 'headline',
    facetFields: [],
    advancedSearchFields: [],
    enableFilterPanel: true,
    defaultFilter: '',
    store: null,
    apiServer: window.App.dataServiceURL,
    docsServiceURL: window.App.docsServiceURL,
    tutorialLink: 'quick_references/',
    queryOptions: null,
    columns: null,
    enableAnchorButton: false,
    showAutoFilterMessage: true,
    containerType: '',

    _setColumnsAttr: function (columns) {
      if (this.grid) {
        this.grid.set('columns', columns);
      }
      this._set('columns', columns);
    },

    _getColumnsAttr: function (columns) {
      if (this.grid) {
        return this.grid.get('columns');
      }
      return this.columns || {};
    },

    _setContainerTypeAttr: function (containerType) {
      this.containerType = containerType;
      if (this.selectionActionBar) {
        this.selectionActionBar.set('currentContainerWidget', this)
      }
      if (this.itemDetailPanel) {
        this.itemDetailPanel.set('containerWidget', this)
      }
    },

    constructor: function () {
      this._firstView = false;
    },

    postCreate: function () {
      this.inherited(arguments);
      this.watch('state', lang.hitch(this, 'onSetState'));
    },

    onSetState: function (attr, oldState, state) {
      if (!state) {
        return;
      }
      var q = [];

      if (state.search) {
        q.push(state.search);
      }

      // reset filters to default state if search is different
      if (oldState && (state.search != oldState.search)) {
        oldState = {};
      }

      if (state.hashParams && state.hashParams.filter && state.hashParams.filter == 'false') {
        // console.log("Filters Disabled By FALSE")
      } else if (state.hashParams) {
        if (state.hashParams.filter) {
          // console.log("Using Filter from Hash Params: ", state.hashParams.filter);
          q.push(state.hashParams.filter);
        } else if (!oldState && this.defaultFilter) {
          // console.log("Using Default Filter as Hash Params Filter", this.defaultFilter)
          state.hashParams.filter = this.defaultFilter;
          this.set('state', lang.mixin({}, state));
          return;
        } else if (oldState && oldState.hashParams && oldState.hashParams.filter) {
          // console.log("Using oldState HashParams Filter", oldState.hashParams.filter)
          state.hashParams.filter = oldState.hashParams.filter;
          this.set('state', lang.mixin({}, state));
          return;
        } else if (this.defaultFilter) {
          // console.log("Fallthrough to default Filter: ", this.defaultFilter);
          state.hashParams.filter = this.defaultFilter;
          this.set('state', lang.mixin({}, state));
          return;
        } else {
          // console.log("    hmmm shouldn't get here if we have defaultFilter:", this.defaultFilter)

        }

        if (state.hashParams.defaultSort) {
          var sp = state.hashParams.defaultSort.split(',');
          var sort = sp.map(function (s) {
            var r = {};
            if (s.charAt(0) == '+') {
              r.descending = false;
              r.attribute = s.substr(1);
            } else if (s.charAt(0) == '-') {
              r.descending = true;
              r.attribute = s.substr(1);
            } else {
              r.attribute = s;
            }
            return r;
          });

          this.set('queryOptions', { sort: sort });

          if (this.grid) {
            console.log('Set Default Sort: ', sort);
            this.grid.set('sort', sort);
          }
        }


      } else {
        state.hashParams = {};
        if (!oldState && this.defaultFilter) {
          // console.log("No OldState or Provided Filters, use default: ", this.defaultFilter)
          state.hashParams.filter = this.defaultFilter;
        } else if (oldState && oldState.hashParams && oldState.hashParams.filter) {
          // console.log("Fall through to oldState hashparams filter");
          state.hashParams.filter = oldState.hashParams.filter;
        }
        this.set('state', lang.mixin({}, state));
        return;
      }

      if (this.enableFilterPanel && this.filterPanel) {
        // console.log("GridContainer call filterPanel set state: ", state.hashParams.filter, state)
        this.filterPanel.set('state', lang.mixin({}, state, { hashParams: lang.mixin({}, state.hashParams) }));
      }

      if (this.showAutoFilterMessage && state.autoFilterMessage) {
        var msg = '<table><tr style="background: #f9ff85;"><td><div class="WarningBanner">' + state.autoFilterMessage + "&nbsp;<i class='fa-1x icon-question-circle-o DialogButton' rel='help:/misc/GenomesLimit' /></div></td><td style='width:30px;'><i style='font-weight:400;color:#333;cursor:pointer;' class='fa-1x icon-cancel-circle close closeWarningBanner' style='color:#333;font-weight:200;'></td></tr></table>";
        // var msg = state.autoFilterMessage;
        if (!this.messagePanel) {
          this.messagePanel = new ContentPane({
            'class': 'WarningPanel',
            region: 'top',
            content: msg
          });

          var _self = this;
          on(this.messagePanel.domNode, '.closeWarningBanner:click', function (evt) {
            if (_self.messagePanel) {
              _self.removeChild(_self.messagePanel);
            }
          });
        } else {
          this.messagePanel.set('content', msg);
        }
        this.addChild(this.messagePanel);
      } else {
        if (this.messagePanel) {
          this.removeChild(this.messagePanel);
        }
      }

      this.set('query', q.join('&'));

    },
    _setQueryAttr: function (query) {

      if (query == this.query) {
        return;
      }

      this.query = query;

      if (this.grid) {
        this.grid.set('query', query);
      }
    },

    _setApiServer: function (server) {
      this._set('apiServer', server);
      if (this.grid) {
        this.grid.set('apiServer', server);
      }
    },

    visible: false,
    _setVisibleAttr: function (visible) {
      this.visible = visible;
      if (this.visible && !this._firstView) {
        this.onFirstView();
      }
    },
    containerActions: [],
    selectionActions: [
      [
        'ToggleItemDetail',
        'fa icon-chevron-circle-right fa-2x',
        {
          label: 'HIDE',
          persistent: true,
          validTypes: ['*'],
          tooltip: 'Toggle Details Pane'
        },
        function (selection, container, button) {

          var children = this.getChildren();
          if (children.some(function (child) {
            return this.itemDetailPanel && (child.id == this.itemDetailPanel.id);
          }, this)) {
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
        'UserGuide',
        'fa icon-info-circle fa-2x',
        {
          label: 'GUIDE',
          persistent: true,
          validTypes: ['*'],
          tooltip: 'Open Quick Reference Guide in a new Tab'
        },
        function () {
          window.open(PathJoin(this.docsServiceURL, this.tutorialLink));
        },
        true
      ], [
        'DownloadSelection',
        'fa icon-download fa-2x',
        {
          label: 'DWNLD',
          multiple: true,
          validTypes: ['*'],
          ignoreDataType: true,
          tooltip: 'Download Selection',
          max: 10000,
          tooltipDialog: downloadSelectionTT,
          validContainerTypes: ['genome_data', 'sequence_data', 'feature_data', 'protein_data', 'spgene_data', 'spgene_ref_data', 'transcriptomics_experiment_data', 'transcriptomics_sample_data', 'experiment_data', 'bioset_data', 'pathway_data', 'transcriptomics_gene_data', 'gene_expression_data', 'interaction_data', 'genome_amr_data', 'structure_data', 'proteinFeatures_data', 'pathwayTab_data', 'subsystemTab_data', 'epitope_data', 'surveillance_data', 'serology_data']
        },
        function (selection, container) {

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
        'CopySelection',
        'fa icon-clipboard2 fa-2x',
        {
          label: 'COPY ROWS',
          multiple: true,
          validTypes: ['*'],
          ignoreDataType: true,
          tooltip: 'Copy Selection to Clipboard.',
          tooltipDialog: copySelectionTT,
          max: 5000,
          validContainerTypes: ['genome_data', 'sequence_data', 'feature_data', 'protein_data', 'spgene_data', 'spgene_ref_data', 'transcriptomics_experiment_data', 'transcriptomics_sample_data', 'pathway_data', 'transcriptomics_gene_data', 'gene_expression_data', 'interaction_data', 'genome_amr_data', 'pathway_summary_data', 'subsystem_data', 'structure_data', 'proteinFeatures_data', 'pathwayTab_data', 'subsystemTab_data', 'surveillance_data', 'serology_data', 'strain_data', 'epitope_data']
        },
        function (selection, container) {
          this.selectionActionBar._actions.CopySelection.options.tooltipDialog.set('selection', selection);
          this.selectionActionBar._actions.CopySelection.options.tooltipDialog.set('containerType', this.containerType);
          if (container && container.grid) {
            this.selectionActionBar._actions.CopySelection.options.tooltipDialog.set('grid', container.grid);
          }

          this.selectionActionBar._actions.CopySelection.options.tooltipDialog.timeout(3500);

          setTimeout(lang.hitch(this, function () {
            popup.open({
              popup: this.selectionActionBar._actions.CopySelection.options.tooltipDialog,
              around: this.selectionActionBar._actions.CopySelection.button,
              orient: ['below']
            });
          }), 10);

        },
        false
      ], [
        'Services',
        'fa icon-cog fa-2x',
        {
          label: 'SERVICES',
          multiple: true,
          max: 100,
          tooltip: 'Submit selection to a service',
          validTypes: ['*'], // TODO: check this
          validContainerTypes: ['*'] // TODO: probably have to change this instead
        },
        function (selection, container, button) {
          // TODO: containerTypes: amr(?), sequence_data, feature_data, structure_data, spgene_data, proteinFeatures_data, pathway_data, subsystems(?)
          console.log('selection=', selection);
          console.log('container=', container);
          var data_type = null;
          var params = {};
          var type;
          if (container.containerType === 'sequence_data' || container.containerType == 'genome_data') {
            type = 'genome';
            data_type = 'genome';
          } else if (container.containerType == 'feature_data' || container.containerType == 'protein_data' || container.containerType == 'transcriptomics_gene_data' || container.containerType == 'spgene_data' || container.containerType == 'strain_data') {
            type = 'feature_group';
            data_type = 'feature';
          } else if (container.containerType == 'transcriptomics_experiment_data') {
            type = 'experiment_group';
          }
          if (!type) {
            console.error('Missing or invalid type for Services');
            return;
          }
          if (!data_type) {
            data_type = '';
          }
          // params.type = type;
          params.selection = selection;
          params.data_type = data_type;
          params.type = type;
          popup.open({
            popup: new ServicesTooltipDialog({
              context: 'grid_container',
              button: button,
              data: params,
            }),
            parent: this,
            around: button,
            orient: ['below'],
            onClose: function () {
              console.log('closing');
            }
          });
        },
        false
      ],  [
        'ViewFeatureItem',
        'MultiButton fa icon-selection-Feature fa-2x',
        {
          label: 'FEATURE',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'Switch to Feature View. Press and Hold for more options.',
          validContainerTypes: ['feature_data', 'protein_data', 'transcriptomics_gene_data', 'structure_data', 'proteinFeatures_data', 'pathwayTab_data', 'subsystemTab_data'],
          pressAndHold: function (selection, button, opts, evt) {
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
          Topic.publish('/navigate', {
            href: '/view/Feature/' + sel.feature_id + '#view_tab=overview',
            target: 'blank'
          });
        },
        false
      ],  [
        'ViewFeatureItems',
        'MultiButton fa icon-selection-FeatureList fa-2x',
        {
          label: 'FEATURES',
          validTypes: ['*'],
          multiple: true,
          min: 2,
          max: 5000,
          tooltip: 'Switch to Feature List View. Press and Hold for more options.',
          validContainerTypes: ['feature_data', 'protein_data', 'transcriptomics_gene_data', 'spgene_data', 'subsystem_data'],
          pressAndHold: function (selection, button, opts, evt) {
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
            }).join(',') + '))'
          });
        },
        false
      ],  [
        'ViewSubsystemsFeatureList',
        'MultiButton fa icon-selection-SequenceList fa-2x',
        {
          label: 'SUBSYSTEMS',
          validTypes: ['*'],
          multiple: true,
          min: 1,
          max: 5000,
          tooltip: 'View Subsystems in Feature List.',
        }, function (selection) {
          var feature_list = selection.map(x => x.feature_id);
          var new_query = '?in(feature_id,(' + feature_list.join(',') + '))';
          Topic.publish('/navigate', { href: '/view/SubsystemList/' + new_query, target: 'blank' });
        },
        false
      ],  [
        'ViewPathwaysFeatureList',
        'MultiButton fa icon-git-pull-request fa-2x',
        {
          label: 'PATHWAYS',
          validTypes: ['*'],
          multiple: true,
          min: 1,
          max: 5000,
          tooltip: 'View Pathways in Feature List.',
        }, function (selection) {
          var feature_list = selection.map(x => x.feature_id);
          var new_query = '?in(feature_id,(' + feature_list.join(',') + '))';
          Topic.publish('/navigate', { href: '/view/PathwayList/' + new_query, target: 'blank' });
        },
        false
      ],  [
        'ViewSpgeneItem',
        'MultiButton fa icon-selection-Feature fa-2x',
        {
          label: 'FEATURE',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'Switch to Feature View. Press and Hold for more options.',
          validContainerTypes: ['spgene_data'],
          pressAndHold: function (selection, button, opts, evt) {
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
          Topic.publish('/navigate', {
            href: '/view/Feature/' + sel.feature_id,
            target: 'blank'
          });
        },
        false
      ], [
        'ViewSpgeneEvidence',
        'MultiButton fa icon-selection-VirulenceFactor fa-2x',
        {
          label: 'VF EVID',
          validTypes: ['*'],
          multiple: false,
          validContainerTypes: ['spgene_data', 'spgene_ref_data'],
          tooltip: 'View Specialty Gene Evidence'
        },
        function (selection) {
          var sel = selection[0];
          Topic.publish('/navigate', {
            href: '/view/SpecialtyGeneEvidence/' + sel.source_id,
            target: 'blank'
          });
        },
        false
      ], [
        'ViewGenomeItemFromGenome',
        'MultiButton fa icon-selection-Genome fa-2x',
        {
          label: 'GENOME',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'Switch to Genome View. Press and Hold for more options.',
          validContainerTypes: ['genome_data'],
          pressAndHold: function (selection, button, opts, evt) {
            popup.open({
              popup: new PerspectiveToolTipDialog({ perspectiveUrl: '/view/Genome/' + selection[0].genome_id }),
              around: button,
              orient: ['below']
            });

          }
        },
        function (selection) {
          var sel = selection[0];
          Topic.publish('/navigate', {
            href: '/view/Genome/' + sel.genome_id,
            target: 'blank'
          });
        },
        false
      ], [
        'ViewGenomeItem',
        'MultiButton fa icon-selection-Genome fa-2x',
        {
          label: 'GENOME',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'Switch to Genome View. Press and Hold for more options.',
          ignoreDataType: true,
          validContainerTypes: ['sequence_data', 'feature_data', 'protein_data', 'spgene_data', 'sequence_data', 'structure_data', 'proteinFeatures_data', 'pathwayTab_data', 'subsystemTab_data'],
          pressAndHold: function (selection, button, opts, evt) {
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
          Topic.publish('/navigate', { href: '/view/Genome/' + sel.genome_id });
        },
        false
      ], [
        'ViewStructureItem',
        'MultiButton fa icon-selection-Sequence fa-2x',
        {
          label: 'STRUCTURE',
          validTypes: ['*'],
          multiple: true,
          max: 10,
          tooltip: 'Switch to Structure View. Press and Hold for more options.',
          ignoreDataType: true,
          validContainerTypes: ['structure_data'],
          pressAndHold: function (selection, button, opts, evt) {
            popup.open({
              popup: new PerspectiveToolTipDialog({ perspectiveUrl: '/view/ProteinStructure#accession=' + selection[0].pdb_id }),
              around: button,
              orient: ['below'],
            });

          }
        },
        function (selection) {
          var sel = selection.map(s => s.pdb_id);
          Topic.publish('/navigate', { href: '/view/ProteinStructure#accession=' + sel, target: 'blank' });
        },
        false
      ],

      [
        'ViewSurveillanceItem',
        'MultiButton fa icon-selection-Sequence fa-2x',
        {
          label: 'SURVEILLANCE',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'Switch to Surveillance View. Press and Hold for more options.',
          ignoreDataType: true,
          validContainerTypes: ['surveillance_data'],
          pressAndHold: function (selection, button, opts, evt) {
            popup.open({
              popup: new PerspectiveToolTipDialog({ perspectiveUrl: '/view/Surveillance/' + selection[0].sample_identifier }),
              around: button,
              orient: ['below'],
            });

          }
        },
        function (selection) {
          var sel = selection[0];
          Topic.publish('/navigate', { href: '/view/Surveillance/' + sel.sample_identifier, target: 'blank' });
        },
        false
      ],

      [
        'ViewSurveillanceMapItem',
        'MultiButton fa icon-map-o fa-2x',
        {
          label: 'MAP',
          validTypes: ['*'],
          multiple: true,
          max: 5000,
          tooltip: 'Switch to Surveillance Data Map View.',
          ignoreDataType: true,
          validContainerTypes: ['surveillance_data']
        },
        function (selection) {
          const idList = Array.from(selection.reduce((p, v) => {
            return p.add(v.id)
          }, new Set()));
          Topic.publish('/navigate', {
            href: '/view/SurveillanceDataMap/?in(id,(' + idList.join(',') + '))',
            target: 'blank'
          });
        },
        false
      ],

      [
        'ViewSerologyItem',
        'MultiButton fa icon-selection-Sequence fa-2x',
        {
          label: 'SEROLOGY',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'Switch to Serology View. Press and Hold for more options.',
          ignoreDataType: true,
          validContainerTypes: ['serology_data'],
          pressAndHold: function (selection, button, opts, evt) {
            popup.open({
              popup: new PerspectiveToolTipDialog({ perspectiveUrl: '/view/Serology/' + selection[0].sample_identifier }),
              around: button,
              orient: ['below'],
            });

          }
        },
        function (selection) {
          var sel = selection[0];
          Topic.publish('/navigate', { href: '/view/Serology/' + sel.sample_identifier, target: 'blank' });
        },
        false
      ],

      [
        'ViewEpitopeItem',
        'MultiButton fa icon-selection-Experiment fa-2x',
        {
          label: 'EPITOPE',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'Switch to Epitope View. Press and Hold for more options.',
          ignoreDataType: true,
          validContainerTypes: ['epitope_data'],
          pressAndHold: function (selection, button, opts, evt) {
            popup.open({
              popup: new PerspectiveToolTipDialog({ perspectiveUrl: '/view/Epitope/' + selection[0].epitope_id }),
              around: button,
              orient: ['below'],
            });

          }
        },
        function (selection) {
          var sel = selection[0];
          Topic.publish('/navigate', { href: '/view/Epitope/' + sel.epitope_id, target: 'blank' });
        },
        false
      ],

      [
        'ViewGenomeItems',
        'MultiButton fa icon-selection-GenomeList fa-2x',
        {
          label: 'GENOMES',
          validTypes: ['*'],
          multiple: true,
          min: 2,
          max: 0,
          tooltip: 'Switch to Genome List View. Press and Hold for more options.',
          ignoreDataType: true,
          validContainerTypes: ['genome_data', 'sequence_data', 'feature_data', 'protein_data', 'spgene_data', 'sequence_data'],
          pressAndHold: function (selection, button, opts, evt) {
            const genome_ids = Array.from(selection.reduce((p, v) => { return p.add(v.genome_id) }, new Set()))
            popup.open({
              popup: new PerspectiveToolTipDialog({
                perspective: 'GenomeList',
                perspectiveUrl: '/view/GenomeList/?eq(*,*)&genome(in(genome_id,(' + genome_ids.join(',') + ')))'
              }),
              around: button,
              orient: ['below']
            });
          }
        },
        function (selection) {
          const genome_ids = Array.from(selection.reduce((p, v) => { return p.add(v.genome_id) }, new Set()))
          Topic.publish('/navigate', { href: '/view/GenomeList/?eq(*,*)&genome(in(genome_id,(' + genome_ids.join(',') + ')))' });
        },
        false
      ],
      [
        'ViewCDSFeaturesSeq',
        'MultiButton fa icon-selection-FeatureList fa-2x',
        {
          label: 'FEATURES',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'Switch to Feature List View. Press and Hold for more options.',
          validContainerTypes: ['sequence_data'],
          pressAndHold: function (selection, button, opts, evt) {
            popup.open({
              popup: new PerspectiveToolTipDialog({
                perspective: 'FeatureList',
                perspectiveUrl: '/view/FeatureList/?and(eq(annotation,PATRIC),eq(feature_type,CDS),eq(sequence_id,' + selection[0].sequence_id + '))'
              }),
              around: button,
              orient: ['below']
            });
          }
        },
        function (selection) {
          var sel = selection[0];
          Topic.publish('/navigate', { href: '/view/FeatureList/?and(eq(annotation,PATRIC),eq(sequence_id,' + sel.sequence_id + '),eq(feature_type,CDS))' });
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
          max: 5000,
          tooltip: 'View FASTA Data',
          tooltipDialog: viewFASTATT,
          validContainerTypes: ['feature_data', 'protein_data', 'spgene_data', 'transcriptomics_gene_data', 'pathway_data', 'sequence_data']
        },
        function (selection, containerWidget) {
          switch (containerWidget.containerType) {
            case 'pathway_data':
              var queryContext = containerWidget.grid.store.state.search;
              if (containerWidget.grid.store.state.hashParams.filter != 'false') {
                queryContext += '&' + containerWidget.grid.store.state.hashParams.filter;
              }

              var self = this;
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
                    viewFASTATT.selection = response;

                    popup.open({
                      popup: self.selectionActionBar._actions.ViewFASTA.options.tooltipDialog,
                      around: self.selectionActionBar._actions.ViewFASTA.button,
                      orient: ['below']
                    });
                  });
                  break;
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
                    viewFASTATT.selection = response;

                    popup.open({
                      popup: self.selectionActionBar._actions.ViewFASTA.options.tooltipDialog,
                      around: self.selectionActionBar._actions.ViewFASTA.button,
                      orient: ['below']
                    });
                  });
                  break;
                case 'gene':
                  viewFASTATT.selection = selection;
                  popup.open({
                    popup: self.selectionActionBar._actions.ViewFASTA.options.tooltipDialog,
                    around: self.selectionActionBar._actions.ViewFASTA.button,
                    orient: ['below']
                  });
                  break;
                default:
                  break;
              }
              break;
            default:
              viewFASTATT.selection = selection;
              popup.open({
                popup: this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog,
                around: this.selectionActionBar._actions.ViewFASTA.button,
                orient: ['below']
              });
              break;
          }
        },
        false
      ], [
        'MultipleSeqAlignmentFeaturesService',
        'fa icon-alignment fa-2x',
        {
          label: 'MSA',
          ignoreDataType: true,
          min: 2,
          multiple: true,
          max: 200,
          validTypes: ['*'],
          tooltipDialog: viewMSATT,
          tooltip: 'Multiple Sequence Alignment',
          validContainerTypes: ['feature_data', 'protein_data', 'spgene_data', 'proteinfamily_data', 'pathway_data', 'transcriptomics_gene_data']
        },
        function (selection) {
          const checkTEMP = function (tmp_path) {
            WorkspaceManager.createFolder(tmp_path).then(lang.hitch(this, function (tmp_record) {
              console.log('creating temporary group folder');
            }), lang.hitch(this, function (err) {
              console.log('temporary group folder already created');
            }));
          };
          var hidden_group_path = WorkspaceManager.getDefaultFolder() + '/home/._tmp_groups';
          var group_name = 'tmp_feature_group_' + Date.now();
          var group_path = hidden_group_path + '/' + group_name;
          console.log('tmp_group = ', group_name);
          checkTEMP(hidden_group_path);
          try {
            this.loadingMask = new Standby({
              target: this.id,
              image: '/public/js/p3/resources/images/spin.svg',
              color: '#efefef'
            });
            this.addChild(this.loadingMask);
            this.loadingMask.startup();
            this.loadingMask.show();
            var feature_id_list = selection.filter(lang.hitch(this, function (d) {
              return 'feature_id' in d;
            })).map(lang.hitch(this, function (o) {
              return o['feature_id'];
            }));
            WorkspaceManager.createGroup(group_name, 'feature_group', hidden_group_path, 'feature_id', feature_id_list).then(lang.hitch(this, function (res) {
              this.loadingMask.hide();
              var job_data = {
                'feature_groups': [group_path],
                'alphabet': 'dna',
                'aligner': 'Muscle',
                'input_type': 'input_group'
              };
              RerunUtility.rerun(JSON.stringify(job_data), 'MSA', window, Topic);
            }));
          } catch (error) {
            console.log('error creating feature group: ', error);
            if (this.loadingMask) {
              this.loadingMask.hide();
            }
          }
        },
        false
      ], [
        'idmapping',
        'fa icon-exchange fa-2x',
        {
          label: 'ID MAP',
          ignoreDataType: true,
          min: 1,
          multiple: true,
          max: 1000,
          validTypes: ['*'],
          tooltip: 'ID Mapping',
          tooltipDialog: idMappingTTDialog,
          validContainerTypes: ['feature_data', 'protein_data', 'spgene_data', 'transcriptomics_gene_data', 'proteinfamily_data', 'pathway_data']
        },
        function (selection, containerWidget) {

          var self = this;
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
                idMappingTTDialog.selection = ids.join(',');
                popup.open({
                  popup: idMappingTTDialog,
                  around: self.selectionActionBar._actions.idmapping.button,
                  orient: ['before-centered']
                });
              });

              return;
            // break;
            case 'pathway_data':
              var queryContext = containerWidget.grid.store.state.search;
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

                    idMappingTTDialog.selection = ids.join(',');
                    popup.open({
                      popup: idMappingTTDialog,
                      around: self.selectionActionBar._actions.idmapping.button,
                      orient: ['before-centered']
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

                    idMappingTTDialog.selection = ids.join(',');
                    popup.open({
                      popup: idMappingTTDialog,
                      around: self.selectionActionBar._actions.idmapping.button,
                      orient: ['before-centered']
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
              ids = selection.map(function (d) {
                return d.feature_id;
              });
              break;
          }

          idMappingTTDialog.selection = ids.join(',');
          popup.open({
            popup: idMappingTTDialog,
            around: this.selectionActionBar._actions.idmapping.button,
            orient: ['before-centered']
          });
        },
        false
      ], [
        'ExperimentComparison',
        'fa icon-selection-Experiment fa-2x',
        {
          label: 'EXPRMNT',
          multiple: false,
          validTypes: ['*'],
          validContainerTypes: ['experiment_data'],
          tooltip: 'View Experiment'
        },
        function (selection) {
          var experimentIdList = selection.map(function (exp) {
            return exp.exp_id;
          });
          Topic.publish('/navigate', {
            href: '/view/ExperimentComparison/' + experimentIdList + '#view_tab=overview',
            target: 'blank'
          });
        },
        false
      ], [
        'ExperimentList',
        'fa icon-selection-ExperimentList fa-2x',
        {
          label: 'EXPRMNTS',
          multiple: true,
          min: 2,
          max: 5000,
          validTypes: ['*'],
          validContainerTypes: ['experiment_data'],
          tooltip: 'View Experiment List'
        },
        function (selection) {
          var experimentIdList = selection.map(function (exp) {
            return exp.exp_id;
          });

          Topic.publish('/navigate', {
            href: '/view/ExperimentList/?in(exp_id,(' + experimentIdList.join(',') + '))#view_tab=experiments',
            target: 'blank'
          });
        },
        false
      ], [
        'ExperimentGeneList',
        'fa icon-list-unordered fa-2x',
        {
          label: 'BIOSETS',
          multiple: true,
          validTypes: ['*'],
          max: 5000,
          validContainerTypes: ['experiment_data', 'bioset_data'],
          tooltip: 'View Experiment Gene List'
        },
        function (selection) {
          const experimentIdSet = new Set(selection.map(function (exp) {
            return exp.exp_id;
          }))

          Topic.publish('/navigate', {
            href: '/view/BiosetResult/?in(exp_id,(' + Array.from(experimentIdSet).join(',') + '))',
            target: 'blank'
          });
        },
        false
      ], [
        'PathwaySummary',
        'fa icon-git-pull-request fa-2x',
        {
          label: 'PTHWY',
          ignoreDataType: true,
          multiple: true,
          max: 5000,
          validTypes: ['*'],
          tooltip: 'Pathway Summary',
          validContainerTypes: ['spgene_data', 'transcriptomics_gene_data', 'proteinfamily_data', 'pathway_data', 'pathwayTab_data']
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
          validTypes: ['*'],
          requireAuth: true,
          max: 10000,
          tooltip: 'Add selection to a new or existing group',
          validContainerTypes: ['genome_data', 'feature_data', 'protein_data', 'transcriptomics_experiment_data', 'transcriptomics_gene_data', 'spgene_data']
        },
        function (selection, containerWidget) {
          var dlg = new Dialog({ title: 'Add selected items to group' });
          var type;

          if (!containerWidget) {
            return;
          }

          if (containerWidget.containerType == 'genome_data') {
            type = 'genome_group';
          } else if (containerWidget.containerType == 'feature_data' || containerWidget.containerType == 'protein_data' || containerWidget.containerType == 'transcriptomics_gene_data' || containerWidget.containerType == 'spgene_data') {
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
      ], [
        'Share',
        'fa icon-user-plus fa-2x',
        {
          label: 'SHARE',
          ignoreDataType: true,
          multiple: true,
          validTypes: ['*'],
          requireAuth: true,
          tooltip: 'Share genome(s) with other users',
          validContainerTypes: ['genome_data']
        },
        function (selection, containerWidget) {
          var self = this;

          var initialPerms = DataAPI.solrPermsToObjs(selection);

          var onConfirm = function (newPerms) {
            var ids = selection.map(function (sel) {
              return sel.genome_id;
            });

            Topic.publish('/Notification', {
              message: "<span class='default'>Updating permissions (this could take several minutes)...</span>",
              type: 'default',
              duration: 50000
            });

            var prom = DataAPI.setGenomePermissions(ids, newPerms);
            Deferred.when(prom).then(function (res) {

              Topic.publish('/Notification', {
                message: 'Permissions updated.',
                type: 'message'
              });
              self.grid.refresh();

            }, function (err) {
              console.log('error', err);
              Topic.publish('/Notification', {
                message: 'Failed. ' + err.response.status,
                type: 'error'
              });
            });
          };

          var permEditor = new PermissionEditor({
            selection: selection,
            onConfirm: onConfirm,
            // onCancel: onCancel,
            user: window.App.user.id || '',
            useSolrAPI: true,
            permissions: initialPerms
          });

          permEditor.show();
        },
        false
      ], [
        'ViewTaxon',
        'fa icon-eye fa-2x',
        {
          label: 'TAXON OVERVIEW',
          multiple: false,
          validTypes: ['*'],
          tooltip: 'Switch to Taxon Overview for the selected taxa and access genomes or genes/proteins associated with it. Press and Hold for more options.',
          validContainerTypes: ['taxonomy_data', 'taxon_data'],
          pressAndHold: function (selection, button, opts, evt) {
            popup.open({
              popup: new PerspectiveToolTipDialog({
                perspective: 'Taxonomy',
                perspectiveUrl: '/view/Taxonomy/' + selection[0].taxon_id
              }),
              around: button,
              orient: ['below']
            });
          }
        },
        function (selection) {
          var sel = selection[0];
          Topic.publish('/navigate', { href: '/view/Taxonomy/' + sel.taxon_id + '#view_tab=overview' });
        },
        false
      ], [
        'ViewGenomeFromTaxon',
        'MultiButton fa icon-selection-GenomeList fa-2x',
        {
          label: 'GENOMES',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'Switch to the Genomes tab view for the selected taxon.',
          ignoreDataType: true,
          validContainerTypes: ['taxonomy_data'],
        },
        function (selection) {
          var sel = selection[0];
          Topic.publish('/navigate', { href: '/view/Taxonomy/' + sel.taxon_id + '#view_tab=genomes' });
        },
      ], [
        'ViewFeatureFromTaxon',
        'MultiButton fa icon-selection-FeatureList fa-2x',
        {
          label: 'FEATURES',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'Switch to the Features / Proteins tab view for the selected taxon.',
          ignoreDataType: true,
          validContainerTypes: ['taxonomy_data'],
        },
        function (selection) {
          var sel = selection[0];
          Topic.publish('/navigate', { href: '/view/Taxonomy/' + sel.taxon_id + '#view_tab=features' });
        },
      ],
      [
        'ViewGenomesFromTaxons',
        'fa icon-selection-GenomeList fa-2x',
        {
          label: 'GENOMES',
          multiple: true,
          min: 2,
          validTypes: ['*'],
          tooltip: 'Switch to Genome List View. Press and Hold for more options.',
          tooltipDialog: downloadSelectionTT,
          validContainerTypes: ['taxonomy_data', 'taxon_data'],
          pressAndHold: function (selection, button, opts, evt) {
            var map = {};
            selection.forEach(function (sel) {
              if (!map[sel.taxon_id]) {
                map[sel.taxon_id] = true;
              }
            });
            var taxonIds = Object.keys(map);
            popup.open({
              popup: new PerspectiveToolTipDialog({
                perspective: 'GenomeList',
                perspectiveUrl: '/view/GenomeList/?in(taxon_lineage_ids,(' + taxonIds.join(',') + '))'
              }),
              around: button,
              orient: ['below']
            });
          }
        },
        function (selection) {
          var map = {};
          selection.forEach(function (sel) {
            if (!map[sel.taxon_id]) {
              map[sel.taxon_id] = true;
            }
          });
          var taxonIds = Object.keys(map);
          Topic.publish('/navigate', { href: '/view/GenomeList/?in(taxon_lineage_ids,(' + taxonIds.join(',') + '))#view_tab=overview' });
        },
        false
      ],
      [
        'ViewFeatureDetails',
        'MultiButton fa icon-pie-chart fa-2x',
        {
          label: 'FEATURE DETAILS',
          validTypes: ['*'],
          multiple: true,
          validContainerTypes: [],
          tooltip: 'View Feature Details Menu',
          pressAndHold: function (selection, button, opts, evt) {
            popup.open({
              popup: new FeatureDetailsTooltipDialog({
                perspective: 'FeatureDetails'
                // perspectiveUrl: '/view/GenomeList/'
              }),
              around: button,
              orient: ['below']
            });
          }
        },
        function (selection) {
          var genome_id = selection[0].genome_id;
          var selectionList = selection.map(function (sel) {
            return sel.feature_id;
          });

          popup.open({
            popup: new FeatureDetailsTooltipDialog({
              genome_id: genome_id,
              selectionList: selectionList,
              perspective: 'FeatureDetails',
              perspectiveUrl: '/view/GenomeList/'
            }),
            around: this.selectionActionBar._actions['ViewFeatureDetails'].button,
            orient: ['below', 'above']
          });
        }
      ]
      /*
      [
        'ViewVirulenceFactor',
        'MultiButton fa icon-selection-VirulenceFactor fa-2x',
        {
          label: 'VIRULENCE',
          validTypes: ['*'],
          multiple: true,
          validContainerTypes: ['feature_data'],
          tooltip: 'View Virulence Factors'
        },
        function (selection) {
          var selectionList = selection.map(function (sel) {
            return sel.feature_id;
          });
          Topic.publish('/navigate', {
            href: '/view/GenomeList/#view_tab=specialtyGenes&filter=and(eq(property,"Virulence%20Factor"),in(feature_id,(' + selectionList.join(',') + ')))',
            target: 'blank'
          });
        },
        false
      ],
      [
        'ViewSubsystems',
        //'MultiButton fa icon-hub fa-2x',
        'MultiButton fa icon-pie-chart fa-2x',
        {
          label: 'SUBSYS',
          validTypes: ['*'],
          multiple: true,
          validContainerTypes: ['feature_data'],
          tooltip: 'View Subsystems'
        },
        function (selection) {
          var genome_id = selection[0].genome_id;
          var selectionList = selection.map(function (sel) {
            return sel.feature_id;
          });
          //https://www.patricbrc.org/view/GenomeList/?in(genome_id,(242231.10))#view_tab=subsystems&filter=in(PATRIC.24431.10.NC_002946.CDS.14081.14431.rev))
          //https://www.patricbrc.org/view/GenomeList/#view_tab=subsystems&filter=in(PATRIC.242231.10.NC_002946.CDS.14081.14431.rev,PATRIC.242231.10.NC_002946.CDS.14438.15211.rev,PATRIC.242231.10.NC_002946.CDS.16000.16656.fwd,PATRIC.242231.10.NC_002946.CDS.19763.20086.rev,PATRIC.242231.10.NC_002946.CDS.49539.49928.rev,PATRIC.242231.10.NC_002946.CDS.58575.59084.fwd,PATRIC.242231.10.NC_002946.CDS.59425.59865.fwd,PATRIC.242231.10.NC_002946.CDS.59981.60481.fwd,PATRIC.242231.10.NC_002946.CDS.60497.61192.fwd,PATRIC.242231.10.NC_002946.CDS.64986.66860.fwd,PATRIC.242231.10.NC_002946.CDS.111184.111813.rev,PATRIC.242231.10.NC_002946.CDS.122259.123572.fwd,PATRIC.242231.10.NC_002946.CDS.127825.128268.fwd,PATRIC.242231.10.NC_002946.CDS.130990.132033.rev,PATRIC.242231.10.NC_002946.CDS.132575.133729.fwd,PATRIC.242231.10.NC_002946.CDS.136192.136407.fwd,PATRIC.242231.10.NC_002946.CDS.148156.148692.rev,PATRIC.242231.10.NC_002946.CDS.148948.150228.fwd,PATRIC.242231.10.NC_002946.CDS.160452.160781.fwd,PATRIC.242231.10.NC_002946.CDS.161341.162240.fwd,PATRIC.242231.10.NC_002946.CDS.163129.163938.fwd,PATRIC.242231.10.NC_002946.CDS.169527.169946.rev,PATRIC.242231.10.NC_002946.CDS.174534.175283.rev,PATRIC.242231.10.NC_002946.CDS.178639.180045.rev,PATRIC.242231.10.NC_002946.CDS.186327.187391.rev,PATRIC.242231.10.NC_002946.CDS.188256.189374.rev,PATRIC.242231.10.NC_002946.CDS.192979.193248.fwd,PATRIC.242231.10.NC_002946.CDS.198352.199818.rev,PATRIC.242231.10.NC_002946.CDS.211238.211768.fwd,PATRIC.242231.10.NC_002946.CDS.219148.220665.rev,PATRIC.242231.10.NC_002946.CDS.229300.229722.fwd,PATRIC.242231.10.NC_002946.CDS.230221.230445.fwd,PATRIC.242231.10.NC_002946.CDS.234399.234926.rev,PATRIC.242231.10.NC_002946.CDS.246159.246692.fwd,PATRIC.242231.10.NC_002946.CDS.250669.251280.rev,PATRIC.242231.10.NC_002946.CDS.255473.255796.rev,PATRIC.242231.10.NC_002946.CDS.260589.261215.rev,PATRIC.242231.10.NC_002946.CDS.261274.261765.rev,PATRIC.242231.10.NC_002946.CDS.285662.286081.fwd,PATRIC.242231.10.NC_002946.CDS.293777.294244.rev,PATRIC.242231.10.NC_002946.CDS.296917.298863.fwd,PATRIC.242231.10.NC_002946.CDS.298998.299402.fwd,PATRIC.242231.10.NC_002946.CDS.301440.301778.fwd,PATRIC.242231.10.NC_002946.CDS.315740.317413.fwd,PATRIC.242231.10.NC_002946.CDS.321265.321744.fwd,PATRIC.242231.10.NC_002946.CDS.321872.322366.rev,PATRIC.242231.10.NC_002946.CDS.325142.325576.fwd,PATRIC.242231.10.NC_002946.CDS.327646.328509.rev,PATRIC.242231.10.NC_002946.CDS.334760.335692.fwd,PATRIC.242231.10.NC_002946.CDS.356285.357322.rev,PATRIC.242231.10.NC_002946.CDS.357319.358443.rev,PATRIC.242231.10.NC_002946.CDS.366361.367185.fwd,PATRIC.242231.10.NC_002946.CDS.367229.367891.fwd,PATRIC.242231.10.NC_002946.CDS.367901.368656.fwd,PATRIC.242231.10.NC_002946.CDS.368712.370094.rev,PATRIC.242231.10.NC_002946.CDS.370891.372306.rev,PATRIC.242231.10.NC_002946.CDS.372535.372897.rev,PATRIC.242231.10.NC_002946.CDS.386946.388325.rev,PATRIC.242231.10.NC_002946.CDS.415005.415562.rev,PATRIC.242231.10.NC_002946.CDS.434303.435148.fwd,PATRIC.242231.10.NC_002946.CDS.441352.442173.rev,PATRIC.242231.10.NC_002946.CDS.443377.443709.fwd,PATRIC.242231.10.NC_002946.CDS.455173.456369.fwd,PATRIC.242231.10.NC_002946.CDS.457189.457872.rev,PATRIC.242231.10.NC_002946.CDS.469861.470241.fwd,PATRIC.242231.10.NC_002946.CDS.470508.470915.fwd,PATRIC.242231.10.NC_002946.CDS.472608.472928.fwd,PATRIC.242231.10.NC_002946.CDS.479692.480222.fwd,PATRIC.242231.10.NC_002946.CDS.484505.484954.rev,PATRIC.242231.10.NC_002946.CDS.489283.489588.fwd,PATRIC.242231.10.NC_002946.CDS.491179.491415.rev,PATRIC.242231.10.NC_002946.CDS.493004.493153.fwd,PATRIC.242231.10.NC_002946.CDS.496290.496802.rev,PATRIC.242231.10.NC_002946.CDS.517343.517900.fwd,PATRIC.242231.10.NC_002946.CDS.518016.520079.fwd,PATRIC.242231.10.NC_002946.CDS.531770.532720.fwd,PATRIC.242231.10.NC_002946.CDS.552433.552981.rev,PATRIC.242231.10.NC_002946.CDS.559802.560560.rev,PATRIC.242231.10.NC_002946.CDS.570041.570271.fwd,PATRIC.242231.10.NC_002946.CDS.588393.588800.fwd,PATRIC.242231.10.NC_002946.CDS.592048.593418.rev,PATRIC.242231.10.NC_002946.CDS.604935.606221.rev,PATRIC.242231.10.NC_002946.CDS.621287.621787.rev,PATRIC.242231.10.NC_002946.CDS.622050.622370.rev,PATRIC.242231.10.NC_002946.CDS.622457.622843.rev,PATRIC.242231.10.NC_002946.CDS.623656.623913.rev,PATRIC.242231.10.NC_002946.CDS.623952.625166.rev,PATRIC.242231.10.NC_002946.CDS.625195.625641.rev,PATRIC.242231.10.NC_002946.CDS.637578.638078.fwd,PATRIC.242231.10.NC_002946.CDS.638731.638931.fwd,PATRIC.242231.10.NC_002946.CDS.639282.640670.rev,PATRIC.242231.10.NC_002946.CDS.642627.643100.fwd,PATRIC.242231.10.NC_002946.CDS.644135.645544.fwd,PATRIC.242231.10.NC_002946.CDS.648916.649548.fwd,PATRIC.242231.10.NC_002946.CDS.657180.657608.rev,PATRIC.242231.10.NC_002946.CDS.664838.666109.rev,PATRIC.242231.10.NC_002946.CDS.666979.667233.rev,PATRIC.242231.10.NC_002946.CDS.684728.687388.rev,PATRIC.242231.10.NC_002946.CDS.710377.711393.fwd,PATRIC.242231.10.NC_002946.CDS.712011.712649.rev,PATRIC.242231.10.NC_002946.CDS.728344.728556.rev,PATRIC.242231.10.NC_002946.CDS.733057.734115.fwd,PATRIC.242231.10.NC_002946.CDS.743637.743822.fwd,PATRIC.242231.10.NC_002946.CDS.751362.751976.fwd,PATRIC.242231.10.NC_002946.CDS.785982.786302.fwd,PATRIC.242231.10.NC_002946.CDS.786351.788909.fwd,PATRIC.242231.10.NC_002946.CDS.796814.797470.fwd,PATRIC.242231.10.NC_002946.CDS.804949.805749.fwd,PATRIC.242231.10.NC_002946.CDS.808542.808847.rev,PATRIC.242231.10.NC_002946.CDS.810538.811875.rev,PATRIC.242231.10.NC_002946.CDS.813087.813488.fwd,PATRIC.242231.10.NC_002946.CDS.814566.814907.rev,PATRIC.242231.10.NC_002946.CDS.814963.815721.rev,PATRIC.242231.10.NC_002946.CDS.815760.816323.rev,PATRIC.242231.10.NC_002946.CDS.816596.818614.rev,PATRIC.242231.10.NC_002946.CDS.828583.829788.fwd,PATRIC.242231.10.NC_002946.CDS.839467.840147.fwd,PATRIC.242231.10.NC_002946.CDS.840176.840535.fwd,PATRIC.242231.10.NC_002946.CDS.845774.845992.rev,PATRIC.242231.10.NC_002946.CDS.850163.850492.rev,PATRIC.242231.10.NC_002946.CDS.857066.858004.fwd,PATRIC.242231.10.NC_002946.CDS.860065.860547.fwd,PATRIC.242231.10.NC_002946.CDS.865554.865808.rev,PATRIC.242231.10.NC_002946.CDS.867077.867625.rev,PATRIC.242231.10.NC_002946.CDS.868321.870012.rev,PATRIC.242231.10.NC_002946.CDS.870109.870453.rev,PATRIC.242231.10.NC_002946.CDS.871021.874941.fwd,PATRIC.242231.10.NC_002946.CDS.875018.876019.fwd,PATRIC.242231.10.NC_002946.CDS.878296.878772.rev,PATRIC.242231.10.NC_002946.CDS.880542.881129.rev,PATRIC.242231.10.NC_002946.CDS.887955.888191.rev,PATRIC.242231.10.NC_002946.CDS.903761.904138.rev,PATRIC.242231.10.NC_002946.CDS.909505.910383.rev,PATRIC.242231.10.NC_002946.CDS.923582.924514.rev,PATRIC.242231.10.NC_002946.CDS.931347.932075.rev,PATRIC.242231.10.NC_002946.CDS.932157.932621.rev,PATRIC.242231.10.NC_002946.CDS.957832.958713.rev,PATRIC.242231.10.NC_002946.CDS.977880.978092.rev,PATRIC.242231.10.NC_002946.CDS.978515.978664.rev,PATRIC.242231.10.NC_002946.CDS.980160.980348.rev,PATRIC.242231.10.NC_002946.CDS.992677.994065.fwd,PATRIC.242231.10.NC_002946.CDS.994130.995020.rev,PATRIC.242231.10.NC_002946.CDS.1006130.1008709.fwd,PATRIC.242231.10.NC_002946.CDS.1012965.1013675.fwd,PATRIC.242231.10.NC_002946.CDS.1015477.1016490.rev,PATRIC.242231.10.NC_002946.CDS.1017355.1018911.rev,PATRIC.242231.10.NC_002946.CDS.1022564.1022944.rev,PATRIC.242231.10.NC_002946.CDS.1044120.1044287.fwd,PATRIC.242231.10.NC_002946.CDS.1047173.1048468.rev,PATRIC.242231.10.NC_002946.CDS.1062720.1063142.rev,PATRIC.242231.10.NC_002946.CDS.1078087.1078281.fwd,PATRIC.242231.10.NC_002946.CDS.1086407.1086718.rev,PATRIC.242231.10.NC_002946.CDS.1086789.1088060.rev,PATRIC.242231.10.NC_002946.CDS.1091449.1092255.fwd,PATRIC.242231.10.NC_002946.CDS.1123800.1124138.rev,PATRIC.242231.10.NC_002946.CDS.1132671.1133579.rev,PATRIC.242231.10.NC_002946.CDS.1134874.1135218.fwd,PATRIC.242231.10.NC_002946.CDS.1165669.1166142.rev,PATRIC.242231.10.NC_002946.CDS.1170480.1171382.rev,PATRIC.242231.10.NC_002946.CDS.1196312.1197178.fwd,PATRIC.242231.10.NC_002946.CDS.1197229.1198281.rev,PATRIC.242231.10.NC_002946.CDS.1199032.1199595.rev,PATRIC.242231.10.NC_002946.CDS.1199701.1200171.rev,PATRIC.242231.10.NC_002946.CDS.1200302.1200637.rev,PATRIC.242231.10.NC_002946.CDS.1209692.1210375.rev,PATRIC.242231.10.NC_002946.CDS.1215967.1216929.rev,PATRIC.242231.10.NC_002946.CDS.1224369.1224773.fwd,PATRIC.242231.10.NC_002946.CDS.1228725.1229903.fwd,PATRIC.242231.10.NC_002946.CDS.1230081.1230836.fwd,PATRIC.242231.10.NC_002946.CDS.1236517.1236948.fwd,PATRIC.242231.10.NC_002946.CDS.1244378.1245004.fwd,PATRIC.242231.10.NC_002946.CDS.1249111.1249575.rev,PATRIC.242231.10.NC_002946.CDS.1249797.1250855.fwd,PATRIC.242231.10.NC_002946.CDS.1252767.1253039.rev,PATRIC.242231.10.NC_002946.CDS.1257496.1257885.rev,PATRIC.242231.10.NC_002946.CDS.1263920.1265104.fwd,PATRIC.242231.10.NC_002946.CDS.1275619.1276332.rev,PATRIC.242231.10.NC_002946.CDS.1280069.1280620.fwd,PATRIC.242231.10.NC_002946.CDS.1286026.1286865.rev,PATRIC.242231.10.NC_002946.CDS.1296661.1297737.rev,PATRIC.242231.10.NC_002946.CDS.1297827.1298597.rev,PATRIC.242231.10.NC_002946.CDS.1307637.1308152.rev,PATRIC.242231.10.NC_002946.CDS.1308159.1308476.rev,PATRIC.242231.10.NC_002946.CDS.1312536.1313294.fwd,PATRIC.242231.10.NC_002946.CDS.1314593.1315930.fwd,PATRIC.242231.10.NC_002946.CDS.1318344.1319678.fwd,PATRIC.242231.10.NC_002946.CDS.1328523.1328735.rev,PATRIC.242231.10.NC_002946.CDS.1334010.1335419.rev,PATRIC.242231.10.NC_002946.CDS.1335763.1337082.rev,PATRIC.242231.10.NC_002946.CDS.1337106.1337276.rev,PATRIC.242231.10.NC_002946.CDS.1337281.1337892.rev,PATRIC.242231.10.NC_002946.CDS.1337919.1339352.rev,PATRIC.242231.10.NC_002946.CDS.1346186.1348399.fwd,PATRIC.242231.10.NC_002946.CDS.1351641.1352183.rev,PATRIC.242231.10.NC_002946.CDS.1352596.1352919.rev,PATRIC.242231.10.NC_002946.CDS.1370073.1370459.rev,PATRIC.242231.10.NC_002946.CDS.1370511.1370801.rev,PATRIC.242231.10.NC_002946.CDS.1373940.1374299.fwd,PATRIC.242231.10.NC_002946.CDS.1384782.1385360.rev,PATRIC.242231.10.NC_002946.CDS.1389199.1389885.rev,PATRIC.242231.10.NC_002946.CDS.1421381.1422634.rev,PATRIC.242231.10.NC_002946.CDS.1422988.1424889.fwd,PATRIC.242231.10.NC_002946.CDS.1430910.1432133.rev,PATRIC.242231.10.NC_002946.CDS.1436917.1437495.rev,PATRIC.242231.10.NC_002946.CDS.1437734.1438645.fwd,PATRIC.242231.10.NC_002946.CDS.1443640.1444422.rev,PATRIC.242231.10.NC_002946.CDS.1454755.1455456.rev,PATRIC.242231.10.NC_002946.CDS.1487121.1487825.rev,PATRIC.242231.10.NC_002946.CDS.1517225.1517488.rev,PATRIC.242231.10.NC_002946.CDS.1534419.1535189.rev,PATRIC.242231.10.NC_002946.CDS.1535249.1535530.rev,PATRIC.242231.10.NC_002946.CDS.1538305.1539474.fwd,PATRIC.242231.10.NC_002946.CDS.1539526.1541034.fwd,PATRIC.242231.10.NC_002946.CDS.1552611.1553546.fwd,PATRIC.242231.10.NC_002946.CDS.1556189.1557763.rev,PATRIC.242231.10.NC_002946.CDS.1558088.1559188.fwd,PATRIC.242231.10.NC_002946.CDS.1584232.1584498.rev,PATRIC.242231.10.NC_002946.CDS.1606828.1607367.fwd,PATRIC.242231.10.NC_002946.CDS.1610655.1611146.rev,PATRIC.242231.10.NC_002946.CDS.1644374.1644619.rev,PATRIC.242231.10.NC_002946.CDS.1659056.1660018.fwd,PATRIC.242231.10.NC_002946.CDS.1665456.1666070.fwd,PATRIC.242231.10.NC_002946.CDS.1666206.1668074.rev,PATRIC.242231.10.NC_002946.CDS.1677383.1678087.rev,PATRIC.242231.10.NC_002946.CDS.1711474.1711956.rev,PATRIC.242231.10.NC_002946.CDS.1722143.1722478.rev,PATRIC.242231.10.NC_002946.CDS.1723162.1724205.rev,PATRIC.242231.10.NC_002946.CDS.1733575.1734738.fwd,PATRIC.242231.10.NC_002946.CDS.1748121.1748846.rev,PATRIC.242231.10.NC_002946.CDS.1761870.1762508.fwd,PATRIC.242231.10.NC_002946.CDS.1770954.1772189.fwd,PATRIC.242231.10.NC_002946.CDS.1791189.1791446.rev,PATRIC.242231.10.NC_002946.CDS.1801981.1802244.rev,PATRIC.242231.10.NC_002946.CDS.1802835.1803527.rev,PATRIC.242231.10.NC_002946.CDS.1803537.1803812.rev,PATRIC.242231.10.NC_002946.CDS.1804159.1804992.rev,PATRIC.242231.10.NC_002946.CDS.1815110.1819285.rev,PATRIC.242231.10.NC_002946.CDS.1819438.1823616.rev,PATRIC.242231.10.NC_002946.CDS.1826732.1827010.rev,PATRIC.242231.10.NC_002946.CDS.1829854.1830192.rev,PATRIC.242231.10.NC_002946.CDS.1839566.1840165.rev,PATRIC.242231.10.NC_002946.CDS.1851528.1853000.fwd,PATRIC.242231.10.NC_002946.CDS.1855436.1855633.rev,PATRIC.242231.10.NC_002946.CDS.1856758.1857972.rev,PATRIC.242231.10.NC_002946.CDS.1879145.1879936.rev,PATRIC.242231.10.NC_002946.CDS.1897570.1898763.fwd,PATRIC.242231.10.NC_002946.CDS.1901520.1901873.fwd,PATRIC.242231.10.NC_002946.CDS.1908251.1909255.fwd,PATRIC.242231.10.NC_002946.CDS.1911219.1912187.fwd,PATRIC.242231.10.NC_002946.CDS.1917457.1917744.fwd,PATRIC.242231.10.NC_002946.CDS.1918753.1919340.rev,PATRIC.242231.10.NC_002946.CDS.1919362.1920108.rev,PATRIC.242231.10.NC_002946.CDS.1920098.1920940.rev,PATRIC.242231.10.NC_002946.CDS.1921470.1921919.rev,PATRIC.242231.10.NC_002946.CDS.1936481.1936678.fwd,PATRIC.242231.10.NC_002946.CDS.1939073.1939873.fwd,PATRIC.242231.10.NC_002946.CDS.1939913.1940899.fwd,PATRIC.242231.10.NC_002946.CDS.1959373.1959981.rev,PATRIC.242231.10.NC_002946.CDS.1972738.1973244.fwd,PATRIC.242231.10.NC_002946.CDS.1978811.1979911.rev,PATRIC.242231.10.NC_002946.CDS.1979908.1981134.rev,PATRIC.242231.10.NC_002946.CDS.1983007.1983666.fwd,PATRIC.242231.10.NC_002946.CDS.1983656.1984324.fwd,PATRIC.242231.10.NC_002946.CDS.1984326.1985057.fwd,PATRIC.242231.10.NC_002946.CDS.1986373.1987260.fwd,PATRIC.242231.10.NC_002946.CDS.1994504.1994809.fwd,PATRIC.242231.10.NC_002946.CDS.1999006.1999587.fwd,PATRIC.242231.10.NC_002946.CDS.2000970.2001758.fwd,PATRIC.242231.10.NC_002946.CDS.2009991.2011013.rev,PATRIC.242231.10.NC_002946.CDS.2019610.2021448.rev,PATRIC.242231.10.NC_002946.CDS.2029539.2029811.rev,PATRIC.242231.10.NC_002946.CDS.2030574.2031575.fwd,PATRIC.242231.10.NC_002946.CDS.2033109.2034677.rev,PATRIC.242231.10.NC_002946.CDS.2066574.2067548.rev,PATRIC.242231.10.NC_002946.CDS.2083793.2084488.fwd,PATRIC.242231.10.NC_002946.CDS.2099285.2100214.fwd,PATRIC.242231.10.NC_002946.CDS.2105764.2106042.fwd,PATRIC.242231.10.NC_002946.CDS.2106877.2107359.fwd,PATRIC.242231.10.NC_002946.CDS.2108308.2108823.rev,PATRIC.242231.10.NC_002946.CDS.2112095.2112700.fwd,PATRIC.242231.10.NC_002946.CDS.2113941.2114153.rev,PATRIC.242231.10.NC_002946.CDS.2138449.2138934.rev,PATRIC.242231.10.NC_002946.CDS.2143479.2144405.rev,PATRIC.242231.10.NC_002946.CDS.2149747.2150337.fwd,PATRIC.242231.10.NC_002946.CDS.2153000.2153221.rev,))
          console.log('/view/GenomeList/?in(genome_id,(' + genome_id + '))#view_tab=subsystems&filter=in(' + selectionList.join(',') + ')');
          Topic.publish('/navigate', {
            href: '/view/GenomeList/?in(genome_id,(' + genome_id + '))#view_tab=subsystems&filter=in(' + selectionList.join(',') + ')',
            target: 'blank'
          });
        },
        false
      ],
      [
        'ViewAMR',
        //'MultiButton fa icon-hub fa-2x',
        'MultiButton fa icon-delicious fa-2x',
        {
          label: 'AMR',
          validTypes: ['*'],
          multiple: true,
          validContainerTypes: ['feature_data'],
          tooltip: 'View Antimicrobial Resistance'
        },
        function (selection) {
          var genome_id = selection[0].genome_id;
          var selectionList = selection.map(function (sel) {
            return sel.feature_id;
          });
          //https://www.patricbrc.org/view/GenomeList/#view_tab=amr&filter=in(PATRIC.242231.10.NC_002946.CDS.14081.14431.rev,PATRIC.242231.10.NC_002946.CDS.14438.15211.rev,PATRIC.242231.10.NC_002946.CDS.16000.16656.fwd))
          console.log('/view/GenomeList/#view_tab=amr&filter=in(' + selectionList.join(',') + ')');
          Topic.publish('/navigate', {
            href: '/view/GenomeList/#view_tab=amr&filter=in(' + selectionList.join(',') + ')',

            target: 'blank'
          });
        },
        false
      ] */
    ],

    buildQuery: function () {
      var q = [];
      if (this.state) {
        if (this.state.search) {
          q.push(this.state.search);
        }
        if (this.state.hashParams && this.state.hashParams.filter) {
          q.push(this.state.hashParams.filter);
        }
        if (q.length < 1) {
          q = '';
        }
        else if (q.length == 1) {
          q = q[0];
        }
        else {
          q = 'and(' + q.join(',') + ')';
        }
      } else {
        q = '';
      }

      return q;
    },

    createFilterPanel: function () {

      this.containerActionBar = this.filterPanel = new ContainerActionBar({
        region: 'top',
        layoutPriority: 7,
        splitter: true,
        className: 'BrowserHeader',
        dataModel: this.dataModel,
        facetFields: this.facetFields,
        advancedSearchFields: this.advancedSearchFields,
        state: lang.mixin({}, this.state),
        enableAnchorButton: this.enableAnchorButton,
        currentContainerWidget: this
      });

      // console.log("gridcontainer startup()", this.state)
      this.filterPanel.watch('filter', lang.hitch(this, function (attr, oldVal, newVal) {
        if ((oldVal != newVal) && (newVal != this.state.hashParams.filter)) {
          on.emit(this.domNode, 'UpdateHash', {
            bubbles: true,
            cancelable: true,
            hashProperty: 'filter',
            value: newVal,
            oldValue: oldVal
          });
        }
      }));
    },

    onFirstView: function () {
      if (this._firstView) {
        return;
      }
      if (!this.gridCtor) {
        console.error('Missing this.gridCtor in GridContainer');
        return;
      }
      var state;
      if (this.state) {
        state = lang.mixin({}, this.state, { hashParams: lang.mixin({}, this.state.hashParams) });
      }

      var o = {
        region: 'center',
        query: this.buildQuery(),
        state: state,
        apiServer: this.apiServer,
        visible: true
      };

      if (this.columns) {
        o.columns = this.columns;
      }

      if (this.queryOptions) {
        o.queryOptions = this.queryOptions;
      }

      if (this.store) {
        o.store = this.store;
      }
      this.grid = new this.gridCtor(o, this);

      if (this.enableFilterPanel) {
        this.createFilterPanel();
      }

      this.selectionActionBar = new ActionBar({
        region: 'right',
        layoutPriority: 4,
        style: 'width:56px;text-align:center;overflow-y: auto;',
        splitter: false,
        currentContainerWidget: this
      });

      this.itemDetailPanel = new ItemDetailPanel({
        region: 'right',
        style: 'width:250px',
        minSize: 150,
        splitter: true,
        layoutPriority: 3,
        containerWidget: this

      });

      if (this.containerActionBar) {
        // The PieChart container does not have a sidebar
        if (this.containerType != 'subsystems_overview_data') {
          this.addChild(this.containerActionBar);
        }

        this.containerActionBar.set('currentContainer', this);
      }

      // The PieChart container does not have a sidebar
      // The csv/tsv viewer uses the action panel in WorkspaceBrowser.js
      if (!(this.containerType == 'subsystems_overview_data' || this.containerType == 'csvFeature')) {
        this.addChild(this.selectionActionBar);
        this.addChild(this.itemDetailPanel);
      }
      this.addChild(this.grid);


      this.setupActions();
      this.listen();
      this.inherited(arguments);
      this._firstView = true;
    },

    getAllSelection: function (query) {
      // console.log('getAll Query: ', query);
    },

    listen: function () {
      this.grid.on('select', lang.hitch(this, function (evt) {

        var sel = Object.keys(evt.selected).map(lang.hitch(this, function (rownum) {
          var row = evt.grid.row(rownum);
          if (row.data) {
            if (this.grid.primaryKey) {
              if (this.selectedData && (!this.grid.selectedData.primaryKey || this.grid.selectedData.primaryKey == this.grid.primaryKey)) {
                if (!this.grid.selectedData.primaryKey) {
                  this.grid.selectedData.primaryKey = this.grid.primaryKey;
                }
                this.grid.selectedData[rownum] = row.data;
              }
              else {
                if (!this.grid.selectedData) {
                  this.grid.selectedData = {}
                }
                this.grid.selectedData.primaryKey = this.grid.primaryKey;
                this.grid.selectedData[rownum] = row.data;
              }
            }
            return row.data;
          } else if (this.grid && this.grid._unloadedData) {
            return this.grid._unloadedData[rownum];
          } else if (this.grid && this.grid.selectedData) {
            return this.grid.selectedData[rownum];
          }
        }), this);
        this.selectionActionBar.set('selection', sel);
        this.itemDetailPanel.set('selection', sel);
      }));

      this.grid.on('deselect', lang.hitch(this, function (evt) {
        var sel = [];
        if (!evt.selected) {
          this.grid.selectedData = {};
          this.actionPanel.set('selection', []);
          this.itemDetailPanel.set('selection', []);
        }
        else {
          sel = Object.keys(evt.selected).map(lang.hitch(this, function (rownum) {
            var row = evt.grid.row(rownum);
            if (row.data) {
              return row.data;
            } else if (this.grid && this.grid._unloadedData) {
              return this.grid._unloadedData[rownum];
            } else if (this.grid && this.grid.selectedData) {
              return this.grid.selectedData[rownum];
            }
          }));
        }
        this.selectionActionBar.set('selection', sel);
        this.itemDetailPanel.set('selection', sel);
      }));

      on(this.domNode, 'ToggleFilters', lang.hitch(this, function (evt) {
        if (!this.filterPanel && this.getFilterPanel) {
          this.filterPanel = this.getFilterPanel();
          this.filterPanel.region = 'top';
          this.filterPanel.splitter = true;
          this.layoutPriority = 2;
          this.addChild(this.filterPanel);
        }
        else if (this.filterPanel) {
          if (this.filterPanel.minimized) {
            this.filterPanel.set('minimized', false);
            this.filterPanel.resize({
              h: this.filterPanel.minSize + 150
            });
          }
          else {
            this.filterPanel.set('minimized', true);
            this.filterPanel.resize({
              h: this.filterPanel.minSize
            });
          }
          this.resize();
        }
      }));
    },

    setupActions: function () {
      if (this.containerActionBar) {
        this.containerActions.forEach(function (a) {
          this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4], a[5]);
        }, this);
      }

      this.selectionActions.forEach(function (a) {
        this.selectionActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4], a[5]);
      }, this);
    },

    startup: function () {
      if (this._started) {
        return;
      }
      if (this.visible) {
        this.onFirstView();
      }
      if (this.state) {
        this.set('state', lang.mixin({}, this.state, { hashParams: lang.mixin({}, this.state.hashParams) }));
      }
      this.inherited(arguments);
    }
  });
});
