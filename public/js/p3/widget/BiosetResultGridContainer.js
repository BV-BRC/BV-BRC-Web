define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic',
  'dijit/popup', 'dijit/TooltipDialog',
  './ContainerActionBar', 'FileSaver',
  './BiosetResultGrid', './GridContainer'
], function (
  declare, lang, on, Topic,
  popup, TooltipDialog,
  ContainerActionBar, saveAs,
  biosetGrid, GridContainer
) {

  var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div>';

  var downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  return declare([GridContainer], {
    gridCtor: biosetGrid,
    containerType: 'bioset_result_data',
    facetFields: [],
    constructor: function (options) {

      this.topicId = options.topicId;

      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updateTgState':
            this.tgState = value;
            break;
          default:
            break;
        }
      }));
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
      if (this.grid) {
        this.grid.set('state', state);
      } else {
        // console.log("No Grid Yet (biosetGridContainer)");
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

            var headers = ['Entity ID', 'BRC ID', 'Locus Tag', 'Protein ID', 'Gene ID', 'Entity Name', 'Comparisons', 'Up', 'Down'];
            var content = [];
            data.forEach(function (row) {
              content.push([row.entity_id, row.patric_id, row.locus_tag, row.protein_id, row.gene_id, '"' + row.entity_name + '"', row.sample_size, row.up, row.down].join(DELIMITER));
            });

            saveAs(new Blob([headers.join(DELIMITER) + '\n' + content.join('\n')], { type: rel }), 'bioset_results.' + ext);

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
