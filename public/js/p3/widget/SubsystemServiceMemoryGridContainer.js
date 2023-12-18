define([
  'dojo/_base/declare', 'dojo/on', './SubsystemServiceMemoryGrid', './SubSystemsMemoryGridContainer', 'dojo/topic',
  'dojo/_base/lang', 'dojo/when', 'dojo/request', 'dijit/TooltipDialog', 'dijit/popup', 'FileSaver', '../util/PathJoin',
  './ComparativeSystemsActionBar', './AdvancedSearchFields', './GridContainer', 'dojo/dom-construct', './PerspectiveToolTip',
  './SelectionToGroup', 'dijit/Dialog', './DownloadTooltipDialog'
], function (
  declare, on, SubSystemsGrid, oldGridContainer, Topic, lang, when, request, TooltipDialog,
  popup, saveAs, PathJoin, ContainerActionBar, AdvancedSearchFields, GridContainer, domConstruct, PerspectiveToolTipDialog,
  SelectionToGroup, Dialog, DownloadTooltipDialog
) {

  var downloadSelectionTT = new DownloadTooltipDialog({});
  downloadSelectionTT.startup();

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

  var signal = on(downloadTT.domNode, 'div:click', lang.hitch(function (evt) {
    var rel = evt.target.attributes.rel.value;
    var data = downloadTT.get('data');
    var headers = downloadTT.get('headers');
    var filename = downloadTT.get('filename');

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
    signal.remove();
    popup.close(downloadTT);
  }));

  return declare([oldGridContainer], {
    gridCtor: SubSystemsGrid,
    facetFields: AdvancedSearchFields['subsystem'].filter((ff) => ff.facet),
    _loadedFacets: false,

    setTopicId: function (topicId) {
      this.topicId = topicId;
      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        var key = arguments[0], value = arguments[1];
        switch (key) {
          case 'refreshGrid':
            console.log('refresh grid');
            break;
          case 'createFilterPanel':
            console.log('createFilterPanel');
            this.populateFilterPanel();
            break;
          default:
            break;
        }
      }));
      // set topic id in grid
      this.grid.setTopicId(this.topicId);

    },

    setFilterUpdateTrigger: function () {
      on(this.domNode, 'UpdateFilterCategory', lang.hitch(this, function (evt) {
        console.log('evt = ', evt);
        this.store.updateDataFilter(this.filterPanel.filter);
        this.populateFilterPanel();
      }));
      this.filterPanel.setFilterUpdateTrigger();
    },

    createFilterPanel: function () {
      var _self = this;
      this.containerActionBar = this.filterPanel = new ContainerActionBar({
        region: 'top',
        layoutPriority: 7,
        splitter: true,
        filter: '',
        className: 'BrowserHeader',
        dataModel: _self.dataModel,
        facetFields: _self.facetFields,
        currentContainerWidget: _self,
        _setQueryAttr: function (query) {
          this.getFacets(_self.store.data, this.facetFields).then(lang.hitch(this, function (facet_counts) {
            console.log('facet_counts', facet_counts);
            console.log('this.state', _self.store.state);
            Object.keys(facet_counts).forEach(function (cat) {
              // console.log("Facet Category: ", cat);
              if (this._ffWidgets[cat]) {
                // console.log("this.state: ", this.state);
                var selected = _self.store.state.selected;
                // console.log(" Set Facet Widget Data", facets[cat], " _selected: ", this._ffWidgets[cat].selected)
                this._ffWidgets[cat].set('data', facet_counts[cat], selected);
              } else {
                // console.log("Missing ffWidget for : ", cat);
              }
            }, this);
          }));
        }
      });
    },

    populateFilterPanel: function () {
      if (this.filterPanel) {
        this.filterPanel.getFacets(this.store.data, this.facetFields).then(lang.hitch(this, function (facet_counts) {
          Object.keys(facet_counts).forEach(function (cat) {
            if (this.filterPanel._ffWidgets[cat] && !this.filterPanel._ffWidgets[cat].focused) {
              this.filterPanel._ffWidgets[cat].set('data', facet_counts[cat]);
            } else {
              if (this.filterPanel._ffWidgets[cat].selected.length == 0) {
                this.filterPanel._ffWidgets[cat].set('data', facet_counts[cat]);
              }            }
          }, this);
        }));
      }
    },

    _setStateAttr: function (state) {
      this._set('state', state);
      if (this.filterPanel) {
        this.filterPanel.set('state', lang.mixin({}, state, { hashParams: lang.mixin({}, state.hashParams) }));
      }
      if (this.grid) {
        this.grid.set('state', lang.mixin({}, state, { hashParams: lang.mixin({}, state.hashParams) }));
      }
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
          var data = this.grid.store.query('', { 'selectAll': true });
          var headers,
            content = [],
            filename;

          var isTaxonView = false;
          if (Object.prototype.hasOwnProperty.call(this.state, 'taxon_id')) {
            isTaxonView = true;
          }

          switch (this.type) {

            case 'subsystems':

              if (isTaxonView) {
                headers = [
                  'Superclass',
                  'Class',
                  'Subclass',
                  'Subsystem Name',
                  'Genome Count',
                  'Gene Count',
                  'Role Count',
                  'Active'

                ];

                data.forEach(function (row) {
                  content.push([
                    JSON.stringify(row.superclass),
                    JSON.stringify(row['class']),
                    JSON.stringify(row.subclass),
                    JSON.stringify(row.subsystem_name),
                    JSON.stringify(row.genome_count),
                    JSON.stringify(row.gene_count),
                    JSON.stringify(row.role_count),
                    JSON.stringify(row.active)

                  ]);
                });
              } else {
                headers = [
                  'Superclass',
                  'Class',
                  'Subclass',
                  'Subsystem Name',
                  // "Genome Count",
                  'Gene Count',
                  'Role Count',
                  'Active'

                ];

                data.forEach(function (row) {
                  content.push([
                    JSON.stringify(row.superclass),
                    JSON.stringify(row['class']),
                    JSON.stringify(row.subclass),
                    JSON.stringify(row.subsystem_name),
                    // JSON.stringify(row.genome_count),
                    JSON.stringify(row.gene_count),
                    JSON.stringify(row.role_count),
                    JSON.stringify(row.active)

                  ]);
                });
              }

              filename = 'BVBRC_subsystems';
              break;

            case 'genes':
              headers = [
                'Superclass',
                'Class',
                'Subclass',
                'Subsystem Name',
                'Role ID',
                'Role Name',
                'Active',
                'BRC ID',
                'Gene',
                'Product'
              ];

              data.forEach(function (row) {
                content.push([
                  JSON.stringify(row.superclass),
                  JSON.stringify(row['class']),
                  JSON.stringify(row.subclass),
                  JSON.stringify(row.subsystem_name),
                  JSON.stringify(row.role_id),
                  JSON.stringify(row.role_name),
                  JSON.stringify(row.active),
                  JSON.stringify(row.patric_id),
                  JSON.stringify(row.gene),
                  JSON.stringify(row.product)
                ]);
              });
              filename = 'BVBRC_subsystems';
              break;

            default:
              break;
          }

          downloadTT.set('data', content);
          downloadTT.set('headers', headers);
          downloadTT.set('filename', filename);

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
          validContainerTypes: ['subsystem_data']
        },
        function (selection) {

          switch (this.type) {

            case 'subsystems':
              var genome_ids = this.state.genome_ids;

              var subsystem_ids = selection.map(function (s) {
                return s.subsystem_id;
              });

              var query = 'q=genome_id:(' + genome_ids.join(' OR ') + ') AND subsystem_id:("' + subsystem_ids.join('" OR "') + '")&fl=feature_id&rows=25000';
              var that = this;
              when(request.post(PathJoin(window.App.dataAPI, '/subsystem/'), {
                handleAs: 'json',
                headers: {
                  Accept: 'application/solr+json',
                  'Content-Type': 'application/solrquery+x-www-form-urlencoded',
                  'X-Requested-With': null,
                  Authorization: (window.App.authorizationToken || '')
                },
                data: query
              }), function (response) {

                var feature_ids = response.response.docs.map(function (feature) {
                  return { feature_id: feature.feature_id };
                });
                viewFASTATT.selection = feature_ids;
                popup.open({
                  popup: that.selectionActionBar._actions.ViewFASTA.options.tooltipDialog,
                  around: that.selectionActionBar._actions.ViewFASTA.button,
                  orient: ['below']
                });
              });
              break;

            case 'genes':

              var feature_ids = selection.map(function (feature) {
                return { feature_id: feature.feature_id };
              });
              viewFASTATT.selection = feature_ids;
              popup.open({
                popup: this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog,
                around: this.selectionActionBar._actions.ViewFASTA.button,
                orient: ['below']
              });
              break;

            default:
              break;
          }
        },
        false
      ],

      [
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
          validContainerTypes: ['subsystem_data']
        },
        function (selection, container) {

          var selectedRows = [];

          var isTaxonView = false;
          if (Object.prototype.hasOwnProperty.call(this.state, 'taxon_id')) {
            isTaxonView = true;
          }

          var genome_ids = this.state.genome_ids;

          switch (this.type) {

            case 'subsystems':

              var subsystem_ids = selection.map(function (s) {
                return s.subsystem_id;
              });

              var query = 'q=genome_id:(' + genome_ids.join(' OR ') + ') AND subsystem_id:("' + subsystem_ids.join('" OR "') + '")&fl=feature_id&rows=25000';
              var that = this;
              when(request.post(PathJoin(window.App.dataAPI, '/subsystem/'), {
                handleAs: 'json',
                headers: {
                  Accept: 'application/solr+json',
                  'Content-Type': 'application/solrquery+x-www-form-urlencoded',
                  'X-Requested-With': null,
                  Authorization: (window.App.authorizationToken || '')
                },
                data: query
              }), function (response) {

                var feature_ids = response.response.docs.map(function (feature) {
                  return feature.feature_id;
                });

                selection.forEach(function (row) {
                  var selectedRow = {};

                  selectedRow.Superclass = row.superclass;
                  selectedRow.Class = row['class'];
                  selectedRow.Subclass = row.subclass;
                  selectedRow['Subsystem Name'] = row.subsystem_name;
                  if (isTaxonView) {
                    selectedRow['Genome Count'] = row.genome_count;
                  }
                  selectedRow['Gene Count'] = row.gene_count;
                  selectedRow['Role Count'] = row.role_count;
                  selectedRow.Active = row.active;
                  selectedRow.subsystem_id = row.subsystem_id;
                  selectedRow.feature_id = feature_ids;

                  selectedRows.push(selectedRow);
                });

                that.openDownloadSelection(selectedRows, container);
              });
              break;
            case 'genes':

              selection.forEach(function (row) {
                var selectedRow = {};

                selectedRow.Superclass = row.superclass;
                selectedRow.Class = row['class'];
                selectedRow.Subclass = row.subclass;
                selectedRow['Subsystem Name'] = row.subsystem_name;
                selectedRow['Role ID'] = row.role_id;
                selectedRow['Role Name'] = row.role_name;
                selectedRow.Active = row.active;
                selectedRow['BRC ID'] = row.patric_id;
                selectedRow.Gene = row.gene;
                selectedRow.Product = row.product;
                selectedRow.subsystem_id = row.subsystem_id;
                selectedRow.feature_id = row.feature_id;

                selectedRows.push(selectedRow);
              });

              this.openDownloadSelection(selectedRows, container);
              break;

            default:
              break;
          }
        },
        false
      ],

      [
        'ViewFeatureItems',
        'MultiButton fa icon-selection-FeatureList fa-2x',
        {
          label: 'FEATURES',
          validTypes: ['*'],
          multiple: true,
          tooltip: 'Switch to Feature List View. Press and Hold for more options.',
          validContainerTypes: ['subsystem_data'],
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
        function (selection, container) {

          // if single genome go to overview page
          if (selection.length === 1 && (selection[0].gene_count === 1 || selection[0].document_type === 'subsystems_gene')) {
            var sel = selection[0];
            Topic.publish('/navigate', { href: '/view/Feature/' + sel.feature_id + '#view_tab=overview', target: 'blank' });
          }
          else if (selection[0].document_type === 'subsystems_subsystem') {

            var subsystem_ids = selection.map(function (s) {
              return encodeURIComponent(s.subsystem_id);
            });

            var query = 'q=genome_id:(' + this.state.genome_ids.join(' OR ') + ') AND subsystem_id:("' + subsystem_ids.join('" OR "') + '")&fl=feature_id&rows=25000';

            when(request.post(PathJoin(window.App.dataAPI, '/subsystem/'), {
              handleAs: 'json',
              headers: {
                Accept: 'application/solr+json',
                'Content-Type': 'application/solrquery+x-www-form-urlencoded',
                'X-Requested-With': null,
                Authorization: (window.App.authorizationToken || '')
              },
              data: query
            }), function (response) {
              Topic.publish('/navigate', {
                href: '/view/FeatureList/?in(feature_id,(' + response.response.docs.map(function (x) {
                  return x.feature_id;
                }).join(',') + '))#view_tab=features',
                target: 'blank'
              });
            });
          }
          // gene tab - selection has id already
          else if (selection[0].document_type === 'subsystems_gene') {
            var feature_ids = selection.map(function (s) {
              return s.feature_id;
            });
            Topic.publish('/navigate', { href: '/view/FeatureList/?in(feature_id,(' + feature_ids.join(',') + '))#view_tab=features', target: 'blank' });
          }

        },
        false
      ],
      [
        'AddGroup',
        'fa icon-object-group fa-2x',
        {
          label: 'GROUP',
          ignoreDataType: true,
          multiple: true,
          validTypes: ['*'],
          requireAuth: true,
          tooltip: 'Add selection to a new or existing group',
          validContainerTypes: ['subsystem_data']
        },
        function (selection) {

          switch (this.type) {

            case 'subsystems':
              var subsystem_ids = selection.map(function (s) {
                return encodeURIComponent(s.subsystem_id);
              });

              var query = 'q=genome_id:(' + this.state.genome_ids.join(' OR ') + ') AND subsystem_id:("' + subsystem_ids.join('" OR "') + '")&fl=feature_id&rows=25000';

              when(request.post(PathJoin(window.App.dataAPI, '/subsystem/'), {
                handleAs: 'json',
                headers: {
                  Accept: 'application/solr+json',
                  'Content-Type': 'application/solrquery+x-www-form-urlencoded',
                  'X-Requested-With': null,
                  Authorization: (window.App.authorizationToken || '')
                },
                data: query
              }), function (response) {

                var feature_ids = response.response.docs.map(lang.hitch(this, function (val) {
                  return { feature_id: val.feature_id };
                }));

                var dlg = new Dialog({ title: 'Add selected items to group' });
                var stg = new SelectionToGroup({
                  selection: feature_ids,
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
              break;

            case 'genes':
              var feature_ids = selection.map(lang.hitch(this, function (val) {
                return { feature_id: val.feature_id };
              }));

              var dlg = new Dialog({ title: 'Add selected items to group' });
              var stg = new SelectionToGroup({
                selection: feature_ids,
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
              break;

            default:
              break;
          }


        },
        false
      ],
      [
        'ViewSubsystemMap',
        'fa icon-map-o fa-2x',
        {
          label: 'Map',
          multiple: false,
          validTypes: ['*'],
          tooltip: 'View Subsystem Map',
          validContainerTypes: ['subsystem_data']
        },
        function (selection) {
          // var display_reference_genomes = 'false';

          var url = {};
          if (Object.prototype.hasOwnProperty.call(this.state, 'taxon_id')) {
            url.taxon_id = this.state.taxon_id;
            // display_reference_genomes = 'false';
          }

          // used to query data
          url.genome_ids = this.state.genome_ids;
          url.subsystem_id = selection[0].subsystem_id;

          // var mapSelection = {};
          if (selection[0].genome_count) {
            // mapSelection.genome_count = selection[0].genome_count;
            url.genome_count = selection[0].genome_count;
          }
          if (selection[0].role_count) {
            // mapSelection.role_count = selection[0].role_count;
            url.role_count = selection[0].role_count;
          }
          if (selection[0].gene_count) {
            // mapSelection.gene_count = selection[0].gene_count;
            url.gene_count = selection[0].gene_count;
          }
          if (selection[0].genome_name) {
            // mapSelection.genome_name = selection[0].genome_name;
            url.genome_name = selection[0].genome_name;
          }

          // var mapData = [];
          // mapData.push(mapSelection)

          // url['subsystemselectionuniqueidentifier'] = JSON.stringify(mapData);
          // url.display_reference_genomes = display_reference_genomes;

          var params = Object.keys(url).map(function (p) {
            return p + '=' + url[p];
          }).join('&');

          Topic.publish('/navigate', { href: '/view/SubsystemServiceMap/?' + params, target: 'blank', genomeIds: this.state.genome_ids });


        },
        false
      ]

    ]),
  });
});
