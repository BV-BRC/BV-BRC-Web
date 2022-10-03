define([
  'dojo/_base/declare', 'dojo/on', './SubsystemServiceMemoryGrid', './SubSystemsMemoryGridContainer', 'dojo/topic',
  'dojo/_base/lang', 'dijit/TooltipDialog', 'dijit/popup', 'FileSaver',
  './ComparativeSystemsActionBar', './AdvancedSearchFields', './GridContainer'
], function (
  declare, on, SubSystemsGrid, oldGridContainer, Topic, lang, TooltipDialog, popup, saveAs,
  ContainerActionBar, AdvancedSearchFields, GridContainer
) {

  var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div>';
  var downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
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
        // TODO: Start Here: Have filters now set store.query to handle filters
        this.store.updateDataFilter(this.filterPanel.filter);
      }));
      this.filterPanel.setFilterUpdateTrigger();
    },

    // TODO: START HERE create filter panel after data is loaded
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
            // console.log("Facet Category: ", cat);
            if (this.filterPanel._ffWidgets[cat]) {
              // console.log("this.state: ", this.state);
              var selected = this.store.state.selected;
              // console.log(" Set Facet Widget Data", facets[cat], " _selected: ", this._ffWidgets[cat].selected)
              this.filterPanel._ffWidgets[cat].set('data', facet_counts[cat], selected);
            } else {
              // console.log("Missing ffWidget for : ", cat);
            }
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
    ])
  });
});
