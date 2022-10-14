define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic', 'dojo/dom-construct',
  'dijit/popup', 'dijit/TooltipDialog',
  './PathwayServiceGrid', './AdvancedSearchFields', './GridContainer',
  '../util/PathJoin', './ComparativeSystemsActionBar', 'FileSaver', '../DataAPI'
], function (
  declare, lang, on, Topic, domConstruct,
  popup, TooltipDialog,
  PathwayGrid, AdvancedSearchFields, GridContainer,
  PathJoin, ContainerActionBar, saveAs, DataAPI
) {

  // Download tooltips
  var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
  var downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  // console.log('PRE facetFields', AdvancedSearchFields['pathway'].filter((ff) => ff.facet));
  return declare([GridContainer], {
    gridCtor: PathwayGrid,
    containerType: 'pathway_data',
    storeType: '',
    store: null,
    data: null,
    facetFields: AdvancedSearchFields['pathway'].filter((ff) => ff.facet),
    // facetFields: ['annotation', 'pathway_class', 'pathway_name', 'ec_number'],
    advancedSearchFields: AdvancedSearchFields['pathway'].filter((ff) => ff.search),
    filter: '',
    defaultFilter: '',
    enableFilterPanel: true,
    visible: true,
    dataModel: 'pathway',
    primaryKey: 'id',
    tooltip: 'The "Pathways" service contains a list of pathways for genomes associated with the current view',
    typeMap: {
      pathway: 'pathway_id',
      ec_number: 'ec_number',
      gene: 'feature_id'
    },

    /*
    constructor: function (options) {
        this._firstView = false;
        this.type = options.type;
    },
    */

    setFilterUpdateTrigger: function () {
      on(this.domNode, 'UpdateFilterCategory', lang.hitch(this, function (evt) {
        console.log('evt = ', evt);
        // TODO: Start Here: Have filters now set store.query to handle filters
        this.store.query({ filter: this.filterPanel.filter } );
        this.refreshFilterPanel();
        this.grid.refresh();
      }));
      this.filterPanel.setFilterUpdateTrigger();
    },

    refreshFilterPanel: function () {
      if (this.filterPanel) {
        this.filterPanel.getFacets(this.store.query({ filter: this.filterPanel.filter }), this.facetFields).then(lang.hitch(this, function (facet_counts) {
          Object.keys(facet_counts).forEach(function (cat) {
            if (this.filterPanel._ffWidgets[cat] && !this.filterPanel._ffWidgets[cat].focused) {
              this.filterPanel._ffWidgets[cat].set('data', facet_counts[cat]);
            } else {
              if (this.filterPanel._ffWidgets[cat] && this.filterPanel._ffWidgets[cat].selected.length == 0) {
                this.filterPanel._ffWidgets[cat].set('data', facet_counts[cat]);
              }
            }
          }, this);
        }));
      }
    },

    createFilterPanel: function () {
      console.log('create pathway filter panel');
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

          var signal = on(downloadTT.domNode, 'div:click', lang.hitch(this, function (evt) {

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

            var data = this.grid.store.query('', { 'selectAll': true });
            var headers,
              content = [],
              filename;

            switch (this.type) {
              case 'pathway':
                headers = ['Pathway ID', 'Pathway Name', 'Pathway Class', 'Annotation', 'Unique Genome Count', 'Unique Gene Count', 'Unique EC Count', 'EC Conservation', 'Gene Conservation'];
                data.forEach(function (row) {
                  content.push([row.pathway_id, JSON.stringify(row.pathway_name), JSON.stringify(row.pathway_class), row.annotation, row.genome_count, row.gene_count, row.ec_count, row.ec_cons, row.gene_cons]);
                });
                filename = 'BVBRC_pathways';
                break;
              case 'ec_number':
                headers = ['Pathway ID', 'Pathway Name', 'Pathway Class', 'Annotation', 'EC Number', 'Description', 'Genome Count', 'Unique Gene Count'];
                data.forEach(function (row) {
                  content.push([row.pathway_id, JSON.stringify(row.pathway_name), JSON.stringify(row.pathway_class), row.annotation, row.ec_number, JSON.stringify(row.ec_description), row.genome_count, row.gene_count]);
                });
                filename = 'BVBRC_pathways_ecnumbers';
                break;
              case 'gene':
                headers = ['Genome Name', 'Accession', 'BRC ID', 'Refseq Locus Tag', 'Alt Locus Tag', 'Gene', 'Product', 'Annotation', 'Pathway Name', 'EC Description'];
                data.forEach(function (row) {
                  content.push([row.genome_name, row.accession, row.patric_id, row.refseq_locus_tag, row.alt_locus_tag, row.gene, JSON.stringify(row.product), row.annotation, JSON.stringify(row.pathway_name), JSON.stringify(row.ec_description)]);
                });
                filename = 'BVBRC_pathways_genes';
                break;
              default:
                break;
            }

            saveAs(new Blob([headers.join(DELIMITER) + '\n' + content.join('\n')], { type: rel }), 'BVBRC_' + this.type + ext);

            signal.remove();
            popup.close(downloadTT);
          }));
          popup.open({
            popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
            around: this.containerActionBar._actions.DownloadTable.button,
            orient: ['below']
          });
          /*
          downloadTT.set('data', content);
          downloadTT.set('headers', headers);
          downloadTT.set('filename', filename);


          popup.open({
            popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
            around: this.containerActionBar._actions.DownloadTable.button,
            orient: ['below']
          });
          */

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
          multiple: false,
          tooltip: 'Switch to FeatureList View.',
          validContainerTypes: ['pathway_data'],
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
        function (selection, container, opts, evt) {
          // console.log(selection, container);
          var sel = selection[0];
          var genome_id_query = 'in(genome_id,(' + this.state.genome_ids.join(',') + '))';
          if (container.type == 'pathway') {
            var pathway_id = sel.pathway_id;
            var pathway_query = 'eq(pathway_id,(' + pathway_id + '))&' + genome_id_query;
            DataAPI.queryPathways(pathway_query, { 'limit': 5000 }).then(lang.hitch(this, function (res) {
              Topic.publish('/navigate', {
                href: '/view/FeatureList/?in(feature_id,(' + res.items.map(function (x) {
                  return x.feature_id;
                }).join(',') + '))',
                target: 'blank'
              });
            }));
          } else if (container.type == 'ec_number') {
            var ec_number = sel.ec_number;
            var ec_query = 'eq(ec_number,(' + ec_number + '))&' + genome_id_query;
            DataAPI.queryPathways(ec_query, { 'limit': 5000 }).then(lang.hitch(this, function (res) {
              Topic.publish('/navigate', {
                href: '/view/FeatureList/?in(feature_id,(' + res.items.map(function (x) {
                  return x.feature_id;
                }).join(',') + '))',
                target: 'blank'
              });
            }));
          } else if (container.type === 'gene') {
            return;
          }
          else {
            return;
          }
          // Topic.publish('/navigate', { href: '/view/Feature/' + sel.feature_id + '#view_tab=overview' });
        },
        false
      ],
      [
        'ViewPathwayMap',
        'fa icon-map-o fa-2x',
        {
          label: 'Map',
          multiple: false,
          validTypes: ['*'],
          tooltip: 'View PathwayMap',
          validContainerTypes: ['pathway_data']
        },
        function (selection) {
          // console.log(selection, this.type, this.state);
          var url = { annotation: 'PATRIC' };

          if (Object.prototype.hasOwnProperty.call(this.state, 'taxon_id')) {
            url.taxon_id = this.state.taxon_id;
          } else if (Object.prototype.hasOwnProperty.call(this.state, 'genome')) {
            url.genome_id = this.state.genome.genome_id;
          }
          if (Object.prototype.hasOwnProperty.call(this.state, 'genome_ids')) {
            url.genome_ids = this.state.genome_ids;
          }
          switch (this.type) {
            case 'pathway':
              url.pathway_id = selection[0].pathway_id;
              break;
            case 'ec_number':
              url.pathway_id = selection[0].pathway_id;
              url.ec_number = selection[0].ec_number;
              break;
            case 'gene':
              url.pathway_id = selection[0].pathway_id;
              url.feature_id = selection[0].feature_id;
              break;
            default:
              break;
          }
          var params = Object.keys(url).map(function (p) {
            return p + '=' + url[p];
          }).join('&');
            // console.log(params);
          Topic.publish('/navigate', { href: '/view/PathwayMap/?' + params, target: 'blank' });
        },
        false
      ]
    ])
  });
});
