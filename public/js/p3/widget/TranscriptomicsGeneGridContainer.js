define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic',
  'dijit/popup', 'dijit/TooltipDialog',
  './ContainerActionBar', 'FileSaver',
  './TranscriptomicsGeneGrid', './GridContainer'
], function (
  declare, lang, on, Topic,
  popup, TooltipDialog,
  ContainerActionBar, saveAs,
  TranscriptomicsGeneGrid, GridContainer
) {

  var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div>';

  var downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  return declare([GridContainer], {
    gridCtor: TranscriptomicsGeneGrid,
    containerType: 'transcriptomics_gene_data',
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
      // console.log("TranscriptomicsGeneGridContainer _setStateAttr: ", state);
      if (this.grid) {
        // console.log("   call set state on this.grid: ", this.grid);
        this.grid.set('state', state);
      } else {
        // console.log("No Grid Yet (TranscriptomicsGeneGridContainer)");
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

            var headers = ['Genome', 'BRC ID', 'Refseq Locus Tag', 'Alt Locus Tag', 'Gene', 'Product', 'Start', 'End', 'Strand', 'Comparisons', 'Up', 'Down'];
            var content = [];
            data.forEach(function (row) {
              content.push([row.genome_name, row.patric_id, row.refseq_locus_tag, row.alt_locus_tag, row.gene, '"' + row.product + '"', row.start, row.end, row.strand, row.sample_size, row.up, row.down].join(DELIMITER));
            });

            saveAs(new Blob([headers.join(DELIMITER) + '\n' + content.join('\n')], { type: rel }), 'BVBRC_transcriptomics_genes.' + ext);

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
