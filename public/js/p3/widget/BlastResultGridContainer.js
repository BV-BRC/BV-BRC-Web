define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/on', 'dojo/topic',
  'dijit/popup', 'dijit/TooltipDialog',
  './ContainerActionBar', 'FileSaver',
  './GridContainer', './BlastResultGrid', './PerspectiveToolTip'
], function (
  declare, lang,
  on, Topic,
  popup, TooltipDialog,
  ContainerActionBar, saveAs,
  GridContainer, BlastResultGrid, PerspectiveToolTipDialog
) {

  var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div>';

  var downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  on(downloadTT.domNode, 'div:click', lang.hitch(function (evt) {
    var rel = evt.target.attributes.rel.value;
    var data = downloadTT.get('data');
    var headers = downloadTT.get('headers');
    var filename = 'PATRIC_blast';
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

  return declare([GridContainer], {
    gridCtor: BlastResultGrid,
    containerType: '',
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
          validTypes: ['*'],
          tooltip: 'Download Table',
          tooltipDialog: downloadTT
        },
        function () {

          downloadTT.set('content', dfc);

          var data = this.grid.store.query('', {});
          var headers,
            content;

          switch (this.type) {
            case 'genome_feature':
              headers = ['Genome', 'Genome ID', 'BRC ID', 'RefSeq Locus Tag', 'Gene', 'Product', 'Length (NT)', 'Length (AA)', 'ALN Length', 'Identity', 'Query cover', 'Subject cover', 'Hit from', 'Hit to', 'Score', 'E value'];
              content = data.map(function (row) {
                return [row.genome_name, row.genome_id, row.patric_id, row.refseq_locus_tag, row.gene, JSON.stringify(row['function']), row.na_length, row.aa_length, row.length, row.pident, row.query_coverage, row.subject_coverage, row.hit_from, row.hit_to, row.bitscore, row.evalue];
              });
              break;
            case 'genome_sequence':
              headers = ['Genome', 'Genome ID', 'Accession', 'Description', 'Product', 'Identity', 'Query cover', 'Subject cover', 'Hit from', 'Hit to', 'ALN Length', 'Score', 'E value'];
              content = data.map(function (row) {
                return [row.genome_name, row.genome_id, row.accession, JSON.stringify(row.description), JSON.stringify(row['function']), row.pident, row.query_coverage, row.subject_coverage, row.hit_from, row.hit_to, row.length, row.bitscore, row.evalue];
              });
              break;
            case 'specialty_genes':
              headers = ['Database', 'Source ID', 'Description', 'Organism', 'Identity', 'Query cover', 'Subject cover', 'Length', 'Score', 'E value'];
              content = data.map(function (row) {
                return [row.database, row.source_id, JSON.stringify(row['function']), row.organism, row.pident, row.query_coverage, row.subject_coverage, row.length, row.bitscore, row.evalue];
              });
              break;
            default:
              headers = [];
              content = [];
              break;
          }

          downloadTT.set('data', content);
          downloadTT.set('headers', headers);

          popup.open({
            popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
            around: this.containerActionBar._actions.DownloadTable.button,
            orient: ['below']
          });
        },
        true
      ]
    ]),
    /*
      add GenomeBrowser as a special case and override ViewGenomeItem, ViewGenomeItems, ViewCDSFeaturesSeq,
      ViewFeatureItem, ViewFeatureItem to open in a new tab
    */
    selectionActions: GridContainer.prototype.selectionActions.concat([
      [
        'GenomeBrowser',
        'fa icon-genome-browser fa-2x',
        {
          label: 'Browser',
          multiple: false,
          validTypes: ['*'],
          validContainerTypes: ['sequence_data'],
          tooltip: 'View in Genome Browser'
        },
        function (selection) {

          var target = selection[0];
          var hit_from = target.detail.hsps[0].hit_from;
          var hit_to = target.detail.hsps[0].hit_to;

          var hash = lang.replace('#view_tab=browser&loc={0}:{1}..{2}&highlight={0}:{3}..{4}&tracks=refseqs,PATRICGenes,RefSeqGenes', [target.accession, Math.min(hit_from, hit_from - 200), Math.max(hit_to, hit_to + 200), hit_from, hit_to]);

          Topic.publish('/navigate', {
            href: '/view/Genome/' + target.genome_id + hash,
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
          validTypes: ['*'],
          multiple: false,
          tooltip: 'Switch to Genome View. Press and Hold for more options.',
          ignoreDataType: true,
          validContainerTypes: ['sequence_data', 'feature_data', 'spgene_data', 'sequence_data'],
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

          Topic.publish('/navigate', { href: '/view/Genome/' + sel.genome_id, target: 'blank' });
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
          Topic.publish('/navigate', {
            href: '/view/GenomeList/?in(genome_id,(' + genome_ids.join(',') + '))',
            target: 'blank'
          });
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
            // console.log("PressAndHold");
            // console.log("Selection: ", selection, selection[0])
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
          Topic.publish('/navigate', {
            href: '/view/FeatureList/?and(eq(annotation,PATRIC),eq(sequence_id,' + sel.sequence_id + '),eq(feature_type,CDS))',
            target: 'blank'
          });
        },
        false
      ],
      [
        'ViewFeatureItem',
        'MultiButton fa icon-selection-Feature fa-2x',
        {
          label: 'FEATURE',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'Switch to Feature View. Press and Hold for more options.',
          validContainerTypes: ['feature_data'],
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
      ],
      [
        'ViewFeatureItems',
        'MultiButton fa icon-selection-FeatureList fa-2x',
        {
          label: 'FEATURES',
          validTypes: ['*'],
          multiple: true,
          min: 2,
          max: 5000,
          tooltip: 'Switch to Feature List View. Press and Hold for more options.',
          validContainerTypes: ['feature_data'],
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
            }).join(',') + '))',
            target: 'blank'
          });
        },
        false
      ]
    ])
  });
});
